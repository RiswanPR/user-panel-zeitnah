import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './notification.schema';
import {
  NotificationPreference,
  NotificationPreferenceDocument,
} from './notification-preference.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
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
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (id instanceof Types.ObjectId) return id;
    if (typeof id === 'string' && Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    throw new BadRequestException('Invalid ID format');
  }

  /**
   * Get paginated notifications and unread count
   */
  async getUserNotifications(userId: string, query: any = {}) {
    const userObjId = this.toObjectId(userId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    const filter: any = { recipientId: userObjId };
    if (query.unreadOnly === 'true' || query.unreadOnly === true) {
      filter.isRead = false;
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
      this.notificationModel.countDocuments({ recipientId: userObjId, isRead: false }),
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
    if (category) filter.category = category;

    await this.notificationModel.updateMany(filter, {
      $set: { isRead: true, readAt: new Date() },
    });

    return { success: true, unreadCount: 0 };
  }

  /**
   * Clear read notifications
   */
  async clearNotifications(userId: string) {
    const userObjId = this.toObjectId(userId);
    await this.notificationModel.deleteMany({ recipientId: userObjId, isRead: true });
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
          ...(updateData.categories ? { categories: updateData.categories } : {}),
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
    const user = await this.userModel.findById(userObjId, { pushTokens: 1 }).lean();
    return (user as any)?.pushTokens || [];
  }
}
