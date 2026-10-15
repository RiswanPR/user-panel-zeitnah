import {
  Injectable,
  Logger,
  Optional,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Report, ReportDocument } from '../schemas/metadata.schema';
import {
  ModerationLog,
  ModerationLogDocument,
} from '../schemas/moderation-log.schema';
import { PostRepository } from '../repositories/mongo-post.repository';
import { CommentRepository } from '../repositories/mongo-comment.repository';
import { ModerationService } from '../../moderation/moderation.service';
import {
  ReportTargetType,
  ReportStatus,
} from '../../moderation/schemas/report.schema';

@Injectable()
export class CommunityModerationService {
  private readonly logger = new Logger(CommunityModerationService.name);

  constructor(
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    @InjectModel(ModerationLog.name)
    private modLogModel: Model<ModerationLogDocument>,
    private postRepository: PostRepository,
    private commentRepository: CommentRepository,
    @Optional() private moderationService?: ModerationService,
  ) {}

  /**
   * Format any report (active or legacy) into a dual-contract representation
   * that seamlessly satisfies both targetType/targetId and entityType/entityId
   */
  private formatReport(report: any, source: 'active' | 'legacy') {
    const id = String(report._id || report.id || '');
    const targetType =
      report.targetType || report.entityType || ReportTargetType.COMMUNITY;
    const entityType = (
      report.entityType ||
      report.targetType ||
      'post'
    ).toLowerCase();
    const targetId = String(report.targetId || report.entityId || '');
    const entityId = String(report.entityId || report.targetId || '');
    const reason = String(report.reason || '');
    const details = report.details || report.description || '';
    const description = report.description || report.details || '';
    const status = report.status;
    const reporterId = String(report.reporterId || '');
    const createdAt = report.createdAt || new Date();
    const updatedAt = report.updatedAt || new Date();

    return {
      _id: id,
      id,
      reporterId,
      targetType,
      entityType,
      targetId,
      entityId,
      reason,
      details,
      description,
      status,
      source,
      createdAt,
      updatedAt,
    };
  }

