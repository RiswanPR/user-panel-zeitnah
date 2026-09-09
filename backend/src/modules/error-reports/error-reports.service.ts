import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ErrorReport,
  ErrorReportDocument,
} from './schemas/error-report.schema';


@Injectable()
export class ErrorReportsService {
  private readonly logger = new Logger(ErrorReportsService.name);

  constructor(
    @InjectModel(ErrorReport.name)
    private errorReportModel: Model<ErrorReportDocument>,
  ) {}

  async create(data: any, userId?: string) {
    // 1. Sanitize Data (Prevent secrets from being saved)
    const sanitizedData = this.sanitizePayload(data);

    // 2. Save to DB
    const report = new this.errorReportModel({
      ...sanitizedData,
      userId: userId || undefined,
    });

    await report.save();

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
    return this.errorReportModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
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


}
