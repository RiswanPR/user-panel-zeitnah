import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  PlatformAnnouncement,
  PlatformAnnouncementDocument,
} from './platform-announcement.schema';
import {
  Announcement,
  AnnouncementDocument,
} from './schemas/announcement.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import {
  Notification,
  NotificationDocument,
} from '../notifications/notification.schema';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @InjectModel(PlatformAnnouncement.name)
    private announcementModel: Model<PlatformAnnouncementDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @Optional()
    @InjectModel(Announcement.name)
    private masterAnnouncementModel?: Model<AnnouncementDocument>,
    @Optional()
    @InjectModel(Notification.name)
    private notificationModel?: Model<NotificationDocument>,
    @Optional()
    private readonly notificationsGateway?: NotificationsGateway,
    @Optional()
    @InjectConnection()
    private readonly connection?: Connection,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (id instanceof Types.ObjectId) return id;
    if (typeof id === 'string' && Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    throw new BadRequestException({
      statusCode: 400,
      code: 'INVALID_ANNOUNCEMENT_ID',
      message: 'Invalid announcement identifier',
    });
  }

  /**
   * Helper: Determine if user is eligible for announcement based on targeting
   */
  /**
   * Helper: Determine if user is eligible for announcement based on targeting
   */
  private checkAudienceEligibility(
    ann: any,
    userObjId: Types.ObjectId,
    userRole: string,
    enrolledCourses: string[],
    userSpaceIds: Set<string>,
  ): boolean {
    const userIdStr = userObjId.toString();
    const targetType = (ann.targetType || '').toLowerCase();
    const audience = (ann.audience || '').toUpperCase();

    // Admins / Superusers can see all announcements
    if (userRole === 'admin' || userRole === 'superuser') {
      return true;
    }

    // 1. Specific Users
    if (targetType === 'specific_users') {
      const targetIds = (ann.targetIds || []).map((id: any) => id?.toString());
      return targetIds.includes(userIdStr);
    }

    // 2. Role-specific
    if (targetType === 'role') {
      const targetRoles = (ann.targetIds || ann.targetRoles || []).map(
        (r: any) => String(r).toLowerCase(),
      );
      if (
        (userRole === 'student' || userRole === 'user') &&
        (targetRoles.includes('students') || targetRoles.includes('student'))
      ) {
        return true;
      }
      if (
        userRole === 'teacher' &&
        (targetRoles.includes('teachers') || targetRoles.includes('teacher'))
      ) {
        return true;
      }
      if (
        (userRole === 'admin' || userRole === 'superuser') &&
        targetRoles.includes('admins')
      ) {
        return true;
      }
      return false;
    }

    if (audience === 'STUDENTS') {
      return (
        userRole === 'student' ||
        userRole === 'user' ||
        userRole === 'admin' ||
        userRole === 'superuser'
      );
    }
    if (audience === 'TEACHERS') {
      return (
        userRole === 'teacher' ||
        userRole === 'admin' ||
        userRole === 'superuser'
      );
    }

    // 3. Course-specific
    if (targetType === 'course' || audience === 'COURSE_STUDENTS') {
      const targetCourseId =
        ann.courseId?.toString() || ann.target?.courseId?.toString();
      if (!targetCourseId) return false;
      return enrolledCourses.includes(targetCourseId);
    }

    // 4. Learning space-specific
    if (targetType === 'learning_space') {
      const targetSpaceId =
        ann.learningSpaceId?.toString() || ann.target?.spaceId?.toString();
      if (!targetSpaceId) return false;
      return userSpaceIds.has(targetSpaceId);
    }

    // 5. Platform-wide / All Users (when explicitly platform or default with no special target)
    if (
      targetType === 'platform' ||
      audience === 'ALL_USERS' ||
      (!targetType && !audience)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Helper: Map priority to numerical weight for sorting
   */
  private getPriorityWeight(ann: any): number {
    if (ann.isCritical === true || String(ann.isCritical) === 'true') {
      return 5;
    }
    const prio = String(ann.priority || '').toUpperCase();
    const type = String(ann.type || '').toUpperCase();

    if (prio === 'CRITICAL' || type === 'CRITICAL') return 5;
    if (prio === 'HIGH' || prio === 'IMPORTANT' || type === 'IMPORTANT')
      return 4;
    if (type === 'MAINTENANCE') return prio === 'CRITICAL' ? 5 : 4;
    if (prio === 'MEDIUM') return 3;
    if (prio === 'NORMAL' || prio === 'INFO') return 2;
    if (prio === 'LOW') return 1;
    return 2;
  }

  /**
   * Get active platform & master announcements for current user
   */
  async getActivePlatformAnnouncements(userId: string, role = 'student') {
    const userObjId = this.toObjectId(userId);
    const userIdStr = userObjId.toString();
    const userRole = (role || 'student').toLowerCase();
    const now = new Date();

    // Fetch user enrolled course IDs
    const user = await this.userModel
      .findById(userObjId, {
        role: 1,
        primaryRole: 1,
        'course.courseId': 1,
      })
      .lean();

    const enrolledCourseIds = (user?.course || [])
      .map((c: any) => String(c.courseId))
      .filter(Boolean);

    // Preload user's learning spaces
    const userSpaceIds = new Set<string>();
    if (this.connection && this.connection.db) {
      try {
        const [spaceMembers, ownedSpaces, commMemberships] = await Promise.all([
          this.connection.db
            .collection('learning_space_members')
            .find(
              { userId: userObjId, status: { $ne: 'removed' } },
              { projection: { spaceId: 1 } },
            )
            .toArray(),
          this.connection.db
            .collection('learning_spaces')
            .find(
              {
                $or: [
                  { ownerId: userObjId },
                  { teachers: userObjId },
                  { teachers: userIdStr },
                ],
                status: { $ne: 'archived' },
              },
              { projection: { _id: 1 } },
            )
            .toArray(),
          this.connection.db
            .collection('network_community_memberships')
            .find(
              { userId: userObjId, status: 'active' },
              { projection: { communityId: 1 } },
            )
            .toArray(),
        ]);

        spaceMembers.forEach(
          (m) => m.spaceId && userSpaceIds.add(m.spaceId.toString()),
        );
        ownedSpaces.forEach((s) => userSpaceIds.add(s._id.toString()));

        if (commMemberships.length > 0) {
          const commIds = commMemberships.map((c) => c.communityId);
          const commSpaces = await this.connection.db
            .collection('learning_spaces')
            .find({ communityId: { $in: commIds } }, { projection: { _id: 1 } })
            .toArray();
          commSpaces.forEach((s) => userSpaceIds.add(s._id.toString()));
        }
      } catch (dbErr) {
        this.logger.debug(`Space membership query note: ${dbErr?.message}`);
      }
    }

    const query: any = {
      $or: [
        { status: 'published', isPublished: true },
        { status: 'PUBLISHED' },
        { isPublished: true },
      ],
      $and: [
        {
          $or: [
            { startsAt: { $lte: now } },
            { publishedAt: { $lte: now } },
            { scheduledAt: { $lte: now } },
            { startsAt: null, publishedAt: null, scheduledAt: null },
          ],
        },
        {
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gt: now } },
          ],
        },
      ],
      dismissedBy: { $ne: userObjId },
    };

    const [platformAnnouncements, masterAnnouncements] = await Promise.all([
      this.announcementModel
        ? this.announcementModel.find(query).sort({ createdAt: -1 }).lean()
        : [],
      this.masterAnnouncementModel
        ? this.masterAnnouncementModel
            .find(query)
            .sort({ createdAt: -1 })
            .lean()
        : [],
    ]);

    // Deduplicate: If an announcement exists in master and platform, master takes precedence
    const seenIds = new Set<string>();
    const combined: any[] = [];

    for (const ann of masterAnnouncements) {
      const idStr = ann._id.toString();
      seenIds.add(idStr);
      if (ann.platformAnnouncementId) {
        seenIds.add(ann.platformAnnouncementId.toString());
      }
      combined.push(ann);
    }

    for (const pAnn of platformAnnouncements) {
      const idStr = pAnn._id.toString();
      if (!seenIds.has(idStr)) {
        seenIds.add(idStr);
        combined.push(pAnn);
      }
    }

    // Filter by audience eligibility
    const filtered = combined.filter((ann) => {
      const dismissedList = (ann.dismissedBy || []).map((id: any) =>
        id?.toString(),
      );
      if (dismissedList.includes(userIdStr)) {
        return false;
      }
      return this.checkAudienceEligibility(
        ann,
        userObjId,
        userRole,
        enrolledCourseIds,
        userSpaceIds,
      );
    });

    // Priority sorting: CRITICAL > HIGH > MEDIUM/IMPORTANT > NORMAL > LOW, then date
    filtered.sort((a, b) => {
      const wA = this.getPriorityWeight(a);
      const wB = this.getPriorityWeight(b);
      if (wA !== wB) return wB - wA;
      const dateA = new Date(
        a.startsAt || a.publishedAt || a.createdAt || 0,
      ).getTime();
      const dateB = new Date(
        b.startsAt || b.publishedAt || b.createdAt || 0,
      ).getTime();
      return dateB - dateA;
    });

    return filtered;
  }

  /**
   * Backward-compatible alias for getActivePlatformAnnouncements
   */
  async getActiveAnnouncements(userId: string, role = 'student') {
    return this.getActivePlatformAnnouncements(userId, role);
  }

  /**
   * Retrieves single announcement by ID
   */
  async getAnnouncementById(id: string): Promise<any> {
    if (!id || id === 'undefined' || id === 'null') {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_ANNOUNCEMENT_ID',
        message: 'Invalid announcement identifier',
      });
    }

    const isAnnObjectId = Types.ObjectId.isValid(id);
    const annObjId = isAnnObjectId ? new Types.ObjectId(id) : null;
    const query: any = annObjId
      ? { $or: [{ _id: annObjId }, { _id: id }] }
      : { _id: id };

    let announcement: any = null;

    if (this.masterAnnouncementModel) {
      try {
        announcement = await this.masterAnnouncementModel.findOne(query).lean();
      } catch (e) {
        // ignore
      }
    }
    if (!announcement && this.announcementModel) {
      try {
        announcement = await this.announcementModel.findOne(query).lean();
      } catch (e) {
        // ignore
      }
    }
    if (!announcement && this.connection && this.connection.db) {
      try {
        announcement = await this.connection.db
          .collection('platform_announcements')
          .findOne({ _id: id } as any);
        if (!announcement && annObjId) {
          announcement = await this.connection.db
            .collection('platform_announcements')
            .findOne({ _id: annObjId } as any);
        }
        if (!announcement) {
          announcement = await this.connection.db
            .collection('announcements')
            .findOne({ _id: id } as any);
        }
      } catch (e) {
        // ignore
      }
    }

    if (!announcement) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'ANNOUNCEMENT_NOT_FOUND',
        message: 'Announcement not found',
      });
    }

    return announcement;
  }

  /**
   * Dismiss an announcement for the user
   */
  async dismissAnnouncement(
    announcementId: string,
    userId: string,
    isAcknowledge = false,
  ) {
    if (
      !announcementId ||
      typeof announcementId !== 'string' ||
      !announcementId.trim() ||
      announcementId.trim() === 'undefined' ||
      announcementId.trim() === 'null'
    ) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_ANNOUNCEMENT_ID',
        message: 'Invalid announcement identifier',
      });
    }

    if (
      !userId ||
      typeof userId !== 'string' ||
      !userId.trim() ||
      userId.trim() === 'undefined' ||
      userId.trim() === 'null'
    ) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_USER_ID',
        message: 'Invalid or missing user ID',
      });
    }

    const trimmedAnnouncementId = announcementId.trim();
    const isAnnObjectId = Types.ObjectId.isValid(trimmedAnnouncementId);
    const annObjId = isAnnObjectId
      ? new Types.ObjectId(trimmedAnnouncementId)
      : null;
    const isUserObjectId = Types.ObjectId.isValid(userId.trim());
    const userObjId = isUserObjectId ? new Types.ObjectId(userId.trim()) : null;
    const userIdVal = userObjId || userId.trim();

    // Search query supporting both ObjectId and string ID
    const idQuery: any = annObjId
      ? { _id: annObjId }
      : { _id: trimmedAnnouncementId };

    // If findById/findOne is available, check allowDismiss
    let ann: any = null;
    if (this.masterAnnouncementModel) {
      try {
        if (
          annObjId &&
          typeof (this.masterAnnouncementModel as any).findById === 'function'
        ) {
          const res = (this.masterAnnouncementModel as any).findById(annObjId);
          ann = typeof res?.lean === 'function' ? await res.lean() : await res;
        } else if (
          typeof (this.masterAnnouncementModel as any).findOne === 'function'
        ) {
          const res = (this.masterAnnouncementModel as any).findOne(idQuery);
          ann = typeof res?.lean === 'function' ? await res.lean() : await res;
        }
      } catch (e) {
        // ignore
      }
    }
    if (!ann && this.announcementModel) {
      try {
        if (
          annObjId &&
          typeof (this.announcementModel as any).findById === 'function'
        ) {
          const res = (this.announcementModel as any).findById(annObjId);
          ann = typeof res?.lean === 'function' ? await res.lean() : await res;
        } else if (
          typeof (this.announcementModel as any).findOne === 'function'
        ) {
          const res = (this.announcementModel as any).findOne(idQuery);
          ann = typeof res?.lean === 'function' ? await res.lean() : await res;
        }
      } catch (e) {
        // ignore
      }
    }
    if (!ann && this.connection && this.connection.db) {
      try {
        ann = await this.connection.db
          .collection('platform_announcements')
          .findOne({ _id: announcementId } as any);
        if (!ann && annObjId) {
          ann = await this.connection.db
            .collection('platform_announcements')
            .findOne({ _id: annObjId } as any);
        }
        if (!ann) {
          ann = await this.connection.db
            .collection('announcements')
            .findOne({ _id: announcementId } as any);
        }
      } catch (e) {
        // ignore
      }
    }

    // Idempotent: If user already dismissed, return success immediately
    const alreadyDismissed = ann?.dismissedBy?.some(
      (d: any) => String(d) === String(userIdVal),
    );
    if (alreadyDismissed) {
      return {
        success: true,
        message: isAcknowledge
          ? 'Announcement already acknowledged'
          : 'Announcement already dismissed',
        alreadyDismissed: true,
      };
    }

    // Check acknowledgment requirement (Requirement #13)
    if (ann && ann.allowDismiss === false && !isAcknowledge) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'ACKNOWLEDGMENT_REQUIRED',
        message: 'This announcement requires explicit acknowledgment.',
      });
    }

    let matchedCount = 0;

    // Primary update on platform announcement model
    if (
      this.announcementModel &&
      typeof this.announcementModel.updateOne === 'function'
    ) {
      try {
        const res = await this.announcementModel.updateOne(idQuery, {
          $addToSet: { dismissedBy: userIdVal },
        });
        if (res && res.matchedCount) matchedCount += res.matchedCount;
      } catch (err) {
        if (this.connection && this.connection.db) {
          try {
            const res = await this.connection.db
              .collection('platform_announcements')
              .updateOne(
                { _id: announcementId } as any,
                { $addToSet: { dismissedBy: userIdVal } } as any,
              );
            if (res && res.matchedCount) matchedCount += res.matchedCount;
          } catch (e) {
            // ignore
          }
        }
      }
    }

    // Mirror update on master announcement model
    if (
      this.masterAnnouncementModel &&
      typeof this.masterAnnouncementModel.updateOne === 'function'
    ) {
      try {
        const res = await this.masterAnnouncementModel.updateOne(idQuery, {
          $addToSet: { dismissedBy: userIdVal, readBy: userIdVal },
        });
        if (res && res.matchedCount) matchedCount += res.matchedCount;
      } catch (err) {
        if (this.connection && this.connection.db) {
          try {
            const res = await this.connection.db
              .collection('announcements')
              .updateOne(
                { _id: announcementId } as any,
                {
                  $addToSet: { dismissedBy: userIdVal, readBy: userIdVal },
                } as any,
              );
            if (res && res.matchedCount) matchedCount += res.matchedCount;
          } catch (e) {
            // ignore
          }
        }
      }
    }

    if (
      ann?.platformAnnouncementId &&
      this.announcementModel &&
      typeof this.announcementModel.updateOne === 'function'
    ) {
      try {
        const pId = ann.platformAnnouncementId;
        const isPObjId = Types.ObjectId.isValid(pId);
        const pObjId = isPObjId ? new Types.ObjectId(pId) : null;
        const pQuery: any = pObjId
          ? { $or: [{ _id: pObjId }, { _id: pId }] }
          : { _id: pId };
        await this.announcementModel.updateOne(pQuery, {
          $addToSet: { dismissedBy: userIdVal },
        });
      } catch (e) {
        // ignore
      }
    }

    if (matchedCount === 0 && !ann) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'ANNOUNCEMENT_NOT_FOUND',
        message: 'Announcement not found',
      });
    }

    // Sync notification read state
    if (
      this.notificationModel &&
      typeof this.notificationModel.updateMany === 'function'
    ) {
      try {
        await this.notificationModel.updateMany(
          {
            recipientId: userIdVal,
            $or: [
              ...(annObjId ? [{ entityId: annObjId }] : []),
              { entityId: announcementId },
              { idempotencyKey: `announcement_${announcementId}_${userId}` },
              ...(ann?.platformAnnouncementId
                ? [{ entityId: ann.platformAnnouncementId }]
                : []),
            ],
          },
          { $set: { isRead: true, readAt: new Date() } },
        );
      } catch (notifErr) {
        this.logger.debug(
          `Could not mark notification read on dismiss: ${notifErr?.message}`,
        );
      }
    }

    return {
      success: true,
      message: isAcknowledge
        ? 'Announcement acknowledged'
        : 'Announcement dismissed',
    };
  }

  /**
   * Explicitly acknowledge an announcement
   */
  async acknowledgeAnnouncement(announcementId: string, userId: string) {
    return this.dismissAnnouncement(announcementId, userId, true);
  }

  /**
   * Scheduled announcements worker - activates scheduled announcements when scheduledAt <= now
   * Uses atomic findOneAndUpdate to guarantee single-execution safety across multi-instance PM2 clusters.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledAnnouncements() {
    if (!this.masterAnnouncementModel) return;

    try {
      const now = new Date();
      const scheduledList = await this.masterAnnouncementModel
        .find({
          status: 'scheduled',
          scheduledAt: { $lte: now },
        })
        .select('_id')
        .lean();

      if (!scheduledList || scheduledList.length === 0) return;

      let activatedCount = 0;

      for (const item of scheduledList) {
        // Atomic lock transition: Only ONE PM2 process can change status from 'scheduled' to 'published'
        const ann = await this.masterAnnouncementModel.findOneAndUpdate(
          {
            _id: item._id,
            status: 'scheduled',
          },
          {
            $set: {
              status: 'published',
              isPublished: true,
              publishedAt: now,
              updatedAt: now,
            },
          },
          { returnDocument: 'after' },
        );

        if (!ann) {
          // Another PM2 process claimed and transitioned this scheduled announcement!
          continue;
        }

        activatedCount++;

        if (ann.platformAnnouncementId && this.announcementModel) {
          await this.announcementModel.updateOne(
            { _id: ann.platformAnnouncementId },
            { $set: { status: 'PUBLISHED', startsAt: now } },
          );
        }

        // Realtime announcement broadcast via socket gateway
        if (this.notificationsGateway) {
          this.notificationsGateway.broadcastAnnouncement({
            _id: ann._id,
            title: ann.title,
            message: ann.message,
            priority: ann.priority,
            isCritical: ann.isCritical,
            cta: ann.cta,
            startsAt: now,
          });
        }
      }

      if (activatedCount > 0) {
        this.logger.log(
          `Processed and activated ${activatedCount} scheduled announcements`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Error processing scheduled announcements: ${err.message}`,
        err.stack,
      );
    }
  }
}
