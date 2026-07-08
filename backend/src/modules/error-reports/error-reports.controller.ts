import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ErrorReportsService } from './error-reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.service';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('error-reports')
export class ErrorReportsController {
  constructor(private readonly errorReportsService: ErrorReportsService) {}

  // Public endpoint (can be called by frontend without auth, but we try to attach user if token exists)
  @Post()
  create(@Req() req: Request, @Body() createErrorReportDto: any) {
    // Attempt to extract userId if an auth header was optionally provided
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // In a real app we'd decode it safely. For now we let the service rely on the auth data in the payload.
      // Or we can rely on the frontend sending the decoded userId in the payload.authentication.userId.
      userId = createErrorReportDto?.authentication?.userId;
      if (userId === 'Unknown') userId = undefined;
    }

    return this.errorReportsService.create(createErrorReportDto, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() req: AuthenticatedRequest, @Query() query: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.errorReportsService.findAll(query);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() updateData: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return this.errorReportsService.update(id, updateData);
  }
}
