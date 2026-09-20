import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { NotificationCategory } from '../schemas/notification.schema';

export class GetNotificationsDto {
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
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
  category?: NotificationCategory;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unreadOnly?: boolean = false;

  @IsOptional()
  @IsString()
  cursor?: string;
}
