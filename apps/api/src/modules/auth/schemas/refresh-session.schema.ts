import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

/**
 * One row per login session. The refresh token itself is never stored, only its SHA-256.
 * Rotation: each refresh replaces `tokenHash`; presenting an older token from the same
 * family (reuse) revokes the whole session as likely theft.
 */
@Schema({ timestamps: true, collection: 'refresh_sessions' })
export class RefreshSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  tokenHash!: string;

  @Prop({ type: [String], default: [], select: false })
  previousTokenHashes!: string[];

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  revokedAt!: Date | null;

  @Prop({ maxlength: 64 })
  revokedReason?: string;

  @Prop({ type: Date })
  lastUsedAt?: Date;

  /** Coarse, user-visible device description for the session list. */
  @Prop({ maxlength: 200 })
  userAgent?: string;

  /** Hashed IP so sessions can be compared without storing raw addresses. */
  @Prop({ maxlength: 64 })
  ipHash?: string;

  createdAt!: Date;
}

export type RefreshSessionDocument = HydratedDocument<RefreshSession>;
export const RefreshSessionSchema = SchemaFactory.createForClass(RefreshSession);
RefreshSessionSchema.index({ tokenHash: 1 }, { unique: true });
RefreshSessionSchema.index({ previousTokenHashes: 1 });
RefreshSessionSchema.index({ userId: 1, revokedAt: 1 });
// Expired sessions are removed 7 days after expiry.
RefreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });
