import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsIn,
  MaxLength,
  MinLength,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CommunityType,
  CommunityVisibility,
} from '../schemas/community.schema';
import {
  CommunityRole,
  MembershipStatus,
} from '../schemas/community-membership.schema';
import {
  DiscussionType,
  DiscussionStatus,
} from '../schemas/community-discussion.schema';
import { ResourceType } from '../schemas/community-resource.schema';

export class GetCommunitiesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ALL', 'COURSE', 'SUBJECT', 'INTEREST', 'PROJECT', 'GOAL', 'GENERAL'])
  type?: string = 'ALL';

  @IsOptional()
  @IsString()
  @IsIn(['all', 'featured', 'recommended', 'popular', 'joined'])
  filter?: 'all' | 'featured' | 'recommended' | 'popular' | 'joined' = 'all';

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
  limit?: number = 12;
}

export class CreateCommunityDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['COURSE', 'SUBJECT', 'INTEREST', 'PROJECT', 'GOAL', 'GENERAL'])
  type?: CommunityType = 'GENERAL';

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['public', 'restricted', 'private'])
  visibility?: CommunityVisibility = 'public';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topics?: string[] = [];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rules?: string[];
}

export class CreateDiscussionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(10000)
  body!: string;

  @IsOptional()
  @IsString()
  @IsIn(['question', 'discussion', 'project', 'resource', 'study_help'])
  type?: DiscussionType = 'discussion';
}

export class UpdateDiscussionDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(10000)
  body?: string;
}

export class CreateReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;
}

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean = false;
}

export class CreateResourceDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsIn(['course', 'document', 'link'])
  type!: ResourceType;

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsOptional()
  @IsString()
  url?: string;
}

export class CreateReportDto {
  @IsString()
  @IsIn(['discussion', 'reply', 'community'])
  targetType!: 'discussion' | 'reply' | 'community';

  @IsString()
  targetId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSE CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════

export interface CommunityResponseItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: CommunityType;
  avatarUrl?: string;
  coverUrl?: string;
  memberCount: number;
  discussionCount: number;
  visibility: CommunityVisibility;
  status: string;
  topics: string[];
  membership: {
    state: 'not_member' | 'pending' | 'member' | 'moderator' | 'owner';
    role?: CommunityRole;
    status?: MembershipStatus;
  };
  recommendationReason?: string;
  createdAt: string;
}

export interface PaginatedCommunitiesResponse {
  data: CommunityResponseItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface CommunityDetailResponse extends CommunityResponseItem {
  rules: string[];
  permissions: {
    isMember: boolean;
    canPost: boolean;
    canModerate: boolean;
    canManage: boolean;
  };
  course?: {
    id: string;
    name: string;
    thumbnail?: string;
  };
}

export interface DiscussionAuthor {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  headline?: string;
  isVerified?: boolean;
}

export interface DiscussionResponseItem {
  id: string;
  communityId: string;
  communitySlug?: string;
  communityName?: string;
  author: DiscussionAuthor;
  title: string;
  body: string;
  type: DiscussionType;
  status: DiscussionStatus;
  isPinned: boolean;
  replyCount: number;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: {
    canEdit: boolean;
    canDelete: boolean;
    canLock: boolean;
  };
}

export type DiscussionDetailResponse = DiscussionResponseItem;

export interface ReplyResponseItem {
  id: string;
  discussionId: string;
  author: DiscussionAuthor;
  body: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: {
    canDelete: boolean;
  };
}

export interface AnnouncementResponseItem {
  id: string;
  communityId: string;
  author: DiscussionAuthor;
  title: string;
  content: string;
  pinned: boolean;
  createdAt: string;
}

export interface ResourceResponseItem {
  id: string;
  communityId: string;
  title: string;
  description?: string;
  type: ResourceType;
  targetId?: string;
  url?: string;
  createdBy: DiscussionAuthor;
  createdAt: string;
}
