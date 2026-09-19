import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Announcement,
  AnnouncementDocument,
  AnnouncementPriority,
  AnnouncementType,
} from './schemas/announcement.schema';
import { NotificationsGateway } from '../notifications/notifications.gateway';

export interface FormattedAnnouncement {
  id: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  eyebrow?: string;
  title: string;
  message: string;
  cta?: {
    label: string;
    url: string;
  };
  allowDismiss: boolean;
  startsAt: string;
  expiresAt?: string | null;
  isPublished: boolean;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
}

const PRIORITY_WEIGHTS: Record<AnnouncementPriority, number> = {
  critical: 60,
  maintenance: 50,
  important: 40,
  high: 30,
  normal: 20,
  low: 10,
};

@Injectable()
export class AnnouncementsService implements OnModuleInit {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @InjectModel(Announcement.name)
    private readonly announcementModel: Model<AnnouncementDocument>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async onModuleInit() {
    await this.seedInitialAnnouncementsIfEmpty();
  }

  /**
   * Sort announcements deterministically according to Zeitnah priority specification:
   * 1. Priority rank (critical > maintenance > important > high > normal > low)
   * 2. Newest startsAt first
   * 3. Newest createdAt first
   * 4. Stable ID tie-breaker
   */
  public sortAnnouncements(items: AnnouncementDocument[]): AnnouncementDocument[] {
    return [...items].sort((a, b) => {
      const weightA = PRIORITY_WEIGHTS[a.priority] ?? 0;
      const weightB = PRIORITY_WEIGHTS[b.priority] ?? 0;

      if (weightA !== weightB) {
        return weightB - weightA;
      }

      const startsAtA = new Date(a.startsAt).getTime();
      const startsAtB = new Date(b.startsAt).getTime();
      if (startsAtA !== startsAtB) {
        return startsAtB - startsAtA;
      }

      const createdAtA = new Date((a as any).createdAt || 0).getTime();
      const createdAtB = new Date((b as any).createdAt || 0).getTime();
      if (createdAtA !== createdAtB) {
        return createdAtB - createdAtA;
      }

      return String(a._id).localeCompare(String(b._id));
    });
  }

  /**
   * Get active, un-dismissed announcements for authenticated student (for primary /courses banner)
   */
  async getActiveAnnouncements(userId?: string): Promise<FormattedAnnouncement[]> {
    const now = new Date();

    const query: any = {
      isPublished: true,
      startsAt: { $lte: now },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    };

    if (userId) {
      query.dismissedBy = { $ne: userId };
    }

    const docs = await this.announcementModel.find(query).lean().exec();
    const sorted = this.sortAnnouncements(docs as any);

    return sorted.map((doc) => this.formatAnnouncement(doc, userId));
  }

  /**
   * Get all active announcements (including dismissed ones) for Notification Center history
   */
  async getAllAnnouncements(userId?: string): Promise<FormattedAnnouncement[]> {
    const now = new Date();

    const query = {
      isPublished: true,
      startsAt: { $lte: now },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    };

    const docs = await this.announcementModel.find(query).lean().exec();
    const sorted = this.sortAnnouncements(docs as any);

    return sorted.map((doc) => this.formatAnnouncement(doc, userId));
  }

  /**
   * Mark an announcement as read by a student
   */
  async markAsRead(
    announcementId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.announcementModel.updateOne(
      { _id: announcementId } as any,
      { $addToSet: { readBy: userId } } as any,
    );
    return { success: true, message: 'Announcement marked as read' };
  }

  /**
   * Dismiss an announcement for a student (also marks it as read)
   */
  async markAsDismissed(
    announcementId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const announcement = await this.announcementModel.findById(announcementId);
    if (announcement && !announcement.allowDismiss) {
      return { success: false, message: 'This critical announcement cannot be dismissed' };
    }

    await this.announcementModel.updateOne(
      { _id: announcementId } as any,
      {
        $addToSet: {
          dismissedBy: userId,
          readBy: userId,
        },
      } as any,
    );
    return { success: true, message: 'Announcement dismissed' };
  }

