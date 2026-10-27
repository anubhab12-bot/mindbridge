import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConsentType, ContentStatus, DOCTOR_SCOPED_CONSENTS } from '@mindbridge/shared-types';
import { type Model, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service.js';
import { ConsentRecord } from './schemas/consent-record.schema.js';
import { PolicyDocument, PolicyDocumentType } from './schemas/policy-document.schema.js';

/** Used until an admin publishes a versioned policy document. */
export const DEFAULT_POLICY_VERSION = '2026-10-27';

export interface ConsentState {
  type: ConsentType;
  granted: boolean;
  version: string;
  doctorId: string | null;
  updatedAt: Date;
}

@Injectable()
export class ConsentService {
  constructor(
    @InjectModel(ConsentRecord.name) private readonly consents: Model<ConsentRecord>,
    @InjectModel(PolicyDocument.name) private readonly policies: Model<PolicyDocument>,
    private readonly audit: AuditService,
  ) {}

  async currentPolicyVersion(type: ConsentType): Promise<string> {
    const policyType = (Object.values(PolicyDocumentType) as string[]).includes(type)
      ? (type as PolicyDocumentType)
      : null;
    if (!policyType) return DEFAULT_POLICY_VERSION;
    const doc = await this.policies
      .findOne({ type: policyType, status: ContentStatus.PUBLISHED, effectiveAt: { $lte: new Date() } })
      .sort({ effectiveAt: -1 })
      .select('version')
      .lean<{ version: string }>();
    return doc?.version ?? DEFAULT_POLICY_VERSION;
  }

  async record(
    userId: string,
    type: ConsentType,
    granted: boolean,
    opts: { doctorId?: string | null; source?: string } = {},
  ): Promise<ConsentState> {
    const scoped = DOCTOR_SCOPED_CONSENTS.includes(type);
    if (scoped && !opts.doctorId) {
      throw new BadRequestException({ code: 'DOCTOR_REQUIRED', message: 'This consent must name a professional.' });
    }
    if (!scoped && opts.doctorId) {
      throw new BadRequestException({ code: 'DOCTOR_NOT_ALLOWED', message: 'This consent is not professional-specific.' });
    }
    const version = await this.currentPolicyVersion(type);
    const row = await this.consents.create({
      userId: new Types.ObjectId(userId),
      type,
      granted,
      version,
      doctorId: opts.doctorId ? new Types.ObjectId(opts.doctorId) : null,
      source: opts.source ?? 'app',
    });
    await this.audit.record({
      actorId: userId,
      action: granted ? 'consent.granted' : 'consent.withdrawn',
      resourceType: 'Consent',
      metadata: { type, version, doctorId: opts.doctorId ?? null },
    });
    return { type, granted, version, doctorId: opts.doctorId ?? null, updatedAt: row.createdAt };
  }

  /** Latest state per (type, doctorId) for a user. */
  async currentStates(userId: string): Promise<ConsentState[]> {
    const rows = await this.consents.aggregate<{
      _id: { type: ConsentType; doctorId: Types.ObjectId | null };
      granted: boolean;
      version: string;
      createdAt: Date;
    }>([
      { $match: { userId: new Types.ObjectId(userId) } },
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $group: {
          _id: { type: '$type', doctorId: '$doctorId' },
          granted: { $first: '$granted' },
          version: { $first: '$version' },
          createdAt: { $first: '$createdAt' },
        },
      },
    ]);
    return rows.map((r) => ({
      type: r._id.type,
      doctorId: r._id.doctorId ? r._id.doctorId.toString() : null,
      granted: r.granted,
      version: r.version,
      updatedAt: r.createdAt,
    }));
  }

  async has(userId: string, type: ConsentType, doctorId?: string): Promise<boolean> {
    const latest = await this.consents
      .findOne({
        userId: new Types.ObjectId(userId),
        type,
        doctorId: doctorId ? new Types.ObjectId(doctorId) : null,
      })
      .sort({ createdAt: -1, _id: -1 })
      .lean();
    return latest?.granted === true;
  }

  async history(userId: string) {
    return this.consents
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(500)
      .select('-__v')
      .lean();
  }

  async deleteAllForUser(userId: string) {
    await this.consents.deleteMany({ userId: new Types.ObjectId(userId) });
  }
}

