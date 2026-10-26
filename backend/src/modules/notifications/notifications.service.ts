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
        metadata: dto.metadata || {},
        ...(dto.entityType ? { entityType: dto.entityType } : {}),
        ...(dto.entityId ? { entityId: dto.entityId } : {}),
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
   * Helper to safely extract newly persisted notification documents after
   * an insertMany unordered partial failure across Mongoose and MongoDB driver versions.
   */
  private extractPersistedDocsFromInsertError(
    err: any,
  ): NotificationDocument[] {
    if (!err) return [];

    const isBasicDoc = (doc: any): doc is NotificationDocument => {
      if (!doc || typeof doc !== 'object') return false;
      // Exclude Error instances (e.g. Mongoose ValidationError)
      if (doc instanceof Error) return false;
      // Exclude MongoDB driver WriteError instances (which expose code/errmsg, not recipientId)
      if (doc.errmsg !== undefined || (doc.err && doc.err.errmsg !== undefined))
        return false;
      // A persisted NotificationDocument has an _id and recipientId
      return Boolean(doc._id && doc.recipientId);
    };

    // 1. Primary Mongoose path for MongoBulkWriteError (duplicate keys, server write failures)
    // In Mongoose 9.7.3 model.js:L3202-3225, err.insertedDocs is explicitly pre-filtered to
    // include only documents that MongoDB confirmed were persisted.
    if (Array.isArray(err.insertedDocs)) {
      return err.insertedDocs.filter(isBasicDoc);
    }

    // 2. MongooseBulkWriteError path (client-side validation errors mixed with partial driver success)
    if (
      err.name === 'MongooseBulkWriteError' ||
      Array.isArray(err.validationErrors)
    ) {
      // If rawResult is explicitly null or reported 0 inserts, no documents were written to MongoDB
      if (err.rawResult === null || err.rawResult?.insertedCount === 0) {
        return [];
      }

      if (Array.isArray(err.results)) {
        // Build set of driver-confirmed inserted IDs if available from MongoDB driver rawResult
        let insertedIdSet: Set<string> | undefined;
        if (
          err.rawResult?.insertedIds &&
          typeof err.rawResult.insertedIds === 'object'
        ) {
          insertedIdSet = new Set(
            Object.values(err.rawResult.insertedIds).map((id: any) =>
              String(id),
            ),
          );
        }

        // A candidate is only accepted if there is reliable per-document evidence:
        // either confirmed by rawResult.insertedIds, or explicitly marked isNew === false by Mongoose
        const verifiedDocs = err.results.filter(
          (doc: any): doc is NotificationDocument => {
            if (!isBasicDoc(doc)) return false;

            const docIdStr = doc._id.toString();
            if (insertedIdSet && insertedIdSet.has(docIdStr)) {
              return true;
            }

            if (doc.isNew === false) {
              return true;
            }

            return false;
          },
        );

        if (verifiedDocs.length > 0) {
          return verifiedDocs;
        }

        // Aggregate insertedCount alone is not sufficient without reliable per-document proof
        if (err.rawResult?.insertedCount > 0) {
          this.logger.warn(
            'createNotificationsBatch: MongooseBulkWriteError has aggregate insertedCount > 0 but lacks reliable per-document confirmation; omitting unverified candidates',
          );
        }
      }
    }

    return [];
  }

  /**
   * Bulk insert notifications in bounded chunks, preserving schema defaults,
   * validation, timestamps, metadata, and existing notification contracts.
   * Handles duplicate-key errors (11000 / MongoBulkWriteError) and partial failures safely
   * without failing the entire batch, and emits socket events ONLY for successfully
   * inserted records using the exact existing payload contract.
   */
  async createNotificationsBatch(
    dtos: Array<{
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
      metadata?: Record<string, any>;
      entityType?: string;
      entityId?: string | Types.ObjectId;
      [key: string]: any;
    }>,
    chunkSize = 100,
  ): Promise<NotificationDocument[]> {
    if (!dtos || dtos.length === 0) return [];

    const effectiveChunkSize = Math.max(1, Math.min(chunkSize, 250));
    const allInserted: NotificationDocument[] = [];

    // Pre-validate & format docs to match schema expectations
    // Validate each recipient ID independently so malformed records do not abort valid ones
    const docsToInsert: any[] = [];
    let skippedCount = 0;

    for (const dto of dtos) {
      if (!dto || !dto.recipientId) {
        skippedCount++;
        continue;
      }

      let recipientId: Types.ObjectId;
      try {
        recipientId = this.toObjectId(dto.recipientId);
      } catch {
        skippedCount++;
        continue;
      }

      let actorId: Types.ObjectId | undefined;
      if (dto.actorId) {
        try {
          actorId = this.toObjectId(dto.actorId);
        } catch {
          this.logger.warn(
            'createNotificationsBatch: ignoring invalid actorId format',
          );
          actorId = undefined;
        }
      }

      let entityId: Types.ObjectId | undefined;
      if (dto.entityId) {
        try {
          entityId = this.toObjectId(dto.entityId);
        } catch {
          this.logger.warn(
            'createNotificationsBatch: ignoring invalid entityId format',
          );
          entityId = undefined;
        }
      }

      const priority = (dto.priority || 'NORMAL').toUpperCase();
      const targetUrl = dto.targetUrl || dto.actionUrl || '';
      const actionUrl = dto.actionUrl || dto.targetUrl || '';

      docsToInsert.push({
        recipientId,
        ...(actorId ? { actorId } : {}),
        type: dto.type,
        category: dto.category || 'general',
        priority,
        title: dto.title,
        message: dto.message,
        targetUrl,
        actionUrl,
        idempotencyKey: dto.idempotencyKey,
        isRead: false,
        metadata: dto.metadata || {},
        ...(dto.entityType ? { entityType: dto.entityType } : {}),
        ...(entityId ? { entityId } : {}),
      });
    }

    if (skippedCount > 0) {
      this.logger.warn(
        `createNotificationsBatch: skipped ${skippedCount} notification(s) with invalid recipient or ID format`,
      );
    }

    if (docsToInsert.length === 0) {
      return [];
    }

    for (let i = 0; i < docsToInsert.length; i += effectiveChunkSize) {
      const chunk = docsToInsert.slice(i, i + effectiveChunkSize);
      let insertedDocs: NotificationDocument[] = [];

      try {
        insertedDocs = (await this.notificationModel.insertMany(chunk, {
          ordered: false,
        })) as NotificationDocument[];
      } catch (err: any) {
        insertedDocs = this.extractPersistedDocsFromInsertError(err);
        if (
          err?.code !== 11000 &&
          err?.name !== 'MongoBulkWriteError' &&
          err?.name !== 'MongooseBulkWriteError'
        ) {
          this.logger.error(
            `Error during bulk notification insertion chunk: ${err?.message}`,
            err?.stack,
          );
        }
      }

      // Emit socket events ONLY for documents successfully inserted
      for (const doc of insertedDocs) {
        try {
          if (this.notificationsGateway && doc.recipientId) {
            const payload =
              typeof (doc as any).toObject === 'function'
                ? (doc as any).toObject()
                : doc;
            this.notificationsGateway.sendNotificationToUser(
              doc.recipientId.toString(),
              payload,
            );
          }
        } catch {
          // Socket emission is best-effort
        }
      }

      allInserted.push(...insertedDocs);
    }

    return allInserted;
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
        .sort({ createdAt: -1, _id: -1 })
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
   * Batch resolve user IDs who have explicitly opted out of in-app notifications.
   * Preserves default opt-in behavior for users without preference documents.
   * Splits queries into bounded chunks to protect query planning under large follower volumes.
   */
  async getInAppOptedOutUserIds(
    userIds: (string | Types.ObjectId)[],
  ): Promise<Set<string>> {
    if (!userIds || userIds.length === 0) return new Set();

    // 1. Deduplicate & validate recipient IDs before querying
    const uniqueHexMap = new Map<string, Types.ObjectId>();
    for (const id of userIds) {
      if (!id) continue;
      try {
        const objId = this.toObjectId(id);
        const hex = objId.toHexString();
        if (!uniqueHexMap.has(hex)) {
          uniqueHexMap.set(hex, objId);
        }
      } catch {
        // Invalid recipient ID format: skip safely
      }
    }

    const uniqueObjIds = Array.from(uniqueHexMap.values());
    if (uniqueObjIds.length === 0) return new Set();

    // 2. Query in bounded chunks (e.g. 1000 IDs)
    const PREF_CHUNK_SIZE = 1000;
    const optedOutSet = new Set<string>();

    for (let i = 0; i < uniqueObjIds.length; i += PREF_CHUNK_SIZE) {
      const chunk = uniqueObjIds.slice(i, i + PREF_CHUNK_SIZE);
      const optedOutDocs = await this.prefModel
        .find({
          userId: { $in: chunk },
          inAppNotifications: false,
        })
        .select('userId')
        .lean();

      for (const doc of optedOutDocs) {
        if (doc?.userId) {
          optedOutSet.add(String(doc.userId));
        }
      }
    }

    return optedOutSet;
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
      { upsert: true, returnDocument: 'after' },
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
