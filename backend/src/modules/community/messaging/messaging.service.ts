import { Injectable } from '@nestjs/common';
import { ConversationService } from './services/conversation.service';
import { MessageService } from './services/message.service';
import { PresenceService } from './services/presence.service';
import { TypingService } from './services/typing.service';

@Injectable()
export class MessagingService {
  constructor(
    public readonly conversationService: ConversationService,
    public readonly messageService: MessageService,
    public readonly presenceService: PresenceService,
    public readonly typingService: TypingService,
  ) {}
}
