/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { NotificationsService } from '../notifications/notifications.service';
import { AnnouncementsService } from './announcements.service';
import { Notification } from '../notifications/notification.schema';
import { NotificationPreference } from '../notifications/notification-preference.schema';
import { User } from '../auth/schemas/user.schema';
import { Announcement } from './schemas/announcement.schema';
import { PlatformAnnouncement } from './platform-announcement.schema';
import { NotificationsGateway } from '../notifications/notifications.gateway';

describe('Announcement -> Notification Integration & Targeting', () => {
  let notifService: NotificationsService;
  let annService: AnnouncementsService;

  const studentId = new Types.ObjectId();
  const enrolledCourseId = new Types.ObjectId();
  const notEnrolledCourseId = new Types.ObjectId();
  const memberSpaceId = new Types.ObjectId();
  const notMemberSpaceId = new Types.ObjectId();

  let storedNotifications: any[] = [];
  let storedAnnouncements: any[] = [];
  let userPrefs: any = null;

  const mockNotificationModel: any = {
    create: jest.fn().mockImplementation((dto) => {
      const doc = {
        _id: new Types.ObjectId(),
        ...dto,
        save: jest.fn().mockResolvedValue(true),
      };
      storedNotifications.push(doc);
      return doc;
    }),
    find: jest.fn().mockImplementation((filter: any) => {
      let results = [...storedNotifications];
      if (filter?.recipientId) {
        results = results.filter(
          (n) => n.recipientId.toString() === filter.recipientId.toString(),
        );
      }
      if (filter?.isRead === false) {
        results = results.filter((n) => !n.isRead);
      }
      return {
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(results),
              }),
            }),
          }),
        }),
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(results),
        }),
      };
    }),
    findOne: jest.fn().mockImplementation((filter: any) => {
      if (filter?.idempotencyKey) {
        return (
          storedNotifications.find(
            (n) => n.idempotencyKey === filter.idempotencyKey,
          ) || null
        );
      }
      if (filter?.$or) {
        for (const cond of filter.$or) {
          if (cond.idempotencyKey) {
            const found = storedNotifications.find(
              (n) => n.idempotencyKey === cond.idempotencyKey,
            );
            if (found) return found;
          }
          if (cond._id && cond.recipientId) {
            const found = storedNotifications.find(
              (n) =>
                n._id.toString() === cond._id.toString() &&
                n.recipientId.toString() === cond.recipientId.toString(),
            );
            if (found) return found;
          }
        }
      }
      return null;
    }),
    countDocuments: jest.fn().mockImplementation((filter: any) => {
      let count = storedNotifications.length;
      if (filter?.recipientId) {
        count = storedNotifications.filter(
          (n) => n.recipientId.toString() === filter.recipientId.toString(),
        ).length;
      }
      if (filter?.isRead === false) {
        count = storedNotifications.filter((n) => !n.isRead).length;
      }
      return Promise.resolve(count);
    }),
    updateMany: jest.fn().mockImplementation((filter: any, update: any) => {
      let modified = 0;
      for (const n of storedNotifications) {
        if (
          filter.recipientId &&
          n.recipientId.toString() !== filter.recipientId.toString()
        )
          continue;
        if (filter.isRead === false && n.isRead) continue;
        if (update?.$set?.isRead !== undefined) n.isRead = update.$set.isRead;
        modified++;
      }
      return Promise.resolve({
        matchedCount: modified,
        modifiedCount: modified,
      });
    }),
    updateOne: jest.fn(),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  };

  const mockPrefModel = {
    findOne: jest.fn().mockImplementation(() => ({
      lean: jest.fn().mockResolvedValue(userPrefs),
    })),
    create: jest.fn().mockImplementation((dto) => dto),
    findOneAndUpdate: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: studentId,
        role: 'student',
        primaryRole: 'student',
        course: [
          { courseId: enrolledCourseId.toString(), courseName: 'German B1' },
        ],
      }),
    }),
  };

  const mockAnnouncementModel: any = {
    find: jest.fn().mockImplementation((filter: any) => {
      const now = new Date();
      return {
        lean: jest.fn().mockResolvedValue(
          storedAnnouncements.filter((a) => {
            if (
              a.status !== 'published' &&
              a.status !== 'PUBLISHED' &&
              !a.isPublished
            )
              return false;
            if (a.startsAt && a.startsAt > now) return false;
            if (a.scheduledAt && a.scheduledAt > now) return false;
            if (a.expiresAt && a.expiresAt <= now) return false;
            return true;
          }),
        ),
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(storedAnnouncements),
        }),
      };
    }),
    findById: jest.fn().mockImplementation((id: any) => {
      return (
        storedAnnouncements.find((a) => a._id.toString() === id.toString()) ||
        null
      );
    }),
    updateOne: jest.fn().mockImplementation((filter: any, update: any) => {
      const ann = storedAnnouncements.find(
        (a) => a._id.toString() === filter._id?.toString(),
      );
      if (ann && update.$addToSet?.readBy) {
        ann.readBy = ann.readBy || [];
        ann.readBy.push(update.$addToSet.readBy);
      }
      if (ann && update.$addToSet?.dismissedBy) {
        ann.dismissedBy = ann.dismissedBy || [];
        ann.dismissedBy.push(update.$addToSet.dismissedBy);
      }
      return Promise.resolve({
        matchedCount: ann ? 1 : 0,
        modifiedCount: ann ? 1 : 0,
      });
    }),
    updateMany: jest
      .fn()
      .mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
  };

  const mockGateway = {
    sendNotificationToUser: jest.fn(),
    broadcastAnnouncement: jest.fn(),
  };

  const mockConnection = {
    db: {
      collection: (name: string) => {
        if (name === 'learning_space_members') {
          return {
            find: () => ({
              toArray: () =>
                Promise.resolve([
                  { spaceId: memberSpaceId, userId: studentId },
                ]),
            }),
          };
        }
        if (name === 'learning_spaces') {
          return {
            find: () => ({
              toArray: () => Promise.resolve([]),
            }),
          };
        }
        if (name === 'network_community_memberships') {
          return {
            find: () => ({
              toArray: () => Promise.resolve([]),
            }),
          };
        }
        return {
          find: () => ({ toArray: () => Promise.resolve([]) }),
        };
      },
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    storedNotifications = [];
    storedAnnouncements = [];
    userPrefs = {
      userId: studentId,
      categories: {
        announcements: true,
        spaces: true,
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        AnnouncementsService,
        {
          provide: getModelToken(Notification.name),
          useValue: mockNotificationModel,
        },
        {
          provide: getModelToken(NotificationPreference.name),
          useValue: mockPrefModel,
        },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        {
          provide: getModelToken(Announcement.name),
          useValue: mockAnnouncementModel,
        },
        {
          provide: getModelToken(PlatformAnnouncement.name),
          useValue: mockAnnouncementModel,
        },
        { provide: NotificationsGateway, useValue: mockGateway },
        { provide: 'DatabaseConnection', useValue: mockConnection },
      ],
    }).compile();

    notifService = module.get<NotificationsService>(NotificationsService);
    annService = module.get<AnnouncementsService>(AnnouncementsService);
  });

  describe('Announcement Targeting', () => {
    it('delivers platform-wide announcement to student', async () => {
      const ann = {
        _id: new Types.ObjectId(),
        title: 'Platform Maintenance Notice',
        message: 'System upgrade tonight',
        targetType: 'platform',
        priority: 'normal',
        status: 'published',
        isPublished: true,
        startsAt: new Date(Date.now() - 60000),
        readBy: [],
        dismissedBy: [],
      };
      storedAnnouncements.push(ann);

      const created =
        await notifService.syncUserAnnouncementNotifications(studentId);
      expect(created).toBe(1);
      expect(storedNotifications.length).toBe(1);
      expect(storedNotifications[0].title).toBe('Platform Maintenance Notice');
      expect(storedNotifications[0].priority).toBe('NORMAL');
    });

    it('delivers course-targeted announcement ONLY if student is enrolled', async () => {
      // 1. Enrolled Course announcement
      const enrolledAnn = {
        _id: new Types.ObjectId(),
        title: 'German B1 Class Rescheduled',
        message: 'Class moved to 4 PM',
        targetType: 'course',
        courseId: enrolledCourseId,
        priority: 'important',
        status: 'published',
        isPublished: true,
        startsAt: new Date(Date.now() - 60000),
        readBy: [],
        dismissedBy: [],
      };
      // 2. Different Course announcement (NOT enrolled)
      const notEnrolledAnn = {
        _id: new Types.ObjectId(),
        title: 'Spanish A1 Exam Guidelines',
        message: 'Exam starts Monday',
        targetType: 'course',
        courseId: notEnrolledCourseId,
        priority: 'important',
        status: 'published',
        isPublished: true,
        startsAt: new Date(Date.now() - 60000),
        readBy: [],
        dismissedBy: [],
      };

      storedAnnouncements.push(enrolledAnn, notEnrolledAnn);

      const created =
        await notifService.syncUserAnnouncementNotifications(studentId);
      expect(created).toBe(1);
      expect(storedNotifications.length).toBe(1);
      expect(storedNotifications[0].title).toBe('German B1 Class Rescheduled');
      expect(storedNotifications[0].priority).toBe('HIGH');
    });

    it('delivers learning space announcement ONLY if student is a space member', async () => {
      const memberSpaceAnn = {
        _id: new Types.ObjectId(),
        title: 'Batch Space Meeting',
        message: 'Weekly sprint planning',
        targetType: 'learning_space',
        learningSpaceId: memberSpaceId,
        priority: 'normal',
        status: 'published',
        isPublished: true,
        startsAt: new Date(Date.now() - 60000),
        readBy: [],
        dismissedBy: [],
      };

      const foreignSpaceAnn = {
        _id: new Types.ObjectId(),
        title: 'Unenrolled Space Notice',
        message: 'No access',
        targetType: 'learning_space',
        learningSpaceId: notMemberSpaceId,
        priority: 'normal',
        status: 'published',
        isPublished: true,
        startsAt: new Date(Date.now() - 60000),
        readBy: [],
        dismissedBy: [],
      };

      storedAnnouncements.push(memberSpaceAnn, foreignSpaceAnn);

      const created =
        await notifService.syncUserAnnouncementNotifications(studentId);
      expect(created).toBe(1);
      expect(storedNotifications[0].title).toBe('Batch Space Meeting');
    });

    it('does NOT deliver announcements to users outside target role', async () => {
      const teacherOnlyAnn = {
        _id: new Types.ObjectId(),
        title: 'Teacher Faculty Meeting',
        message: 'Curriculum review',
        targetType: 'role',
        targetIds: ['teachers'],
        priority: 'normal',
        status: 'published',
        isPublished: true,
        startsAt: new Date(Date.now() - 60000),
        readBy: [],
        dismissedBy: [],
      };
      storedAnnouncements.push(teacherOnlyAnn);

      const created =
        await notifService.syncUserAnnouncementNotifications(studentId);
      expect(created).toBe(0);
      expect(storedNotifications.length).toBe(0);
    });
  });

  describe('Priority & Preferences Handling', () => {
    it('critical announcement bypasses user preferences even if user disabled announcements category', async () => {
      userPrefs.categories.announcements = false; // User muted announcements!

      const normalAnn = {
        _id: new Types.ObjectId(),
        title: 'Optional Newsletter',
        message: 'Tips for learning',
        targetType: 'platform',
        priority: 'normal',
        status: 'published',
        isPublished: true,
        startsAt: new Date(Date.now() - 60000),
      };

      const criticalAnn = {
        _id: new Types.ObjectId(),
        title: 'Emergency Server Downtime',
        message: 'Critical maintenance underway',
        targetType: 'platform',
        priority: 'critical',
        isCritical: true,
        status: 'published',
        isPublished: true,
        startsAt: new Date(Date.now() - 60000),
      };

      storedAnnouncements.push(normalAnn, criticalAnn);

      const created =
        await notifService.syncUserAnnouncementNotifications(studentId);
      // Only the critical announcement is created because preference muted normal announcements
      expect(created).toBe(1);
      expect(storedNotifications[0].title).toBe('Emergency Server Downtime');
      expect(storedNotifications[0].priority).toBe('CRITICAL');
    });
  });

  describe('Deduplication & Scheduling & Expiry', () => {
    it('does NOT create duplicate notifications on multiple sync cycles', async () => {
      const ann = {
        _id: new Types.ObjectId(),
        title: 'Important Exam Update',
        message: 'Exam schedule released',
        targetType: 'platform',
        priority: 'important',
        status: 'published',
        isPublished: true,
        startsAt: new Date(Date.now() - 60000),
      };
      storedAnnouncements.push(ann);

      // Cycle 1
      const count1 =
        await notifService.syncUserAnnouncementNotifications(studentId);
      expect(count1).toBe(1);
      expect(storedNotifications.length).toBe(1);

      // Cycle 2 (e.g. repeated user fetch or tab refresh)
      const count2 =
        await notifService.syncUserAnnouncementNotifications(studentId);
      expect(count2).toBe(0);
      expect(storedNotifications.length).toBe(1); // Zero duplicates!
    });

    it('does NOT deliver future scheduled announcements before start time', async () => {
      const futureAnn = {
        _id: new Types.ObjectId(),
        title: 'Future Scheduled Announcement',
        message: 'Will be published tomorrow',
        targetType: 'platform',
        priority: 'normal',
        status: 'scheduled',
        isPublished: false,
        scheduledAt: new Date(Date.now() + 86400000), // In 24 hours
      };
      storedAnnouncements.push(futureAnn);

      const created =
        await notifService.syncUserAnnouncementNotifications(studentId);
      expect(created).toBe(0);
      expect(storedNotifications.length).toBe(0);
    });

    it('does NOT deliver expired announcements', async () => {
      const expiredAnn = {
        _id: new Types.ObjectId(),
        title: 'Expired Flash Sale',
        message: 'Discount expired',
        targetType: 'platform',
        priority: 'normal',
        status: 'published',
        isPublished: true,
        startsAt: new Date(Date.now() - 172800000),
        expiresAt: new Date(Date.now() - 86400000), // Expired yesterday
      };
      storedAnnouncements.push(expiredAnn);

      const created =
        await notifService.syncUserAnnouncementNotifications(studentId);
      expect(created).toBe(0);
      expect(storedNotifications.length).toBe(0);
    });
  });

  describe('Read State & Dismissal Synchronization', () => {
    it('marking notification as read updates readBy on announcement', async () => {
      const annId = new Types.ObjectId();
      const ann = {
        _id: annId,
        title: 'Campus Guidelines',
        message: 'Updated campus rules',
        targetType: 'platform',
        priority: 'normal',
        status: 'published',
        isPublished: true,
        startsAt: new Date(Date.now() - 60000),
        readBy: [],
        dismissedBy: [],
      };
      storedAnnouncements.push(ann);

      await notifService.syncUserAnnouncementNotifications(studentId);
      const notif = storedNotifications[0];
      expect(notif.isRead).toBe(false);

      // Mark notification as read
      await notifService.markAsRead(
        notif._id.toHexString(),
        studentId.toHexString(),
      );

      expect(notif.isRead).toBe(true);
      expect(mockAnnouncementModel.updateOne).toHaveBeenCalledWith(
        { _id: annId },
        { $addToSet: { readBy: studentId } },
      );
    });

    it('requires acknowledgment when allowDismiss is false', async () => {
      const annId = new Types.ObjectId();
      const mandatoryAnn = {
        _id: annId,
        title: 'Mandatory Policy Acknowledgment',
        message: 'You must acknowledge the terms',
        allowDismiss: false,
        priority: 'critical',
        status: 'published',
      };
      storedAnnouncements.push(mandatoryAnn);

      // Regular dismiss attempt should be rejected
      await expect(
        annService.dismissAnnouncement(
          annId.toHexString(),
          studentId.toHexString(),
          false,
        ),
      ).rejects.toThrow();

      // Explicit acknowledgment should succeed
      const result = await annService.acknowledgeAnnouncement(
        annId.toHexString(),
        studentId.toHexString(),
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe('Announcement acknowledged');
    });
  });
});
