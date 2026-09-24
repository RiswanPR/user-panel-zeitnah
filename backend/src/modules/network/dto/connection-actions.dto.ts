import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiscoverableStudent } from './discoverable-student.dto';

export type RelationshipState =
  | 'none'
  | 'outgoing_pending'
  | 'incoming_pending'
  | 'connected'
  | 'self'
  | 'blocked';

export class GetConnectionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 12;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export interface RelationshipStateResponse {
  targetUserId: string;
  state: RelationshipState;
  connectionId?: string;
}

export interface ConnectionItem {
  connectionId: string;
  user: DiscoverableStudent;
  connectedAt: string;
}

export interface ConnectionRequestItem {
  connectionId: string;
  user: DiscoverableStudent;
  createdAt: string;
}

export interface ConnectionCountsResponse {
  connectionsCount: number;
  incomingRequestsCount: number;
  outgoingRequestsCount: number;
}

export interface PaginatedConnectionsResponse {
  data: ConnectionItem[];
  connections?: ConnectionItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface ProfileNetworkStatsResponse {
  userId: string;
  username: string;
  followers: number;
  following: number;
  connections: number;
  followersCount: number;
  followingCount: number;
  connectionsCount: number;
  relationship?: {
    isFollowing: boolean;
    isFollowedBy: boolean;
    connectionStatus: string;
    requestSent: boolean;
    requestReceived: boolean;
    connectionId?: string | null;
  };
}

export interface NetworkUserItem {
  _id: string;
  name: string;
  username: string;
  email?: string;
  avatar?: string;
  avatarUrl?: string;
  headline?: string;
  currentRole?: string;
  role?: string;
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  connectionStatus?: string;
  connectionId?: string | null;
  connectedSince?: string;
  followedSince?: string;
}

export interface PaginatedNetworkUsersResponse {
  data: NetworkUserItem[];
  followers?: NetworkUserItem[];
  following?: NetworkUserItem[];
  connections?: NetworkUserItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}
