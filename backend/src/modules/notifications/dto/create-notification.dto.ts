import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
} from 'class-validator';
import {
  NotificationCategory,
  NotificationPriority,
} from '../schemas/notification.schema';

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  recipientId!: string;

  @IsString()
  @IsOptional()
  actorId?: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsEnum([
    'social',
    'learning',
    'course',
    'achievement',
    'leaderboard',
    'community',
    'organization',
    'opportunity',
    'identity',
    'security',
    'system',
  ])
  category!: NotificationCategory;

  @IsEnum(['critical', 'high', 'important', 'normal', 'low'])
  @IsOptional()
  priority?: NotificationPriority;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsString()
  @IsOptional()
  actionUrl?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
