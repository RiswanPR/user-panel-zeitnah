/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LearningSpacesService } from './learning-spaces.service';
import { LearningSpace } from '../schemas/learning-space.schema';
import { Community } from '../schemas/community.schema';
import { CommunityMembership } from '../schemas/community-membership.schema';
import { CommunityAnnouncement } from '../schemas/community-announcement.schema';
import { CommunityDiscussion } from '../schemas/community-discussion.schema';
import { CommunityReply } from '../schemas/community-reply.schema';
import { CommunityResource } from '../schemas/community-resource.schema';
import { User } from '../../auth/schemas/user.schema';
import { Notification } from '../../notifications/notification.schema';
import { Types } from 'mongoose';

describe('LearningSpacesService - Access Control & RBAC', () => {
  let service: LearningSpacesService;

  const mockSpaceId = new Types.ObjectId();
  const mockCommunityId = new Types.ObjectId();
  const teacherId = new Types.ObjectId();
  const studentId = new Types.ObjectId();
  const outsiderId = new Types.ObjectId();

  const mockSpace: any = {
    _id: mockSpaceId,
    name: 'Full Stack Web Dev Cohort',
    code: 'FSWD-01',
    accessMode: 'restricted',
    status: 'active',
    teachers: [teacherId],
    communityId: mockCommunityId,
  };

  const mockSpaceModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockCommunityModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockMembershipModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockAnnouncementModel = {
    find: jest.fn(),
    create: jest.fn(),
  };

  const mockDiscussionModel = {
    find: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockReplyModel = {
    find: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockResourceModel = {
    find: jest.fn(),
    create: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn(),
  };

  const mockNotificationModel = {
    create: jest.fn(),
    insertMany: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningSpacesService,
        { provide: getModelToken(LearningSpace.name), useValue: mockSpaceModel },
        { provide: getModelToken(Community.name), useValue: mockCommunityModel },
        { provide: getModelToken(CommunityMembership.name), useValue: mockMembershipModel },
        { provide: getModelToken(CommunityAnnouncement.name), useValue: mockAnnouncementModel },
        { provide: getModelToken(CommunityDiscussion.name), useValue: mockDiscussionModel },
        { provide: getModelToken(CommunityReply.name), useValue: mockReplyModel },
        { provide: getModelToken(CommunityResource.name), useValue: mockResourceModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Notification.name), useValue: mockNotificationModel },
      ],
    }).compile();

    service = module.get<LearningSpacesService>(LearningSpacesService);
  });

  describe('checkSpaceAccess', () => {
    it('should grant access to platform admins regardless of membership', async () => {
      const result = await service.checkSpaceAccess(mockSpace, '507f1f77bcf86cd799439011', 'admin');
      expect(result.isAdmin).toBe(true);
      expect(result.isMember).toBe(true);
      expect(result.userRole).toBe('owner');
    });

    it('should grant access to assigned teachers with moderator role', async () => {
      const result = await service.checkSpaceAccess(mockSpace, teacherId.toHexString(), 'instructor');
      expect(result.isTeacher).toBe(true);
      expect(result.isMember).toBe(true);
      expect(result.userRole).toBe('moderator');
    });

    it('should grant access to enrolled students with active membership', async () => {
      mockMembershipModel.findOne.mockResolvedValue({
        userId: studentId,
        communityId: mockCommunityId,
        role: 'member',
        status: 'active',
      });

      const result = await service.checkSpaceAccess(mockSpace, studentId.toHexString(), 'student');
      expect(result.isMember).toBe(true);
      expect(result.userRole).toBe('member');
    });

    it('should deny access (throw ForbiddenException) to unenrolled students / outsiders in restricted spaces', async () => {
      mockMembershipModel.findOne.mockResolvedValue(null);

      await expect(
        service.checkSpaceAccess(mockSpace, outsiderId.toHexString(), 'student'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('resolveSpace', () => {
    it('should resolve space by ObjectId', async () => {
      mockSpaceModel.findById.mockResolvedValue(mockSpace);

      const result = await service.resolveSpace(mockSpaceId.toHexString());
      expect(result).toBe(mockSpace);
      expect(mockSpaceModel.findById).toHaveBeenCalledWith(mockSpaceId.toHexString());
    });

    it('should throw NotFoundException if space is not found', async () => {
      mockSpaceModel.findById.mockResolvedValue(null);
      mockSpaceModel.findOne.mockResolvedValue(null);
      mockCommunityModel.findOne.mockResolvedValue(null);

      await expect(service.resolveSpace(new Types.ObjectId().toHexString())).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
