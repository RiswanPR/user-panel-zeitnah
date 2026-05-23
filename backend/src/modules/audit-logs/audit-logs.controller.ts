import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import type { Request } from 'express';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/auth.service';
import type { AuditLogSeverity } from './schemas/audit-log.schema';
import { AuditLogsService } from './audit-logs.service';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

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
}
