import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, PushDevice } from '../auth/schemas/user.schema';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';
import {
  NotificationPreference,
  NotificationPreferenceDocument,
} from './schemas/notification-preference.schema';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { GetNotificationsDto } from './dto/get-notifications.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-preference.dto';
import { NotificationsGateway } from './notifications.gateway';
import { resend } from '../../config/resend.config';

export type NotificationEventType =
  | 'LESSON_RELEASED'
  | 'ASSIGNMENT_DEADLINE'
  | 'QUIZ_DEADLINE'
  | 'MENTOR_REPLY'
  | 'DIRECT_MESSAGE'
  | 'SECURITY_EVENT';

export interface NotificationPayload {
  title: string;
  body: string;
  type: NotificationEventType;
  data?: Record<string, any>;
  deepLink?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(NotificationPreference.name)
    private readonly preferenceModel: Model<NotificationPreferenceDocument>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Register or replace a push notification token for an authenticated user's device
   */
  async registerPushToken(
    userId: string,
    dto: RegisterPushTokenDto,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const pushDevices: PushDevice[] = user.pushDevices || [];
    const existingIndex = pushDevices.findIndex((d) => d.deviceId === dto.deviceId);

    const updatedDevice: PushDevice = {
      deviceId: dto.deviceId,
      platform: dto.platform || 'android',
      pushToken: dto.pushToken,
      enabled: true,
      updatedAt: new Date(),
    };

    if (existingIndex > -1) {
      pushDevices[existingIndex] = updatedDevice;
    } else {
      pushDevices.push(updatedDevice);
    }

    await this.userModel.updateOne(
      { _id: userId },
      { $set: { pushDevices } },
    );

    this.logger.log(`Push token registered for user: ${userId}, device: ${dto.deviceId}`);
    return { success: true, message: 'Push token registered successfully' };
  }

  /**
   * Remove / disable push token on logout
   */
  async removePushToken(
    userId: string,
    deviceId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.userModel.updateOne(
      { _id: userId },
      { $pull: { pushDevices: { deviceId } } },
    );

    this.logger.log(`Push token removed for user: ${userId}, device: ${deviceId}`);
    return { success: true, message: 'Push token removed' };
  }

  /**
   * List active push devices for user
   */
  async getPushDevices(userId: string): Promise<PushDevice[]> {
    const user = await this.userModel.findById(userId).select('pushDevices');
    return user?.pushDevices || [];
  }

