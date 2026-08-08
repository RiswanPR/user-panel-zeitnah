import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TroubleshootReport,
  TroubleshootReportDocument,
  ErrorSeverity,
} from './schemas/error-report.schema';
import { SubmitReportDto } from './dto/submit-report.dto';
import { resend } from '../../config/resend.config';
import { generateTroubleshootEmailHtml } from '../../common/templates/email-templates';

const getAlertRecipients = (): string[] => {
  const envEmails =
    process.env.ALERT_EMAIL ||
    process.env.DEV_TEAM_EMAIL ||
    'riswanpr7amses@gmail.com,riswanpr94@gmail.com,zeitnahpkd@gmail.com';
  return envEmails
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.includes('@'));
};

// Severity config for email formatting
const SEVERITY_CONFIG = {
  low: { emoji: '🟢', label: 'LOW', color: '#22c55e' },
  medium: { emoji: '🟡', label: 'MEDIUM', color: '#eab308' },
  high: { emoji: '🟠', label: 'HIGH', color: '#f97316' },
  critical: { emoji: '🔴', label: 'CRITICAL', color: '#ef4444' },
};

@Injectable()
export class TroubleshootService {
  constructor(
    @InjectModel(TroubleshootReport.name)
    private errorReportModel: Model<TroubleshootReportDocument>,
  ) {}

  /**
   * Submit a troubleshoot error report — save to DB and send email alert.
   */
  async submitReport(userId: string, userEmail: string, dto: SubmitReportDto) {
    // Save to MongoDB
    const report = await this.errorReportModel.create({
      userId: new Types.ObjectId(userId),
      userEmail,
      source: dto.source || 'troubleshoot_user_report',
      severity: dto.severity as ErrorSeverity,
      title: dto.title,
      description: dto.description || '',
      pageUrl: dto.pageUrl || '',
      consoleErrors: dto.consoleErrors || [],
      networkErrors: dto.networkErrors || [],
      unhandledErrors: dto.unhandledErrors || [],
      browserInfo: dto.browserInfo || {},
      status: 'open',
    });

    // Send email alert (fire and forget — don't block response)
    this.sendEmailAlert(report, userEmail).catch((err) => {
      console.error('[Troubleshoot] Failed to send email alert:', err);
    });

    return {
      success: true,
      message: 'Troubleshoot report submitted successfully.',
      reportId: report?._id ?? null,
    };
  }

  /**
   * List all reports with pagination (admin use).
   */
  async findReports(query: {
    severity?: string;
    status?: string;
    page?: number;
    limit?: number;
    userId?: string;
  }) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 25, 1), 100);
    const filter: Record<string, unknown> = {};

    if (query.severity) filter.severity = query.severity;
    if (query.status) filter.status = query.status;
    if (query.userId && Types.ObjectId.isValid(query.userId)) {
      filter.userId = new Types.ObjectId(query.userId);
    }

    const [items, total] = await Promise.all([
      this.errorReportModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'name email')
        .lean(),
      this.errorReportModel.countDocuments(filter),
    ]);

    return {
      success: true,
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Build and send a rich HTML email alert.
   */
  private async sendEmailAlert(report: TroubleshootReportDocument, userEmail: string) {
    const sev = SEVERITY_CONFIG[report.severity] || SEVERITY_CONFIG.medium;

    const html = generateTroubleshootEmailHtml(report, userEmail, sev);
    const recipients = getAlertRecipients();

    try {
      await resend.emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ||
          'Zeitnah Admin <onboarding@resend.dev>',
        to: recipients,
        subject: `${sev.emoji} [${sev.label}] Troubleshoot Report — ${report.title.substring(0, 60)}`,
        html,
      });
    } catch (error) {
      console.error('[TroubleshootService] Resend email send failed:', error);
    }
  }

  private escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
