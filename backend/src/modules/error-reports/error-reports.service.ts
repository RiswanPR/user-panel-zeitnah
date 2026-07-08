import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ErrorReport, ErrorReportDocument } from './schemas/error-report.schema';
import { Resend } from 'resend';

@Injectable()
export class ErrorReportsService {
  private readonly logger = new Logger(ErrorReportsService.name);
  private resend: Resend;

  constructor(
    @InjectModel(ErrorReport.name) private errorReportModel: Model<ErrorReportDocument>,
  ) {
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
  }

  async create(data: any, userId?: string) {
    // 1. Sanitize Data (Prevent secrets from being saved)
    const sanitizedData = this.sanitizePayload(data);
    
    // 2. Save to DB
    const report = new this.errorReportModel({
      ...sanitizedData,
      userId: userId || undefined,
    });
    
    await report.save();

    // 3. Send Email Notification
    this.sendNotification(report).catch(err => {
      this.logger.error('Failed to send error report email notification', err);
    });

    return { success: true, id: report._id };
  }

  async findAll(query: any) {
    const { status, page = 1, limit = 20 } = query;
    const filter: any = {};
    if (status) filter.status = status;

    const reports = await this.errorReportModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('userId', 'name email')
      .exec();

    const total = await this.errorReportModel.countDocuments(filter);

    return {
      data: reports,
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }

  async update(id: string, updateData: any) {
    return this.errorReportModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  private sanitizePayload(data: any) {
    const payloadStr = JSON.stringify(data);
    // Replace obvious tokens and passwords
    const sanitizedStr = payloadStr
      .replace(/"token":"[^"]+"/gi, '"token":"[REDACTED]"')
      .replace(/"password":"[^"]+"/gi, '"password":"[REDACTED]"')
      .replace(/"otp":"[^"]+"/gi, '"otp":"[REDACTED]"');
    
    return JSON.parse(sanitizedStr);
  }

  private async sendNotification(report: ErrorReportDocument) {
    if (!this.resend || !process.env.DEV_TEAM_EMAIL) {
      this.logger.warn('Skipping email notification: missing RESEND_API_KEY or DEV_TEAM_EMAIL');
      return;
    }

    const errorDetails = report.error ? report.error.message || report.error.name : 'Unknown Error';
    const source = report.source;
    const correlationId = report.correlationId || 'N/A';

    await this.resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'LMS Errors <onboarding@resend.dev>',
      to: process.env.DEV_TEAM_EMAIL,
      subject: `🚨 Production Error [${source}] - ${errorDetails}`,
      html: `
        <h2>Zeitnah Academy - Production Error Report</h2>
        <p><strong>Source:</strong> ${source}</p>
        <p><strong>Correlation ID:</strong> ${correlationId}</p>
        <p><strong>User Feedback:</strong> ${report.feedback?.whatHappened || 'None provided'}</p>
        <p><strong>Error:</strong> ${errorDetails}</p>
        
        <p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/error-reports" style="padding:10px 15px; background:#07192a; color:#f6ed4a; text-decoration:none; border-radius:5px; font-weight:bold;">
            View Full Report in Admin Panel
          </a>
        </p>
      `,
    });
  }
}
