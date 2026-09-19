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
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}
