import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

/**
 * A short-lived AI draft shown to a professional. Never part of the record unless the
 * professional explicitly copies it into a note and finalizes that note. Expires after 7 days.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'ai_drafts' })
export class AiDraft {
  @Prop({ type: Types.ObjectId, ref: 'DoctorProfile', required: true })
  doctorProfileId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  patientId?: Types.ObjectId;

  @Prop({ required: true })
  task!: string;

  @Prop({ required: true })
  draftEnc!: string;

  @Prop({ required: true })
  provider!: string;

  @Prop({ required: true })
  model!: string;

  @Prop({ default: false })
  isMock!: boolean;

  createdAt!: Date;
}

export type AiDraftDocument = HydratedDocument<AiDraft>;
export const AiDraftSchema = SchemaFactory.createForClass(AiDraft);
AiDraftSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });
