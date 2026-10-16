import {
  Injectable,
  BadRequestException,
  Logger,
  Optional,
  OnModuleInit,
} from '@nestjs/common';
import {
  PROFESSIONAL_CATALOGUE_VERSION,
  CatalogueDepartment,
  CatalogueTitle,
  getAllDepartments,
  getDepartmentById,
  getTitleById,
  getCatalogueSummary,
} from '../constants/professional-catalogue';
import {
  CatalogueRepository,
  RawCatalogueDepartmentRecord,
  RawCatalogueTitleRecord,
} from '../repositories/catalogue.repository';

export interface ValidatedProfessionalIdentity {
  departmentId: string;
  departmentName: string;
  titleId: string | null;
  titleName: string;
  isCustomTitle: boolean;
  isLegacyTitle: boolean;
  catalogueVersion: string;
}

export interface CatalogueResponse {
  version: string;
  departments: CatalogueDepartment[];
  summary: {
    version: string;
    totalDepartments: number;
    totalTitles: number;
  };
}

export type CatalogueSource = 'DATABASE' | 'CACHE' | 'STATIC_FALLBACK';

export interface CatalogueDiagnostics {
  source: CatalogueSource;
  version: string;
  totalDepartments: number;
  totalTitles: number;
  cached: boolean;
  cacheExpiresAt: number;
  lastRefreshedAt: string;
  warning?: string;
}

/**
 * Documented cache TTL for the Professional Identity catalogue:
 * 5 minutes (300,000 ms). Minimizes MongoDB load while ensuring administrative
 * catalogue updates propagate across the User Panel within bounded latency.
 */
