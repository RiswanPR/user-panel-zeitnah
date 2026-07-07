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

@WebSocketGateway({
  cors: {
    origin: '*', // Should be restricted in production
    credentials: true,
  },
  namespace: '/community',
})
export class CommunityGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // Basic JWT auth extraction from handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.user = payload;

      // Join user's personal room for direct notifications
      client.join(`user_${payload.sub || payload._id}`);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Cleanup on disconnect
  }

  @SubscribeMessage('join_course_room')
  handleJoinCourseRoom(
    @MessageBody() data: { courseId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.courseId) {
      client.join(`course_${data.courseId}`);
    }
  }

  @SubscribeMessage('leave_course_room')
  handleLeaveCourseRoom(
    @MessageBody() data: { courseId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.courseId) {
      client.leave(`course_${data.courseId}`);
    }
  }

  // Helper methods to be called from Services

  private lastEmitTimes = new Map<string, number>();

  emitPostCreated(courseId: string | undefined, post: any) {
    const now = Date.now();
    const throttleKey = `post_created_${post._id}`;

    // Throttle duplicate post emissions (e.g. within 1 second)
    if (
      this.lastEmitTimes.has(throttleKey) &&
      now - this.lastEmitTimes.get(throttleKey) < 1000
    ) {
      return;
    }
    this.lastEmitTimes.set(throttleKey, now);

    if (courseId) {
      this.server.to(`course_${courseId}`).emit('post_created', post);
    } else {
      this.server.emit('post_created', post); // Public feed broadcast
    }
  }

  emitStoryCreated(story: any) {
    this.server.emit('story_created', story);
  }

  emitCommentAdded(postId: string, comment: any) {
    this.server.emit(`post_${postId}_comments`, { action: 'added', comment });
  }

  emitReaction(entityId: string, reaction: any) {
    this.server.emit(`entity_${entityId}_reaction`, reaction);
  }

  emitNotification(userId: string, notification: any) {
    this.server.to(`user_${userId}`).emit('new_notification', notification);
  }
}
