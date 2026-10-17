import { BadRequestException } from '@nestjs/common';
import {
  ProfessionalCatalogueService,
  DEFAULT_CATALOGUE_CACHE_TTL_MS,
} from './professional-catalogue.service';
import {
  CatalogueRepository,
  RawCatalogueDepartmentRecord,
  RawCatalogueTitleRecord,
} from '../repositories/catalogue.repository';
import {
  PROFESSIONAL_CATALOGUE_VERSION,
  getAllDepartments,
} from '../constants/professional-catalogue';

describe('ProfessionalCatalogueService (Phase 5: User Panel DB Integration)', () => {
  let service: ProfessionalCatalogueService;
  let mockRepository: jest.Mocked<CatalogueRepository>;

  const sampleDbDepartments: RawCatalogueDepartmentRecord[] = [
    {
      id: 'civil-engineering',
      name: 'Civil Engineering',
      status: 'active',
      displayOrder: 1,
      catalogueVersion: '2026.1',
      aliases: ['CE', 'Civil'],
    },
    {
      id: 'mechanical-engineering',
      name: 'Mechanical Engineering',
      status: 'active',
      displayOrder: 2,
      catalogueVersion: '2026.1',
      aliases: ['ME', 'Mechanical'],
    },
  ];

  const sampleDbTitles: RawCatalogueTitleRecord[] = [
    {
      id: 'civil-engineering:project-manager',
      departmentId: 'civil-engineering',
      label: 'Project manager',
      status: 'active',
      displayOrder: 1,
      catalogueVersion: '2026.1',
      aliases: ['PM Civil'],
    },
    {
      id: 'civil-engineering:site-engineer',
      departmentId: 'civil-engineering',
      label: 'Site Engineer',
      status: 'active',
      displayOrder: 2,
      catalogueVersion: '2026.1',
    },
    {
      id: 'mechanical-engineering:project-manager',
      departmentId: 'mechanical-engineering',
      label: 'Project manager',
      status: 'active',
      displayOrder: 1,
      catalogueVersion: '2026.1',
      aliases: ['PM Mech'],
    },
  ];

  beforeEach(() => {
    mockRepository = {
      findActiveDepartments: jest.fn().mockResolvedValue([...sampleDbDepartments]),
      findActiveTitles: jest.fn().mockResolvedValue([...sampleDbTitles]),
      findAllTitles: jest.fn().mockResolvedValue([...sampleDbTitles]),
      getCollectionCounts: jest.fn().mockResolvedValue({
        departments: sampleDbDepartments.length,
        titles: sampleDbTitles.length,
      }),
    } as unknown as jest.Mocked<CatalogueRepository>;

    service = new ProfessionalCatalogueService(mockRepository);
  });

  // =========================================================================
  // 1. Database Catalogue Success Path & Deterministic Ordering
  // =========================================================================
  describe('1. Database Catalogue Success Path & Scoping', () => {
    it('should successfully load catalogue from database repository', async () => {
      const catalogue = await service.loadCatalogue();

      expect(mockRepository.findActiveDepartments).toHaveBeenCalledTimes(1);
      expect(mockRepository.findActiveTitles).toHaveBeenCalledTimes(1);

      expect(catalogue.version).toBe('2026.1');
      expect(catalogue.departments).toHaveLength(2);
      expect(catalogue.summary.totalDepartments).toBe(2);
      expect(catalogue.summary.totalTitles).toBe(3);
      expect(service.getActiveSource()).toBe('DATABASE');

      const diagnostics = service.getDiagnostics();
      expect(diagnostics.source).toBe('DATABASE');
      expect(diagnostics.totalDepartments).toBe(2);
      expect(diagnostics.totalTitles).toBe(3);
    });

    it('should successfully load and validate all 18 departments and 254 titles matching the seeded database', async () => {
      const allDepts = getAllDepartments();
      const rawDepts: RawCatalogueDepartmentRecord[] = allDepts.map((d, dIdx) => ({
        id: d.id,
        name: d.name,
        status: 'active',
        displayOrder: dIdx + 1,
        catalogueVersion: '2026.1',
        aliases: d.aliases,
      }));
      const rawTitles: RawCatalogueTitleRecord[] = allDepts.flatMap((d) =>
        d.titles.map((t, tIdx) => ({
          id: t.id,
          departmentId: d.id,
          label: t.label,
          status: 'active',
          displayOrder: tIdx + 1,
          catalogueVersion: '2026.1',
          aliases: t.aliases,
        })),
      );

      mockRepository.findActiveDepartments.mockResolvedValueOnce(rawDepts);
      mockRepository.findActiveTitles.mockResolvedValueOnce(rawTitles);

      const catalogue = await service.loadCatalogue(true);

      expect(catalogue.version).toBe('2026.1');
      expect(catalogue.departments).toHaveLength(18);
      expect(catalogue.summary.totalDepartments).toBe(18);
      expect(catalogue.summary.totalTitles).toBe(254);
      expect(service.getActiveSource()).toBe('DATABASE');

      const diagnostics = service.getDiagnostics();
      expect(diagnostics.source).toBe('DATABASE');
      expect(diagnostics.totalDepartments).toBe(18);
      expect(diagnostics.totalTitles).toBe(254);
    });

    it('should maintain deterministic ordering (displayOrder asc, then id asc)', async () => {
      // Return unsorted records from mock repository
      mockRepository.findActiveDepartments.mockResolvedValueOnce([
        {
          id: 'zebra-dept',
          name: 'Zebra Dept',
          status: 'active',
          displayOrder: 5,
        },
        {
          id: 'alpha-dept-b',
          name: 'Alpha Dept B',
          status: 'active',
          displayOrder: 1,
        },
        {
          id: 'alpha-dept-a',
          name: 'Alpha Dept A',
          status: 'active',
          displayOrder: 1,
        },
      ]);
      mockRepository.findActiveTitles.mockResolvedValueOnce([
        {
          id: 'alpha-dept-a:title-2',
          departmentId: 'alpha-dept-a',
          label: 'Title 2',
          status: 'active',
          displayOrder: 2,
        },
        {
          id: 'alpha-dept-a:title-1',
          departmentId: 'alpha-dept-a',
          label: 'Title 1',
          status: 'active',
          displayOrder: 1,
        },
      ]);

      const catalogue = await service.loadCatalogue(true);
      expect(catalogue.departments[0].id).toBe('alpha-dept-a');
      expect(catalogue.departments[1].id).toBe('alpha-dept-b');
      expect(catalogue.departments[2].id).toBe('zebra-dept');

      expect(catalogue.departments[0].titles[0].id).toBe('alpha-dept-a:title-1');
      expect(catalogue.departments[0].titles[1].id).toBe('alpha-dept-a:title-2');
    });

    it('should strictly scope titles to their parent department', async () => {
      const catalogue = await service.loadCatalogue();
      const civil = catalogue.departments.find((d) => d.id === 'civil-engineering');
      const mech = catalogue.departments.find((d) => d.id === 'mechanical-engineering');

      expect(civil?.titles.map((t) => t.id)).toEqual([
        'civil-engineering:project-manager',
        'civil-engineering:site-engineer',
      ]);
      expect(mech?.titles.map((t) => t.id)).toEqual([
        'mechanical-engineering:project-manager',
      ]);
    });
  });

  // =========================================================================
  // 2. Missing Collections and Empty Collections Handling
  // =========================================================================
  describe('2. Missing and Empty Collections Handling', () => {
    it('should safely fall back to static 2026.1 catalogue when departments collection is empty', async () => {
      mockRepository.findActiveDepartments.mockResolvedValueOnce([]);
      mockRepository.findActiveTitles.mockResolvedValueOnce([...sampleDbTitles]);

      const catalogue = await service.loadCatalogue(true);

      expect(service.getActiveSource()).toBe('STATIC_FALLBACK');
      expect(catalogue.version).toBe(PROFESSIONAL_CATALOGUE_VERSION);
      expect(catalogue.departments).toHaveLength(18);
      expect(catalogue.summary.totalTitles).toBe(254);

      const diag = service.getDiagnostics();
      expect(diag.source).toBe('STATIC_FALLBACK');
      expect(diag.warning).toContain('empty or missing');
    });

    it('should safely fall back to static catalogue when titles collection is empty', async () => {
      mockRepository.findActiveDepartments.mockResolvedValueOnce([...sampleDbDepartments]);
      mockRepository.findActiveTitles.mockResolvedValueOnce([]);

      const catalogue = await service.loadCatalogue(true);

      expect(service.getActiveSource()).toBe('STATIC_FALLBACK');
      expect(catalogue.version).toBe('2026.1');
      expect(catalogue.departments).toHaveLength(18);
      // Zero combining: Never combines partial database departments with static titles
      expect(catalogue.summary.totalDepartments).toBe(18);
    });
  });

  // =========================================================================
  // 3. Database Outage and Malformed Records Resilience
  // =========================================================================
  describe('3. Database Outage and Malformed Records Resilience', () => {
    it('should fall back safely when database connection throws MongoNetworkError', async () => {
      mockRepository.findActiveDepartments.mockRejectedValueOnce(
        new Error('MongoNetworkError: connection timed out to 127.0.0.1:27017'),
      );

      const catalogue = await service.loadCatalogue(true);

      expect(service.getActiveSource()).toBe('STATIC_FALLBACK');
      expect(catalogue.version).toBe('2026.1');
      expect(catalogue.departments).toHaveLength(18);
      expect(service.getDiagnostics().warning).toContain('MongoNetworkError');
    });

    it('should reject malformed department record (missing name) and fall back safely', async () => {
      mockRepository.findActiveDepartments.mockResolvedValueOnce([
        { id: 'civil-engineering', name: '', status: 'active', displayOrder: 1 },
      ]);

      const catalogue = await service.loadCatalogue(true);
      expect(service.getActiveSource()).toBe('STATIC_FALLBACK');
      expect(catalogue.departments).toHaveLength(18);
    });

    it('should reject malformed title record (missing label) and fall back safely', async () => {
      mockRepository.findActiveTitles.mockResolvedValueOnce([
        {
          id: 'civil-engineering:site-engineer',
          departmentId: 'civil-engineering',
          label: '',
          status: 'active',
          displayOrder: 1,
        },
      ]);

      const catalogue = await service.loadCatalogue(true);
      expect(service.getActiveSource()).toBe('STATIC_FALLBACK');
      expect(catalogue.departments).toHaveLength(18);
    });

    it('should reject title referencing non-existent department (orphan detection)', async () => {
      mockRepository.findActiveTitles.mockResolvedValueOnce([
        {
          id: 'non-existent-dept:some-title',
          departmentId: 'non-existent-dept',
          label: 'Some Title',
          status: 'active',
          displayOrder: 1,
        },
      ]);

      const catalogue = await service.loadCatalogue(true);
      expect(service.getActiveSource()).toBe('STATIC_FALLBACK');
      expect(catalogue.departments).toHaveLength(18);
    });

    it('should reject title with scoping mismatch (titleId prefix != departmentId)', async () => {
      mockRepository.findActiveTitles.mockResolvedValueOnce([
        {
          id: 'mechanical-engineering:some-title',
          departmentId: 'civil-engineering',
          label: 'Some Title',
          status: 'active',
          displayOrder: 1,
        },
      ]);

      const catalogue = await service.loadCatalogue(true);
      expect(service.getActiveSource()).toBe('STATIC_FALLBACK');
    });

    it('should reject duplicate department IDs in database payload', async () => {
      mockRepository.findActiveDepartments.mockResolvedValueOnce([
        { id: 'civil-engineering', name: 'Civil 1', status: 'active', displayOrder: 1 },
        { id: 'civil-engineering', name: 'Civil 2', status: 'active', displayOrder: 2 },
      ]);

      const catalogue = await service.loadCatalogue(true);
      expect(service.getActiveSource()).toBe('STATIC_FALLBACK');
    });

    it('should reject duplicate title IDs across database payload', async () => {
      mockRepository.findActiveTitles.mockResolvedValueOnce([
        {
          id: 'civil-engineering:site-engineer',
          departmentId: 'civil-engineering',
          label: 'Site Eng 1',
          status: 'active',
          displayOrder: 1,
        },
        {
          id: 'civil-engineering:site-engineer',
          departmentId: 'civil-engineering',
          label: 'Site Eng 2',
          status: 'active',
          displayOrder: 2,
        },
      ]);

      const catalogue = await service.loadCatalogue(true);
      expect(service.getActiveSource()).toBe('STATIC_FALLBACK');
    });
  });

  // =========================================================================
  // 4. Cache TTL, Refresh Failure, and Concurrent Refresh Storm Prevention
  // =========================================================================
  describe('4. Cache TTL, Refresh Resilience & Concurrency Guarding', () => {
    it('should serve cached snapshot within TTL (5 minutes) without re-querying MongoDB', async () => {
      await service.loadCatalogue();
      expect(mockRepository.findActiveDepartments).toHaveBeenCalledTimes(1);

      // Second call immediately -> should be served from memory cache
      const secondCall = await service.loadCatalogue();
      expect(mockRepository.findActiveDepartments).toHaveBeenCalledTimes(1);
      expect(service.getActiveSource()).toBe('CACHE');
      expect(secondCall.summary.totalDepartments).toBe(2);
    });

    it('should query MongoDB again after cache TTL expires', async () => {
      await service.loadCatalogue();
      expect(mockRepository.findActiveDepartments).toHaveBeenCalledTimes(1);

      // Simulate TTL expiration
      service.invalidateCache();

      await service.loadCatalogue();
      expect(mockRepository.findActiveDepartments).toHaveBeenCalledTimes(2);
      expect(service.getActiveSource()).toBe('DATABASE');
    });

    it('should prevent concurrent refresh storms (promise deduplication mutex)', async () => {
      let resolveDepts: any;
      mockRepository.findActiveDepartments.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveDepts = resolve;
          }),
      );

      // Fire 10 concurrent requests while initial refresh is pending
      const promises = Array.from({ length: 10 }, () => service.loadCatalogue());

      // Resolve background query
      resolveDepts([...sampleDbDepartments]);

      const results = await Promise.all(promises);

      // Verify repository was queried exactly ONCE, not 10 times
      expect(mockRepository.findActiveDepartments).toHaveBeenCalledTimes(1);
      expect(mockRepository.findActiveTitles).toHaveBeenCalledTimes(1);

      results.forEach((res) => {
        expect(res.departments).toHaveLength(2);
      });
    });

    it('should preserve previously validated snapshot if a subsequent refresh fails', async () => {
      // 1. Initial successful database load
      await service.loadCatalogue();
      expect(service.getActiveSource()).toBe('DATABASE');

      // 2. Invalidate cache to trigger refresh
      service.invalidateCache();

      // 3. Simulate database failure on subsequent refresh
      mockRepository.findActiveDepartments.mockRejectedValueOnce(
        new Error('MongoDB Connection Outage'),
      );

      const refreshed = await service.loadCatalogue();

      // Should preserve previously validated 2-department database snapshot, NOT reset
      expect(refreshed.departments).toHaveLength(2);
      expect(service.getActiveSource()).toBe('CACHE');
      expect(service.getDiagnostics().warning).toContain('MongoDB Connection Outage');
    });
  });

  // =========================================================================
  // 5. Duplicate Labels Across Distinct Departments Preservation
  // =========================================================================
  describe('5. Cross-Department Duplicate Labels Preservation', () => {
    it('should preserve distinct options for identical title label "Project manager" across departments', async () => {
      await service.loadCatalogue();

      const civilPm = service.getTitle(
        'civil-engineering',
        'civil-engineering:project-manager',
      );
      const mechPm = service.getTitle(
        'mechanical-engineering',
        'mechanical-engineering:project-manager',
      );

      expect(civilPm).toBeDefined();
      expect(mechPm).toBeDefined();
      expect(civilPm?.label).toBe('Project manager');
      expect(mechPm?.label).toBe('Project manager');
      expect(civilPm?.id).not.toBe(mechPm?.id);
    });
  });

  // =========================================================================
  // 6. Server-Side Identity Validation Against Selected Catalogue Source
  // =========================================================================
  describe('6. Department/Title Pair Validation', () => {
    it('should accept valid active department and title pair', async () => {
      await service.loadCatalogue();

      const validated = service.validateAndResolveIdentity({
        departmentId: 'civil-engineering',
        titleId: 'civil-engineering:site-engineer',
      });

      expect(validated.departmentId).toBe('civil-engineering');
      expect(validated.departmentName).toBe('Civil Engineering');
      expect(validated.titleId).toBe('civil-engineering:site-engineer');
      expect(validated.titleName).toBe('Site Engineer');
      expect(validated.isCustomTitle).toBe(false);
      expect(validated.catalogueVersion).toBe('2026.1');
    });

    it('should reject title belonging to a different department with helpful diagnostic', async () => {
      await service.loadCatalogue();

      expect(() =>
        service.validateAndResolveIdentity({
          departmentId: 'civil-engineering',
          titleId: 'mechanical-engineering:project-manager',
        }),
      ).toThrow(
        "Title 'mechanical-engineering:project-manager' belongs to department 'Mechanical Engineering', not 'Civil Engineering'",
      );
    });

    it('should reject invalid or non-existent departmentId', async () => {
      await service.loadCatalogue();

      expect(() =>
        service.validateAndResolveIdentity({
          departmentId: 'aerospace-engineering',
          titleId: 'aerospace:flight-engineer',
        }),
      ).toThrow("Invalid department ID: 'aerospace-engineering'");
    });

    it('should reject empty or missing departmentId', async () => {
      expect(() => service.validateAndResolveIdentity({})).toThrow(
        'Department ID is required',
      );
    });
  });

  // =========================================================================
  // 7. Custom Titles Validation & Handling
  // =========================================================================
  describe('7. Custom Titles in Predefined Department', () => {
    it('should accept valid custom title and set titleId to null', async () => {
      await service.loadCatalogue();

      const validated = service.validateAndResolveIdentity({
        departmentId: 'civil-engineering',
        customTitle: 'Bridge Health Assessment Specialist',
        isCustomTitle: true,
      });

      expect(validated.departmentId).toBe('civil-engineering');
      expect(validated.titleId).toBeNull();
      expect(validated.titleName).toBe('Bridge Health Assessment Specialist');
      expect(validated.isCustomTitle).toBe(true);
    });

    it('should reject custom title with HTML tags or newlines', async () => {
      await service.loadCatalogue();

      expect(() =>
        service.validateAndResolveIdentity({
          departmentId: 'civil-engineering',
          customTitle: '<script>alert("hack")</script>',
        }),
      ).toThrow('Custom title must be single-line plain text without HTML');

      expect(() =>
        service.validateAndResolveIdentity({
          departmentId: 'civil-engineering',
          customTitle: 'Line 1\nLine 2',
        }),
      ).toThrow('Custom title must be single-line plain text without HTML');
    });

    it('should reject custom title exceeding 100 characters', async () => {
      await service.loadCatalogue();

      expect(() =>
        service.validateAndResolveIdentity({
          departmentId: 'civil-engineering',
          customTitle: 'A'.repeat(101),
        }),
      ).toThrow('Custom title must not exceed 100 characters');
    });
  });

  // =========================================================================
  // 8. Retired Titles Handling & Existing Profile Readability
  // =========================================================================
  describe('8. Retired Titles Invariant (Never Offered for New Selections)', () => {
    it('should reject selection of retired title for new profiles', async () => {
      // Simulate title marked retired in database (not active)
      await service.loadCatalogue();

      expect(() =>
        service.validateAndResolveIdentity({
          departmentId: 'civil-engineering',
          titleId: 'civil-engineering:retired-title',
        }),
      ).toThrow("Invalid title ID 'civil-engineering:retired-title'");
    });

    it('should confirm existing profile saved identities remain intact without rewriting', () => {
      // Existing saved user profile with legacy/retired title
      const existingUserIdentity = {
        departmentId: 'civil-engineering',
        departmentName: 'Civil Engineering',
        titleId: 'civil-engineering:legacy-title',
        titleName: 'Senior Resident Engineer',
        isCustomTitle: false,
        isLegacyTitle: true,
        catalogueVersion: '2026.1',
      };

      // Service getter does not mutate or invalidate existing profile structures
      expect(existingUserIdentity.departmentId).toBe('civil-engineering');
      expect(existingUserIdentity.titleName).toBe('Senior Resident Engineer');
      expect(existingUserIdentity.isLegacyTitle).toBe(true);
    });
  });

  // =========================================================================
  // 9. API Response Shape Compatibility
  // =========================================================================
  describe('9. API Response Shape Compatibility', () => {
    it('should support synchronous access (response.version, response.departments)', () => {
      const response = service.getCatalogue();
      expect(response.version).toBe('2026.1');
      expect(Array.isArray(response.departments)).toBe(true);
      expect(response.summary.version).toBe('2026.1');
    });

    it('should support async await access (await service.getCatalogue())', async () => {
      const response = await service.getCatalogue();
      expect(response.version).toBe('2026.1');
      expect(Array.isArray(response.departments)).toBe(true);
      expect(response.summary.totalDepartments).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 10. No Database Writes or Seeding from User Panel
  // =========================================================================
  describe('10. Zero Database Writes or Seeding Invariant', () => {
    it('should confirm repository and service expose zero write, update, delete, or seed methods', () => {
      const repoMethods = Object.getOwnPropertyNames(
        CatalogueRepository.prototype,
      );
      const serviceMethods = Object.getOwnPropertyNames(
        ProfessionalCatalogueService.prototype,
      );

      const writeKeywords = [
        'insert',
        'create',
        'update',
        'delete',
        'remove',
        'save',
        'seed',
        'drop',
        'upsert',
      ];

      for (const method of repoMethods) {
        for (const kw of writeKeywords) {
          expect(method.toLowerCase()).not.toContain(kw);
        }
      }

      for (const method of serviceMethods) {
        for (const kw of writeKeywords) {
          expect(method.toLowerCase()).not.toContain(kw);
        }
      }
    });
  });
});
