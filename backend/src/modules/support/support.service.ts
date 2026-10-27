import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SupportTicket,
  SupportTicketDocument,
} from './schemas/support-ticket.schema';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { EmailService } from '../../common/email/email.service';
import {
  generateSupportTicketEmailHtml,
  generateSupportTicketEmailText,
} from '../../common/templates/email-templates';

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

    const emailHtml = generateSupportTicketEmailHtml(ticket);
    const textContent = generateSupportTicketEmailText(ticket);

    await this.emailService.sendEmail({
      to: recipients,
      subject: `[Zeitnah Support] ${ticket.category}: ${ticket.subject} (${ticket.ticketNumber})`,
      html: emailHtml,
      text: textContent,
    });
  }
}
