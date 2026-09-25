/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { PlatformAnnouncement } from './platform-announcement.schema';
import { User } from '../auth/schemas/user.schema';
import { Types } from 'mongoose';

describe('AnnouncementsService - Filtering & Audience Targeting', () => {
  let service: AnnouncementsService;

  const userId = new Types.ObjectId();
  const annId = new Types.ObjectId();

  const mockAnnouncements: any[] = [
    {
      _id: new Types.ObjectId(),
      title: 'Platform Maintenance',
      audience: 'ALL_USERS',
      priority: 'HIGH',
      status: 'PUBLISHED',
      startsAt: new Date(Date.now() - 10000),
    },
    {
      _id: new Types.ObjectId(),
      title: 'Student Webinar',
      audience: 'STUDENTS',
      priority: 'MEDIUM',
      status: 'PUBLISHED',
      startsAt: new Date(Date.now() - 5000),
    },
    {
      _id: new Types.ObjectId(),
      title: 'Teacher Faculty Meeting',
      audience: 'TEACHERS',
      priority: 'CRITICAL',
      status: 'PUBLISHED',
      startsAt: new Date(Date.now() - 1000),
    },
  ];

  const mockAnnouncementModel = {
    find: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementsService,
        {
          provide: getModelToken(PlatformAnnouncement.name),
          useValue: mockAnnouncementModel,
        },
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get<AnnouncementsService>(AnnouncementsService);
  });

  describe('getActivePlatformAnnouncements', () => {
    it('should return ALL_USERS and STUDENTS announcements for a student user', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: userId, course: [] }),
      });

      mockAnnouncementModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockAnnouncements),
        }),
      });

      const results = await service.getActivePlatformAnnouncements(
        userId.toHexString(),
        'student',
      );
      expect(results.length).toBe(2);
      expect(results.some((a) => a.title === 'Platform Maintenance')).toBe(
        true,
      );
      expect(results.some((a) => a.title === 'Student Webinar')).toBe(true);
      expect(results.some((a) => a.title === 'Teacher Faculty Meeting')).toBe(
        false,
      );
    });

    it('should return ALL_USERS and TEACHERS announcements for a teacher user', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: userId, course: [] }),
      });

      mockAnnouncementModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockAnnouncements),
        }),
      });

      const results = await service.getActivePlatformAnnouncements(
        userId.toHexString(),
        'teacher',
      );
      expect(results.length).toBe(2);
      expect(results.some((a) => a.title === 'Platform Maintenance')).toBe(
        true,
      );
      expect(results.some((a) => a.title === 'Teacher Faculty Meeting')).toBe(
        true,
      );
      expect(results.some((a) => a.title === 'Student Webinar')).toBe(false);
      // Priority sorting should put CRITICAL above HIGH
      expect(results[0].priority).toBe('CRITICAL');
    });

    it('should return all announcements for admin users', async () => {
      mockUserModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: userId, course: [] }),
      });

      mockAnnouncementModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockAnnouncements),
        }),
      });

      const results = await service.getActivePlatformAnnouncements(
        userId.toHexString(),
        'admin',
      );
      expect(results.length).toBe(3);
    });
  });

  describe('dismissAnnouncement', () => {
    it('should add userId to dismissedBy array', async () => {
      mockAnnouncementModel.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });

      const res = await service.dismissAnnouncement(
        annId.toHexString(),
        userId.toHexString(),
      );
      expect(res.success).toBe(true);
      expect(mockAnnouncementModel.updateOne).toHaveBeenCalledWith(
        { _id: annId },
        { $addToSet: { dismissedBy: userId } },
      );
    });

    it('should throw NotFoundException if announcement does not exist', async () => {
      mockAnnouncementModel.updateOne.mockResolvedValue({ matchedCount: 0 });

      await expect(
        service.dismissAnnouncement(annId.toHexString(), userId.toHexString()),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
