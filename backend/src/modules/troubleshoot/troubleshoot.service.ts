import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ErrorReport,
  ErrorReportDocument,
  ErrorSeverity,
} from './schemas/error-report.schema';
import { SubmitReportDto } from './dto/submit-report.dto';
import { resend } from '../../config/resend.config';

const ALERT_EMAIL = 'riswanpr94@gmail.com';

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
    @InjectModel(ErrorReport.name)
    private errorReportModel: Model<ErrorReportDocument>,
  ) {}

  /**
   * Submit a troubleshoot error report — save to DB and send email alert.
   */
  async submitReport(
    userId: string,
    userEmail: string,
    dto: SubmitReportDto,
  ) {
    // Save to MongoDB
    const report = await this.errorReportModel.create({
      userId: new Types.ObjectId(userId),
      userEmail,
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
  private async sendEmailAlert(
    report: ErrorReportDocument,
    userEmail: string,
  ) {
    const sev =
      SEVERITY_CONFIG[report.severity as keyof typeof SEVERITY_CONFIG] ||
      SEVERITY_CONFIG.medium;

    const consoleErrorsHtml =
      report.consoleErrors.length > 0
        ? report.consoleErrors
            .slice(0, 15)
            .map(
              (e, i) => `
              <tr style="border-bottom:1px solid #1e293b">
                <td style="padding:8px 12px;color:#94a3b8;font-size:12px">${i + 1}</td>
                <td style="padding:8px 12px">
                  <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${e.type === 'error' ? '#7f1d1d' : '#78350f'};color:${e.type === 'error' ? '#fca5a5' : '#fde68a'}">${this.escapeHtml(e.type)}</span>
                </td>
                <td style="padding:8px 12px;color:#e2e8f0;font-size:12px;font-family:monospace;word-break:break-all">${this.escapeHtml(e.message?.substring(0, 200))}</td>
                <td style="padding:8px 12px;color:#64748b;font-size:11px;white-space:nowrap">${this.escapeHtml(e.timestamp)}</td>
              </tr>`,
            )
            .join('')
        : '<tr><td colspan="4" style="padding:16px;color:#64748b;text-align:center">No console errors captured</td></tr>';

    const networkErrorsHtml =
      report.networkErrors.length > 0
        ? report.networkErrors
            .slice(0, 10)
            .map(
              (e, i) => `
              <tr style="border-bottom:1px solid #1e293b">
                <td style="padding:8px 12px;color:#94a3b8;font-size:12px">${i + 1}</td>
                <td style="padding:8px 12px">
                  <span style="font-weight:600;color:#f8fafc;font-size:12px">${this.escapeHtml(e.method)}</span>
                </td>
                <td style="padding:8px 12px;color:#e2e8f0;font-size:12px;font-family:monospace;word-break:break-all">${this.escapeHtml(e.url?.substring(0, 150))}</td>
                <td style="padding:8px 12px">
                  <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:#7f1d1d;color:#fca5a5">${e.status || 0}</span>
                </td>
                <td style="padding:8px 12px;color:#94a3b8;font-size:12px">${this.escapeHtml(e.message?.substring(0, 100))}</td>
              </tr>`,
            )
            .join('')
        : '<tr><td colspan="5" style="padding:16px;color:#64748b;text-align:center">No network errors captured</td></tr>';

    const unhandledHtml =
      report.unhandledErrors.length > 0
        ? report.unhandledErrors
            .slice(0, 10)
            .map(
              (e) =>
                `<li style="margin-bottom:6px;color:#e2e8f0;font-size:12px;font-family:monospace">[${this.escapeHtml(e.type)}] ${this.escapeHtml(e.message?.substring(0, 200))}</li>`,
            )
            .join('')
        : '<li style="color:#64748b">None</li>';

    const browserInfo = report.browserInfo || ({} as any);

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      <div style="max-width:680px;margin:0 auto;padding:32px 16px">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border:1px solid #334155;border-radius:16px;overflow:hidden">
          <div style="padding:24px 28px;border-bottom:1px solid #334155">
            <div style="display:flex;align-items:center;gap:12px">
              <span style="font-size:28px">${sev.emoji}</span>
              <div>
                <h1 style="margin:0;font-size:20px;font-weight:800;color:#f8fafc;letter-spacing:-0.5px">
                  Troubleshoot Report
                </h1>
                <p style="margin:4px 0 0;font-size:12px;font-weight:600;color:${sev.color};text-transform:uppercase;letter-spacing:1px">
                  ${sev.label} SEVERITY
                </p>
              </div>
            </div>
          </div>

          <!-- Report Meta -->
          <div style="padding:20px 28px;border-bottom:1px solid #334155;background:#0f172a">
            <table style="width:100%;border-collapse:collapse">
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:600;width:100px">TITLE</td>
                <td style="padding:6px 0;color:#f8fafc;font-size:14px;font-weight:600">${this.escapeHtml(report.title)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:600">USER</td>
                <td style="padding:6px 0;color:#e2e8f0;font-size:13px">${this.escapeHtml(userEmail)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:600">PAGE</td>
                <td style="padding:6px 0;color:#38bdf8;font-size:12px;font-family:monospace;word-break:break-all">${this.escapeHtml(report.pageUrl || 'N/A')}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:600">TIME</td>
                <td style="padding:6px 0;color:#e2e8f0;font-size:13px">${new Date(report['createdAt']).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:600">BROWSER</td>
                <td style="padding:6px 0;color:#e2e8f0;font-size:13px">${this.escapeHtml(browserInfo.browser || 'Unknown')} | ${this.escapeHtml(browserInfo.os || 'Unknown')} | ${this.escapeHtml(browserInfo.screenSize || 'Unknown')}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:600">REPORT ID</td>
                <td style="padding:6px 0;color:#94a3b8;font-size:11px;font-family:monospace">${report._id}</td>
              </tr>
            </table>
          </div>

          ${
            report.description
              ? `
          <!-- Description -->
          <div style="padding:20px 28px;border-bottom:1px solid #334155">
            <h3 style="margin:0 0 8px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px">User Description</h3>
            <p style="margin:0;color:#e2e8f0;font-size:13px;line-height:1.6;background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:12px 16px">${this.escapeHtml(report.description)}</p>
          </div>`
              : ''
          }

          <!-- Console Errors -->
          <div style="padding:20px 28px;border-bottom:1px solid #334155">
            <h3 style="margin:0 0 12px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px">
              Console Errors (${report.consoleErrors.length})
            </h3>
            <div style="overflow-x:auto">
              <table style="width:100%;border-collapse:collapse;background:#0f172a;border:1px solid #1e293b;border-radius:8px">
                <thead>
                  <tr style="border-bottom:2px solid #1e293b">
                    <th style="padding:8px 12px;text-align:left;color:#475569;font-size:10px;font-weight:700;text-transform:uppercase">#</th>
                    <th style="padding:8px 12px;text-align:left;color:#475569;font-size:10px;font-weight:700;text-transform:uppercase">Type</th>
                    <th style="padding:8px 12px;text-align:left;color:#475569;font-size:10px;font-weight:700;text-transform:uppercase">Message</th>
                    <th style="padding:8px 12px;text-align:left;color:#475569;font-size:10px;font-weight:700;text-transform:uppercase">Time</th>
                  </tr>
                </thead>
                <tbody>${consoleErrorsHtml}</tbody>
              </table>
            </div>
          </div>

          <!-- Network Errors -->
          <div style="padding:20px 28px;border-bottom:1px solid #334155">
            <h3 style="margin:0 0 12px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px">
              Network Failures (${report.networkErrors.length})
            </h3>
            <div style="overflow-x:auto">
              <table style="width:100%;border-collapse:collapse;background:#0f172a;border:1px solid #1e293b;border-radius:8px">
                <thead>
                  <tr style="border-bottom:2px solid #1e293b">
                    <th style="padding:8px 12px;text-align:left;color:#475569;font-size:10px;font-weight:700;text-transform:uppercase">#</th>
                    <th style="padding:8px 12px;text-align:left;color:#475569;font-size:10px;font-weight:700;text-transform:uppercase">Method</th>
                    <th style="padding:8px 12px;text-align:left;color:#475569;font-size:10px;font-weight:700;text-transform:uppercase">URL</th>
                    <th style="padding:8px 12px;text-align:left;color:#475569;font-size:10px;font-weight:700;text-transform:uppercase">Status</th>
                    <th style="padding:8px 12px;text-align:left;color:#475569;font-size:10px;font-weight:700;text-transform:uppercase">Message</th>
                  </tr>
                </thead>
                <tbody>${networkErrorsHtml}</tbody>
              </table>
            </div>
          </div>

          <!-- Unhandled Errors -->
          <div style="padding:20px 28px">
            <h3 style="margin:0 0 12px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px">
              Unhandled Errors (${report.unhandledErrors.length})
            </h3>
            <ul style="margin:0;padding-left:20px">${unhandledHtml}</ul>
          </div>
        </div>

        <!-- Footer -->
        <p style="text-align:center;color:#475569;font-size:11px;margin-top:24px">
          Zeitnah Academy — Automated Troubleshoot Alert System
        </p>
      </div>
    </body>
    </html>`;

    await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL ||
        'Zeitnah Admin <onboarding@resend.dev>',
      to: ALERT_EMAIL,
      subject: `${sev.emoji} [${sev.label}] Troubleshoot Report — ${report.title.substring(0, 60)}`,
      html,
    });
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
