import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { RelationshipState } from './connection-actions.dto';
import { NetworkActivityType } from '../schemas/network-activity.schema';

export class GetNetworkActivityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  @IsIn(['all', 'connections'])
  scope?: 'all' | 'connections' = 'all';

  @IsOptional()
  @IsString()
  @IsIn(['all', 'courses', 'achievements', 'streaks', 'lessons'])
  type?: 'all' | 'courses' | 'achievements' | 'streaks' | 'lessons' = 'all';
}

export interface NetworkActivityActor {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  headline?: string;
  isVerified?: boolean;
}

export interface NetworkActivityResponseItem {
  id: string;
  actor: NetworkActivityActor;
  type: NetworkActivityType;
  context: {
    courseId?: string;
    courseName?: string;
    lessonId?: string;
    lessonName?: string;
    achievementId?: string;
    achievementName?: string;
    streakDays?: number;
    thumbnail?: string;
  };
  createdAt: string;
  relationship: {
    state: RelationshipState;
    connectionId?: string;
  };
}

export interface PaginatedNetworkActivityResponse {
  data: NetworkActivityResponseItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface NetworkActivitySummaryResponse {
  activeConnectionsCount: number;
  weeklyMilestonesCount: number;
  weeklyAchievementsCount: number;
}
