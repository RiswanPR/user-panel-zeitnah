import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import {
  Conversation,
  ConversationSchema,
} from './schemas/conversation.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import {
  MessageRead,
  MessageReadSchema,
} from './schemas/message-read.schema';
import {
  UserPresence,
  UserPresenceSchema,
} from './schemas/user-presence.schema';
import { Typing, TypingSchema } from './schemas/typing.schema';

import { ConversationService } from './services/conversation.service';
import { MessageService } from './services/message.service';
import { PresenceService } from './services/presence.service';
import { TypingService } from './services/typing.service';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';
import { MessagingGateway } from './messaging.gateway';

import { AwsModule } from '../../../common/aws/aws.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: MessageRead.name, schema: MessageReadSchema },
      { name: UserPresence.name, schema: UserPresenceSchema },
      { name: Typing.name, schema: TypingSchema },
    ]),
    AwsModule,
    RedisModule,
    JwtModule.register({ secret: process.env.JWT_SECRET || 'secret' }),
  ],
  controllers: [MessagingController],
  providers: [
    ConversationService,
    MessageService,
    PresenceService,
    TypingService,
    MessagingService,
    MessagingGateway,
  ],
  exports: [
    ConversationService,
    MessageService,
    PresenceService,
    TypingService,
    MessagingService,
    MessagingGateway,
  ],
})
export class MessagingModule {}
