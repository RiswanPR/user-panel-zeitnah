import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { Notification, NotificationDocument } from './notification.schema';
import {
  NotificationPreference,
  NotificationPreferenceDocument,
} from './notification-preference.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import {
  Announcement,
  AnnouncementDocument,
} from '../announcements/schemas/announcement.schema';
import {
  PlatformAnnouncement,
  PlatformAnnouncementDocument,
} from '../announcements/platform-announcement.schema';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(NotificationPreference.name)
    private prefModel: Model<NotificationPreferenceDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly notificationsGateway: NotificationsGateway,
    @Optional()
    @InjectModel(Announcement.name)
    private announcementModel?: Model<AnnouncementDocument>,
    @Optional()
    @InjectModel(PlatformAnnouncement.name)
    private platformAnnouncementModel?: Model<PlatformAnnouncementDocument>,
    @Optional()
    @InjectConnection()
    private connection?: Connection,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (id instanceof Types.ObjectId) return id;
    if (typeof id === 'string' && Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    throw new BadRequestException('Invalid ID format');
  }

  /**
   * Helper: Map announcement priority into standard notification severity
   */
  mapAnnouncementPriority(ann: any): string {
    if (ann.isCritical === true || String(ann.isCritical) === 'true') {
      return 'CRITICAL';
    }
    const prio = String(ann.priority || '').toUpperCase();
    const type = String(ann.type || '').toUpperCase();

    if (prio === 'CRITICAL' || type === 'CRITICAL') {
      return 'CRITICAL';
    }
    if (prio === 'HIGH' || prio === 'IMPORTANT' || type === 'IMPORTANT') {
      return 'HIGH';
    }
    if (type === 'MAINTENANCE') {
      return prio === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
    }
    if (prio === 'LOW') {
      return 'LOW';
    }
    return 'NORMAL';
  }

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
      if (userRole === 'admin' || userRole === 'superuser') return true;
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
   * Synchronize published announcements into the user notification collection lazily & idempotently
   */
  async syncUserAnnouncementNotifications(
    userId: string | Types.ObjectId,
  ): Promise<number> {
    try {
      const userObjId = this.toObjectId(userId);
      const userIdStr = userObjId.toString();
      const now = new Date();

      if (!this.announcementModel && !this.platformAnnouncementModel) {
        return 0;
      }

      // Fetch user data for role & course targeting
      const user = await this.userModel
        .findById(userObjId, {
          role: 1,
          primaryRole: 1,
          course: 1,
        })
        .lean();

      if (!user) return 0;

      const userRole = (
        user.role ||
        (user as any).primaryRole ||
        'student'
      ).toLowerCase();
      const userEnrolledCourses = ((user as any).course || [])
        .map((c: any) => String(c.courseId))
        .filter(Boolean);

      // Preload user's learning spaces for space targeting (indexed queries)
      const userSpaceIds = new Set<string>();
      if (this.connection && this.connection.db) {
        try {
          const [spaceMembers, ownedSpaces, commMemberships] =
            await Promise.all([
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
              .find(
                { communityId: { $in: commIds } },
                { projection: { _id: 1 } },
              )
              .toArray();
            commSpaces.forEach((s) => userSpaceIds.add(s._id.toString()));
          }
        } catch (dbErr) {
          this.logger.debug(`Space membership query note: ${dbErr?.message}`);
        }
      }

      // Fetch user preferences
      const userPrefs = await this.prefModel
        .findOne({ userId: userObjId })
        .lean();
      const allowNonCriticalAnnouncements =
        userPrefs?.categories?.announcements !== false;

      // Query active announcements from canonical `announcements` and `platform_announcements`
      const activeFilter: any = {
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

      const [masterAnnouncements, platformAnnouncements] = await Promise.all([
        this.announcementModel
          ? this.announcementModel.find(activeFilter).lean()
          : [],
        this.platformAnnouncementModel
          ? this.platformAnnouncementModel.find(activeFilter).lean()
          : [],
      ]);

      // Deduplicate: If an announcement exists in master and platform, master takes precedence
      const seenIds = new Set<string>();
      const combinedAnnouncements: any[] = [];

      for (const ann of masterAnnouncements) {
        const idStr = ann._id.toString();
        seenIds.add(idStr);
        if (ann.platformAnnouncementId) {
          seenIds.add(ann.platformAnnouncementId.toString());
        }
        combinedAnnouncements.push(ann);
      }

      for (const pAnn of platformAnnouncements) {
        const idStr = pAnn._id.toString();
        if (!seenIds.has(idStr)) {
          seenIds.add(idStr);
          combinedAnnouncements.push(pAnn);
        }
      }

      let createdCount = 0;

      for (const ann of combinedAnnouncements) {
        const annIdStr = ann._id.toString();

        // 1. Check Dismissal
        const dismissedList = (ann.dismissedBy || []).map((id: any) =>
          id?.toString(),
        );
        if (dismissedList.includes(userIdStr)) {
          continue;
        }

        // 2. Audience Eligibility Check
        const isEligible = this.checkAudienceEligibility(
          ann,
          userObjId,
          userRole,
          userEnrolledCourses,
          userSpaceIds,
        );

        if (!isEligible) {
          continue;
        }

        // 3. Priority Mapping
        const priority = this.mapAnnouncementPriority(ann);
        const isCritical = priority === 'CRITICAL' || ann.isCritical === true;

        // 4. Preference Check (Critical announcements bypass suppression)
        if (!isCritical && !allowNonCriticalAnnouncements) {
          continue;
        }

        // 5. Idempotent notification check
        const idempotencyKey = `announcement_${annIdStr}_${userIdStr}`;
        const existing = await this.notificationModel.findOne({
          $or: [
            { idempotencyKey },
            {
              recipientId: userObjId,
              entityType: 'announcement',
              entityId: ann._id,
            },
          ],
        });

        const isReadBy = (ann.readBy || []).some(
          (id: any) => id?.toString() === userIdStr,
        );

        if (existing) {
          // If read in announcement but unread in notification, reconcile
          if (isReadBy && !existing.isRead) {
            existing.isRead = true;
            (existing as any).readAt = new Date();
            await existing.save();
          }
          continue;
        }

        // 6. Strip HTML tags from message snippet for clean notification
        const plainMessage = String(ann.message || '')
          .replace(/<[^>]*>?/gm, '')
          .trim();

        const actionUrl =
          ann.cta?.url ||
          ann.actionUrl ||
          (ann.targetType === 'course' && ann.courseId
            ? `/courses/${ann.courseId}`
            : '');

        let newNotification: any = null;
        try {
          newNotification = await this.notificationModel.create({
            recipientId: userObjId,
            actorId: ann.createdBy ? this.toObjectId(ann.createdBy) : undefined,
            type: 'ANNOUNCEMENT',
            category:
              ann.targetType === 'learning_space' ? 'community' : 'system',
            priority,
            title: ann.title,
            message: plainMessage,
            isRead: isReadBy,
            readAt: isReadBy ? new Date() : null,
            entityType: 'announcement',
            entityId: ann._id,
            allowDismiss: ann.allowDismiss !== false,
            targetUrl: actionUrl,
            actionUrl: actionUrl,
            idempotencyKey,
            metadata: {
              announcementId: annIdStr,
              targetType: ann.targetType || 'platform',
              priority,
              isCritical,
              cta: ann.cta || null,
            },
          });
          createdCount++;
        } catch (createErr: any) {
          if (createErr?.code === 11000) {
            // Concurrent request inserted the same notification at the exact same millisecond
            this.logger.debug(
              `Idempotent notification collision handled: ${idempotencyKey}`,
            );
            continue;
          }
          throw createErr;
        }

        // Realtime dispatch if user is online
        try {
          if (newNotification && !isReadBy && this.notificationsGateway) {
            this.notificationsGateway.sendNotificationToUser(
              userIdStr,
              newNotification.toObject
                ? newNotification.toObject()
                : newNotification,
            );
          }
        } catch (emitErr) {
          // Best effort
        }
      }

      return createdCount;
    } catch (err) {
      this.logger.error(
        `Error syncing announcement notifications for ${userId}: ${err.message}`,
        err.stack,
      );
      return 0;
    }
  }

  /**
   * Create a notification and dispatch real-time socket event
   */
  async createNotification(dto: {
    recipientId: string | Types.ObjectId;
    actorId?: string | Types.ObjectId;
    type: string;
    category?: string;
    priority?: string;
    title: string;
    message: string;
    actionUrl?: string;
    targetUrl?: string;
    idempotencyKey?: string;
    [key: string]: any;
  }) {
    if (dto.idempotencyKey) {
      const existing = await this.notificationModel.findOne({
        idempotencyKey: dto.idempotencyKey,
      });
      if (existing) return existing;
    }

    const recipientId = this.toObjectId(dto.recipientId);
    const actorId = dto.actorId ? this.toObjectId(dto.actorId) : undefined;
    const priority = (dto.priority || 'NORMAL').toUpperCase();

    try {
      const notification = await this.notificationModel.create({
        recipientId,
        actorId,
        type: dto.type,
        category: dto.category || 'general',
        priority,
        title: dto.title,
        message: dto.message,
        targetUrl: dto.targetUrl || dto.actionUrl || '',
        actionUrl: dto.actionUrl || dto.targetUrl || '',
        idempotencyKey: dto.idempotencyKey,
        isRead: false,
      });

      try {
        this.notificationsGateway.sendNotificationToUser(
          recipientId.toString(),
          notification.toObject ? notification.toObject() : notification,
        );
      } catch (e) {
        // Gateway emission is best-effort
      }

      return notification;
    } catch (createErr: any) {
      if (createErr?.code === 11000 && dto.idempotencyKey) {
        return await this.notificationModel.findOne({
          idempotencyKey: dto.idempotencyKey,
        });
      }
      throw createErr;
    }
  }

  /**
   * Get paginated notifications and unread count
   */
  async getUserNotifications(userId: string, query: any = {}) {
    const userObjId = this.toObjectId(userId);

    // Lazily synchronize any eligible published announcements
    await this.syncUserAnnouncementNotifications(userObjId);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    const filter: any = { recipientId: userObjId };
    if (query.unreadOnly === 'true' || query.unreadOnly === true) {
      filter.isRead = false;
    }
    if (query.category && query.category !== 'all') {
      filter.category = query.category;
    }
    if (query.since) {
      const sinceDate = new Date(query.since);
      if (!isNaN(sinceDate.getTime())) {
        filter.createdAt = { $gt: sinceDate };
      }
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .populate('actorId', 'name email avatar profileImage role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.notificationModel.countDocuments(filter),
      this.notificationModel.countDocuments({
        recipientId: userObjId,
        isRead: false,
      }),
    ]);

    return {
      notifications,
      unreadCount,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Accurate unread count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const userObjId = this.toObjectId(userId);
    await this.syncUserAnnouncementNotifications(userObjId);
    return this.notificationModel.countDocuments({
      recipientId: userObjId,
      isRead: false,
    });
  }

  /**
   * Mark single notification as read (supports both (id, userId) and (userId, id))
   */
  async markAsRead(param1: string, param2: string) {
    const p1 = this.toObjectId(param1);
    const p2 = this.toObjectId(param2);

    const notification = await this.notificationModel.findOne({
      $or: [
        { _id: p1, recipientId: p2 },
        { _id: p2, recipientId: p1 },
      ],
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;
    (notification as any).readAt = new Date();
    await notification.save();

    // Reconcile announcement readBy (Requirement #12)
    if (notification.entityType === 'announcement' && notification.entityId) {
      try {
        if (this.announcementModel) {
          await this.announcementModel.updateOne(
            { _id: notification.entityId },
            { $addToSet: { readBy: notification.recipientId } },
          );
        }
        if (this.platformAnnouncementModel) {
          await this.platformAnnouncementModel.updateOne(
            { _id: notification.entityId },
            { $addToSet: { readBy: notification.recipientId } },
          );
        }
      } catch (err) {
        this.logger.debug(
          `Could not update announcement readBy: ${err.message}`,
        );
      }
    }

    const unreadCount = await this.notificationModel.countDocuments({
      recipientId: notification.recipientId,
      isRead: false,
    });

    return { success: true, unreadCount };
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string, category?: string) {
    const userObjId = this.toObjectId(userId);
    const filter: any = { recipientId: userObjId, isRead: false };
    if (category && category !== 'all') filter.category = category;

    // Collect any unread announcement notifications before marking read
    let unreadAnnouncements: any[] = [];
    try {
      unreadAnnouncements = await this.notificationModel
        .find({
          ...filter,
          entityType: 'announcement',
          entityId: { $ne: null },
        })
        .select('entityId')
        .lean();
    } catch (findErr) {
      this.logger.debug(
        `Could not find unread announcements: ${findErr?.message}`,
      );
    }

    await this.notificationModel.updateMany(filter, {
      $set: { isRead: true, readAt: new Date() },
    });

    if (unreadAnnouncements.length > 0) {
      const annIds = unreadAnnouncements.map((n) => n.entityId).filter(Boolean);
      try {
        if (this.announcementModel) {
          await this.announcementModel.updateMany(
            { _id: { $in: annIds } },
            { $addToSet: { readBy: userObjId } },
          );
        }
        if (this.platformAnnouncementModel) {
          await this.platformAnnouncementModel.updateMany(
            { _id: { $in: annIds } },
            { $addToSet: { readBy: userObjId } },
          );
        }
      } catch (err) {
        this.logger.debug(
          `Could not update readBy in markAllAsRead: ${err.message}`,
        );
      }
    }

    return { success: true, unreadCount: 0 };
  }

  /**
   * Clear read notifications
   */
  async clearNotifications(userId: string) {
    const userObjId = this.toObjectId(userId);
    await this.notificationModel.deleteMany({
      recipientId: userObjId,
      isRead: true,
    });
    return { success: true };
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(userId: string) {
    const userObjId = this.toObjectId(userId);
    let prefs = await this.prefModel.findOne({ userId: userObjId }).lean();

    if (!prefs) {
      prefs = await this.prefModel.create({
        userId: userObjId,
        emailNotifications: true,
        inAppNotifications: true,
        categories: {
          announcements: true,
          spaces: true,
          discussions: true,
          connections: true,
          opportunities: true,
        },
      });
    }

    return prefs;
  }

  async getUserPreferences(userId: string) {
    return this.getPreferences(userId);
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(userId: string, updateData: any) {
    const userObjId = this.toObjectId(userId);

    const prefs = await this.prefModel.findOneAndUpdate(
      { userId: userObjId },
      {
        $set: {
          emailNotifications: updateData.emailNotifications,
          inAppNotifications: updateData.inAppNotifications,
          ...(updateData.categories
            ? { categories: updateData.categories }
            : {}),
        },
      },
      { upsert: true, new: true },
    );

    return prefs;
  }

  async updateUserPreferences(userId: string, dto: any) {
    return this.updatePreferences(userId, dto);
  }

  /**
   * Push Token Registration
   */
  async registerPushToken(userId: string, dto: any) {
    const userObjId = this.toObjectId(userId);
    await this.userModel.updateOne(
      { _id: userObjId },
      { $addToSet: { pushTokens: dto.token || dto } },
    );
    return { success: true, message: 'Push token registered' };
  }

  async removePushToken(userId: string, deviceId: string) {
    const userObjId = this.toObjectId(userId);
    await this.userModel.updateOne(
      { _id: userObjId },
      { $pull: { pushTokens: { deviceId } } },
    );
    return { success: true, message: 'Push token removed' };
  }

  async getPushDevices(userId: string) {
    const userObjId = this.toObjectId(userId);
    const user = await this.userModel
      .findById(userObjId, { pushTokens: 1 })
      .lean();
    return (user as any)?.pushTokens || [];
  }
}
