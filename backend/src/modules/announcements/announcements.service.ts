import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PlatformAnnouncement,
  PlatformAnnouncementDocument,
} from './schemas/announcement.schema';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @InjectModel(PlatformAnnouncement.name)
    private readonly announcementModel: Model<PlatformAnnouncementDocument>,
  ) {}

  /**
   * Retrieves active platform announcements targeted to the user
   */
  async getActiveAnnouncements(
    userId: string,
  ): Promise<PlatformAnnouncementDocument[]> {
    const now = new Date();

    return this.announcementModel
      .find({
        status: 'PUBLISHED',
        startsAt: { $lte: now },
        $and: [
          {
            $or: [
              { expiresAt: null },
              { expiresAt: { $exists: false } },
              { expiresAt: { $gt: now } },
            ],
          },
          {
            dismissedBy: { $ne: userId },
          },
        ],
      })
      .sort({ startsAt: -1, createdAt: -1 })
      .lean()
      .exec() as unknown as Promise<PlatformAnnouncementDocument[]>;
  }

  /**
   * Retrieves single announcement by ID
   */
  async getAnnouncementById(
    id: string,
  ): Promise<PlatformAnnouncementDocument> {
    const announcement = await this.announcementModel.findById(id).lean().exec();
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }
    return announcement as unknown as PlatformAnnouncementDocument;
  }

  /**
   * Dismisses an announcement for a user
   */
  async dismissAnnouncement(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.announcementModel.updateOne(
      { _id: id },
      { $addToSet: { dismissedBy: userId } },
    );

    return { success: true, message: 'Announcement dismissed' };
  }
}
