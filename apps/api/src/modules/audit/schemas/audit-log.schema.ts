import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

/**
 * Append-only audit trail. Only ids, action names, outcomes and redacted metadata are
 * stored: never passwords, tokens, conversation text, journal text or clinical content.
 * Readable only by admins with `audit:read`; no API can update or delete entries.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  actorId!: Types.ObjectId | null;

  @Prop({ maxlength: 16 })
  actorRole?: string;

  @Prop({ required: true, maxlength: 80 })
  action!: string;

  @Prop({ maxlength: 40 })
  resourceType?: string;

  @Prop({ maxlength: 40 })
  resourceId?: string;

  @Prop({ required: true, enum: ['SUCCESS', 'FAILURE', 'DENIED'] })
  outcome!: 'SUCCESS' | 'FAILURE' | 'DENIED';

  @Prop({ maxlength: 64 })
  ipHash?: string;

  @Prop({ maxlength: 64 })
  requestId?: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  createdAt!: Date;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
// Retention: two years, after which entries expire automatically.
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 3600, name: 'retention_ttl' });
