import { ConflictException, Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ContentStatus, type WellnessContentType } from '@mindbridge/shared-types';
import { type Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { AiClientService, AiServiceUnavailableError } from '../ai/ai-client.service.js';
import { AuditService } from '../audit/audit.service.js';
import { JobsService } from '../queues/jobs.service.js';
import { WellnessContent } from './schemas/wellness-content.schema.js';

export const KNOWLEDGE_SYNC_JOB = 'wellness.knowledge-sync';
type Lean = WellnessContent & { _id: Types.ObjectId };

export interface WellnessInput {
  slug: string;
  type: WellnessContentType;
  title: string;
  summary: string;
  body: string;
  steps?: string[];
  durationMinutes?: number;
  language?: string;
  tags?: string[];
  publisher?: string;
  sourceUrl?: string;
}

@Injectable()
export class WellnessService implements OnModuleInit {
  private readonly logger = new Logger(WellnessService.name);

  constructor(
    @InjectModel(WellnessContent.name) private readonly model: Model<WellnessContent>,
    private readonly ai: AiClientService,
    private readonly jobs: JobsService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit() {
    this.jobs.register(KNOWLEDGE_SYNC_JOB, async () => {
      await this.syncKnowledge();
    });
  }

  private toPublic(c: Lean) {
    return {
      id: c._id.toString(),
      slug: c.slug,
      type: c.type,
      title: c.title,
      summary: c.summary,
      body: c.body,
      steps: c.steps,
      durationMinutes: c.durationMinutes ?? null,
      language: c.language,
      tags: c.tags,
      publisher: c.publisher ?? null,
      sourceUrl: c.sourceUrl ?? null,
      reviewedAt: c.reviewedAt ?? null,
    };
  }

  async listPublished(q: { type?: WellnessContentType; language?: string; tag?: string; skip: number; limit: number }) {
    const filter: Record<string, unknown> = { status: ContentStatus.PUBLISHED };
    if (q.type) filter['type'] = q.type;
    if (q.language) filter['language'] = q.language;
    if (q.tag) filter['tags'] = q.tag;
    const [rows, total] = await Promise.all([
      this.model.find(filter).sort({ publishedAt: -1 }).skip(q.skip).limit(q.limit).lean<Lean[]>(),
      this.model.countDocuments(filter),
    ]);
    return { items: rows.map((r) => this.toPublic(r)), total };
  }

  async getPublished(slug: string) {
    const row = await this.model.findOne({ slug, status: ContentStatus.PUBLISHED }).lean<Lean>();
    if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Content not found.' });
    return this.toPublic(row);
  }

  // ------------------------------------------------------------------ admin

  async adminList(status: ContentStatus | undefined, skip: number, limit: number) {
    const filter = status ? { status } : {};
    const [rows, total] = await Promise.all([
      this.model.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean<Lean[]>(),
      this.model.countDocuments(filter),
    ]);
    return { items: rows.map((r) => ({ ...this.toPublic(r), status: r.status, publishedAt: r.publishedAt ?? null, updatedAt: r.updatedAt })), total };
  }

  async create(admin: AuthenticatedUser, input: WellnessInput) {
    if (await this.model.exists({ slug: input.slug })) throw new ConflictException({ code: 'SLUG_TAKEN', message: 'That slug is already used.' });
    const row = await this.model.create({ ...input, status: ContentStatus.DRAFT });
    await this.audit.record({ actorId: admin.id, actorRole: admin.role, action: 'wellness.created', resourceType: 'WellnessContent', resourceId: row._id.toString() });
    return this.toPublic(row.toObject());
  }

  async update(admin: AuthenticatedUser, id: string, input: Partial<WellnessInput>) {
    const row = await this.model.findById(id);
    if (!row) throw new NotFoundException();
    Object.assign(row, input);
    // Edits to published content require a fresh review before they reach users.
    if (row.status === ContentStatus.PUBLISHED) {
      row.status = ContentStatus.DRAFT;
      row.reviewedAt = undefined;
      row.reviewedBy = undefined;
    }
    await row.save();
    await this.audit.record({ actorId: admin.id, actorRole: admin.role, action: 'wellness.updated', resourceType: 'WellnessContent', resourceId: id });
    await this.jobs.dispatch(KNOWLEDGE_SYNC_JOB, {});
    return this.toPublic(row.toObject());
  }

  async setStatus(admin: AuthenticatedUser, id: string, status: ContentStatus) {
    const row = await this.model.findById(id);
    if (!row) throw new NotFoundException();
    row.status = status;
    if (status === ContentStatus.PUBLISHED) {
      row.reviewedAt = new Date();
      row.reviewedBy = new Types.ObjectId(admin.id);
      row.publishedAt = row.publishedAt ?? new Date();
    }
    await row.save();
    await this.audit.record({ actorId: admin.id, actorRole: admin.role, action: `wellness.${status.toLowerCase()}`, resourceType: 'WellnessContent', resourceId: id });
    await this.jobs.dispatch(KNOWLEDGE_SYNC_JOB, {});
    return this.toPublic(row.toObject());
  }

  /** Replaces the AI service's knowledge base with all currently published, reviewed content. */
  async syncKnowledge(): Promise<number> {
    const rows = await this.model.find({ status: ContentStatus.PUBLISHED }).lean<Lean[]>();
    const documents = rows.map((r) => ({
      id: r._id.toString(),
      title: r.title,
      body: [r.summary, r.body, ...r.steps].join('\n\n').slice(0, 50000),
      language: r.language,
      publisher: r.publisher ?? 'MindBridge editorial',
      source_url: r.sourceUrl ?? null,
      reviewed_at: r.reviewedAt?.toISOString() ?? null,
      tags: r.tags,
    }));
    try {
      const res = await this.ai.syncKnowledge(documents);
      return res.chunks;
    } catch (err) {
      if (err instanceof AiServiceUnavailableError) {
        this.logger.warn('knowledge sync skipped: AI service unavailable');
        return 0;
      }
      throw err;
    }
  }
}
