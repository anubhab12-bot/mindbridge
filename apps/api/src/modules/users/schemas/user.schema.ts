import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  AccountStatus,
  type AdminPermission,
  ALL_ADMIN_PERMISSIONS,
  Role,
} from '@mindbridge/shared-types';
import type { HydratedDocument } from 'mongoose';

/**
 * Access control: a user document is readable by its owner (via /auth/me and profile
 * endpoints) and by admins holding `users:manage` (limited fields only). Password hash,
 * MFA secret and lockout counters are `select: false` and never serialized.
 */
@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, lowercase: true, trim: true, maxlength: 254 })
  email!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ type: String, required: true, enum: Object.values(Role) })
  role!: Role;

  @Prop({ type: String, required: true, enum: Object.values(AccountStatus), default: AccountStatus.ACTIVE })
  status!: AccountStatus;

  @Prop({ required: true, trim: true, maxlength: 80 })
  displayName!: string;

  @Prop({ type: Date, default: null })
  emailVerifiedAt!: Date | null;

  @Prop({ default: 'Asia/Kolkata', maxlength: 64 })
  timezone!: string;

  @Prop({ default: 'en', maxlength: 10 })
  locale!: string;

  @Prop({ default: 'IN', maxlength: 2, uppercase: true })
  country!: string;

  @Prop({ type: [String], enum: ALL_ADMIN_PERMISSIONS, default: [] })
  adminPermissions!: AdminPermission[];

  @Prop({ default: false })
  mfaEnabled!: boolean;

  /** TOTP secret, encrypted with FieldEncryptionService. */
  @Prop({ select: false })
  mfaSecretEnc?: string;

  @Prop({ default: 0, select: false })
  failedLoginCount!: number;

  @Prop({ type: Date, default: null, select: false })
  lockedUntil!: Date | null;

  @Prop({ type: Date })
  lastLoginAt?: Date;

  @Prop({ type: Date })
  passwordChangedAt?: Date;

  @Prop({ type: Date })
  deletionRequestedAt?: Date;

  @Prop({ type: Date })
  deletionScheduledFor?: Date;

  @Prop({ maxlength: 500 })
  statusReason?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1, status: 1, createdAt: -1 });
UserSchema.index({ status: 1, deletionScheduledFor: 1 });
