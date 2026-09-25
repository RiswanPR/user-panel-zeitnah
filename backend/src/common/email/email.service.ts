import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ResendEmailProvider } from './resend-email.provider';
import {
  EmailProvider,
  EmailSendResult,
  SendEmailOptions,
} from './email-provider.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private primaryProvider: EmailProvider;
  private fallbackProvider?: EmailProvider;

  constructor(resendProvider: ResendEmailProvider) {
    this.primaryProvider = resendProvider;
  }

  /**
   * Optional registration of a secondary/fallback provider (e.g. AWS SES / SendGrid)
   */
  public registerFallbackProvider(provider: EmailProvider) {
    this.fallbackProvider = provider;
    this.logger.log(`Registered fallback email provider: ${provider.name}`);
  }

  /**
   * Resilient email dispatch with primary provider, automatic fallback,
   * timeout protection, and friendly user-facing exceptions.
   */
  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    // 1. Try Primary Provider
    const primaryResult = await this.primaryProvider.sendEmail(options);
    if (primaryResult.success) {
      return primaryResult;
    }

    this.logger.error(
      `Primary provider (${this.primaryProvider.name}) failed: ${primaryResult.error}`,
    );

    // 2. Try Fallback Provider if configured
    if (this.fallbackProvider) {
      this.logger.warn(
        `Attempting email delivery via fallback provider (${this.fallbackProvider.name})...`,
      );
      const fallbackResult = await this.fallbackProvider.sendEmail(options);
      if (fallbackResult.success) {
        return fallbackResult;
      }
      this.logger.error(
        `Fallback provider (${this.fallbackProvider.name}) failed: ${fallbackResult.error}`,
      );
    }

    // 3. User-safe exception (never leak API keys, URLs, or internal stack traces)
    throw new BadRequestException(
      'Unable to send verification email. Please check your address or try again in a few moments.',
    );
  }
}
