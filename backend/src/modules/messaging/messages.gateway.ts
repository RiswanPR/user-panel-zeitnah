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
import { socketCorsConfig } from '../../config/cors.config';

@WebSocketGateway({
  cors: socketCorsConfig,
  namespace: '/messages',
  path: '/api/socket.io/',
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MessagesGateway.name);

  @WebSocketServer()
  server!: Server;

  // Track connected sockets per user: userId -> Set of socket IDs
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
          `Rejected unauthenticated messages socket: ${client.id}`,
        );
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.userId || payload._id || payload.id || payload.sub;

      if (!userId) {
        this.logger.warn(
          `Invalid token payload for messages socket: ${client.id}`,
        );
        client.disconnect();
        return;
      }

      const sUserId = String(userId);
      client.data.userId = sUserId;
      client.data.user = payload;

      if (!this.userSockets.has(sUserId)) {
        this.userSockets.set(sUserId, new Set());
      }
      this.userSockets.get(sUserId)?.add(client.id);

      // Join individual user room for targeted updates and unread count badges
      await client.join(`user_${sUserId}`);
      this.logger.log(
        `User connected to messages socket: ${sUserId} (${client.id})`,
      );

      // Broadcast online status to any listeners
      this.server.emit('presence_change', {
        userId: sUserId,
        status: 'online',
        timestamp: new Date(),
      });
    } catch (err: any) {
      this.logger.warn(
        `JWT verification failed for messages socket ${client.id}: ${err.message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)?.delete(client.id);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
        this.server.emit('presence_change', {
          userId,
          status: 'offline',
          timestamp: new Date(),
        });
      }
      this.logger.log(
        `User disconnected from messages socket: ${userId} (${client.id})`,
      );
    }
  }

  isUserOnline(userId: string): boolean {
    const sId = String(userId);
    return Boolean(
      this.userSockets.get(sId)?.size && this.userSockets.get(sId)!.size > 0,
    );
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    if (payload?.conversationId) {
      await client.join(`conversation_${payload.conversationId}`);
    }
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    if (payload?.conversationId) {
      await client.leave(`conversation_${payload.conversationId}`);
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { conversationId: string; isTyping: boolean; userName?: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.conversationId) return;

    // Ephemeral broadcast to room members (excluding the sender)
    client.to(`conversation_${payload.conversationId}`).emit('user_typing', {
      conversationId: payload.conversationId,
      userId,
      userName: payload.userName || client.data?.user?.name || 'Someone',
      isTyping: Boolean(payload.isTyping),
    });
  }

  // ── Helper methods called from MessagingService ──

  notifyNewMessage(
    conversationId: string,
    message: any,
    participantIds: string[],
  ) {
    // 1. Broadcast to the active conversation room
    this.server.to(`conversation_${conversationId}`).emit('new_message', {
      conversationId,
      message,
    });

    // 2. Also notify each participant's private user room for badge update and push/toast
    for (const pid of participantIds) {
      this.server.to(`user_${pid}`).emit('message_received', {
        conversationId,
        message,
      });
    }
  }

  notifyMessageUpdated(conversationId: string, message: any) {
    this.server.to(`conversation_${conversationId}`).emit('message_updated', {
      conversationId,
      message,
    });
  }

  notifyMessageDeleted(
    conversationId: string,
    messageId: string,
    isDeletedForEveryone: boolean,
  ) {
    this.server.to(`conversation_${conversationId}`).emit('message_deleted', {
      conversationId,
      messageId,
      isDeletedForEveryone,
    });
  }

  notifyReadReceipt(conversationId: string, userId: string, lastReadAt: Date) {
    this.server.to(`conversation_${conversationId}`).emit('messages_read', {
      conversationId,
      userId,
      lastReadAt,
    });
  }

  notifyReaction(conversationId: string, messageId: string, reactions: any[]) {
    this.server.to(`conversation_${conversationId}`).emit('reaction_updated', {
      conversationId,
      messageId,
      reactions,
    });
  }

  notifyConversationUpdated(participantIds: string[], conversation: any) {
    for (const pid of participantIds) {
      this.server.to(`user_${pid}`).emit('conversation_updated', conversation);
    }
  }
}
