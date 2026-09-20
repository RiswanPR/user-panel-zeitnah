import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NetworkConnection, NetworkConnectionDocument } from '../schemas/connection.schema';
import { User, UserDocument } from '../../auth/schemas/user.schema';
import { Notification, NotificationDocument } from '../../notifications/notification.schema';
import { QueryPeopleDto } from '../dto/network.dto';
import { escapeRegex } from '../../../common/utils/regex.util';

@Injectable()
export class NetworkConnectionsService {
  constructor(
    @InjectModel(NetworkConnection.name)
    private connectionModel: Model<NetworkConnectionDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (id instanceof Types.ObjectId) return id;
    if (typeof id === 'string' && Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }
    throw new BadRequestException('Invalid ID format');
  }

  private getOrderedUserIds(idA: string, idB: string): [Types.ObjectId, Types.ObjectId] {
    const sA = String(idA);
    const sB = String(idB);
    return sA < sB
      ? [this.toObjectId(sA), this.toObjectId(sB)]
      : [this.toObjectId(sB), this.toObjectId(sA)];
  }

  /**
   * People directory discovery with connection status relative to caller
   */
  async getPeople(userId: string, query: QueryPeopleDto) {
    const userObjId = this.toObjectId(userId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    const filter: any = {
      _id: { $ne: userObjId },
      'account_Status.isDeleted': { $ne: true },
      'account_Status.isBlocked': { $ne: true },
    };

    if (query.role && query.role !== 'all') {
      filter.role = query.role;
    }

    if (query.q && query.q.trim()) {
      const regex = new RegExp(escapeRegex(query.q.trim()), 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const total = await this.userModel.countDocuments(filter);
    const users = await this.userModel
      .find(filter, {
        name: 1,
        email: 1,
        role: 1,
        avatar: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Map connection status for each user
    const otherUserIds = users.map((u) => u._id);
    const connections = await this.connectionModel
      .find({
        $or: [
          { requesterId: userObjId, recipientId: { $in: otherUserIds } },
          { recipientId: userObjId, requesterId: { $in: otherUserIds } },
        ],
      })
      .lean();

    const connMap = new Map<string, { status: string; connectionId: string; isRequester: boolean }>();
    connections.forEach((c) => {
      const otherId = c.requesterId.equals(userObjId) ? String(c.recipientId) : String(c.requesterId);
      connMap.set(otherId, {
        status: c.status,
        connectionId: String(c._id),
        isRequester: c.requesterId.equals(userObjId),
      });
    });

    const enrichedUsers = users.map((u: any) => {
      const conn = connMap.get(String(u._id));
      let connectionStatus = 'none';
      if (conn) {
        if (conn.status === 'accepted') connectionStatus = 'connected';
        else if (conn.status === 'pending') {
          connectionStatus = conn.isRequester ? 'pending_sent' : 'pending_received';
        }
      }

      return {
        _id: u._id,
        name: u.name || u.email.split('@')[0],
        email: u.email,
        role: u.role,
        avatar: u.avatar || u.profileImage || '',
        connectionStatus,
        connectionId: conn?.connectionId || null,
      };
    });

    return {
      people: enrichedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get accepted connections
   */
  async getConnections(userId: string, query: any) {
    const userObjId = this.toObjectId(userId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    const filter = {
      $or: [{ requesterId: userObjId }, { recipientId: userObjId }],
      status: 'accepted',
    };

    const total = await this.connectionModel.countDocuments(filter);
    const connections = await this.connectionModel
      .find(filter)
      .populate('requesterId', 'name email avatar profileImage role')
      .populate('recipientId', 'name email avatar profileImage role')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formattedConnections = connections.map((c: any) => {
      const isRequester = String(c.requesterId?._id || c.requesterId) === String(userId);
      const peer = isRequester ? c.recipientId : c.requesterId;
      return {
        _id: c._id,
        connectedSince: c.updatedAt || c.createdAt,
        peer: peer || { _id: null, name: 'User', email: '' },
      };
    });

    return {
      connections: formattedConnections,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get pending connection requests (incoming and outgoing)
   */
  async getPendingRequests(userId: string) {
    const userObjId = this.toObjectId(userId);

    const [incoming, outgoing] = await Promise.all([
      this.connectionModel
        .find({ recipientId: userObjId, status: 'pending' })
        .populate('requesterId', 'name email avatar profileImage role')
        .sort({ createdAt: -1 })
        .lean(),
      this.connectionModel
        .find({ requesterId: userObjId, status: 'pending' })
        .populate('recipientId', 'name email avatar profileImage role')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return { incoming, outgoing };
  }

  /**
   * Send a connection request
   */
  async sendConnectionRequest(requesterId: string, recipientId: string) {
    if (requesterId === recipientId) {
      throw new BadRequestException('You cannot send a connection request to yourself.');
    }

    const reqObjId = this.toObjectId(requesterId);
    const recObjId = this.toObjectId(recipientId);

    const recipient = await this.userModel.findById(recObjId);
    if (!recipient) {
      throw new NotFoundException('Target user not found.');
    }

    const [userLow, userHigh] = this.getOrderedUserIds(requesterId, recipientId);

    const existing = await this.connectionModel.findOne({ userLow, userHigh });
    if (existing) {
      if (existing.status === 'accepted') {
        throw new BadRequestException('You are already connected with this user.');
      }
      if (existing.status === 'pending') {
        throw new BadRequestException('A connection request is already pending.');
      }
      // If previously declined or cancelled, reset to pending
      existing.status = 'pending';
      existing.requesterId = reqObjId;
      existing.recipientId = recObjId;
      await existing.save();
      return existing;
    }

    const newConnection = await this.connectionModel.create({
      requesterId: reqObjId,
      recipientId: recObjId,
      userLow,
      userHigh,
      status: 'pending',
    });

    const requester = await this.userModel.findById(reqObjId, { name: 1, email: 1 });
    await this.notificationModel.create({
      recipientId: recObjId,
      actorId: reqObjId,
      type: 'connection_request',
      category: 'connections',
      priority: 'LOW',
      title: 'New Connection Request',
      message: `${requester?.name || requester?.email || 'Someone'} sent you a connection request.`,
      isRead: false,
      targetUrl: '/network?tab=connections',
    }).catch(() => {});

    return newConnection;
  }

  /**
   * Accept connection request
   */
  async acceptConnectionRequest(requestId: string, userId: string) {
    const connObjId = this.toObjectId(requestId);
    const userObjId = this.toObjectId(userId);

    const connection = await this.connectionModel.findById(connObjId);
    if (!connection) {
      throw new NotFoundException('Connection request not found.');
    }

    if (!connection.recipientId.equals(userObjId)) {
      throw new ForbiddenException('Only the recipient can accept this connection request.');
    }

    connection.status = 'accepted';
    await connection.save();

    const user = await this.userModel.findById(userObjId, { name: 1, email: 1 });
    await this.notificationModel.create({
      recipientId: connection.requesterId,
      actorId: userObjId,
      type: 'connection_accepted',
      category: 'connections',
      priority: 'LOW',
      title: 'Connection Accepted',
      message: `${user?.name || user?.email || 'A user'} accepted your connection request.`,
      isRead: false,
      targetUrl: '/network?tab=connections',
    }).catch(() => {});

    return { success: true, message: 'Connection accepted.' };
  }

  /**
   * Reject / Cancel / Remove connection
   */
  async removeConnection(connectionId: string, userId: string) {
    const connObjId = this.toObjectId(connectionId);
    const userObjId = this.toObjectId(userId);

    const connection = await this.connectionModel.findById(connObjId);
    if (!connection) {
      throw new NotFoundException('Connection not found.');
    }

    if (!connection.requesterId.equals(userObjId) && !connection.recipientId.equals(userObjId)) {
      throw new ForbiddenException('You do not have permission to modify this connection.');
    }

    await this.connectionModel.deleteOne({ _id: connObjId });
    return { success: true, message: 'Connection removed.' };
  }
}
