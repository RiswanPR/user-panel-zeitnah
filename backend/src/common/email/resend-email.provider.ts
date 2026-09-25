import { Injectable, Logger } from '@nestjs/common';
import { resend } from '../../config/resend.config';
import {
  EmailProvider,
  EmailSendResult,
  SendEmailOptions,
} from './email-provider.interface';

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
   * Send with strict timeout to prevent hanging connections
   */
  private async sendWithTimeout(payload: any, timeoutMs: number): Promise<any> {
    return Promise.race([
      resend.emails.send(payload),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Resend API timed out after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ]);
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    const timeoutMs = options.timeoutMs || 7000;
    const defaultFrom =
      process.env.RESEND_FROM_EMAIL ||
      'Zeitnah Academy <onboarding@resend.dev>';
    const payload = {
      from: options.from || defaultFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    const masked = this.maskEmail(options.to);
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

        if (attempt < maxAttempts) {
          const delay = 1000 * Math.pow(2, attempt - 1); // 1000ms, then 2000ms
          await new Promise((resolve) => setTimeout(resolve, delay));
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