  /**
   * Create and deliver a notification across enabled channels.
   * Handles idempotency, user preferences, persistence, WebSocket & email delivery.
   */
  async createNotification(
    dto: CreateNotificationDto,
  ): Promise<NotificationDocument | null> {
    try {
      // 1. Idempotency Check (prevent duplicate processing)
      if (dto.idempotencyKey) {
        const existing = await this.notificationModel.findOne({
          idempotencyKey: dto.idempotencyKey,
        });
        if (existing) {
          this.logger.debug(
            `Duplicate notification prevented by key: ${dto.idempotencyKey}`,
          );
          return existing;
        }
      }

      // 2. Preference Check
      const preferences = await this.getUserPreferences(dto.recipientId);
      const isSecurity = dto.category === 'security';

      // Determine inApp & email permission
      const categoryPref = (preferences as any)?.[dto.category];
      const allowInApp = isSecurity || (categoryPref?.inApp !== false);
      const allowEmail = isSecurity || (categoryPref?.email === true);
      const allowPush = isSecurity || (categoryPref?.push === true);

      if (!allowInApp && !allowEmail && !allowPush) {
        this.logger.debug(
          `Notification skipped by user preferences: user=${dto.recipientId}, category=${dto.category}`,
        );
        return null;
      }

      // 3. Persist Notification Document
      const notification = new this.notificationModel({
        recipientId: new Types.ObjectId(dto.recipientId),
        actorId: dto.actorId ? new Types.ObjectId(dto.actorId) : undefined,
        type: dto.type,
        category: dto.category,
        priority: dto.priority || (isSecurity ? 'critical' : 'normal'),
        title: dto.title,
        message: dto.message,
        entityType: dto.entityType,
        entityId: dto.entityId,
        actionUrl: dto.actionUrl,
        metadata: dto.metadata || {},
        idempotencyKey: dto.idempotencyKey,
        delivery: {
          inApp: allowInApp,
          email: allowEmail,
          push: allowPush,
        },
      });

      const saved = await notification.save();

      // Populate actor details safely for real-time payload
      await saved.populate('actorId', 'name username avatar');

      // 4. Real-time In-App Delivery via WebSocket Gateway
      if (allowInApp) {
        this.notificationsGateway.sendNotificationToUser(dto.recipientId, {
          _id: saved._id,
          id: saved._id,
          recipientId: saved.recipientId,
          actor: saved.actorId,
          type: saved.type,
          category: saved.category,
          priority: saved.priority,
          title: saved.title,
          message: saved.message,
          entityType: saved.entityType,
          entityId: saved.entityId,
          actionUrl: saved.actionUrl,
          metadata: saved.metadata,
          readAt: saved.readAt,
          createdAt: saved.createdAt,
        });
      }

      // 5. Optional Email Delivery via Resend
      if (allowEmail && process.env.RESEND_API_KEY) {
        this.dispatchEmailNotification(dto.recipientId, saved).catch((err) => {
          this.logger.warn(`Failed to dispatch notification email: ${err.message}`);
        });
      }

      return saved;
    } catch (error: any) {
      // If error is duplicate key error on idempotencyKey (code 11000), gracefully fetch existing
      if (error?.code === 11000 && dto.idempotencyKey) {
        return this.notificationModel.findOne({
          idempotencyKey: dto.idempotencyKey,
        });
      }
      this.logger.error(`Error creating notification: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Dispatch email notification asynchronously
   */
  private async dispatchEmailNotification(
    recipientId: string,
    notification: NotificationDocument,
  ): Promise<void> {
    const user = await this.userModel.findById(recipientId).select('email name');
    if (!user || !user.email) return;

    const fromEmail =
      process.env.RESEND_FROM_EMAIL || 'Zeitnah Academy <onboarding@resend.dev>';

    await resend.emails.send({
      from: fromEmail,
      to: user.email,
      subject: `[Zeitnah] ${notification.title}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #0b0b0b; color: #ffffff; border-radius: 12px; border: 1px solid #222;">
          <h2 style="color: #9fd5b2; margin-bottom: 8px;">${notification.title}</h2>
          <p style="color: #cccccc; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">${notification.message}</p>
          ${
            notification.actionUrl
              ? `<a href="${process.env.FRONTEND_URL || 'https://zeitnahacademy.com'}${notification.actionUrl}" style="display: inline-block; background: #9fd5b2; color: #040607; text-decoration: none; font-weight: 600; font-size: 13px; padding: 10px 20px; border-radius: 8px;">View Details</a>`
              : ''
          }
          <hr style="border: none; border-top: 1px solid #333; margin: 24px 0 12px 0;" />
          <p style="font-size: 11px; color: #666;">This notification was sent by Zeitnah Learning Platform. You can customize your preferences in Account Settings.</p>
        </div>
      `,
    });
  }

  /**
   * Retrieves paginated notifications for the authenticated user
   */
  async getUserNotifications(
    userId: string,
    query: GetNotificationsDto,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    totalPages: number;
    hasNextPage: boolean;
    unreadCount: number;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = {
      recipientId: new Types.ObjectId(userId),
      deletedAt: { $in: [null, undefined] },
    };

    if (query.category) {
      filter.category = query.category;
    }

    if (query.unreadOnly) {
      filter.readAt = { $in: [null, undefined] };
    }

    const [items, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actorId', 'name username avatar')
        .lean()
        .exec(),
      this.notificationModel.countDocuments(filter),
      this.getUnreadCount(userId),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    const hasNextPage = page < totalPages;

    const sanitizedData = items.map((item: any) => ({
      _id: item._id,
      id: item._id,
      recipientId: item.recipientId,
      actor: item.actorId
        ? {
            id: item.actorId._id,
            name: item.actorId.name,
            username: item.actorId.username,
            avatar: item.actorId.avatar,
          }
        : null,
      type: item.type,
      category: item.category,
      priority: item.priority,
      title: item.title,
      message: item.message,
      entityType: item.entityType,
      entityId: item.entityId,
      actionUrl: item.actionUrl,
      metadata: item.metadata,
      readAt: item.readAt,
      createdAt: item.createdAt,
    }));

    return {
      data: sanitizedData,
      total,
      page,
      totalPages,
      hasNextPage,
      unreadCount,
    };
  }

  /**
   * Retrieves accurate unread count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      recipientId: new Types.ObjectId(userId),
      readAt: { $in: [null, undefined] },
      deletedAt: { $in: [null, undefined] },
    });
  }

  /**
   * Marks a single notification as read
   */
  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<{ success: boolean }> {
    const notification = await this.notificationModel.findOne({
      _id: notificationId,
      recipientId: new Types.ObjectId(userId),
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
      await notification.save();
    }

    return { success: true };
  }

  /**
   * Marks all notifications as read for user (optionally scoped to category)
   */
  async markAllAsRead(
    userId: string,
    category?: string,
  ): Promise<{ success: boolean }> {
    const filter: any = {
      recipientId: new Types.ObjectId(userId),
      readAt: { $in: [null, undefined] },
    };

    if (category) {
      filter.category = category;
    }

    await this.notificationModel.updateMany(filter, {
      $set: { readAt: new Date() },
    });

    return { success: true };
  }

  /**
   * Soft-deletes read notifications for user
   */
  async clearNotifications(userId: string): Promise<{ success: boolean }> {
    await this.notificationModel.updateMany(
      {
        recipientId: new Types.ObjectId(userId),
        readAt: { $ne: null },
      },
      {
        $set: { deletedAt: new Date() },
      },
    );

    return { success: true };
  }

  /**
   * Retrieves or initializes notification preferences for a user
   */
  async getUserPreferences(
    userId: string,
  ): Promise<NotificationPreferenceDocument> {
    let pref = await this.preferenceModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!pref) {
      pref = await new this.preferenceModel({
        userId: new Types.ObjectId(userId),
      }).save();
    }

    return pref;
  }

  /**
   * Updates notification preferences for a user
   */
  async updateUserPreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferenceDocument> {
    const pref = await this.getUserPreferences(userId);

    // Apply partial updates
    if (dto.social) Object.assign(pref.social, dto.social);
    if (dto.learning) Object.assign(pref.learning, dto.learning);
    if (dto.course) Object.assign(pref.course, dto.course);
    if (dto.achievement) Object.assign(pref.achievement, dto.achievement);
    if (dto.community) Object.assign(pref.community, dto.community);
    if (dto.organization) Object.assign(pref.organization, dto.organization);
    if (dto.opportunity) Object.assign(pref.opportunity, dto.opportunity);
    if (dto.announcement) Object.assign(pref.announcement, dto.announcement);

    // Security preferences are strictly locked to inApp=true, email=true
    if (dto.security?.push !== undefined) {
      pref.security.push = dto.security.push;
    }

    await pref.save();
    return pref;
  }

  /**
   * Backward-compatible legacy helper
   */
  async sendNotification(
    userId: string,
    notification: NotificationPayload,
  ): Promise<void> {
    this.notificationsGateway.sendNotificationToUser(userId, {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    });
  }
}
