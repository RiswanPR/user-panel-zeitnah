import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NetworkService } from './network.service';
import { GetStudentsDto } from './dto/get-students.dto';
import {
  PaginatedStudentsResponse,
  NetworkFiltersResponse,
  DiscoverableStudent,
} from './dto/discoverable-student.dto';
import {
  GetConnectionsQueryDto,
  PaginatedConnectionsResponse,
  ConnectionRequestItem,
  ConnectionCountsResponse,
  RelationshipStateResponse,
  RelationshipState,
  ProfileNetworkStatsResponse,
  PaginatedNetworkUsersResponse,
} from './dto/connection-actions.dto';
import { PublicNetworkProfile } from './dto/network-profile.dto';
import {
  GetNetworkActivityQueryDto,
  PaginatedNetworkActivityResponse,
  NetworkActivitySummaryResponse,
} from './dto/network-activity.dto';

interface AuthenticatedRequest {
  user?: {
    userId?: string;
    _id?: string;
    role?: string;
  };
}

@Controller('network')
@UseGuards(JwtAuthGuard)
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // STUDENT DISCOVERY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Discovers students with search, filtering, pagination, and relationship enrichment.
   */
  @Get('students')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getStudents(
    @Query() dto: GetStudentsDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<PaginatedStudentsResponse> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.getStudents(
      dto,
      currentUserId ? String(currentUserId) : undefined,
    );
  }

  /**
   * Retrieves real available filters (courses, skills, institutions, levels).
   */
  @Get('filters')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getFilters(): Promise<NetworkFiltersResponse> {
    return this.networkService.getFilters();
  }

  /**
   * Retrieves a student's public learning profile preview by username.
   */
  @Get('students/:username')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getStudentByUsername(
    @Param('username') username: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<DiscoverableStudent> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.getStudentByUsername(
      username,
      currentUserId ? String(currentUserId) : undefined,
    );
  }

  /**
   * Phase 4: Retrieves full public student profile with safe projection.
   */
  @Get('profile/:username')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getStudentProfile(
    @Param('username') username: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<PublicNetworkProfile> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.getStudentProfile(
      username,
      currentUserId ? String(currentUserId) : undefined,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONNECTIONS & RELATIONSHIPS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Retrieves paginated connected students for authenticated user.
   */
  @Get('connections')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getConnections(
    @Query() query: GetConnectionsQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<PaginatedConnectionsResponse> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.getConnections(String(currentUserId), query);
  }

  /**
   * Retrieves incoming pending connection requests for authenticated user.
   */
  @Get('connections/requests')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getIncomingRequests(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ data: ConnectionRequestItem[]; total: number }> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.getIncomingRequests(String(currentUserId));
  }

  /**
   * Retrieves outgoing pending connection requests sent by authenticated user.
   */
  @Get('connections/sent')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getOutgoingRequests(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ data: ConnectionRequestItem[]; total: number }> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.getOutgoingRequests(String(currentUserId));
  }

  /**
   * Retrieves connection counts (connected, incoming requests, outgoing sent).
   */
  @Get('connections/counts')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getConnectionCounts(
    @Req() req: AuthenticatedRequest,
  ): Promise<ConnectionCountsResponse> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.getConnectionCounts(String(currentUserId));
  }

  /**
   * Retrieves personal network stats (active students, connections, pending requests, spaces).
   */
  @Get('stats')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getNetworkStats(@Req() req: AuthenticatedRequest) {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.getNetworkStats(
      currentUserId ? String(currentUserId) : undefined,
    );
  }

  /**
   * Retrieves profile network statistics (followers, following, connections, relationship) for target user.
   */
  @Get('stats/:userId')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getProfileStats(
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ProfileNetworkStatsResponse> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.getProfileNetworkStats(
      userId,
      currentUserId ? String(currentUserId) : undefined,
    );
  }

  /**
   * Alias: Retrieves profile network statistics under /network/users/:userId/stats.
   */
  @Get('users/:userId/stats')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getUserNetworkStats(
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ProfileNetworkStatsResponse> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.getProfileNetworkStats(
      userId,
      currentUserId ? String(currentUserId) : undefined,
    );
  }

  /**
   * Retrieves paginated followers for a specific user.
   */
  @Get('users/:userId/followers')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getUserFollowers(
    @Param('userId') userId: string,
    @Query() query: GetConnectionsQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<PaginatedNetworkUsersResponse> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.getUserFollowers(
      userId,
      currentUserId ? String(currentUserId) : undefined,
      query,
    );
  }

  /**
   * Retrieves paginated following for a specific user.
   */
  @Get('users/:userId/following')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getUserFollowing(
    @Param('userId') userId: string,
    @Query() query: GetConnectionsQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<PaginatedNetworkUsersResponse> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.getUserFollowing(
      userId,
      currentUserId ? String(currentUserId) : undefined,
      query,
    );
  }

  /**
   * Retrieves paginated accepted connections for a specific user.
   */
  @Get('users/:userId/connections')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getUserConnections(
    @Param('userId') userId: string,
    @Query() query: GetConnectionsQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<PaginatedNetworkUsersResponse> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.getUserConnections(
      userId,
      currentUserId ? String(currentUserId) : undefined,
      query,
    );
  }

  /**
   * Follows a target user.
   */
  @Post('users/:userId/follow')
  @Throttle({
    default: {
      limit: 30,
      ttl: 60000,
    },
  })
  async followUser(
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.followUser(String(currentUserId), userId);
  }

  /**
   * Unfollows a target user.
   */
  @Delete('users/:userId/follow')
  @Throttle({
    default: {
      limit: 30,
      ttl: 60000,
    },
  })
  async unfollowUser(
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.unfollowUser(String(currentUserId), userId);
  }

  /**
   * Connect with a target user (alias).
   */
  @Post('users/:userId/connect')
  @Throttle({
    default: {
      limit: 30,
      ttl: 60000,
    },
  })
  async connectUser(
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.sendRequest(String(currentUserId), userId);
  }

  /**
   * Retrieves all pending connection requests (both incoming and outgoing).
   */
  @Get('requests')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getRequests(@Req() req: AuthenticatedRequest) {
    const currentUserId = req.user?.userId || req.user?._id;
    const [incoming, outgoing] = await Promise.all([
      this.networkService.getIncomingRequests(String(currentUserId)),
      this.networkService.getOutgoingRequests(String(currentUserId)),
    ]);
    return {
      incoming: incoming.data,
      outgoing: outgoing.data,
      incomingCount: incoming.total,
      outgoingCount: outgoing.total,
      total: incoming.total + outgoing.total,
    };
  }

  /**
   * Accepts a connection request by request ID (alias for POST /network/requests/:requestId/accept).
   */
  @Post('requests/:requestId/accept')
  @Throttle({
    default: {
      limit: 30,
      ttl: 60000,
    },
  })
  async acceptRequestById(
    @Param('requestId') requestId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.acceptRequest(String(currentUserId), requestId);
  }

  /**
   * Rejects a connection request by request ID (alias for POST /network/requests/:requestId/reject).
   */
  @Post('requests/:requestId/reject')
  @Throttle({
    default: {
      limit: 30,
      ttl: 60000,
    },
  })
  async rejectRequestById(
    @Param('requestId') requestId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.declineRequest(String(currentUserId), requestId);
  }

  /**
   * Rejects a connection request (alias for PATCH /network/connections/:connectionId/reject).
   */
  @Patch('connections/:connectionId/reject')
  @Throttle({
    default: {
      limit: 30,
      ttl: 60000,
    },
  })
  async rejectRequest(
    @Param('connectionId') connectionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.declineRequest(
      String(currentUserId),
      connectionId,
    );
  }

  /**
   * Retrieves relationship state between authenticated user and target student.
   */
  @Get('connections/relationship/:targetUserId')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getRelationshipState(
    @Param('targetUserId') targetUserId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<RelationshipStateResponse> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.getRelationshipState(
      String(currentUserId),
      targetUserId,
    );
  }

  /**
   * Sends a connection request to a target student.
   */
  @Post('connections/request/:targetUserId')
  @Throttle({
    default: {
      limit: 30,
      ttl: 60000,
    },
  })
  async sendRequest(
    @Param('targetUserId') targetUserId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{
    success: boolean;
    state: RelationshipState;
    connectionId: string;
  }> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.sendRequest(String(currentUserId), targetUserId);
  }

  /**
   * Accepts an incoming connection request.
   */
  @Patch('connections/:connectionId/accept')
  @Throttle({
    default: {
      limit: 30,
      ttl: 60000,
    },
  })
  async acceptRequest(
    @Param('connectionId') connectionId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{
    success: boolean;
    state: RelationshipState;
    connectionId: string;
  }> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.acceptRequest(
      String(currentUserId),
      connectionId,
    );
  }

  /**
   * Declines an incoming connection request.
   */
  @Patch('connections/:connectionId/decline')
  @Throttle({
    default: {
      limit: 30,
      ttl: 60000,
    },
  })
  async declineRequest(
    @Param('connectionId') connectionId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; state: RelationshipState }> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.declineRequest(
      String(currentUserId),
      connectionId,
    );
  }

  /**
   * Cancels an outgoing connection request.
   */
  @Delete('connections/:connectionId/cancel')
  @Throttle({
    default: {
      limit: 30,
      ttl: 60000,
    },
  })
  async cancelRequest(
    @Param('connectionId') connectionId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; state: RelationshipState }> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.cancelRequest(
      String(currentUserId),
      connectionId,
    );
  }

  /**
   * Removes an existing connection.
   */
  @Delete('connections/:connectionId')
  @Throttle({
    default: {
      limit: 30,
      ttl: 60000,
    },
  })
  async removeConnection(
    @Param('connectionId') connectionId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; state: RelationshipState }> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.removeConnection(
      String(currentUserId),
      connectionId,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NETWORK ACTIVITY FEED
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Phase 5: Retrieves learning activity feed with scope & type filtering, relationship enrichment.
   */
  @Get('activity')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getActivityFeed(
    @Query() query: GetNetworkActivityQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<PaginatedNetworkActivityResponse> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.getActivityFeed(
      query,
      currentUserId ? String(currentUserId) : undefined,
    );
  }

  /**
   * Phase 5: Retrieves network activity summary (active connections, weekly milestones, weekly achievements).
   */
  @Get('activity/summary')
  @Throttle({
    default: {
      limit: 60,
      ttl: 60000,
    },
  })
  async getActivitySummary(
    @Req() req: AuthenticatedRequest,
  ): Promise<NetworkActivitySummaryResponse> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.networkService.getActivitySummary(
      currentUserId ? String(currentUserId) : undefined,
    );
  }
}
