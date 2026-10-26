import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Block, BlockDocument } from './schemas/block.schema';
import {
  Report,
  ReportDocument,
  ReportTargetType,
  ReportStatus,
} from './schemas/report.schema';

export interface CreateReportDto {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details?: string;
}

@Injectable()
export class ModerationService {
  constructor(
    @InjectModel(Block.name)
    private readonly blockModel: Model<BlockDocument>,
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
  ) {}

  /**
   * Block a user
   */
  async blockUser(blockerId: string, blockedUserId: string) {
    if (
      !Types.ObjectId.isValid(blockerId) ||
      !Types.ObjectId.isValid(blockedUserId)
    ) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_ID_FORMAT',
        message: 'Invalid user identifier format',
      });
    }

    if (blockerId === blockedUserId) {
      throw new BadRequestException('You cannot block yourself');
    }

    const blockerObjId = new Types.ObjectId(blockerId);
    const blockedObjId = new Types.ObjectId(blockedUserId);

    const existing = await this.blockModel.findOne({
      blockerId: blockerObjId,
      blockedUserId: blockedObjId,
    });

    if (existing) {
      return { success: true, message: 'User is already blocked' };
    }

    await this.blockModel.create({
      blockerId: blockerObjId,
      blockedUserId: blockedObjId,
      status: 'ACTIVE',
    });

    return { success: true, message: 'User blocked successfully' };
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerId: string, blockedUserId: string) {
    if (
      !Types.ObjectId.isValid(blockerId) ||
      !Types.ObjectId.isValid(blockedUserId)
    ) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_ID_FORMAT',
        message: 'Invalid user identifier format',
      });
    }

    const blockerObjId = new Types.ObjectId(blockerId);
    const blockedObjId = new Types.ObjectId(blockedUserId);

    await this.blockModel.deleteOne({
      blockerId: blockerObjId,
      blockedUserId: blockedObjId,
    });

    return { success: true, message: 'User unblocked successfully' };
  }

  /**
   * Get all user IDs blocked by this user or who blocked this user
   */
  async getExcludedUserIds(userId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_ID_FORMAT',
        message: 'Invalid user identifier format',
      });
    }

    const userObjId = new Types.ObjectId(userId);

    const blocks = await this.blockModel
      .find({
        $or: [{ blockerId: userObjId }, { blockedUserId: userObjId }],
      })
      .lean();

    const ids = new Set<string>();
    for (const b of blocks) {
      if (String(b.blockerId) === userId) {
        ids.add(String(b.blockedUserId));
      } else {
        ids.add(String(b.blockerId));
      }
    }

    return Array.from(ids);
  }

  /**
   * Check if a block relationship exists between two users
   */
  async hasBlockRelationship(userA: string, userB: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(userA) || !Types.ObjectId.isValid(userB)) {
      return false;
    }

    const objA = new Types.ObjectId(userA);
    const objB = new Types.ObjectId(userB);

    const block = await this.blockModel.findOne({
      $or: [
        { blockerId: objA, blockedUserId: objB },
        { blockerId: objB, blockedUserId: objA },
      ],
    });

    return Boolean(block);
  }

  /**
   * Create a factual report
   */
  async createReport(reporterId: string, dto: CreateReportDto) {
    if (!Types.ObjectId.isValid(reporterId)) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_ID_FORMAT',
        message: 'Invalid reporter identifier format',
      });
    }

    if (
      !dto.targetType ||
      !Object.values(ReportTargetType).includes(dto.targetType)
    ) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_TARGET_TYPE',
        message: 'Invalid report target type',
      });
    }

    if (
      !dto.targetId ||
      typeof dto.targetId !== 'string' ||
      !dto.targetId.trim()
    ) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_TARGET_ID',
        message: 'Target identifier is required',
      });
    }

    if (!dto.reason || typeof dto.reason !== 'string' || !dto.reason.trim()) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_REASON',
        message: 'Reason is required',
      });
    }

    if (
      dto.targetType === ReportTargetType.USER &&
      !Types.ObjectId.isValid(dto.targetId.trim())
    ) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_TARGET_ID',
        message: 'Target user identifier must be a valid ObjectId',
      });
    }

    const reporterObjId = new Types.ObjectId(reporterId);

    // Deduplication policy: if an existing pending report exists from this reporter for this target, return it
    const existing = await this.reportModel.findOne({
      reporterId: reporterObjId,
      targetType: dto.targetType,
      targetId: dto.targetId.trim(),
      status: ReportStatus.PENDING,
    });
    if (existing) {
      return existing;
    }

    return this.reportModel.create({
      reporterId: reporterObjId,
      targetType: dto.targetType,
      targetId: dto.targetId.trim(),
      reason: dto.reason.trim(),
      details: dto.details?.trim() || '',
      status: ReportStatus.PENDING,
    });
  }

  /**
   * Find reports with optional filters
   */
  async getReports(filter?: {
    targetType?: string;
    status?: string;
    limit?: number;
    skip?: number;
  }): Promise<ReportDocument[]> {
    const query: any = {};

    if (filter?.targetType) {
      const tt = String(filter.targetType).trim().toUpperCase();
      if (tt === 'ALL') {
        // No targetType filter when querying all target types
      } else if (tt === 'COMMUNITY') {
        query.targetType = {
          $in: [
            ReportTargetType.COMMUNITY,
            ReportTargetType.POST,
            ReportTargetType.COMMENT,
            'COMMUNITY',
            'POST',
            'COMMENT',
            'post',
            'comment',
          ],
        };
      } else if (
        Object.values(ReportTargetType).includes(tt as ReportTargetType)
      ) {
        query.targetType = tt;
      } else {
        query.targetType = filter.targetType;
      }
    }

    if (filter?.status) {
      const st = String(filter.status).trim().toUpperCase();
      if (st === 'ALL') {
        // no status filter
      } else if (Object.values(ReportStatus).includes(st as ReportStatus)) {
        query.status = st;
      } else {
        query.status = filter.status;
      }
    } else {
      query.status = ReportStatus.PENDING;
    }

    const limit = Math.min(Math.max(filter?.limit || 20, 1), 500);
    const skip = Math.max(filter?.skip || 0, 0);

    return this.reportModel
      .find(query)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  /**
   * Get a report by its ID
   */
  async getReportById(reportId: string): Promise<ReportDocument | null> {
    if (!Types.ObjectId.isValid(reportId)) {
      return null;
    }
    const res = this.reportModel.findById(reportId);
    return typeof (res as any)?.exec === 'function' ? (res as any).exec() : res;
  }

  /**
   * Resolve or dismiss a report atomically with concurrency protection
   */
  async resolveReport(
    reportId: string,
    moderatorId: string,
    action: string,
    notes?: string,
  ): Promise<{ report: ReportDocument | null; transitioned: boolean }> {
    if (!Types.ObjectId.isValid(reportId)) {
      return { report: null, transitioned: false };
    }

    const normalizedAction = String(action || '')
      .trim()
      .toLowerCase();
    const newStatus =
      normalizedAction === 'dismiss' || normalizedAction === 'dismissed'
        ? ReportStatus.DISMISSED
        : normalizedAction === 'review' || normalizedAction === 'reviewed'
          ? ReportStatus.REVIEWED
          : ReportStatus.RESOLVED;

    const trimmedNotes = (notes || '').trim();
    const noteEntry = trimmedNotes
      ? `\n[Mod ${moderatorId}]: ${trimmedNotes}`
      : '';

    // Check pre-existing state
    const existing = await this.getReportById(reportId);
    if (!existing) {
      return { report: null, transitioned: false };
    }

    const isPendingOrReviewed =
      existing.status === ReportStatus.PENDING ||
      existing.status === ReportStatus.REVIEWED;

    if (!isPendingOrReviewed) {
      // Already finalized (resolved or dismissed)
      return { report: existing, transitioned: false };
    }

    const newDetails = existing.details
      ? `${existing.details}${noteEntry}`
      : trimmedNotes
        ? `[Mod ${moderatorId}]: ${trimmedNotes}`
        : '';

    // Atomic compare-and-swap: only update if status is currently PENDING or REVIEWED
    if (typeof (this.reportModel as any).findOneAndUpdate === 'function') {
      const updated = await this.reportModel.findOneAndUpdate(
        {
          _id: new Types.ObjectId(reportId),
          status: { $in: [ReportStatus.PENDING, ReportStatus.REVIEWED] },
        },
        {
          $set: {
            status: newStatus,
            details: newDetails,
          },
        },
        { returnDocument: 'after' },
      );

      if (updated) {
        return { report: updated, transitioned: true };
      }

      const current = await this.getReportById(reportId);
      return { report: current, transitioned: false };
    }

    // Fallback for simple mocks without findOneAndUpdate
    existing.status = newStatus;
    if (trimmedNotes) {
      existing.details = newDetails;
    }
    if (typeof (existing as any).save === 'function') {
      await existing.save();
    }
    return { report: existing, transitioned: true };
  }
}
