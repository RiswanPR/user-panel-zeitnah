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
    return (title || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
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

    // Reject HTML tags and multiline text
    if (/[<>]/.test(rawTitle) || /[\r\n]/.test(rawTitle)) {
      throw new BadRequestException(
        'Title label must be single-line plain text without HTML characters.',
      );
    }

    const normalized = CatalogueTitleRequestService.normalizeTitle(rawTitle);

    // Check 1: Does this title already exist in the department catalogue?
    const existingTitles = department.titles || [];
    for (const t of existingTitles) {
      if (
        CatalogueTitleRequestService.normalizeTitle(t.label) === normalized
      ) {
        throw new BadRequestException(
          `Title "${rawTitle}" already exists in the ${department.name} department catalogue.`,
        );
      }
      if (Array.isArray(t.aliases)) {
        for (const alias of t.aliases) {
          if (
            CatalogueTitleRequestService.normalizeTitle(alias) === normalized
          ) {
            throw new BadRequestException(
              `Title "${rawTitle}" matches existing catalogue title "${t.label}" (alias) in ${department.name}.`,
            );
          }
        }
      }
    }

    // Check 2: Is there already a pending request for this normalized title and department?
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

    // Check 3: Abuse protection - limit pending requests per user
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
  }

  /**
   * Retrieves pending or past requests submitted by the authenticated user.
   */
  async getUserRequests(
    userId: string,
    status?: string,
  ): Promise<CatalogueTitleRequest[]> {
    if (!userId) return [];
    const query: any = { userId };
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }
    return this.requestModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean()
      .exec() as Promise<CatalogueTitleRequest[]>;
  }

  /**
   * Diagnostic method to inspect count of pending requests.
   */
  async getPendingCount(): Promise<number> {
    return this.requestModel.countDocuments({ status: 'pending' }).exec();
  }
}
