import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  type AdminPermission,
  AdminRolePreset,
  ALL_ADMIN_PERMISSIONS,
  GovernanceRole,
} from '@mindbridge/shared-types';
import { type HydratedDocument, Types } from 'mongoose';

export const PromotionStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
} as const;
export type PromotionStatus = (typeof PromotionStatus)[keyof typeof PromotionStatus];

@Schema({ timestamps: true, collection: 'admin_promotions' })
export class AdminPromotion {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  targetUserId!: Types.ObjectId;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  targetEmail!: string;

  @Prop({ type: String, enum: Object.values(AdminRolePreset), required: true })
  targetPreset!: AdminRolePreset;

  @Prop({ type: [String], enum: ALL_ADMIN_PERMISSIONS, default: [] })
  targetPermissions!: AdminPermission[];

  @Prop({ type: String, enum: Object.values(GovernanceRole), default: null })
  targetGovernanceRole?: GovernanceRole | null;

  @Prop({ type: String, required: true, maxlength: 500 })
  rationale!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  proposedBy!: Types.ObjectId;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  proposedByEmail!: string;

  @Prop({ type: String, enum: Object.values(PromotionStatus), default: PromotionStatus.PENDING })
  status!: PromotionStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  confirmedBy?: Types.ObjectId | null;

  @Prop({ type: String, lowercase: true, trim: true, default: null })
  confirmedByEmail?: string | null;

  @Prop({ type: Date, default: null })
  confirmedAt?: Date | null;

  @Prop({ type: String, maxlength: 500, default: null })
  rejectionReason?: string | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export type AdminPromotionDocument = HydratedDocument<AdminPromotion>;
export const AdminPromotionSchema = SchemaFactory.createForClass(AdminPromotion);
AdminPromotionSchema.index({ targetUserId: 1, status: 1 });
AdminPromotionSchema.index({ status: 1, createdAt: -1 });
