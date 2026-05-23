import { Injectable } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model, Types } from 'mongoose';

import {
  AuditLog,
  AuditLogDocument,
  AuditLogSeverity,
} from './schemas/audit-log.schema';

type CreateAuditLogInput = {
  actor?: Types.ObjectId | string | null;
  action: string;
  entityType: string;
  entityId?: string;
  severity?: AuditLogSeverity;
  ipAddress?: string;
  deviceId?: string;
  message?: string;
  metadata?: Record<string, unknown>;
};

type AuditLogQuery = {
  actor?: string;
  action?: string;
  entityType?: string;
  severity?: AuditLogSeverity;
  page?: number;
  limit?: number;
};

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async record(data: CreateAuditLogInput) {
    try {
      return await this.auditLogModel.create({
        actor: data.actor || null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId || '',
        severity: data.severity || 'info',
        ipAddress: data.ipAddress || '',
        deviceId: data.deviceId || '',
        message: data.message || '',
        metadata: data.metadata || {},
      });
    } catch (error) {
      console.error('Failed to write audit log', error);

      return null;
    }
  }

  async find(query: AuditLogQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 25, 1), 100);
    const filter: Record<string, unknown> = {};

    if (query.actor && Types.ObjectId.isValid(query.actor)) {
      filter.actor = new Types.ObjectId(query.actor);
    }

    if (query.action) {
      filter.action = query.action;
    }

    if (query.entityType) {
      filter.entityType = query.entityType;
    }

    if (query.severity) {
      filter.severity = query.severity;
    }

    const [items, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('actor', 'name email role')
        .lean(),
      this.auditLogModel.countDocuments(filter),
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
}
