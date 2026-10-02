import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report, ReportDocument } from '../schemas/metadata.schema';
import {
  ModerationLog,
  ModerationLogDocument,
} from '../schemas/moderation-log.schema';
import { PostRepository } from '../repositories/mongo-post.repository';
import { CommentRepository } from '../repositories/mongo-comment.repository';

@Injectable()
export class CommunityModerationService {
  private readonly logger = new Logger(CommunityModerationService.name);

  constructor(
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    @InjectModel(ModerationLog.name)
    private modLogModel: Model<ModerationLogDocument>,
    private postRepository: PostRepository,
    private commentRepository: CommentRepository,
  ) {}

  async getPendingReports(limit: number = 20): Promise<ReportDocument[]> {
    return this.reportModel
      .find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .limit(limit)
      .exec();
  }

  async resolveReport(
    reportId: string,
    moderatorId: string,
    action: string,
    notes?: string,
  ): Promise<ReportDocument> {
    const report = await this.reportModel.findById(reportId);
    if (!report) throw new Error('Report not found');

    report.status = 'resolved';
    if (notes) {
      report.description = report.description
        ? `${report.description}\n[Mod]: ${notes}`
        : `[Mod]: ${notes}`;
    }
    await report.save();

    await this.logAction(
      moderatorId,
      action,
      report.entityId,
      report.entityType,
      `Resolved report ${reportId}`,
    );
    return report;
  }

  async hidePost(
    postId: string,
    moderatorId: string,
    reason?: string,
  ): Promise<void> {
    // Soft delete
    await this.postRepository.softDelete(postId);
    await this.logAction(moderatorId, 'hide_post', postId, 'post', reason);
  }

  async lockPost(
    postId: string,
    moderatorId: string,
    reason?: string,
  ): Promise<void> {
    await this.postRepository.setLockStatus(postId, true);
    await this.logAction(moderatorId, 'lock_post', postId, 'post', reason);
  }

  private async logAction(
    moderatorId: string,
    action: string,
    entityId: string,
    entityType: string,
    reason?: string,
  ): Promise<void> {
    const log = new this.modLogModel({
      moderatorId,
      action,
      entityId,
      entityType,
      reason,
    });
    await log.save();
    this.logger.log(
      `Moderator ${moderatorId} performed ${action} on ${entityType} ${entityId}`,
    );
  }
}
