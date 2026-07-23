import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  Catch(exception: unknown, host: ArgumentsHost) {
    this.catch(exception, host);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const correlationId = request.headers['x-correlation-id'] || uuidv4();

    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'Something went wrong on our end. Please try again later.';

    if (exception instanceof HttpException) {
      const responseBody = exception.getResponse() as any;
      message = responseBody?.message || exception.message;
      code = responseBody?.error || 'HTTP_EXCEPTION';
      
      // Keep it somewhat generic if it's a 500
      if (status >= 500) {
        message = 'We encountered an internal server error. Our team has been notified.';
        code = 'INTERNAL_SERVER_ERROR';
      }
    } else {
      // It's a raw exception (DB error, NodeJS error, AWS error, etc)
      // Do not leak stack traces to the client!
      message = 'We encountered an unexpected error. Our team has been notified.';
    }

    const errorResponse = {
      success: false,
      code,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log internally based on error severity:
    // Log 5xx & unhandled internal errors as ERROR with stack trace
    // Log 4xx expected client errors as WARN without stack trace to prevent PM2 error log spam
    if (status >= 500) {
      this.logger.error(
        `[${correlationId}] ${request.method} ${request.url} - Status: ${status}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception),
      );
    } else {
      this.logger.warn(
        `[${correlationId}] ${request.method} ${request.url} - Status: ${status} - ${message}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
