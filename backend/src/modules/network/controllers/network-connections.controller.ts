import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Req,
  Body,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { NetworkConnectionsService } from '../services/network-connections.service';
import { QueryPeopleDto } from '../dto/network.dto';

@ApiTags('Network Connections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('network')
export class NetworkConnectionsController {
  constructor(private readonly connService: NetworkConnectionsService) {}

  private getUserId(req: any): string {
    return req.user?.userId || req.user?._id || req.user?.id || req.user?.sub;
  }

  @Get('people')
  @ApiOperation({ summary: 'Discover people in the network' })
  async getPeople(@Req() req, @Query() query: QueryPeopleDto) {
    return this.connService.getPeople(this.getUserId(req), query);
  }

  @Get('connections')
  @ApiOperation({ summary: 'Get user connections' })
  async getConnections(@Req() req, @Query() query: any) {
    return this.connService.getConnections(this.getUserId(req), query);
  }

  @Get('connections/requests')
  @ApiOperation({ summary: 'Get pending connection requests' })
  async getPendingRequests(@Req() req) {
    return this.connService.getPendingRequests(this.getUserId(req));
  }

  @Post('connections/request/:recipientId')
  @ApiOperation({ summary: 'Send connection request' })
  async sendRequest(@Req() req, @Param('recipientId') recipientId: string) {
    return this.connService.sendConnectionRequest(this.getUserId(req), recipientId);
  }

  @Post('connections')
  @ApiOperation({ summary: 'Send connection request via body' })
  async sendConnection(@Req() req, @Body() body: { recipientId?: string; targetUserId?: string }) {
    const recipientId = body?.recipientId || body?.targetUserId;
    if (!recipientId) {
      throw new BadRequestException('recipientId is required');
    }
    return this.connService.sendConnectionRequest(this.getUserId(req), recipientId);
  }

  @Patch('connections/:id/accept')
  @ApiOperation({ summary: 'Accept connection request' })
  async acceptRequest(@Req() req, @Param('id') id: string) {
    return this.connService.acceptConnectionRequest(id, this.getUserId(req));
  }

  @Delete('connections/:id')
  @ApiOperation({ summary: 'Remove connection or cancel request' })
  async removeConnection(@Req() req, @Param('id') id: string) {
    return this.connService.removeConnection(id, this.getUserId(req));
  }
}
