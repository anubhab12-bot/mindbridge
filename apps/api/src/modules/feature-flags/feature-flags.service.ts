import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { AuditService } from '../audit/audit.service.js';
import { FeatureFlag } from './schemas/feature-flag.schema.js';

/** Known flags and their defaults. Unknown keys cannot be created from the admin UI. */
export const FLAG_DEFAULTS: Record<string, { enabled: boolean; clientVisible: boolean; description: string }> = {
  'ai.companion': { enabled: true, clientVisible: true, description: 'Patient AI companion chat' },
  'ai.doctor_assist': { enabled: true, clientVisible: true, description: 'AI drafting tools for verified professionals' },
  'booking.enabled': { enabled: true, clientVisible: true, description: 'New appointment bookings' },
  'messaging.enabled': { enabled: true, clientVisible: true, description: 'Secure messaging' },
  'registration.doctor': { enabled: true, clientVisible: true, description: 'Professional sign-up' },
};

@Injectable()
export class FeatureFlagsService {
  private cache: { at: number; flags: Map<string, FeatureFlag> } | null = null;

  constructor(
    @InjectModel(FeatureFlag.name) private readonly model: Model<FeatureFlag>,
    private readonly audit: AuditService,
  ) {}

  private async all() {
    if (this.cache && Date.now() - this.cache.at < 30_000) return this.cache.flags;
    const rows = await this.model.find().lean();
    const flags = new Map<string, FeatureFlag>();
    for (const [key, d] of Object.entries(FLAG_DEFAULTS)) flags.set(key, { key, ...d } as FeatureFlag);
    for (const r of rows) if (FLAG_DEFAULTS[r.key]) flags.set(r.key, r);
    this.cache = { at: Date.now(), flags };
    return flags;
  }

  async isEnabled(key: string) {
    return (await this.all()).get(key)?.enabled ?? false;
  }

  async clientFlags() {
    const out: Record<string, boolean> = {};
    for (const [k, f] of await this.all()) if (f.clientVisible) out[k] = f.enabled;
    return out;
  }

  async list() {
    return [...(await this.all()).values()].map((f) => ({ key: f.key, enabled: f.enabled, description: f.description, clientVisible: f.clientVisible, updatedAt: f.updatedAt ?? null }));
  }

  async set(admin: AuthenticatedUser, key: string, enabled: boolean) {
    const def = FLAG_DEFAULTS[key];
    if (!def) return null;
    await this.model.updateOne(
      { key },
      { $set: { enabled, updatedBy: new Types.ObjectId(admin.id) }, $setOnInsert: { description: def.description, clientVisible: def.clientVisible } },
      { upsert: true },
    );
    this.cache = null;
    await this.audit.record({ actorId: admin.id, actorRole: admin.role, action: 'settings.flag_changed', metadata: { key, enabled } });
    return { key, enabled };
  }
}
