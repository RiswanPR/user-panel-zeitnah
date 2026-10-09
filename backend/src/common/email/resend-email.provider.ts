import { Injectable, Logger } from '@nestjs/common';
import { resend } from '../../config/resend.config';
import {
  EmailProvider,
  EmailSendResult,
  SendEmailOptions,
} from './email-provider.interface';
import { isReservedDocumentationDomain } from '../utils/email-validation.util';

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'Resend';
  private readonly logger = new Logger(ResendEmailProvider.name);

  /**
   * Helper to safely mask email address for audit/logs
   */
  private maskEmail(email: string | string[]): string {
    if (Array.isArray(email)) {
      return email.map((e) => this.maskSingleEmail(e)).join(', ');
    }
    return this.maskSingleEmail(email);
  }

  private maskSingleEmail(email: string): string {
    if (!email || !email.includes('@')) return '***';
    const [user, domain] = email.split('@');
    const maskedUser =
      user.length > 2
        ? `${user[0]}***${user[user.length - 1]}`
        : `${user[0]}***`;
    return `${maskedUser}@${domain}`;
  }

  /**
   * Checks whether an error is transient (network/timeout/rate limit)
   * or permanent (invalid recipient, unverified domain, bad parameters).
   */
  private isTransientError(err: any): boolean {
    const msg = (err?.message || String(err)).toLowerCase();
    if (
      msg.includes('invalid `to`') ||
      msg.includes('invalid to') ||
      msg.includes('domain is not verified') ||
      msg.includes('domain not verified') ||
      msg.includes('validation_error') ||
      msg.includes('missing_required_field') ||
      msg.includes('reserved') ||
      msg.includes('not a valid email')
    ) {
      return false;
    }
    return true;
  }

  /**
   * Send with strict timeout to prevent hanging connections
   */
  private async sendWithTimeout(payload: any, timeoutMs: number): Promise<any> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        resend.emails.send(payload),
        new Promise((_, reject) => {
          timer = setTimeout(
            () =>
              reject(new Error(`Resend API timed out after ${timeoutMs}ms`)),
            timeoutMs,
          );
          if (timer && typeof timer.unref === 'function') {
            timer.unref();
          }
        }),
      ]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    const masked = this.maskEmail(options.to);

    // 1. Guard against reserved example/documentation domains (RFC 2606)
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const hasReservedDomain = recipients.some((r) =>
      isReservedDocumentationDomain(r),
    );
    if (hasReservedDomain) {
      if (
        process.env.NODE_ENV === 'test' ||
        process.env.EMAIL_DEV_MODE === 'true'
      ) {
        this.logger.log(
          `[Test Mode] Simulated email delivery for reserved domain recipient: ${masked}`,
        );
        return {
          success: true,
          messageId: `simulated-test-${Date.now()}`,
          provider: `${this.name} (Simulated)`,
        };
      }
      return {
        success: false,
        provider: this.name,
        error: `Cannot send real email to reserved documentation/testing domain (RFC 2606) for recipient: ${masked}`,
      };
    }

    const timeoutMs = options.timeoutMs || 7000;
    const defaultFrom =
      process.env.RESEND_FROM_EMAIL || 'Zeitnah <onboarding@resend.dev>';
    const payload = {
      from: options.from || defaultFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    const maxAttempts = 2;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response: any = await this.sendWithTimeout(payload, timeoutMs);

        // Resend returns { data, error } or direct object
        if (response?.error) {
          throw new Error(
            response.error.message || JSON.stringify(response.error),
          );
        }

        const messageId = response?.data?.id || response?.id || 'unknown';
        this.logger.log(
          `Email sent successfully to ${masked} via Resend (attempt ${attempt}, id: ${messageId})`,
        );

        return {
          success: true,
          messageId,
          provider: this.name,
        };
      } catch (err: any) {
        lastError = err;
        this.logger.warn(
          `Resend attempt ${attempt}/${maxAttempts} failed for ${masked}: ${err?.message || err}`,
        );

        if (err?.message?.includes('domain is not verified')) {
          this.logger.warn(
            `Resend sender domain is not verified. To send in testing mode, set RESEND_FROM_EMAIL to 'Zeitnah <onboarding@resend.dev>' and send to your registered Resend account address or delivered@resend.dev.`,
          );
        }

        // Do not retry permanent validation or configuration errors
        if (!this.isTransientError(err)) {
          break;
        }

        if (attempt < maxAttempts) {
          const delay = 1000 * Math.pow(2, attempt - 1); // 1000ms
          await new Promise((resolve) => {
            const retryTimer = setTimeout(resolve, delay);
            if (retryTimer && typeof retryTimer.unref === 'function') {
              retryTimer.unref();
            }
          });
        }
      }
    }

    return {
      success: false,
      provider: this.name,
      error: lastError?.message || 'Unknown email delivery failure',
    };
  }
}
