import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Server;

  // Track connected users (userId -> set of socket IDs)
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1] ||
        client.handshake.query?.token;

      if (!token || typeof token !== 'string') {
        this.logger.warn(
          `Rejected unauthenticated notification socket connection: ${client.id}`,
        );
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.userId || payload._id || payload.id || payload.sub;

      if (!userId) {
        this.logger.warn(
          `Invalid token payload for notification socket: ${client.id}`,
        );
        client.disconnect();
        return;
      }

      client.data.userId = userId;
      client.data.user = payload;

      if (!this.userSockets.has(userId as string)) {
        this.userSockets.set(userId as string, new Set());
      }
      this.userSockets.get(userId as string)?.add(client.id);

      // Join personal room for targeted notification broadcasts
      await client.join(`user_${userId}`);
      this.logger.log(`User connected to notification socket: ${userId} (${client.id})`);
    } catch (err) {
      this.logger.warn(
        `JWT verification failed for notification socket ${client.id}: ${err.message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId && this.userSockets.has(userId as string)) {
      this.userSockets.get(userId as string)?.delete(client.id);
      if (this.userSockets.get(userId as string)?.size === 0) {
        this.userSockets.delete(userId as string);
      }
      this.logger.log(`User disconnected from notification socket: ${userId} (${client.id})`);
    }
  }

  // Method to send a notification to a specific verified user
  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }

  // Method to broadcast to everyone
  broadcastAnnouncement(announcement: any) {
    this.server.emit('announcement', announcement);
  }

  @SubscribeMessage('markAsRead')
  handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { notificationId: string },
  ) {
    const userId = client.data?.userId;
    if (userId && payload?.notificationId) {
      this.server
        .to(`user_${userId}`)
        .emit('notificationRead', payload.notificationId);
    }
  }
}

