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
import { CommunityService } from './community.service';
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
} from './dto/connection-actions.dto';
import { PublicNetworkProfile } from './dto/network-profile.dto';
import {
  GetNetworkActivityQueryDto,
  PaginatedNetworkActivityResponse,
  NetworkActivitySummaryResponse,
} from './dto/network-activity.dto';
import {
  GetCommunitiesQueryDto,
  CreateDiscussionDto,
  UpdateDiscussionDto,
  CreateReplyDto,
  CreateAnnouncementDto,
  CreateResourceDto,
  CreateReportDto,
  PaginatedCommunitiesResponse,
  CommunityDetailResponse,
  DiscussionResponseItem,
  DiscussionDetailResponse,
  ReplyResponseItem,
  AnnouncementResponseItem,
  ResourceResponseItem,
} from './dto/community.dto';

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
  constructor(
    private readonly networkService: NetworkService,
    private readonly communityService: CommunityService,
  ) {}

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

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 6: COMMUNITIES & LEARNING SPACES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Discovers communities with search, filtering, recommendations, and pagination.
   */
  @Get('communities')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getCommunities(
    @Query() query: GetCommunitiesQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<PaginatedCommunitiesResponse> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.communityService.getCommunities(
      query,
      currentUserId ? String(currentUserId) : undefined,
    );
  }

  /**
   * Retrieves full community details by slug.
   */
  @Get('communities/:slug')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getCommunityBySlug(
    @Param('slug') slug: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<CommunityDetailResponse> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.communityService.getCommunityBySlug(
      slug,
      currentUserId ? String(currentUserId) : undefined,
    );
  }

  /**
   * Joins a community.
   */
  @Post('communities/:id/join')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async joinCommunity(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; state: string }> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.communityService.joinCommunity(id, String(currentUserId));
  }

  /**
   * Leaves a community.
   */
  @Delete('communities/:id/leave')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async leaveCommunity(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; state: string }> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.communityService.leaveCommunity(id, String(currentUserId));
  }

  /**
   * Retrieves paginated community members.
   */
  @Get('communities/:id/members')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getCommunityMembers(
    @Param('id') id: string,
    @Query()
    query: { q?: string; role?: string; page?: number; limit?: number },
  ) {
    return this.communityService.getCommunityMembers(id, query);
  }

  /**
   * Retrieves discussions for a community.
   */
  @Get('communities/:id/discussions')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getCommunityDiscussions(
    @Param('id') id: string,
    @Query() query: { type?: string; page?: number; limit?: number },
  ) {
    return this.communityService.getDiscussions(id, query);
  }

  /**
   * Creates a discussion in a community.
   */
  @Post('communities/:id/discussions')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async createCommunityDiscussion(
    @Param('id') id: string,
    @Body() dto: CreateDiscussionDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<DiscussionResponseItem> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.communityService.createDiscussion(
      id,
      dto,
      String(currentUserId),
    );
  }

  /**
   * Retrieves discussion detail.
   */
  @Get('discussions/:id')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getDiscussionDetail(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<DiscussionDetailResponse> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.communityService.getDiscussionDetail(
      id,
      currentUserId ? String(currentUserId) : undefined,
    );
  }

  /**
   * Updates discussion.
   */
  @Patch('discussions/:id')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async updateDiscussion(
    @Param('id') id: string,
    @Body() dto: UpdateDiscussionDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean }> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.communityService.updateDiscussion(
      id,
      dto,
      String(currentUserId),
    );
  }

  /**
   * Deletes a discussion.
   */
  @Delete('discussions/:id')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async deleteDiscussion(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean }> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.communityService.deleteDiscussion(id, String(currentUserId));
  }

  /**
   * Locks or unlocks a discussion.
   */
  @Patch('discussions/:id/lock')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async lockDiscussion(
    @Param('id') id: string,
    @Body() body: { locked: boolean },
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; status: string }> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.communityService.lockDiscussion(
      id,
      Boolean(body.locked),
      String(currentUserId),
    );
  }

  /**
   * Retrieves flat chronological replies for a discussion.
   */
  @Get('discussions/:id/replies')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getDiscussionReplies(
    @Param('id') id: string,
    @Query() query: { page?: number; limit?: number },
  ) {
    return this.communityService.getReplies(id, query);
  }

  /**
   * Adds a reply to a discussion.
   */
  @Post('discussions/:id/replies')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async createDiscussionReply(
    @Param('id') id: string,
    @Body() dto: CreateReplyDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ReplyResponseItem> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.communityService.createReply(id, dto, String(currentUserId));
  }

  /**
   * Deletes a reply.
   */
  @Delete('discussions/:discussionId/replies/:replyId')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async deleteDiscussionReply(
    @Param('discussionId') discussionId: string,
    @Param('replyId') replyId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean }> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.communityService.deleteReply(
      discussionId,
      replyId,
      String(currentUserId),
    );
  }

  /**
   * Retrieves announcements for a community.
   */
  @Get('communities/:id/announcements')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getCommunityAnnouncements(
    @Param('id') id: string,
  ): Promise<AnnouncementResponseItem[]> {
    return this.communityService.getAnnouncements(id);
  }

  /**
   * Creates an announcement (moderators/owners only).
   */
  @Post('communities/:id/announcements')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async createCommunityAnnouncement(
    @Param('id') id: string,
    @Body() dto: CreateAnnouncementDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<AnnouncementResponseItem> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.communityService.createAnnouncement(
      id,
      dto,
      String(currentUserId),
    );
  }

  /**
   * Retrieves resources for a community.
   */
  @Get('communities/:id/resources')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getCommunityResources(
    @Param('id') id: string,
  ): Promise<ResourceResponseItem[]> {
    return this.communityService.getResources(id);
  }

  /**
   * Adds a resource to a community.
   */
  @Post('communities/:id/resources')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async createCommunityResource(
    @Param('id') id: string,
    @Body() dto: CreateResourceDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ResourceResponseItem> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.communityService.createResource(id, dto, String(currentUserId));
  }

  /**
   * Reports community content.
   */
  @Post('communities/report')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async reportContent(
    @Body() dto: CreateReportDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean }> {
    const currentUserId = req.user?.userId || req.user?._id;
    return this.communityService.reportContent(dto, String(currentUserId));
  }
}
