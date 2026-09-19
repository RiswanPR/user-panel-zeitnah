import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AnnouncementsService } from './announcements.service';
import { Announcement } from './schemas/announcement.schema';
import { NotificationsGateway } from '../notifications/notifications.gateway';

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;
  let mockModel: any;
  let mockGateway: any;

  beforeEach(async () => {
    mockModel = {
      find: jest.fn(),
      findById: jest.fn(),
      updateOne: jest.fn(),
      updateMany: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(1),
    };

    mockGateway = {
      broadcastAnnouncement: jest.fn(),
      sendNotificationToUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementsService,
        {
          provide: getModelToken(Announcement.name),
          useValue: mockModel,
        },
        {
          provide: NotificationsGateway,
          useValue: mockGateway,
        },
      ],
    }).compile();

    service = module.get<AnnouncementsService>(AnnouncementsService);
  });

  describe('Priority Resolution Algorithm', () => {
    it('should sort announcements by priority hierarchy (critical > maintenance > important > high > normal > low)', () => {
      const mockDocs: any[] = [
        {
          _id: '1',
          type: 'general',
          priority: 'low',
          title: 'Low Notice',
          startsAt: new Date('2026-09-19T10:00:00Z'),
          createdAt: new Date('2026-09-19T10:00:00Z'),
        },
        {
          _id: '2',
          type: 'critical',
          priority: 'critical',
          title: 'Critical Outage',
          startsAt: new Date('2026-09-19T08:00:00Z'),
          createdAt: new Date('2026-09-19T08:00:00Z'),
        },
        {
          _id: '3',
          type: 'maintenance',
          priority: 'maintenance',
          title: 'Scheduled Maintenance',
          startsAt: new Date('2026-09-19T09:00:00Z'),
          createdAt: new Date('2026-09-19T09:00:00Z'),
        },
        {
          _id: '4',
          type: 'platform',
          priority: 'high',
          title: 'Platform Update',
          startsAt: new Date('2026-09-19T11:00:00Z'),
          createdAt: new Date('2026-09-19T11:00:00Z'),
        },
        {
          _id: '5',
          type: 'important',
          priority: 'important',
          title: 'Important Exam Info',
          startsAt: new Date('2026-09-19T09:30:00Z'),
          createdAt: new Date('2026-09-19T09:30:00Z'),
        },
      ];

      const sorted = service.sortAnnouncements(mockDocs);

      expect(sorted[0].priority).toBe('critical');
      expect(sorted[1].priority).toBe('maintenance');
      expect(sorted[2].priority).toBe('important');
      expect(sorted[3].priority).toBe('high');
      expect(sorted[4].priority).toBe('low');
    });

    it('should break ties by newest startsAt date first', () => {
      const mockDocs: any[] = [
        {
          _id: '1',
          type: 'platform',
          priority: 'high',
          title: 'Older High Update',
          startsAt: new Date('2026-09-18T10:00:00Z'),
          createdAt: new Date('2026-09-18T10:00:00Z'),
        },
        {
          _id: '2',
          type: 'course',
          priority: 'high',
          title: 'Newer High Course',
          startsAt: new Date('2026-09-19T12:00:00Z'),
          createdAt: new Date('2026-09-19T12:00:00Z'),
        },
      ];

      const sorted = service.sortAnnouncements(mockDocs);

      expect(sorted[0]._id).toBe('2');
      expect(sorted[1]._id).toBe('1');
    });
  });

  describe('markAsDismissed', () => {
    it('should reject dismissing non-dismissible critical announcements', async () => {
      mockModel.findById.mockResolvedValue({
        _id: 'crit-1',
        allowDismiss: false,
      });

      const res = await service.markAsDismissed('crit-1', 'user-123');
      expect(res.success).toBe(false);
      expect(mockModel.updateOne).not.toHaveBeenCalled();
    });

    it('should allow dismissing announcements when allowDismiss is true', async () => {
      mockModel.findById.mockResolvedValue({
        _id: 'maint-1',
        allowDismiss: true,
      });
      mockModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const res = await service.markAsDismissed('maint-1', 'user-123');
      expect(res.success).toBe(true);
      expect(mockModel.updateOne).toHaveBeenCalledWith(
        { _id: 'maint-1' },
        {
          $addToSet: {
            dismissedBy: 'user-123',
            readBy: 'user-123',
          },
        },
      );
    });
  });
});
