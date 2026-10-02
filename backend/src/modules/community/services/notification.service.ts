import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationDocument } from '../schemas/notification.schema';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async createNotification(
    userId: string,
    actorId: string,
    type: string,
    entityId?: string,
    entityType?: string,
    message?: string,
  ): Promise<NotificationDocument | null> {
    if (userId === actorId) return null; // Don't notify self

    return this.notificationRepository.create({
      userId,
      actorId,
      type,
      entityId,
      entityType,
      message,
    });
  }

  async getUserNotifications(
    userId: string,
    limit: number = 20,
  ): Promise<NotificationDocument[]> {
    return this.notificationRepository.find({ userId });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.getUnreadCount(userId);
  }

  async markAsRead(id: string): Promise<void> {
    await this.notificationRepository.update(id, {
      $set: { isRead: true },
    } as any);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.markAllAsRead(userId);
  }

  async deleteNotification(id: string): Promise<void> {
    await this.notificationRepository.softDelete(id);
  }
}
