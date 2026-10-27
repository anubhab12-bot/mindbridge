import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, QueryFilter } from 'mongoose';
import { Types } from 'mongoose';
import { sha256 } from '../../common/crypto/tokens.js';
import { redact } from '../../common/utils/redact.js';
import { AuditLog } from './schemas/audit-log.schema.js';

export type AuditOutcome = 'SUCCESS' | 'FAILURE' | 'DENIED';

export interface AuditEntry {
  actorId?: string | null;
  actorRole?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  outcome?: AuditOutcome;
  ip?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditSearch {
  actorId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  outcome?: AuditOutcome;
  from?: Date;
  to?: Date;
  skip: number;
  limit: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectModel(AuditLog.name) private readonly model: Model<AuditLog>) {}

  /** Never throws: an audit write failure is logged but must not break the user action. */
  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.model.create({
        actorId: entry.actorId ? new Types.ObjectId(entry.actorId) : null,
        actorRole: entry.actorRole,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        outcome: entry.outcome ?? 'SUCCESS',
        ipHash: entry.ip ? sha256(entry.ip).slice(0, 32) : undefined,
        requestId: entry.requestId,
        metadata: entry.metadata ? (redact(entry.metadata) as Record<string, unknown>) : undefined,
      });
    } catch (err) {
      this.logger.error({ msg: 'audit write failed', action: entry.action, error: (err as Error).message });
    }
  }

  async search(q: AuditSearch) {
    const filter: QueryFilter<AuditLog> = {};
    if (q.actorId && Types.ObjectId.isValid(q.actorId)) filter.actorId = new Types.ObjectId(q.actorId);
    if (q.action) filter.action = q.action;
    if (q.resourceType) filter.resourceType = q.resourceType;
    if (q.resourceId) filter.resourceId = q.resourceId;
    if (q.outcome) filter.outcome = q.outcome;
    if (q.from || q.to) {
      filter.createdAt = {};
      if (q.from) filter.createdAt.$gte = q.from;
      if (q.to) filter.createdAt.$lte = q.to;
    }
    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(q.skip).limit(q.limit).lean(),
      this.model.countDocuments(filter),
    ]);
    return { items, total };
  }

  async countSince(action: string, since: Date, outcome?: AuditOutcome): Promise<number> {
    const filter: QueryFilter<AuditLog> = { action, createdAt: { $gte: since } };
    if (outcome) filter.outcome = outcome;
    return this.model.countDocuments(filter);
  }
}