  /**
   * Mark all active announcements as read by a student
   */
  async markAllAsRead(userId: string): Promise<{ success: boolean; count: number }> {
    const now = new Date();
    const result = await this.announcementModel.updateMany(
      {
        isPublished: true,
        startsAt: { $lte: now },
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
      },
      { $addToSet: { readBy: userId } },
    );

    return { success: true, count: result.modifiedCount };
  }

  /**
   * Helper to format Mongoose document into student-facing DTO
   */
  private formatAnnouncement(
    doc: any,
    userId?: string,
  ): FormattedAnnouncement {
    const isRead = userId ? Array.isArray(doc.readBy) && doc.readBy.includes(userId) : false;
    const isDismissed = userId
      ? Array.isArray(doc.dismissedBy) && doc.dismissedBy.includes(userId)
      : false;

    return {
      id: String(doc._id),
      type: doc.type,
      priority: doc.priority,
      eyebrow: doc.eyebrow,
      title: doc.title,
      message: doc.message,
      cta: doc.cta,
      allowDismiss: doc.allowDismiss ?? true,
      startsAt: doc.startsAt instanceof Date ? doc.startsAt.toISOString() : doc.startsAt,
      expiresAt: doc.expiresAt instanceof Date ? doc.expiresAt.toISOString() : doc.expiresAt,
      isPublished: doc.isPublished,
      isRead,
      isDismissed,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    };
  }

  /**
   * Seed realistic initial announcements if collection is empty
   */
  private async seedInitialAnnouncementsIfEmpty() {
    try {
      const count = await this.announcementModel.countDocuments();
      if (count > 0) return;

      const now = new Date();
      const inOneHour = new Date(now.getTime() + 1000 * 60 * 60 * 2);
      const inTwoDays = new Date(now.getTime() + 1000 * 60 * 60 * 48);
      const inThirtyDays = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

      const samples: Partial<Announcement>[] = [
        {
          type: 'platform',
          priority: 'high',
          eyebrow: 'PLATFORM UPDATE',
          title: 'Faster & Cleaner Learning Experience',
          message:
            'We have upgraded the course player and syllabus navigation with improved streaming performance, zero layout shift, and instant lesson switching.',
          cta: {
            label: "Explore What's New",
            url: '/updates',
          },
          allowDismiss: true,
          startsAt: now,
          expiresAt: inThirtyDays,
          isPublished: true,
          readBy: [],
          dismissedBy: [],
        },
        {
          type: 'maintenance',
          priority: 'maintenance',
          eyebrow: 'SCHEDULED MAINTENANCE',
          title: 'Upcoming Infrastructure Optimization',
          message:
            'Planned maintenance is scheduled for Sunday from 02:00 AM to 04:00 AM UTC. Video streaming and learning progress synchronization may experience brief interruptions.',
          cta: {
            label: 'View Maintenance Schedule',
            url: '/updates',
          },
          allowDismiss: true,
          startsAt: inOneHour,
          expiresAt: inTwoDays,
          isPublished: true,
          readBy: [],
          dismissedBy: [],
        },
        {
          type: 'course',
          priority: 'normal',
          eyebrow: 'NEW COURSE RELEASE',
          title: 'Comprehensive German B2 Mastery Now Available',
          message:
            'Explore 12 new modular chapters, 48 cinematic lessons, and downloadable exercises curated by Zeitnah faculty.',
          cta: {
            label: 'Browse Course Syllabus',
            url: '/courses',
          },
          allowDismiss: true,
          startsAt: now,
          expiresAt: inThirtyDays,
          isPublished: true,
          readBy: [],
          dismissedBy: [],
        },
      ];

      await this.announcementModel.insertMany(samples);
      this.logger.log('Seeded initial student announcements successfully.');
    } catch (err) {
      this.logger.warn('Failed to seed initial announcements:', err);
    }
  }
}
