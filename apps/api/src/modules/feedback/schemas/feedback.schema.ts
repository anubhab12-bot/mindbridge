import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ModerationStatus } from '@mindbridge/shared-types';
import { type HydratedDocument, Types } from 'mongoose';

/**
 * Post-consultation rating. One per completed appointment. Comments are moderated before
 * they count toward a professional's rating; comments are never shown publicly in v1.
 */
@Schema({ timestamps: true, collection: 'feedback' })
export class Feedback {
  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: true })
  appointmentId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'DoctorProfile', required: true })
  doctorProfileId!: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating!: number;

  @Prop({ maxlength: 1000 })
  comment?: string;

  @Prop({ type: String, required: true, enum: Object.values(ModerationStatus), default: ModerationStatus.PENDING })
  moderationStatus!: ModerationStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  moderatedBy?: Types.ObjectId;

  @Prop({ type: Date })
  moderatedAt?: Date;

  createdAt!: Date;
}

export type FeedbackDocument = HydratedDocument<Feedback>;
export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
FeedbackSchema.index({ appointmentId: 1 }, { unique: true });
FeedbackSchema.index({ moderationStatus: 1, createdAt: 1 });
