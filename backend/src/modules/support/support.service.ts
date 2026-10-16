import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SupportTicket,
  SupportTicketDocument,
} from './schemas/support-ticket.schema';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { EmailService } from '../../common/email/email.service';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    @InjectModel(SupportTicket.name)
    private supportTicketModel: Model<SupportTicketDocument>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Generates a collision-resistant human-readable ticket reference number:
   * e.g. ZN-SUP-K8X9Y2-4821
   */
  private generateTicketNumber(): string {
    const epochPart = Date.now().toString(36).toUpperCase();
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `ZN-SUP-${epochPart}-${randomPart}`;
  }

  /**
   * Submits a new support ticket with server-side validation,
   * honeypot spam protection, database persistence, and administrative notifications.
   */
  async createTicket(dto: CreateSupportTicketDto, userId?: string) {
    // 1. Honeypot check: If the hidden honeypot field is filled, silently discard spam
    if (dto.websiteUrl && dto.websiteUrl.trim().length > 0) {
      this.logger.warn(
        `[SupportService] Honeypot triggered from email: ${dto.email}. Discarding silently.`,
      );
      return {
        success: true,
        ticketNumber: this.generateTicketNumber(),
        message:
          'Your support request has been received. Our team will review your enquiry.',
      };
    }

    const ticketNumber = this.generateTicketNumber();

    // 2. Validate optional userId
    let validUserId: Types.ObjectId | undefined;
    if (userId && Types.ObjectId.isValid(userId)) {
      validUserId = new Types.ObjectId(userId);
    }

    // 3. Persist ticket in MongoDB
    const ticket = await this.supportTicketModel.create({
      ticketNumber,
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      category: dto.category,
      subject: dto.subject.trim(),
      message: dto.message.trim(),
      status: 'OPEN',
      userId: validUserId,
      metadata: {
        submittedAt: new Date().toISOString(),
      },
    });

    this.logger.log(
      `[SupportService] Support ticket created successfully: ${ticketNumber} (${dto.category}) by ${dto.email}`,
    );

    // 4. Dispatch administrative alert asynchronously (fail-safe)
    this.sendNotificationEmail(ticket).catch((err) => {
      this.logger.error(
        `[SupportService] Non-blocking notice email failed for ${ticketNumber}: ${err.message}`,
      );
    });

    return {
      success: true,
      ticketNumber: ticket.ticketNumber,
      category: ticket.category,
      createdAt: ticket.createdAt,
      message:
        'Your support request has been successfully submitted. Our team will investigate and reply to your registered email address within 24 to 48 business hours.',
    };
  }

  /**
   * Helper to send an internal alert email via the platform's Resend provider
   */
  private async sendNotificationEmail(ticket: SupportTicketDocument) {
    const alertRecipients =
      process.env.SUPPORT_NOTIFICATION_EMAILS ||
      process.env.ALERT_EMAIL ||
      process.env.DEV_TEAM_EMAIL ||
      '';

    const recipients = alertRecipients
      ? alertRecipients
          .split(',')
          .map((e) => e.trim())
          .filter((e) => e.includes('@'))
      : [];

    if (recipients.length === 0) return;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #1e293b;">
        <h2 style="color: #9fd5b2; margin-top: 0;">🎫 New Support Ticket: ${ticket.ticketNumber}</h2>
        <p style="color: #94a3b8; font-size: 14px;"><strong>From:</strong> ${ticket.name} (&lt;${ticket.email}&gt;)</p>
        <p style="color: #94a3b8; font-size: 14px;"><strong>Category:</strong> ${ticket.category}</p>
        <p style="color: #94a3b8; font-size: 14px;"><strong>Subject:</strong> ${ticket.subject}</p>
        <div style="background-color: #111827; border-left: 4px solid #9fd5b2; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="white-space: pre-wrap; font-size: 14px; line-height: 1.6; margin: 0; color: #e2e8f0;">${ticket.message}</p>
        </div>
        <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Zeitnah LMS Platform Support Notification Engine</p>
      </div>
    `;

    await this.emailService.sendEmail({
      to: recipients,
      subject: `[Zeitnah Support] ${ticket.category}: ${ticket.subject} (${ticket.ticketNumber})`,
      html: emailHtml,
    });
  }
}
