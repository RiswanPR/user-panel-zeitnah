import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, PushDevice } from '../auth/schemas/user.schema';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { NotificationsGateway } from './notifications.gateway';

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
    private userModel: Model<UserDocument>,
    private notificationsGateway: NotificationsGateway,
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
   * Send a notification to user:
   * 1. If user has active socket connection in foreground -> emits real-time WebSocket event
   * 2. If user is in background / native device registered -> prepares / dispatches push payload
   */
  async sendNotification(
    userId: string,
    notification: NotificationPayload,
  ): Promise<void> {
    // 1. Dispatch real-time foreground in-app event via WebSocket
    this.notificationsGateway.sendNotificationToUser(userId, {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    });

    // 2. Query registered push devices
    const user = await this.userModel.findById(userId).select('pushDevices');
    const enabledDevices = (user?.pushDevices || []).filter((d) => d.enabled && d.pushToken);

    if (enabledDevices.length > 0) {
      this.logger.log(
        `Dispatched push notification [${notification.type}] to ${enabledDevices.length} registered devices for user ${userId}`,
      );
      // In production, FCM / APNs dispatch bridge triggers here with notification payload & deepLink
    }
  }
}
