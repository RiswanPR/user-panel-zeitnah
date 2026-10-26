import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';
import {
  CatalogueTitleRequest,
  CatalogueTitleRequestDocument,
} from '../schemas/catalogue-title-request.schema';
import { ProfessionalCatalogueService } from './professional-catalogue.service';
import { CreateTitleRequestDto } from '../dto/create-title-request.dto';

export interface UserContext {
  userId: string;
  name?: string;
  email?: string;
}

export interface TitleRequestOperationResult {
  action:
    | 'CREATED_PENDING'
    | 'REUSED_PENDING'
    | 'OFFICIAL_TITLE_EXISTS'
    | 'ALREADY_APPROVED';
  request: CatalogueTitleRequest | null;
  departmentId: string;
  departmentName: string;
  resolvedTitleId?: string | null;
  resolvedTitleName: string;
  isOfficialTitle: boolean;
  isNew: boolean;
  reused: boolean;
}

@Injectable()
export class CatalogueTitleRequestService {
  private readonly logger = new Logger(CatalogueTitleRequestService.name);

  constructor(
    @InjectModel(CatalogueTitleRequest.name)
    private readonly requestModel: Model<CatalogueTitleRequestDocument>,
    private readonly catalogueService: ProfessionalCatalogueService,
  ) {}

