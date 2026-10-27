import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

export const AuthTokenType = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PASSWORD_RESET: 'PASSWORD_RESET',
} as const;
export type AuthTokenType = (typeof AuthTokenType)[keyof typeof AuthTokenType];

/** Single-use tokens for email verification and password reset, stored hashed, auto-expiring. */
@Schema({ timestamps: true, collection: 'auth_tokens' })
export class AuthToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(AuthTokenType) })
  type!: AuthTokenType;

  @Prop({ required: true })
  tokenHash!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  usedAt!: Date | null;
}

export type AuthTokenDocument = HydratedDocument<AuthToken>;
export const AuthTokenSchema = SchemaFactory.createForClass(AuthToken);
AuthTokenSchema.index({ tokenHash: 1 }, { unique: true });
AuthTokenSchema.index({ userId: 1, type: 1 });
AuthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