  async getPendingReports(
    limit: number = 20,
    skip: number = 0,
    status?: string,
    targetType?: string,
  ): Promise<any[]> {
    const combined: any[] = [];
    const seenIds = new Set<string>();

    const fetchLimit = limit + skip;

    // 1. Fetch from active global moderation_reports (scoped to COMMUNITY by default)
    if (this.moderationService) {
      try {
        const activeTargetType =
          targetType && targetType.trim().toUpperCase() === 'ALL'
            ? 'ALL'
            : targetType || ReportTargetType.COMMUNITY;

        const activeReports = await this.moderationService.getReports({
          targetType: activeTargetType,
          status: status || ReportStatus.PENDING,
          limit: fetchLimit,
          skip: 0,
        });

        for (const r of activeReports) {
          const idStr = String(r._id);
          if (!seenIds.has(idStr)) {
            seenIds.add(idStr);
            combined.push(this.formatReport(r, 'active'));
          }
        }
      } catch (err: any) {
        this.logger.error(
          `Failed to fetch active moderation reports: ${err.message}`,
        );
      }
    }

    // 2. Fetch from legacy community_reports (backward compatibility)
    if (this.reportModel) {
      try {
        const legacyQuery: any = {};
        if (status) {
          const stLower = status.toLowerCase().trim();
          if (stLower !== 'all') {
            legacyQuery.status = stLower;
          }
        } else {
          legacyQuery.status = 'pending';
        }

        const rawTargetType = (targetType || 'COMMUNITY').trim().toLowerCase();
        if (rawTargetType === 'all') {
          // No entityType filter for legacy when querying all
        } else if (rawTargetType === 'community') {
          legacyQuery.entityType = {
            $in: ['post', 'comment', 'community', 'story'],
          };
        } else {
          legacyQuery.entityType = rawTargetType;
        }

        const legacyReports = await this.reportModel
          .find(legacyQuery)
          .sort({ createdAt: 1 })
          .limit(fetchLimit)
          .exec();

        for (const lr of legacyReports) {
          const idStr = String(lr._id);
          if (!seenIds.has(idStr)) {
            seenIds.add(idStr);
            combined.push(this.formatReport(lr, 'legacy'));
          }
        }
      } catch (err: any) {
        this.logger.warn(
          `Failed to read legacy community reports: ${err.message}`,
        );
      }
    }

    // 3. Chronological sort (oldest pending reports first)
    combined.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime() || 0;
      const timeB = new Date(b.createdAt).getTime() || 0;
      return timeA - timeB;
    });

    // 4. Deterministic pagination across both sources
    return combined.slice(skip, skip + limit);
  }

  async resolveReport(
    reportId: string,
    moderatorId: string,
    action: string,
    notes?: string,
  ): Promise<any> {
    if (!reportId || !reportId.trim()) {
      throw new BadRequestException('Report ID is required');
    }

    let report: any = null;
    let entityId = '';
    let entityType = 'post';
    let isLegacy = false;
    let transitioned = false;

    // 1. Attempt resolution in active ModerationService (atomic CAS)
    if (this.moderationService) {
      try {
        const resolution = await this.moderationService.resolveReport(
          reportId,
          moderatorId,
          action,
          notes,
        );
        if (resolution && resolution.report) {
          report = resolution.report;
          entityId = String(report.targetId || '');
          entityType = String(report.targetType || 'post').toLowerCase();
          transitioned = resolution.transitioned;
        }
      } catch (err: any) {
        this.logger.debug(
          `Active moderation resolveReport failed: ${err.message}`,
        );
      }
    }

    // 2. Fall back to legacy community_reports if not found in active collection
    if (!report && this.reportModel) {
      try {
        const legacyReport = await this.reportModel.findById(reportId);
        if (legacyReport) {
          const currentStatus = String(legacyReport.status || '').toLowerCase();
          if (
            currentStatus === 'resolved' ||
            currentStatus === 'dismissed'
          ) {
            report = legacyReport;
            entityId = String(legacyReport.entityId || '');
            entityType = String(legacyReport.entityType || 'post').toLowerCase();
            isLegacy = true;
            transitioned = false;
          } else {
            const normalizedAction = String(action || '').toLowerCase().trim();
            const newLegacyStatus =
              normalizedAction === 'dismiss' || normalizedAction === 'dismissed'
                ? 'dismissed'
                : 'resolved';

            if (typeof (this.reportModel as any).findOneAndUpdate === 'function') {
              const updatedLegacy = await (this.reportModel as any).findOneAndUpdate(
                {
                  _id: reportId,
                  status: { $in: ['pending', 'reviewed'] },
                },
                {
                  $set: {
                    status: newLegacyStatus,
                    ...(notes && notes.trim()
                      ? {
                          description: legacyReport.description
                            ? `${legacyReport.description}\n[Mod ${moderatorId}]: ${notes.trim()}`
                            : `[Mod ${moderatorId}]: ${notes.trim()}`,
                        }
                      : {}),
                  },
                },
                { returnDocument: 'after' },
              );

              if (updatedLegacy) {
                report = updatedLegacy;
                transitioned = true;
              } else {
                report = await this.reportModel.findById(reportId);
                transitioned = false;
              }
            } else {
              legacyReport.status = newLegacyStatus;
              if (notes && notes.trim()) {
                legacyReport.description = legacyReport.description
                  ? `${legacyReport.description}\n[Mod ${moderatorId}]: ${notes.trim()}`
                  : `[Mod ${moderatorId}]: ${notes.trim()}`;
              }
              await legacyReport.save();
              report = legacyReport;
              transitioned = true;
            }

            entityId = String(report.entityId || '');
            entityType = String(report.entityType || 'post').toLowerCase();
            isLegacy = true;
          }
        }
      } catch (err: any) {
        this.logger.debug(
          `Legacy community resolveReport check failed: ${err.message}`,
        );
      }
    }

    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }

    // 3. Side effects: ONLY execute if status transitioned in this atomic invocation
    if (transitioned) {
      const normalizedAction = String(action || '').toLowerCase().trim();
      if (normalizedAction === 'hide' && entityId) {
        await this.hideEntity(entityId, entityType, moderatorId, notes);
      }

      // 4. Log moderation audit record
      await this.logAction(
        moderatorId,
        action,
        entityId,
        entityType,
        `Resolved report ${reportId}${notes ? `: ${notes}` : ''}`,
      );
    }

    return this.formatReport(report, isLegacy ? 'legacy' : 'active');
  }

  async hideEntity(
    entityId: string,
    entityType: string,
    moderatorId: string,
    reason?: string,
  ): Promise<boolean> {
    if (!entityId || !entityId.trim()) return false;

    const normalizedType = String(entityType || '').toLowerCase().trim();

    // 1. If explicitly a comment
    if (normalizedType === 'comment') {
      try {
        const comment = await this.commentRepository.findById(entityId);
        if (comment) {
          const deleted = await this.commentRepository.softDelete(entityId);
          if (deleted) {
            if (comment.postId) {
              await this.postRepository.update(comment.postId, {
                $inc: { 'stats.comments': -1 },
              } as any);
            }
            if (comment.parentId) {
              await this.commentRepository.update(comment.parentId, {
                $inc: { 'stats.replies': -1 },
              } as any);
            }
            await this.logAction(
              moderatorId,
              'hide_comment',
              entityId,
              'comment',
              reason,
            );
            return true;
          }
          return false;
        }
      } catch {
        // error handling
      }
      return false;
    }

    // 2. If explicitly a post
    if (normalizedType === 'post') {
      try {
        const post = await this.postRepository.findById(entityId);
        if (post) {
          const deleted = await this.postRepository.softDelete(entityId);
          if (deleted) {
            await this.logAction(
              moderatorId,
              'hide_post',
              entityId,
              'post',
              reason,
            );
            return true;
          }
          return false;
        }
      } catch {
        // error handling
      }
      return false;
    }

    // 3. Generic community item: check Post first, then Comment
    try {
      const post = await this.postRepository.findById(entityId);
      if (post) {
        const deleted = await this.postRepository.softDelete(entityId);
        if (deleted) {
          await this.logAction(
            moderatorId,
            'hide_post',
            entityId,
            'post',
            reason,
          );
          return true;
        }
        return false;
      }
    } catch {
      // ignore
    }

    try {
      const comment = await this.commentRepository.findById(entityId);
      if (comment) {
        const deleted = await this.commentRepository.softDelete(entityId);
        if (deleted) {
          if (comment.postId) {
            await this.postRepository.update(comment.postId, {
              $inc: { 'stats.comments': -1 },
            } as any);
          }
          if (comment.parentId) {
            await this.commentRepository.update(comment.parentId, {
              $inc: { 'stats.replies': -1 },
            } as any);
          }
          await this.logAction(
            moderatorId,
            'hide_comment',
            entityId,
            'comment',
            reason,
          );
          return true;
        }
        return false;
      }
    } catch {
      // ignore
    }

    return false;
  }

  async hidePost(
    postId: string,
    moderatorId: string,
    reason?: string,
  ): Promise<void> {
    await this.hideEntity(postId, 'post', moderatorId, reason);
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
    try {
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
    } catch (err: any) {
      this.logger.warn(`Failed to write moderation log: ${err.message}`);
    }
  }
}