export const DEFAULT_CATALOGUE_CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class ProfessionalCatalogueService implements OnModuleInit {
  private readonly logger = new Logger(ProfessionalCatalogueService.name);

  private readonly cacheTtlMs: number = DEFAULT_CATALOGUE_CACHE_TTL_MS;
  private cachedSnapshot: CatalogueResponse | null = null;
  private lastValidatedDatabaseSnapshot: CatalogueResponse | null = null;
  private cacheExpiresAt: number = 0;
  private lastRefreshedAt: string = '';
  private activeSource: CatalogueSource = 'STATIC_FALLBACK';
  private lastWarning?: string;

  // Single-flight promise mutex to prevent concurrent refresh stampedes
  private refreshPromise: Promise<CatalogueResponse> | null = null;

  // In-memory lookup maps for O(1) synchronous validation
  private departmentMap = new Map<string, CatalogueDepartment>();
  private departmentTitleMap = new Map<string, Map<string, CatalogueTitle>>();

  constructor(
    @Optional()
    private readonly catalogueRepository?: CatalogueRepository,
  ) {
    // Immediately initialize memory structures with the authoritative static fallback snapshot
    const staticFallback = this.buildStaticFallbackSnapshot();
    this.cachedSnapshot = staticFallback;
    this.activeSource = 'STATIC_FALLBACK';
    this.lastRefreshedAt = new Date().toISOString();
    this.buildLookupMaps(staticFallback.departments);
  }

  /**
   * NestJS Lifecycle Hook: Pre-warms the catalogue cache from the database at startup.
   */
  async onModuleInit(): Promise<void> {
    if (this.catalogueRepository) {
      try {
        await this.loadCatalogue();
      } catch (err: any) {
        this.logger.warn(
          `Initial catalogue database pre-warm skipped: ${err.message}. Running on static fallback.`,
        );
      }
    }
  }

  /**
   * Core catalogue getter.
   * Returns a thenable response object that satisfies both:
   * 1. Synchronous access (response.version, response.departments, response.summary)
   * 2. Asynchronous await (await service.getCatalogue())
   *
   * If cache is valid, returns cached snapshot immediately.
   * If expired and repository is injected, initiates / joins single-flight background refresh.
   */
  getCatalogue(): CatalogueResponse & Promise<CatalogueResponse> {
    const isExpired = Date.now() >= this.cacheExpiresAt;

    if (this.catalogueRepository && isExpired) {
      // Trigger refresh asynchronously without blocking synchronous access
      const refreshP = this.loadCatalogue();

      // Return a thenable with immediate snapshot properties attached
      const current = this.cachedSnapshot || this.buildStaticFallbackSnapshot();
      const hybrid = Promise.resolve(current).then(async () => {
        try {
          return await refreshP;
        } catch {
          return current;
        }
      });

      Object.assign(hybrid, {
        version: current.version,
        departments: current.departments,
        summary: current.summary,
      });

      return hybrid as unknown as CatalogueResponse & Promise<CatalogueResponse>;
    }

    // Cache hit or static fallback
    const current = this.cachedSnapshot || this.buildStaticFallbackSnapshot();
    const resolvedP = Promise.resolve(current);
    Object.assign(resolvedP, {
      version: current.version,
      departments: current.departments,
      summary: current.summary,
    });

    return resolvedP as unknown as CatalogueResponse & Promise<CatalogueResponse>;
  }

  /**
   * Explicitly loads or refreshes the catalogue from MongoDB with concurrency deduplication.
   * Safe against partial or malformed database states.
   */
  async loadCatalogue(forceRefresh = false): Promise<CatalogueResponse> {
    const now = Date.now();
    if (!forceRefresh && this.cachedSnapshot && now < this.cacheExpiresAt) {
      this.activeSource = 'CACHE';
      return this.cachedSnapshot;
    }

    if (!this.catalogueRepository) {
      this.activeSource = 'STATIC_FALLBACK';
      const fallback = this.buildStaticFallbackSnapshot();
      this.cachedSnapshot = fallback;
      this.buildLookupMaps(fallback.departments);
      return fallback;
    }

    // Single-flight deduplication: prevent concurrent refresh storms
    if (this.refreshPromise) {
      return await this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const snapshot = await this.fetchAndValidateDatabaseCatalogue();
        this.cachedSnapshot = snapshot;
        this.lastValidatedDatabaseSnapshot = snapshot;
        this.cacheExpiresAt = Date.now() + this.cacheTtlMs;
        this.lastRefreshedAt = new Date().toISOString();
        this.activeSource = 'DATABASE';
        this.lastWarning = undefined;
        this.buildLookupMaps(snapshot.departments);

        this.logger.log(
          `[CatalogueService] Loaded catalogue from DATABASE (version ${snapshot.version}): ` +
            `${snapshot.departments.length} active departments, ${snapshot.summary.totalTitles} active titles.`,
        );
        return snapshot;
      } catch (err: any) {
        const warnMsg = `Catalogue database query/validation failed: ${err.message}.`;
        this.lastWarning = warnMsg;
        this.logger.warn(
          `[CatalogueService] ${warnMsg} Preserving validated snapshot or falling back safely.`,
        );

        // Resilience: If a previously validated database snapshot exists, preserve it!
        if (this.lastValidatedDatabaseSnapshot) {
          this.cachedSnapshot = this.lastValidatedDatabaseSnapshot;
          this.activeSource = 'CACHE';
          // Temporary grace period before re-trying
          this.cacheExpiresAt = Date.now() + 30_000;
          this.buildLookupMaps(this.cachedSnapshot.departments);
          return this.cachedSnapshot;
        }

        // If no prior snapshot succeeded, fall back safely to static catalogue 2026.1
        const fallback = this.buildStaticFallbackSnapshot();
        this.cachedSnapshot = fallback;
        this.activeSource = 'STATIC_FALLBACK';
        this.cacheExpiresAt = Date.now() + 30_000;
        this.lastRefreshedAt = new Date().toISOString();
        this.buildLookupMaps(fallback.departments);
        return fallback;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return await this.refreshPromise;
  }

  /**
   * Fetches active records from MongoDB and executes rigorous integrity validation.
   * Never combines partial data; fails completely to trigger fallback if any anomaly is detected.
   */
  private async fetchAndValidateDatabaseCatalogue(): Promise<CatalogueResponse> {
    if (!this.catalogueRepository) {
      throw new Error('Repository is not configured.');
    }

    const [rawDepts, rawTitles] = await Promise.all([
      this.catalogueRepository.findActiveDepartments(),
      this.catalogueRepository.findActiveTitles(),
    ]);

    // Validation 1: Collections must not be empty or missing
    if (!Array.isArray(rawDepts) || rawDepts.length === 0) {
      throw new Error('Database departments collection is empty or missing.');
    }
    if (!Array.isArray(rawTitles) || rawTitles.length === 0) {
      throw new Error('Database titles collection is empty or missing.');
    }

    // Validation 2: Department documents integrity & duplicate detection
    const deptIdSet = new Set<string>();
    const activeDepts: Array<{
      id: string;
      name: string;
      status: 'active';
      displayOrder: number;
      catalogueVersion?: string;
      aliases?: string[];
    }> = [];

    for (const d of rawDepts) {
      if (!d || typeof d !== 'object') {
        throw new Error('Malformed department document in database.');
      }
      const deptId = typeof d.id === 'string' ? d.id.trim() : '';
      const deptName = typeof d.name === 'string' ? d.name.trim() : '';
      if (!deptId || !deptName) {
        throw new Error('Department record is missing required id or name.');
      }
      if (deptIdSet.has(deptId)) {
        throw new Error(`Duplicate department ID in database: '${deptId}'.`);
      }
      deptIdSet.add(deptId);

      activeDepts.push({
        id: deptId,
        name: deptName,
        status: 'active',
        displayOrder: Number(d.displayOrder) || 0,
        catalogueVersion: d.catalogueVersion,
        aliases: Array.isArray(d.aliases) ? d.aliases : [],
      });
    }

    // Validation 3: Titles integrity, department scoping, and duplicates
    const titleIdSet = new Set<string>();
    const titlesByDept = new Map<string, CatalogueTitle[]>();

    for (const t of rawTitles) {
      if (!t || typeof t !== 'object') {
        throw new Error('Malformed title document in database.');
      }
      const titleId = typeof t.id === 'string' ? t.id.trim() : '';
      const deptId = typeof t.departmentId === 'string' ? t.departmentId.trim() : '';
      const titleLabel = typeof t.label === 'string' ? t.label.trim() : '';

      if (!titleId || !deptId || !titleLabel) {
        throw new Error('Title record is missing required id, departmentId, or label.');
      }
      if (titleIdSet.has(titleId)) {
        throw new Error(`Duplicate title ID across database: '${titleId}'.`);
      }
      titleIdSet.add(titleId);

      // Enforce that title's parent department is active and exists
      if (!deptIdSet.has(deptId)) {
        throw new Error(
          `Title '${titleId}' references non-existent or inactive department '${deptId}'.`,
        );
      }

      // Enforce standard composite ID scoping
      if (!titleId.startsWith(`${deptId}:`)) {
        throw new Error(
          `Title ID '${titleId}' is not properly scoped to department '${deptId}'.`,
        );
      }

      let deptTitleList = titlesByDept.get(deptId);
      if (!deptTitleList) {
        deptTitleList = [];
        titlesByDept.set(deptId, deptTitleList);
      }

      (deptTitleList as any[]).push({
        id: titleId,
        label: titleLabel,
        status: 'active',
        displayOrder: Number(t.displayOrder) || 0,
        ...(Array.isArray(t.aliases) && t.aliases.length > 0
          ? { aliases: t.aliases }
          : {}),
      });
    }

    // Assemble assembled departments strictly ordered by displayOrder asc, then id asc
    activeDepts.sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return a.id.localeCompare(b.id);
    });

    const assembledDepartments: CatalogueDepartment[] = activeDepts.map((d) => {
      const rawDeptTitles = (titlesByDept.get(d.id) || []) as any[];
      rawDeptTitles.sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }
        return a.id.localeCompare(b.id);
      });

      const titles: CatalogueTitle[] = rawDeptTitles.map(({ displayOrder, ...rest }) => rest);

      return {
        id: d.id,
        name: d.name,
        status: 'active',
        titles,
        ...(d.aliases && d.aliases.length > 0 ? { aliases: d.aliases } : {}),
      };
    });

    const version =
      activeDepts[0]?.catalogueVersion || PROFESSIONAL_CATALOGUE_VERSION;

    const totalTitles = assembledDepartments.reduce(
      (sum, d) => sum + d.titles.length,
      0,
    );

    return {
      version,
      departments: assembledDepartments,
      summary: {
        version,
        totalDepartments: assembledDepartments.length,
        totalTitles,
      },
    };
  }

  /**
   * Builds the static fallback snapshot conforming to version 2026.1.
   */
  private buildStaticFallbackSnapshot(): CatalogueResponse {
    return {
      version: PROFESSIONAL_CATALOGUE_VERSION,
      departments: getAllDepartments() as CatalogueDepartment[],
      summary: getCatalogueSummary(),
    };
  }

  /**
   * Rebuilds fast lookup maps from the active departments list for O(1) synchronous resolution.
   */
  private buildLookupMaps(departments: readonly CatalogueDepartment[]): void {
    const newDeptMap = new Map<string, CatalogueDepartment>();
    const newDeptTitleMap = new Map<string, Map<string, CatalogueTitle>>();

    for (const dept of departments) {
      newDeptMap.set(dept.id, dept);
      const titleMap = new Map<string, CatalogueTitle>();
      for (const title of dept.titles) {
        titleMap.set(title.id, title);
      }
      newDeptTitleMap.set(dept.id, titleMap);
    }

    this.departmentMap = newDeptMap;
    this.departmentTitleMap = newDeptTitleMap;
  }

  /**
   * Synchronous accessor for currently active departments list.
   */
  getDepartments(): readonly CatalogueDepartment[] {
    if (this.cachedSnapshot) {
      return this.cachedSnapshot.departments;
    }
    return getAllDepartments();
  }

  /**
   * Synchronous accessor for a specific department by ID.
   */
  getDepartment(deptId: string): CatalogueDepartment | undefined {
    if (!deptId) return undefined;
    return this.departmentMap.get(deptId.trim());
  }

  /**
   * Synchronous accessor for a specific title by department ID and title ID.
   */
  getTitle(deptId: string, titleId: string): CatalogueTitle | undefined {
    if (!deptId || !titleId) return undefined;
    const titles = this.departmentTitleMap.get(deptId.trim());
    if (!titles) return undefined;
    return titles.get(titleId.trim());
  }

  /**
   * Observable diagnostics method for internal monitoring and tests.
   * Never exposes credentials, connection strings, or database URLs.
   */
  getDiagnostics(): CatalogueDiagnostics {
    const current = this.cachedSnapshot || this.buildStaticFallbackSnapshot();
    return {
      source: this.activeSource,
      version: current.version,
      totalDepartments: current.departments.length,
      totalTitles: current.summary.totalTitles,
      cached: this.activeSource === 'CACHE',
      cacheExpiresAt: this.cacheExpiresAt,
      lastRefreshedAt: this.lastRefreshedAt,
      warning: this.lastWarning,
    };
  }

  /**
   * Returns current active data source ('DATABASE' | 'CACHE' | 'STATIC_FALLBACK').
   */
  getActiveSource(): CatalogueSource {
    return this.activeSource;
  }

  /**
   * Forces cache invalidation by expiring the TTL so that the next request triggers a refresh.
   * Preserves previous snapshot for resilience unless purge = true.
   */
  invalidateCache(purge = false): void {
    this.cacheExpiresAt = 0;
    if (purge) {
      this.cachedSnapshot = null;
      this.lastValidatedDatabaseSnapshot = null;
      this.activeSource = 'STATIC_FALLBACK';
    }
  }

  /**
   * Server-side validation and identity resolution for incoming selections.
   * Validates departmentId and titleId against the selected catalogue source.
   * Custom titles within predefined departments are fully supported.
   * Retired titles or unknown entries are strictly rejected for new selections.
   */
  validateAndResolveIdentity(input?: {
    departmentId?: string | null;
    titleId?: string | null;
    customTitle?: string | null;
    titleName?: string | null;
    isCustomTitle?: boolean;
  }): ValidatedProfessionalIdentity {
    if (!input || !input.departmentId || !input.departmentId.trim()) {
      throw new BadRequestException('Department ID is required');
    }

    const cleanDeptId = input.departmentId.trim();
    const department = this.getDepartment(cleanDeptId);
    if (!department || department.status !== 'active') {
      throw new BadRequestException(`Invalid department ID: '${cleanDeptId}'`);
    }

    const isCustom = Boolean(
      input.isCustomTitle ||
        (input.customTitle && input.customTitle.trim().length > 0) ||
        (!input.titleId && input.titleName && input.titleName.trim().length > 0),
    );

    const version =
      this.cachedSnapshot?.version || PROFESSIONAL_CATALOGUE_VERSION;

    if (isCustom) {
      const rawCustomTitle = (input.customTitle || input.titleName || '').trim();
      if (!rawCustomTitle) {
        throw new BadRequestException('Custom title cannot be empty');
      }

      // Max length limit 100 characters
      if (rawCustomTitle.length > 100) {
        throw new BadRequestException(
          'Custom title must not exceed 100 characters',
        );
      }

      // Plain text validation: reject HTML or multiline content
      if (/[<>]/.test(rawCustomTitle) || /[\r\n]/.test(rawCustomTitle)) {
        throw new BadRequestException(
          'Custom title must be single-line plain text without HTML',
        );
      }

      return {
        departmentId: department.id,
        departmentName: department.name,
        titleId: null,
        titleName: rawCustomTitle,
        isCustomTitle: true,
        isLegacyTitle: false,
        catalogueVersion: version,
      };
    }

    // Predefined title path
    if (!input.titleId || !input.titleId.trim()) {
      throw new BadRequestException(
        'A predefined title ID or custom title is required',
      );
    }

    const cleanTitleId = input.titleId.trim();
    const title = this.getTitle(department.id, cleanTitleId);

    if (!title || title.status !== 'active') {
      // Diagnostic check: verify if titleId belongs to another department
      for (const [otherDeptId, otherDept] of this.departmentMap.entries()) {
        if (
          otherDeptId !== department.id &&
          this.getTitle(otherDeptId, cleanTitleId)
        ) {
          throw new BadRequestException(
            `Title '${cleanTitleId}' belongs to department '${otherDept.name}', not '${department.name}'`,
          );
        }
      }
      throw new BadRequestException(
        `Invalid title ID '${cleanTitleId}' for department '${department.name}'`,
      );
    }

    return {
      departmentId: department.id,
      departmentName: department.name,
      titleId: title.id,
      titleName: title.label,
      isCustomTitle: false,
      isLegacyTitle: false,
      catalogueVersion: version,
    };
  }
}
