import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { LearningSpacesService } from '../services/learning-spaces.service';
import {
  CreateDiscussionDto,
  CreateReplyDto,
  CreateSpaceAnnouncementDto,
  CreateResourceDto,
} from '../dto/learning-space.dto';

@ApiTags('Learning Spaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('network')
export class LearningSpacesController {
  constructor(private readonly spacesService: LearningSpacesService) {}

  private getUserId(req: any): string {
    return req.user?.userId || req.user?._id || req.user?.id || req.user?.sub;
  }

  private getUserRole(req: any): string {
    return req.user?.role || 'student';
  }

  @Get('spaces')
  @ApiOperation({ summary: 'Get learning spaces for user' })
  async getSpaces(@Req() req, @Query() query: any) {
    return this.spacesService.getSpaces(this.getUserId(req), this.getUserRole(req), query);
  }

  @Get('spaces/:idOrSlug')
  @ApiOperation({ summary: 'Get learning space details' })
  async getSpaceDetails(@Req() req, @Param('idOrSlug') idOrSlug: string) {
    return this.spacesService.getSpaceDetails(idOrSlug, this.getUserId(req), this.getUserRole(req));
  }

  @Post('spaces/:idOrSlug/join')
  @ApiOperation({ summary: 'Join a learning space' })
  async joinSpace(@Req() req, @Param('idOrSlug') idOrSlug: string) {
    return this.spacesService.joinSpace(idOrSlug, this.getUserId(req));
  }

  @Delete('spaces/:idOrSlug/leave')
  @ApiOperation({ summary: 'Leave a learning space' })
  async leaveSpace(@Req() req, @Param('idOrSlug') idOrSlug: string) {
    return this.spacesService.leaveSpace(idOrSlug, this.getUserId(req));
  }

  @Get('spaces/:idOrSlug/announcements')
  @ApiOperation({ summary: 'Get space announcements' })
  async getAnnouncements(@Req() req, @Param('idOrSlug') idOrSlug: string) {
    return this.spacesService.getAnnouncements(idOrSlug, this.getUserId(req), this.getUserRole(req));
  }

  @Post('spaces/:idOrSlug/announcements')
  @ApiOperation({ summary: 'Create space announcement' })
  async createAnnouncement(
    @Req() req,
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: CreateSpaceAnnouncementDto,
  ) {
    return this.spacesService.createAnnouncement(
      idOrSlug,
      this.getUserId(req),
      this.getUserRole(req),
      dto,
    );
  }

  @Get('spaces/:idOrSlug/discussions')
  @ApiOperation({ summary: 'Get space discussions' })
  async getDiscussions(@Req() req, @Param('idOrSlug') idOrSlug: string, @Query() query: any) {
    return this.spacesService.getDiscussions(idOrSlug, this.getUserId(req), this.getUserRole(req), query);
  }

  @Post('spaces/:idOrSlug/discussions')
  @ApiOperation({ summary: 'Create space discussion' })
  async createDiscussion(
    @Req() req,
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: CreateDiscussionDto,
  ) {
    return this.spacesService.createDiscussion(
      idOrSlug,
      this.getUserId(req),
      this.getUserRole(req),
      dto,
    );
  }

  @Get('discussions/:id')
  @ApiOperation({ summary: 'Get discussion detail' })
  async getDiscussionDetail(@Req() req, @Param('id') id: string) {
    return this.spacesService.getDiscussionDetail(id, this.getUserId(req), this.getUserRole(req));
  }

  @Get('discussions/:id/replies')
  @ApiOperation({ summary: 'Get discussion replies' })
  async getReplies(@Req() req, @Param('id') id: string, @Query() query: any) {
    return this.spacesService.getReplies(id, this.getUserId(req), this.getUserRole(req), query);
  }

  @Post('discussions/:id/replies')
  @ApiOperation({ summary: 'Post reply to discussion' })
  async createReply(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: CreateReplyDto,
  ) {
    return this.spacesService.createReply(id, this.getUserId(req), this.getUserRole(req), dto);
  }

  @Get('spaces/:idOrSlug/resources')
  @ApiOperation({ summary: 'Get space resources' })
  async getResources(@Req() req, @Param('idOrSlug') idOrSlug: string) {
    return this.spacesService.getResources(idOrSlug, this.getUserId(req), this.getUserRole(req));
  }

  @Post('spaces/:idOrSlug/resources')
  @ApiOperation({ summary: 'Create space resource' })
  async createResource(
    @Req() req,
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: CreateResourceDto,
  ) {
    return this.spacesService.createResource(idOrSlug, this.getUserId(req), this.getUserRole(req), dto);
  }

  @Get('spaces/:idOrSlug/members')
  @ApiOperation({ summary: 'Get space members' })
  async getMembers(@Req() req, @Param('idOrSlug') idOrSlug: string, @Query() query: any) {
    return this.spacesService.getMembers(idOrSlug, this.getUserId(req), this.getUserRole(req), query);
  }
}
