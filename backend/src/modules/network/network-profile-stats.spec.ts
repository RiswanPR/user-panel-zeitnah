/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { NetworkService } from './network.service';
import { User } from '../auth/schemas/user.schema';
import { Course } from '../courses/schemas/course.schema';
import { Connection } from './schemas/connection.schema';
import { CommunityMembership } from './schemas/community-membership.schema';
import { NetworkActivity } from './schemas/network-activity.schema';
import { SignedUrlService } from '../../common/aws/signed-url.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('NetworkService - Profile Network Statistics & Relationships (Strict network_connections schema)', () => {
  let service: NetworkService;

  const userA = new Types.ObjectId();
  const userB = new Types.ObjectId();

  const mockUserModel = {
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockCourseModel = {
    find: jest.fn(),
  };

  const mockConnectionModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockMembershipModel = {
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockActivityModel = {
    find: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
  };

  const mockSignedUrlService = {
    generateSignedImageUrl: jest
      .fn()
      .mockImplementation((key) =>
        Promise.resolve(`https://cdn.example.com/${key}`),
      ),
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NetworkService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Course.name), useValue: mockCourseModel },
        {
          provide: getModelToken(Connection.name),
          useValue: mockConnectionModel,
        },
        {
          provide: getModelToken(CommunityMembership.name),
          useValue: mockMembershipModel,
        },
        {
          provide: getModelToken(NetworkActivity.name),
          useValue: mockActivityModel,
        },
        { provide: SignedUrlService, useValue: mockSignedUrlService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<NetworkService>(NetworkService);
  });

  describe('getProfileNetworkStats', () => {
    it('should throw NotFoundException if target user is not found', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.getProfileNetworkStats(
          userA.toHexString(),
          userB.toHexString(),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate accurate followers, following, and connections count using database-level countDocuments on network_connections', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: userA,
          username: 'student_a',
          name: 'Student A',
        }),
      });

      // Followers, Following, Connections counts from connectionModel
      mockConnectionModel.countDocuments
        .mockResolvedValueOnce(125) // followers
        .mockResolvedValueOnce(84) // following
        .mockResolvedValueOnce(42); // connections

      mockConnectionModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'conn_123',
          requesterId: userB,
          recipientId: userA,
          status: 'pending',
        }),
      });

      const stats = await service.getProfileNetworkStats(
        userA.toHexString(),
        userB.toHexString(),
      );

      expect(stats.followers).toBe(125);
      expect(stats.following).toBe(84);
      expect(stats.connections).toBe(42);
      expect(stats.followersCount).toBe(125);
      expect(stats.followingCount).toBe(84);
      expect(stats.connectionsCount).toBe(42);
      expect(stats.relationship).toBeDefined();
      expect(stats.relationship?.isFollowing).toBe(true);
      expect(stats.relationship?.isFollowedBy).toBe(false);
      expect(stats.relationship?.connectionStatus).toBe('pending_sent');
      expect(stats.relationship?.requestSent).toBe(true);
    });

    it('should return connectionStatus: self when viewer is viewing their own profile', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: userA,
          username: 'student_a',
          name: 'Student A',
        }),
      });

      mockConnectionModel.countDocuments
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(15);

      const stats = await service.getProfileNetworkStats(
        userA.toHexString(),
        userA.toHexString(),
      );

      expect(stats.followers).toBe(50);
      expect(stats.following).toBe(20);
      expect(stats.connections).toBe(15);
      expect(stats.relationship?.connectionStatus).toBe('self');
    });
  });

  describe('followUser & unfollowUser', () => {
    it('should throw BadRequestException when attempting to follow oneself', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: userA,
          username: 'student_a',
        }),
      });

      await expect(
        service.followUser(userA.toHexString(), userA.toHexString()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create pending connection record in network_connections and dispatch notification when following another user', async () => {
      mockUserModel.findById
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue({
            _id: userB,
            username: 'student_b',
            account_Status: { isBlocked: false, isDeleted: false },
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({
              _id: userA,
              username: 'student_a',
              name: 'Student A',
            }),
          }),
        });

      mockConnectionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      mockConnectionModel.create.mockResolvedValue({
        requesterId: userA,
        recipientId: userB,
        status: 'pending',
      });

      mockConnectionModel.countDocuments.mockResolvedValue(10);

      const result = await service.followUser(
        userA.toHexString(),
        userB.toHexString(),
      );

      expect(result.success).toBe(true);
      expect(result.isFollowing).toBe(true);
      expect(result.followersCount).toBe(10);
      expect(mockConnectionModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requesterId: expect.any(Types.ObjectId),
          recipientId: userB,
          status: 'pending',
        }),
      );
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: userB.toHexString(),
          actorId: userA.toHexString(),
          type: 'follow',
        }),
      );
    });

    it('should delete pending connection document in network_connections when unfollowing', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: userB,
          username: 'student_b',
        }),
      });

      const mockConnDoc = {
        _id: new Types.ObjectId(),
        requesterId: userA,
        recipientId: userB,
        status: 'pending',
      };

      mockConnectionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockConnDoc),
      });

      mockConnectionModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      mockConnectionModel.countDocuments.mockResolvedValue(9);

      const result = await service.unfollowUser(
        userA.toHexString(),
        userB.toHexString(),
      );

      expect(result.success).toBe(true);
      expect(result.isFollowing).toBe(false);
      expect(result.followersCount).toBe(9);
      expect(mockConnectionModel.deleteOne).toHaveBeenCalledWith({
        _id: mockConnDoc._id,
      });
    });
  });

  describe('getStudentProfile & getStudentByUsername resolution', () => {
    beforeEach(() => {
      mockActivityModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      mockCourseModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
    });

    it('should resolve student profile by ObjectId', async () => {
      const studentObjId = new Types.ObjectId();
      const mockStudent = {
        _id: studentObjId,
        name: 'Rahul Kumar',
        username: 'rahulk',
        role: 'student',
        publicProfilePublished: true,
        skills: ['German B2', 'Communication'],
        toObject: () => ({
          _id: studentObjId,
          name: 'Rahul Kumar',
          username: 'rahulk',
          role: 'student',
        }),
      };

      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockStudent),
      });

      const profile = await service.getStudentProfile(
        studentObjId.toHexString(),
      );
      expect(profile.user.name).toBe('Rahul Kumar');
      expect(profile.user.username).toBe('rahulk');
      expect(profile.user.id).toBe(studentObjId.toHexString());
    });

    it('should resolve student profile by username', async () => {
      const studentObjId = new Types.ObjectId();
      const mockStudent = {
        _id: studentObjId,
        name: 'Jane Doe',
        username: 'janedoe',
        role: 'student',
        publicProfilePublished: true,
        skills: ['TypeScript', 'React'],
        toObject: () => ({
          _id: studentObjId,
          name: 'Jane Doe',
          username: 'janedoe',
          role: 'student',
        }),
      };

      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockStudent),
      });

      const profile = await service.getStudentProfile('janedoe');
      expect(profile.user.name).toBe('Jane Doe');
      expect(profile.user.username).toBe('janedoe');
    });

    it('should throw NotFoundException if student is not found by ID or username', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.getStudentProfile(new Types.ObjectId().toHexString()),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getStudentProfile('unknown_student'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
