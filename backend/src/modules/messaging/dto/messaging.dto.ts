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
  @IsEnum(['chats', 'requests', 'archived'])
  tab?: 'chats' | 'requests' | 'archived' = 'chats';

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
  limit?: number = 30;

  @IsOptional()
  @IsString()
  q?: string;
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
