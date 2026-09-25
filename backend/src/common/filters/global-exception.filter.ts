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
        message =
          'We encountered an internal server error. Our team has been notified.';
        code = 'INTERNAL_SERVER_ERROR';
      }
    } else {
      // It's a raw exception (DB error, NodeJS error, AWS error, etc)
      // Do not leak stack traces to the client!
      message =
        'We encountered an unexpected error. Our team has been notified.';
    }

    const sanitizedUrl = request.url
      ? request.url.replace(/([?&]token=)[^&]+/gi, '$1[REDACTED]')
      : request.url;

    const errorResponse = {
      success: false,
      code,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
      path: sanitizedUrl,
    };

    // Log internally based on error severity:
    // Log 5xx & unhandled internal errors as ERROR with stack trace
    // Log 4xx expected client errors as WARN without stack trace to prevent PM2 error log spam
    // Distinguish expected anonymous/expired-token checks on /auth/me from genuine auth errors
    const isExpectedMeCheck =
      status === 401 &&
      sanitizedUrl?.startsWith('/api/auth/me') &&
      (message === 'Unauthorized' || code === 'HTTP_EXCEPTION');

    if (status >= 500) {
      this.logger.error(
        `[${correlationId}] ${request.method} ${sanitizedUrl} - Status: ${status}`,
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
      );
    } else if (isExpectedMeCheck) {
      this.logger.debug(
        `[${correlationId}] ${request.method} ${sanitizedUrl} - Status: ${status} - Expected unauthenticated session check`,
      );
    } else if (status === 401) {
      // Structured auth failure log for diagnosing unexpected 401s without leaking raw tokens
      const authUser = (request as any)?.user;
      const authHeader = request.headers.authorization;
      const rawToken =
        typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.slice(7).trim()
          : (request as any).cookies?.token ||
            (request as any).cookies?.accessToken;

      let tokenPayload: any = null;
      let tokenExpiryState: string = 'NO_TOKEN';

      if (rawToken && typeof rawToken === 'string') {
        try {
          const parts = rawToken.split('.');
          if (parts.length === 3) {
            tokenPayload = JSON.parse(
              Buffer.from(parts[1], 'base64url').toString('utf8'),
            );
            if (tokenPayload?.exp) {
              const expiresAtMs = tokenPayload.exp * 1000;
              tokenExpiryState =
                Date.now() > expiresAtMs
                  ? `EXPIRED_AT_${new Date(expiresAtMs).toISOString()}`
                  : `VALID_UNTIL_${new Date(expiresAtMs).toISOString()}`;
            } else {
              tokenExpiryState = 'NO_EXP_CLAIM';
            }
          } else {
            tokenExpiryState = 'MALFORMED_JWT';
          }
        } catch {
          tokenExpiryState = 'PARSE_ERROR';
        }
      }

      const authDiag = {
        event: 'AUTH_FAILURE',
        correlationId,
        method: request.method,
        endpoint: sanitizedUrl,
        status,
        message,
        userId: authUser?.userId || tokenPayload?.userId || null,
        deviceId: authUser?.deviceId || tokenPayload?.deviceId || null,
        tokenExpiryState,
        hasAuthHeader: Boolean(authHeader),
        timestamp: new Date().toISOString(),
      };
      this.logger.warn(JSON.stringify(authDiag));
    } else {
      this.logger.warn(
        `[${correlationId}] ${request.method} ${sanitizedUrl} - Status: ${status} - ${message}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
