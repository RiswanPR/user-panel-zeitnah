import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';

@ApiTags('Support')
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * Public support ticket submission endpoint.
   * Rate limited to 5 submissions per minute to prevent abuse and spam.
   */
  @Post('ticket')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Submit a customer support request' })
  @ApiResponse({
    status: 201,
    description: 'Support ticket successfully submitted',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - rate limit exceeded',
  })
  async submitTicket(
    @Req() req: Request,
    @Body() createTicketDto: CreateSupportTicketDto,
  ) {
    // Optionally extract userId if caller is logged in
    let userId: string | undefined;
    const authUser = (req as any).user;
    if (authUser?.userId) {
      userId = authUser.userId;
    }

    return this.supportService.createTicket(createTicketDto, userId);
  }
}
