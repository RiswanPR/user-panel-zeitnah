import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TroubleshootService } from './troubleshoot.service';
import { SubmitReportDto } from './dto/submit-report.dto';
import type { AuthenticatedUser } from '../auth/auth.service';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@ApiTags('Troubleshoot')
@Controller('troubleshoot')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TroubleshootController {
  constructor(
    private readonly troubleshootService: TroubleshootService,
  ) {}

  /**
   * Submit a troubleshoot error report.
   * Available to any authenticated user.
   */
  @Post('report')
  submitReport(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SubmitReportDto,
  ) {
    return this.troubleshootService.submitReport(
      req.user.userId,
      req.user.email,
      dto,
    );
  }

  /**
   * List all troubleshoot reports with pagination and filters.
   */
  @Get('reports')
  findReports(
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.troubleshootService.findReports({
      severity,
      status,
      page: Number(page),
      limit: Number(limit),
    });
  }
}
