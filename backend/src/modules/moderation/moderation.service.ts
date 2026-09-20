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
    const reporterObjId = new Types.ObjectId(reporterId);

    return this.reportModel.create({
      reporterId: reporterObjId,
      targetType: dto.targetType,
      targetId: dto.targetId.trim(),
      reason: dto.reason.trim(),
      details: dto.details?.trim() || '',
      status: ReportStatus.PENDING,
    });
  }
}
