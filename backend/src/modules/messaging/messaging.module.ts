import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import {
  SavedMessage,
  SavedMessageSchema,
} from './schemas/saved-message.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import {
  NetworkConnection,
  NetworkConnectionSchema,
} from '../network/schemas/connection.schema';
import { AwsModule } from '../../common/aws/aws.module';
import { ModerationModule } from '../moderation/moderation.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';
import { MessagesGateway } from './messages.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
    }),
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: SavedMessage.name, schema: SavedMessageSchema },
      { name: User.name, schema: UserSchema },
      { name: NetworkConnection.name, schema: NetworkConnectionSchema },
    ]),
    AwsModule,
    ModerationModule,
    NotificationsModule,
  ],
  controllers: [MessagingController],
  providers: [MessagingService, MessagesGateway],
  exports: [MessagingService, MessagesGateway, MongooseModule],
})
export class MessagingModule {}
