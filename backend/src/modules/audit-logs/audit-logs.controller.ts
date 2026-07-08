import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';

import type { Request } from 'express';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/auth.service';
import type { AuditLogSeverity } from './schemas/audit-log.schema';
import { AuditLogsService } from './audit-logs.service';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  find(
    @Req()
    req: AuthenticatedRequest,

    @Query('action')
    action?: string,

    @Query('entityType')
    entityType?: string,

    @Query('severity')
    severity?: AuditLogSeverity,

    @Query('page')
    page?: string,

    @Query('limit')
    limit?: string,
  ) {
    return this.auditLogsService.find({
      actor: req.user.role === 'admin' ? undefined : req.user.userId,
      action,
      entityType,
      severity,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Post('client-error')
  logClientError(@Req() req: Request, @Body() body: any) {
    // Log the detailed diagnostic internally
    const correlationId = body.correlationId || 'no-correlation-id';
    console.error(
      `[CLIENT_ERROR] [${correlationId}] URL: ${body.apiUrl} Status: ${body.httpStatus}`,
      JSON.stringify(body, null, 2)
    );
    return { success: true };
  }
}