  /**
   * Normalizes a title label for robust duplicate detection:
   * trims, lowercases, and collapses multiple consecutive spaces.
   */
  static normalizeTitle(title: string): string {
    return (title || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Submits a custom title request for administrator review.
   * Enforces:
   * 1. Active department requirement (cannot invent/modify departments).
   * 2. Strict plain text validation (max 100 chars, no HTML, no newlines).
   * 3. Existing title detection (rejects if already in department catalogue).
   * 4. Duplicate pending request detection (rejects if identical normalized title pending).
   * 5. User ownership & rate limiting (max 10 pending requests per user).
   * 6. Does NOT mutate catalogue_titles (manual admin approval required).
   */
  async createRequest(
    user: UserContext,
    dto: CreateTitleRequestDto,
  ): Promise<CatalogueTitleRequest> {
    if (!user || !user.userId) {
      throw new BadRequestException('Authenticated user context is required.');
    }

    if (!dto || !dto.departmentId || !dto.departmentId.trim()) {
      throw new BadRequestException('Department ID is required.');
    }

    const cleanDeptId = dto.departmentId.trim();
    const department = this.catalogueService.getDepartment(cleanDeptId);

    if (!department || department.status !== 'active') {
      throw new BadRequestException(
        `Department '${cleanDeptId}' not found or is currently inactive.`,
      );
    }

    const rawTitle = (dto.title || '').trim();
    if (!rawTitle) {
      throw new BadRequestException('Title label cannot be empty.');
    }

    if (rawTitle.length < 2) {
      throw new BadRequestException(
        'Title label must be at least 2 characters long.',
      );
    }

    if (rawTitle.length > 100) {
      throw new BadRequestException(
        'Title label must not exceed 100 characters.',
      );
    }

    // Reject control characters (0x00-0x1F, 0x7F), HTML tags (< >), and newlines
    if (/[\x00-\x1F\x7F<>]/.test(rawTitle)) {
      throw new BadRequestException(
        'Title label must be single-line plain text without control or HTML characters.',
      );
    }

    const normalized = CatalogueTitleRequestService.normalizeTitle(rawTitle);

    // Check 1: Does this title already exist in the department catalogue?
    const existingTitles = department.titles || [];
    for (const t of existingTitles) {
      if (CatalogueTitleRequestService.normalizeTitle(t.label) === normalized) {
        throw new BadRequestException(
          `Title "${rawTitle}" already exists in the ${department.name} department catalogue. Please select it from the available catalogue titles.`,
        );
      }
      if (Array.isArray(t.aliases)) {
        for (const alias of t.aliases) {
          if (
            CatalogueTitleRequestService.normalizeTitle(alias) === normalized
          ) {
            throw new BadRequestException(
              `Title "${rawTitle}" matches existing catalogue title "${t.label}" (alias) in ${department.name}. Please select "${t.label}" from the available catalogue titles.`,
            );
          }
        }
      }
    }

    // Check 2: Has an equivalent request already been approved in the database?
    const alreadyApproved = await this.requestModel
      .findOne({
        departmentId: department.id,
        normalizedTitle: normalized,
        status: 'approved',
      })
      .exec();

    if (alreadyApproved) {
      throw new BadRequestException(
        `A request for title "${rawTitle}" in ${department.name} has already been approved. Please select it from the available catalogue titles.`,
      );
    }

    // Check 3: Is there already a pending request for this normalized title and department?
    const duplicatePending = await this.requestModel
      .findOne({
        departmentId: department.id,
        normalizedTitle: normalized,
        status: 'pending',
      })
      .exec();

    if (duplicatePending) {
      throw new ConflictException(
        `A request for title "${rawTitle}" in ${department.name} is already pending administrator review.`,
      );
    }

    // Check 4: Abuse protection - limit pending requests per user
    const pendingCount = await this.requestModel
      .countDocuments({
        userId: user.userId,
        status: 'pending',
      })
      .exec();

    if (pendingCount >= 10) {
      throw new BadRequestException(
        'You have reached the maximum limit of 10 pending title requests. Please await review of prior requests.',
      );
    }

    const requestId = `req_${randomUUID()}`;
    const now = new Date();

    try {
      const created = await this.requestModel.create({
        id: requestId,
        userId: user.userId,
        userName: user.name || '',
        userEmail: user.email || '',
        departmentId: department.id,
        departmentName: department.name,
        requestedTitle: rawTitle,
        normalizedTitle: normalized,
        status: 'pending',
        submittedAt: now,
        reviewedAt: null,
        reviewerId: null,
        reviewerName: null,
        reviewNote: null,
        createdTitleId: null,
      });

      this.logger.log(
        `[TitleRequest] Created title request ${requestId} for "${rawTitle}" in ${department.name} by user ${user.userId}`,
      );

      return created;
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException(
          `A request for title "${rawTitle}" in ${department.name} is already pending administrator review.`,
        );
      }
      throw err;
    }
  }

  /**
   * Idempotently finds, creates, or reuses a catalogue title request for a custom title.
   *
   * Design & Rules:
   * 1. Validates user context, active department, and title constraints (trim, length 2-100, no HTML/control chars).
   * 2. Checks if the normalized title matches an active official title or alias in the department.
   *    If an unambiguous match exists, returns OFFICIAL_TITLE_EXISTS with resolved title ID without creating a request.
   * 3. Checks if an equivalent request was already approved in the database.
   *    If so, returns ALREADY_APPROVED with resolved title ID if available.
   * 4. Checks if an equivalent request is already pending across the department (shared across users).
   *    If so, returns REUSED_PENDING and reuses the existing request without throwing ConflictException.
   * 5. Checks if an equivalent request was previously rejected:
   *    Preserves the rejected record in history and creates a fresh pending request for re-review.
   * 6. Creates a new pending request if none exists, enforcing the user pending limit (max 10).
   * 7. Concurrency safety: catches duplicate-key error (code 11000) and re-fetches the winning pending request.
   */
  async findOrCreateOrReuseRequest(
    user: UserContext,
    departmentId: string,
    rawTitle: string,
  ): Promise<TitleRequestOperationResult> {
    if (!user || !user.userId) {
      throw new BadRequestException('Authenticated user context is required.');
    }

    if (!departmentId || !departmentId.trim()) {
      throw new BadRequestException('Department ID is required.');
    }

    const cleanDeptId = departmentId.trim();
    const department = this.catalogueService.getDepartment(cleanDeptId);

    if (!department || department.status !== 'active') {
      throw new BadRequestException(
        `Department '${cleanDeptId}' not found or is currently inactive.`,
      );
    }

    const trimmedTitle = (rawTitle || '').trim();
    if (!trimmedTitle) {
      throw new BadRequestException('Title label cannot be empty.');
    }

    if (trimmedTitle.length < 2) {
      throw new BadRequestException(
        'Title label must be at least 2 characters long.',
      );
    }

    if (trimmedTitle.length > 100) {
      throw new BadRequestException(
        'Title label must not exceed 100 characters.',
      );
    }

    if (/[\x00-\x1F\x7F<>]/.test(trimmedTitle) || /[\r\n]/.test(trimmedTitle)) {
      throw new BadRequestException(
        'Title label must be single-line plain text without control or HTML characters.',
      );
    }

    const normalized =
      CatalogueTitleRequestService.normalizeTitle(trimmedTitle);

    // Check 1: Does this match an official active catalogue title or alias in this department?
    const matchingOfficialTitles: any[] = [];
    for (const t of department.titles || []) {
      if (t.status !== 'active') continue;
      if (CatalogueTitleRequestService.normalizeTitle(t.label) === normalized) {
        matchingOfficialTitles.push(t);
        continue;
      }
      if (Array.isArray(t.aliases)) {
        for (const alias of t.aliases) {
          if (
            CatalogueTitleRequestService.normalizeTitle(alias) === normalized
          ) {
            matchingOfficialTitles.push(t);
            break;
          }
        }
      }
    }

    if (matchingOfficialTitles.length === 1) {
      const official = matchingOfficialTitles[0];
      return {
        action: 'OFFICIAL_TITLE_EXISTS',
        request: null,
        departmentId: department.id,
        departmentName: department.name,
        resolvedTitleId: official.id,
        resolvedTitleName: official.label,
        isOfficialTitle: true,
        isNew: false,
        reused: false,
      };
    }

    if (matchingOfficialTitles.length > 1) {
      throw new BadRequestException(
        `Ambiguous title match: '${trimmedTitle}' matches multiple official titles in ${department.name}. Please select from predefined titles.`,
      );
    }

    // Check 2: Has an equivalent request already been approved in the database?
    const alreadyApproved = await this.requestModel
      .findOne({
        departmentId: department.id,
        normalizedTitle: normalized,
        status: 'approved',
      })
      .exec();

    if (alreadyApproved) {
      const resolvedId = alreadyApproved.createdTitleId || null;
      let resolvedName = alreadyApproved.requestedTitle || trimmedTitle;
      if (resolvedId && typeof this.catalogueService?.getTitle === 'function') {
        const catTitle = this.catalogueService.getTitle(
          department.id,
          resolvedId,
        );
        if (catTitle) {
          resolvedName = catTitle.label;
        }
      }
      return {
        action: 'ALREADY_APPROVED',
        request: alreadyApproved,
        departmentId: department.id,
        departmentName: department.name,
        resolvedTitleId: resolvedId,
        resolvedTitleName: resolvedName,
        isOfficialTitle: Boolean(resolvedId),
        isNew: false,
        reused: true,
      };
    }

    // Check 3: Is there already a pending request for this normalized title and department?
    const existingPending = await this.requestModel
      .findOne({
        departmentId: department.id,
        normalizedTitle: normalized,
        status: 'pending',
      })
      .exec();

    if (existingPending) {
      return {
        action: 'REUSED_PENDING',
        request: existingPending,
        departmentId: department.id,
        departmentName: department.name,
        resolvedTitleId: null,
        resolvedTitleName: trimmedTitle,
        isOfficialTitle: false,
        isNew: false,
        reused: true,
      };
    }

    // Check 4: Abuse protection - limit pending requests per user
    const pendingCount = await this.requestModel
      .countDocuments({
        userId: user.userId,
        status: 'pending',
      })
      .exec();

    if (pendingCount >= 10) {
      throw new BadRequestException(
        'You have reached the maximum limit of 10 pending title requests. Please await review of prior requests.',
      );
    }

    // Create a new pending request
    const requestId = `req_${randomUUID()}`;
    const now = new Date();

    try {
      const created = await this.requestModel.create({
        id: requestId,
        userId: user.userId,
        userName: user.name || '',
        userEmail: user.email || '',
        departmentId: department.id,
        departmentName: department.name,
        requestedTitle: trimmedTitle,
        normalizedTitle: normalized,
        status: 'pending',
        submittedAt: now,
        reviewedAt: null,
        reviewerId: null,
        reviewerName: null,
        reviewNote: null,
        createdTitleId: null,
      });

      this.logger.log(
        `[TitleRequest] Auto-created title request ${requestId} for "${trimmedTitle}" in ${department.name} by user ${user.userId}`,
      );

      return {
        action: 'CREATED_PENDING',
        request: created,
        departmentId: department.id,
        departmentName: department.name,
        resolvedTitleId: null,
        resolvedTitleName: trimmedTitle,
        isOfficialTitle: false,
        isNew: true,
        reused: false,
      };
    } catch (err: any) {
      if (err.code === 11000) {
        // Concurrently inserted by another process: look up winning pending request!
        const winning = await this.requestModel
          .findOne({
            departmentId: department.id,
            normalizedTitle: normalized,
            status: 'pending',
          })
          .exec();

        if (winning) {
          return {
            action: 'REUSED_PENDING',
            request: winning,
            departmentId: department.id,
            departmentName: department.name,
            resolvedTitleId: null,
            resolvedTitleName: trimmedTitle,
            isOfficialTitle: false,
            isNew: false,
            reused: true,
          };
        }
      }
      throw err;
    }
  }

  /**
   * Retrieves pending or past requests submitted by the authenticated user with optional pagination.
   */
  async getUserRequests(
    userId: string,
    statusOrOptions?:
      string | { status?: string; page?: number; limit?: number },
  ): Promise<CatalogueTitleRequest[]> {
    if (!userId) return [];
    let status: string | undefined;
    let page: number | undefined;
    let limit: number | undefined;

    if (typeof statusOrOptions === 'string') {
      status = statusOrOptions;
    } else if (statusOrOptions && typeof statusOrOptions === 'object') {
      status = statusOrOptions.status;
      page = statusOrOptions.page;
      limit = statusOrOptions.limit;
    }

    const query: any = { userId };
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }

    let queryChain = this.requestModel.find(query).sort({ createdAt: -1 });

    if (page && limit && page > 0 && limit > 0) {
      const skip = (page - 1) * limit;
      queryChain = queryChain.skip(skip).limit(limit) as any;
    } else if (limit && limit > 0) {
      queryChain = queryChain.limit(limit) as any;
    }

    return queryChain.lean().exec() as Promise<CatalogueTitleRequest[]>;
  }

  /**
   * Diagnostic method to inspect count of pending requests.
   */
  async getPendingCount(): Promise<number> {
    return this.requestModel.countDocuments({ status: 'pending' }).exec();
  }
}
