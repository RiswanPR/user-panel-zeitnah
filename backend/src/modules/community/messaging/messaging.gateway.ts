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
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { ConversationService } from './services/conversation.service';
import { MessageService } from './services/message.service';
import { PresenceService } from './services/presence.service';
import { TypingService } from './services/typing.service';
import { PresenceStatus } from './schemas/user-presence.schema';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/community/messages',
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MessagingGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly presenceService: PresenceService,
    private readonly typingService: TypingService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(`Rejected unauthorized socket connection: ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload._id || payload.id || payload.sub;

      client.data.userId = userId;
      client.data.user = payload;

      client.join(`user_${userId}`);

      await this.presenceService.setPresence(userId, PresenceStatus.ONLINE);
      this.server.emit('presence_updated', {
        userId,
        status: PresenceStatus.ONLINE,
      });

      this.logger.log(`User connected to messaging socket: ${userId} (${client.id})`);
    } catch (err) {
      this.logger.error(`Socket auth failed for client ${client.id}:`, err);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      await this.presenceService.setPresence(userId, PresenceStatus.OFFLINE);
      this.server.emit('presence_updated', {
        userId,
        status: PresenceStatus.OFFLINE,
        lastSeen: new Date(),
      });
      this.logger.log(`User disconnected from messaging socket: ${userId}`);
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!data.conversationId) return;

    try {
      await this.conversationService.getConversationById(
        data.conversationId,
        userId,
      );
      client.join(`conversation_${data.conversationId}`);
    } catch (err) {
      client.emit('error', { message: 'Access denied to conversation' });
    }
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.conversationId) {
      client.leave(`conversation_${data.conversationId}`);
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    try {
      const message = await this.messageService.sendMessage(userId, data);

      this.server
        .to(`conversation_${data.conversationId}`)
        .emit('message_received', message);

      const conversation = await this.conversationService.getConversationById(
        data.conversationId,
        userId,
      );

      for (const participantId of conversation.participants) {
        this.server.to(`user_${participantId}`).emit('conversation_updated', {
          conversationId: data.conversationId,
          lastMessagePreview: message.content,
          lastActivity: message.createdAt,
        });
      }
    } catch (err) {
      client.emit('error', { message: err.message || 'Failed to send message' });
    }
  }

  @SubscribeMessage('react_message')
  async handleReactMessage(
    @MessageBody() data: { messageId: string; emoji: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    try {
      const updatedMessage = await this.messageService.reactToMessage(
        userId,
        data.messageId,
        data.emoji,
      );

      this.server
        .to(`conversation_${updatedMessage.conversationId}`)
        .emit('message_reacted', updatedMessage);
    } catch (err) {
      client.emit('error', { message: err.message || 'Failed to react to message' });
    }
  }

  @SubscribeMessage('pin_message')
  async handlePinMessage(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    try {
      const updatedMessage = await this.messageService.pinMessage(
        userId,
        data.messageId,
      );

      this.server
        .to(`conversation_${updatedMessage.conversationId}`)
        .emit('message_pinned', updatedMessage);
    } catch (err) {
      client.emit('error', { message: err.message || 'Failed to pin message' });
    }
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!data.conversationId) return;

    await this.typingService.startTyping(data.conversationId, userId);
    client.to(`conversation_${data.conversationId}`).emit('typing_started', {
      conversationId: data.conversationId,
      userId,
    });
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!data.conversationId) return;

    await this.typingService.stopTyping(data.conversationId, userId);
    client.to(`conversation_${data.conversationId}`).emit('typing_stopped', {
      conversationId: data.conversationId,
      userId,
    });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @MessageBody() data: { conversationId: string; messageId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!data.conversationId) return;

    await this.messageService.markRead(userId, data);
    client.to(`conversation_${data.conversationId}`).emit('read_receipt', {
      conversationId: data.conversationId,
      messageId: data.messageId,
      userId,
      seenAt: new Date(),
    });
  }
}
