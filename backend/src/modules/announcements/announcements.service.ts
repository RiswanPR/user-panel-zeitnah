import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PlatformAnnouncement,
  PlatformAnnouncementDocument,
} from './platform-announcement.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectModel(PlatformAnnouncement.name)
    private announcementModel: Model<PlatformAnnouncementDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (id instanceof Types.ObjectId) return id;
    if (typeof id === 'string' && Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    throw new BadRequestException('Invalid ID format');
  }

  /**
   * Get active platform announcements for the current user
   */
  async getActivePlatformAnnouncements(userId: string, role: string) {
    const userObjId = this.toObjectId(userId);
    const now = new Date();

    // Fetch user enrolled course IDs
    const user = await this.userModel.findById(userObjId, { 'course.courseId': 1 }).lean();
    const enrolledCourseIds = (user?.course || [])
      .map((c: any) => String(c.courseId))
      .filter(Boolean);

    const query: any = {
      status: 'PUBLISHED',
      startsAt: { $lte: now },
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
      dismissedBy: { $ne: userObjId },
    };

    const announcements = await this.announcementModel.find(query).sort({ createdAt: -1 }).lean();

    // Filter by audience
    const filtered = announcements.filter((ann) => {
      if (ann.audience === 'ALL_USERS') return true;
      if (role === 'admin' || role === 'superuser') return true;

      if (ann.audience === 'STUDENTS' && (role === 'student' || role === 'user')) return true;
      if (ann.audience === 'TEACHERS' && role === 'teacher') return true;

      if (ann.audience === 'COURSE_STUDENTS') {
        const targetCourseId = ann.target?.courseId;
        if (targetCourseId && enrolledCourseIds.includes(String(targetCourseId))) {
          return true;
        }
      }

      return false;
    });

    // Priority sorting: CRITICAL > HIGH > MEDIUM > LOW
    const priorityWeight: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    filtered.sort((a, b) => {
      const wA = priorityWeight[a.priority || 'LOW'] || 1;
      const wB = priorityWeight[b.priority || 'LOW'] || 1;
      if (wA !== wB) return wB - wA;
      return new Date(b.startsAt || b.createdAt).getTime() - new Date(a.startsAt || a.createdAt).getTime();
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
  async getAnnouncementById(id: string): Promise<PlatformAnnouncementDocument> {
    const annObjId = this.toObjectId(id);
    const announcement = await this.announcementModel.findById(annObjId).lean();
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }
    return announcement as unknown as PlatformAnnouncementDocument;
  }

  /**
   * Dismiss an announcement for the user
   */
  async dismissAnnouncement(announcementId: string, userId: string) {
    const annObjId = this.toObjectId(announcementId);
    const userObjId = this.toObjectId(userId);

    const result = await this.announcementModel.updateOne(
      { _id: annObjId },
      { $addToSet: { dismissedBy: userObjId } },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException('Announcement not found');
    }

    return { success: true, message: 'Announcement dismissed' };
  }
}
