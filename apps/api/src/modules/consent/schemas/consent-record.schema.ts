import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ConsentType } from '@mindbridge/shared-types';
import { type HydratedDocument, Types } from 'mongoose';

/**
 * Append-only consent ledger. Each grant or withdrawal is a new row; the current state is the
 * latest row per (userId, type, doctorId). Rows are never edited, so consent history is auditable.
 * Access: the owning user; doctors indirectly through ConsentService checks only.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'consent_records' })
export class ConsentRecord {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: Object.values(ConsentType) })
  type!: ConsentType;

  @Prop({ required: true, maxlength: 20 })
  version!: string;

  @Prop({ required: true })
  granted!: boolean;

  /** Present for consents scoped to one professional (e.g. share AI summary with doctor X). */
  @Prop({ type: Types.ObjectId, ref: 'DoctorProfile', default: null })
  doctorId!: Types.ObjectId | null;

  @Prop({ maxlength: 32 })
  source?: string;

  createdAt!: Date;
}

export type ConsentRecordDocument = HydratedDocument<ConsentRecord>;
export const ConsentRecordSchema = SchemaFactory.createForClass(ConsentRecord);
ConsentRecordSchema.index({ userId: 1, type: 1, doctorId: 1, createdAt: -1 });
