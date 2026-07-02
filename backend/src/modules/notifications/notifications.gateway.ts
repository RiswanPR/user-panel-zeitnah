import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // Track connected users (userId -> set of socket IDs)
  private userSockets: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket) {
    const userId = client.handshake.auth?.userId || client.handshake.query?.userId;
    if (userId) {
      if (!this.userSockets.has(userId as string)) {
        this.userSockets.set(userId as string, new Set());
      }
      this.userSockets.get(userId as string)?.add(client.id);
      // Join a room specific to the user for easy broadcasting
      client.join(`user_${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.auth?.userId || client.handshake.query?.userId;
    if (userId && this.userSockets.has(userId as string)) {
      this.userSockets.get(userId as string)?.delete(client.id);
      if (this.userSockets.get(userId as string)?.size === 0) {
        this.userSockets.delete(userId as string);
      }
    }
  }

  // Example method to send a notification to a specific user
  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }

  // Example method to broadcast to everyone
  broadcastAnnouncement(announcement: any) {
    this.server.emit('announcement', announcement);
  }

  @UseGuards(JwtAuthGuard)
  @SubscribeMessage('markAsRead')
  handleMarkAsRead(client: Socket, payload: { notificationId: string }) {
    // Ideally update in DB
    const userId = client.handshake.auth?.userId || client.handshake.query?.userId;
    if (userId) {
      this.server.to(`user_${userId}`).emit('notificationRead', payload.notificationId);
    }
  }
}
