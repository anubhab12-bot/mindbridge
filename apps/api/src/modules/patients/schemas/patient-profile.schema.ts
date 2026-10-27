import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

/**
 * Minimum necessary patient profile.
 * Access control: owner only (PATIENT role, userId = caller). Doctors receive a reduced
 * projection (display name, preferred language, pronouns) only within an active care
 * relationship. Admins never read this collection through the API.
 */
@Schema({ timestamps: true, collection: 'patient_profiles' })
export class PatientProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ maxlength: 40 })
  pronouns?: string;

  @Prop({ default: 'en', maxlength: 10 })
  preferredLanguage!: string;

  @Prop({ maxlength: 80 })
  region?: string;

  /** The patient confirmed they are 18 or older. Minors are not supported in v1 (guardian consent flows pending). */
  @Prop({ required: true })
  ageConfirmedAdult!: boolean;

  /** Optional trusted contact, encrypted. Never shared automatically with anyone. */
  @Prop()
  trustedContactEnc?: string;

  @Prop({ default: false })
  moodRemindersEnabled!: boolean;

  @Prop({ default: false })
  showReadReceipts!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export type PatientProfileDocument = HydratedDocument<PatientProfile>;
export const PatientProfileSchema = SchemaFactory.createForClass(PatientProfile);
PatientProfileSchema.index({ userId: 1 }, { unique: true });
