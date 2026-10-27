import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { CrisisResourcesResponse, CrisisResourceView } from '@mindbridge/shared-types';
import { type Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { AppConfigService } from '../../config/app-config.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { CreateCrisisResourceDto, UpdateCrisisResourceDto } from './crisis-resources.dto.js';
import { CRISIS_FALLBACK_ADVICE, VERIFIED_SEED_RESOURCES } from './crisis-resources.seed-data.js';
import { CrisisResource } from './schemas/crisis-resource.schema.js';

type Lean = CrisisResource & { _id: Types.ObjectId };

/** Shape passed to the AI service, which may only repeat numbers/URLs from this list. */
export interface AiCrisisResource {
  name: string;
  service_type: string;
  phone?: string;
  sms?: string;
  url?: string;
  availability: string;
  languages: string[];
}

@Injectable()
export class CrisisResourcesService {
  constructor(
    @InjectModel(CrisisResource.name) private readonly model: Model<CrisisResource>,
    private readonly config: AppConfigService,
    private readonly audit: AuditService,
  ) {}

  private freshnessCutoff(now = new Date()) {
    return new Date(now.getTime() - this.config.get('CRISIS_RESOURCE_MAX_AGE_DAYS') * 86_400_000);
  }

  private toView(r: Lean): CrisisResourceView {
    return {
      id: r._id.toString(),
      name: r.name,
      country: r.country,
      region: r.region || undefined,
      serviceType: r.serviceType,
      phone: r.phone || undefined,
      sms: r.sms || undefined,
      url: r.url || undefined,
      languages: r.languages,
      availability: r.availability,
      description: r.description || undefined,
      sourceUrl: r.sourceUrl,
      verifiedAt: r.verifiedAt.toISOString(),
    };
  }

  /**
   * Current, verified resources for a country (national + matching region). Stale or inactive
   * entries are never served; when nothing qualifies the client shows `fallbackAdvice` only.
   */
  async forCountry(country: string, region?: string): Promise<CrisisResourcesResponse & { altPhones: Record<string, string[]> }> {
    const code = (country || 'IN').toUpperCase();
    const rows = await this.model
      .find({
        country: code,
        status: 'ACTIVE',
        verifiedAt: { $gte: this.freshnessCutoff() },
        $or: [{ region: { $in: [null, ''] } }, ...(region ? [{ region }] : [])],
      })
      .sort({ priority: 1, name: 1 })
      .limit(20)
      .lean<Lean[]>();
    return {
      country: code,
      resources: rows.map((r) => this.toView(r)),
      altPhones: Object.fromEntries(rows.filter((r) => r.altPhones?.length).map((r) => [r._id.toString(), r.altPhones])),
      fallbackAdvice: CRISIS_FALLBACK_ADVICE,
    };
  }

  /** Verified resources in the AI-service wire format (snake_case). */
  async forAi(country: string): Promise<AiCrisisResource[]> {
    const { resources } = await this.forCountry(country);
    return resources.map((r) => ({
      name: r.name,
      service_type: r.serviceType,
      phone: r.phone,
      sms: r.sms,
      url: r.url,
      availability: r.availability,
      languages: r.languages,
    }));
  }

  // ------------------------------------------------------------------ admin

  async adminList(q: { country?: string; status?: string; stale?: boolean; skip: number; limit: number }) {
    const filter: Record<string, unknown> = {};
    if (q.country) filter['country'] = q.country.toUpperCase();
    if (q.status) filter['status'] = q.status;
    if (q.stale) filter['verifiedAt'] = { $lt: this.freshnessCutoff() };
    const [rows, total] = await Promise.all([
      this.model.find(filter).sort({ country: 1, priority: 1 }).skip(q.skip).limit(q.limit).lean<Lean[]>(),
      this.model.countDocuments(filter),
    ]);
    const cutoff = this.freshnessCutoff();
    return {
      items: rows.map((r) => ({
        ...this.toView(r),
        altPhones: r.altPhones,
        status: r.status,
        priority: r.priority,
        verificationExpired: r.verifiedAt < cutoff,
      })),
      total,
    };
  }

  private parseVerifiedAt(value?: string) {
    const at = value ? new Date(value) : new Date();
    if (Number.isNaN(at.getTime()) || at.getTime() > Date.now() + 60_000) {
      throw new BadRequestException({ code: 'INVALID_VERIFIED_AT', message: 'Verification date cannot be in the future.' });
    }
    return at;
  }

  async create(admin: AuthenticatedUser, dto: CreateCrisisResourceDto) {
    if (!dto.phone && !dto.url && !dto.sms) {
      throw new BadRequestException({ code: 'CONTACT_REQUIRED', message: 'Provide at least a phone number, SMS number or URL.' });
    }
    const row = await this.model.create({
      ...dto,
      country: dto.country.toUpperCase(),
      verifiedAt: this.parseVerifiedAt(dto.verifiedAt),
      verifiedBy: new Types.ObjectId(admin.id),
    });
    await this.audit.record({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'crisis_resource.created',
      resourceType: 'CrisisResource',
      resourceId: row._id.toString(),
      metadata: { country: row.country, serviceType: row.serviceType, phone: row.phone, sourceUrl: row.sourceUrl },
    });
    return this.toView(row.toObject());
  }

  async update(admin: AuthenticatedUser, id: string, dto: UpdateCrisisResourceDto) {
    const row = await this.model.findById(id);
    if (!row) throw new NotFoundException();
    const contactChanged = ['phone', 'altPhones', 'sms', 'url'].some((k) => k in dto);
    Object.assign(row, dto);
    if (!row.phone && !row.url && !row.sms) {
      throw new BadRequestException({ code: 'CONTACT_REQUIRED', message: 'Provide at least a phone number, SMS number or URL.' });
    }
    // Changing contact details without re-verifying would serve unverified numbers: force a re-check.
    if (contactChanged) row.verifiedAt = new Date(0);
    await row.save();
    await this.audit.record({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'crisis_resource.updated',
      resourceType: 'CrisisResource',
      resourceId: id,
      metadata: { fields: Object.keys(dto), requiresReverification: contactChanged },
    });
    return this.toView(row.toObject());
  }

  /** Records that an administrator checked the entry against the official source today. */
  async markVerified(admin: AuthenticatedUser, id: string, sourceUrl: string) {
    const row = await this.model.findById(id);
    if (!row) throw new NotFoundException();
    row.sourceUrl = sourceUrl;
    row.verifiedAt = new Date();
    row.verifiedBy = new Types.ObjectId(admin.id);
    await row.save();
    await this.audit.record({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'crisis_resource.verified',
      resourceType: 'CrisisResource',
      resourceId: id,
      metadata: { sourceUrl },
    });
    return this.toView(row.toObject());
  }

  async remove(admin: AuthenticatedUser, id: string) {
    const res = await this.model.deleteOne({ _id: id });
    if (!res.deletedCount) throw new NotFoundException();
    await this.audit.record({ actorId: admin.id, actorRole: admin.role, action: 'crisis_resource.deleted', resourceType: 'CrisisResource', resourceId: id });
  }

  async countStale() {
    return this.model.countDocuments({ status: 'ACTIVE', verifiedAt: { $lt: this.freshnessCutoff() } });
  }

  /** Idempotent: inserts seed entries that are not present yet (matched by country + phone). */
  async seedVerified(): Promise<number> {
    let inserted = 0;
    for (const r of VERIFIED_SEED_RESOURCES) {
      const res = await this.model.updateOne(
        { country: r.country, phone: r.phone },
        { $setOnInsert: { ...r, altPhones: [...r.altPhones], languages: [...r.languages], status: 'ACTIVE' } },
        { upsert: true },
      );
      inserted += res.upsertedCount;
    }
    return inserted;
  }
}
