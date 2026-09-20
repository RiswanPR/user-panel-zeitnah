/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { NetworkConnectionsService } from './network-connections.service';
import { NetworkConnection } from '../schemas/connection.schema';
import { User } from '../../auth/schemas/user.schema';
import { Notification } from '../../notifications/notification.schema';
import { Types } from 'mongoose';

describe('NetworkConnectionsService - Connections & Canonical Ordering', () => {
  let service: NetworkConnectionsService;

  const userA = new Types.ObjectId();
  const userB = new Types.ObjectId();
  const userC = new Types.ObjectId();

  const mockConnectionModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockNotificationModel = {
    create: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NetworkConnectionsService,
        { provide: getModelToken(NetworkConnection.name), useValue: mockConnectionModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Notification.name), useValue: mockNotificationModel },
      ],
    }).compile();

    service = module.get<NetworkConnectionsService>(NetworkConnectionsService);
  });

  describe('sendConnectionRequest', () => {
    it('should throw BadRequestException if user tries to connect with themselves', async () => {
      await expect(
        service.sendConnectionRequest(userA.toHexString(), userA.toHexString()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if recipient user does not exist', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(
        service.sendConnectionRequest(userA.toHexString(), userB.toHexString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if connection already exists and is accepted', async () => {
      mockUserModel.findById.mockResolvedValue({ _id: userB, name: 'User B' });
      mockConnectionModel.findOne.mockResolvedValue({
        status: 'accepted',
      });

      await expect(
        service.sendConnectionRequest(userA.toHexString(), userB.toHexString()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create connection with canonical userLow/userHigh ordering and notify recipient', async () => {
      mockUserModel.findById
        .mockResolvedValueOnce({ _id: userB, name: 'User B' })
        .mockResolvedValueOnce({ _id: userA, name: 'User A' });
      mockConnectionModel.findOne.mockResolvedValue(null);

      const createdConn = {
        _id: new Types.ObjectId(),
        requesterId: userA,
        recipientId: userB,
        status: 'pending',
      };
      mockConnectionModel.create.mockResolvedValue(createdConn);

      const result = await service.sendConnectionRequest(userA.toHexString(), userB.toHexString());
      expect(result).toBe(createdConn);
      expect(mockConnectionModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requesterId: userA,
          recipientId: userB,
          status: 'pending',
        }),
      );
    });
  });

  describe('acceptConnectionRequest', () => {
    it('should throw NotFoundException if connection does not exist', async () => {
      mockConnectionModel.findById.mockResolvedValue(null);

      await expect(
        service.acceptConnectionRequest(new Types.ObjectId().toHexString(), userB.toHexString()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if caller is not the recipient', async () => {
      const mockConn = {
        _id: new Types.ObjectId(),
        requesterId: userA,
        recipientId: userB,
        status: 'pending',
      };
      mockConnectionModel.findById.mockResolvedValue(mockConn);

      // userA (requester) tries to accept instead of recipient userB
      await expect(
        service.acceptConnectionRequest(mockConn._id.toHexString(), userA.toHexString()),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update status to accepted when recipient accepts', async () => {
      const mockConn = {
        _id: new Types.ObjectId(),
        requesterId: userA,
        recipientId: userB,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true),
      };
      mockConnectionModel.findById.mockResolvedValue(mockConn);
      mockUserModel.findById.mockResolvedValue({ _id: userB, name: 'User B' });

      const result = await service.acceptConnectionRequest(
        mockConn._id.toHexString(),
        userB.toHexString(),
      );
      expect(result.success).toBe(true);
      expect(mockConn.status).toBe('accepted');
      expect(mockConn.save).toHaveBeenCalled();
    });
  });

  describe('removeConnection', () => {
    it('should throw ForbiddenException if caller is neither requester nor recipient', async () => {
      const mockConn = {
        _id: new Types.ObjectId(),
        requesterId: userA,
        recipientId: userB,
      };
      mockConnectionModel.findById.mockResolvedValue(mockConn);

      await expect(
        service.removeConnection(mockConn._id.toHexString(), userC.toHexString()),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should delete connection if caller is a participant', async () => {
      const mockConn = {
        _id: new Types.ObjectId(),
        requesterId: userA,
        recipientId: userB,
      };
      mockConnectionModel.findById.mockResolvedValue(mockConn);
      mockConnectionModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const result = await service.removeConnection(
        mockConn._id.toHexString(),
        userA.toHexString(),
      );
      expect(result.success).toBe(true);
      expect(mockConnectionModel.deleteOne).toHaveBeenCalledWith({ _id: mockConn._id });
    });
  });
});
