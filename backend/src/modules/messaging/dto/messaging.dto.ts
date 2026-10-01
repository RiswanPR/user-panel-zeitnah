import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  MaxLength,
  MinLength,
  IsBoolean,
  IsDateString,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AttachmentDto {
  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsNumber()
  @IsOptional()
  size?: number;
}

export class CreateDirectConversationDto {
  @IsString()
  @IsNotEmpty()
  recipientId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}

export class CreateGroupConversationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  participantIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  initialMessage?: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsOptional()
  @IsString()
  replyToId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];
}

export class EditMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body!: string;
}

export class AddReactionDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(['👍', '❤️', '👏', '🎯'], {
    message: 'Reaction must be one of 👍, ❤️, 👏, 🎯',
  })
  emoji!: string;
}

export class QueryConversationsDto {
  @IsOptional()
  @IsEnum(['chats', 'requests', 'archived', 'mentions'])
  tab?: 'chats' | 'requests' | 'archived' | 'mentions' = 'chats';

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 20;
}

export class QueryMessagesDto {
  @IsOptional()
  @IsString()
  before?: string; // messageId cursor or timestamp

  @IsOptional()
  @IsString()
  around?: string; // messageId to center the message window around

  @IsOptional()
  limit?: number = 30;

  @IsOptional()
  @IsString()
  q?: string;
}

export class QuerySavedMessagesDto {
  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 20;

  @IsOptional()
  @IsString()
  q?: string;
}

export class SearchMessagingDto {
  @IsString()
  @IsNotEmpty()
  q!: string;

  @IsOptional()
  @IsEnum(['all', 'messages', 'conversations', 'people', 'files', 'links'])
  type?: 'all' | 'messages' | 'conversations' | 'people' | 'files' | 'links' =
    'all';

  @IsOptional()
  limit?: number = 20;
}

export class MuteConversationDto {
  @IsBoolean()
  muted!: boolean;

  @IsOptional()
  @IsDateString()
  until?: string;
}

export class ArchiveConversationDto {
  @IsBoolean()
  archived!: boolean;
}

export class ReportConversationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}

// ── Tier 3 DTOs ──

export class QueryMentionSuggestionsDto {
  @IsOptional()
  @IsString()
  q?: string;
}

export class CreateThreadReplyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];
}

export class QueryThreadRepliesDto {
  @IsOptional()
  @IsString()
  before?: string;

  @IsOptional()
  limit?: number = 30;
}

export class ForwardMessageDto {
  @IsString()
  @IsNotEmpty()
  sourceMessageId!: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  targetConversationIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class AddGroupMembersDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  userIds!: string[];
}

export class UpdateGroupMemberRoleDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(['ADMIN', 'MEMBER'], { message: 'Role must be ADMIN or MEMBER' })
  role!: 'ADMIN' | 'MEMBER';
}

export class UpdateGroupMetadataDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}
