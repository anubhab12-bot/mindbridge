import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  ConsultationMode,
  DoctorVerificationStatus,
  ProfessionalCategory,
} from '@mindbridge/shared-types';
import { type HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class WorkingHours {
  /** 0 = Sunday … 6 = Saturday, in the doctor's timezone. */
  @Prop({ required: true, min: 0, max: 6 })
  dayOfWeek!: number;

  /** "HH:mm" local time. */
  @Prop({ required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ })
  start!: string;

  @Prop({ required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ })
  end!: string;
}
const WorkingHoursSchema = SchemaFactory.createForClass(WorkingHours);

/**
 * Professional profile. Public fields are exposed only when verificationStatus = APPROVED
 * and the account is ACTIVE. Registration number and council are visible to the doctor and
 * to admins with `doctors:verify`. Verification fields are written only by VerificationService.
 */
@Schema({ timestamps: true, collection: 'doctor_profiles' })
export class DoctorProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 80 })
  displayName!: string;

  @Prop({ required: true, enum: Object.values(ProfessionalCategory) })
  professionalCategory!: ProfessionalCategory;

  @Prop({ type: [String], default: [] })
  qualifications!: string[];

  @Prop({ required: true, trim: true, maxlength: 60 })
  registrationNumber!: string;

  @Prop({ required: true, trim: true, maxlength: 120 })
  registrationCouncil!: string;

  @Prop({ type: [String], default: [] })
  specialties!: string[];

  @Prop({ type: [String], default: ['en'] })
  languages!: string[];

  @Prop({ required: true, min: 0, max: 70 })
  yearsExperience!: number;

  @Prop({ default: '', maxlength: 2000 })
  bio!: string;

  @Prop({ type: { amount: Number, currency: String }, default: { amount: 0, currency: 'INR' } })
  consultationFee!: { amount: number; currency: string };

  @Prop({ type: [String], enum: Object.values(ConsultationMode), default: [ConsultationMode.ONLINE] })
  consultationModes!: ConsultationMode[];

  @Prop({ type: [WorkingHoursSchema], default: [] })
  workingHours!: WorkingHours[];

  @Prop({ default: 'Asia/Kolkata', maxlength: 64 })
  timezone!: string;

  @Prop({ default: 50, min: 15, max: 120 })
  slotDurationMinutes!: number;

  @Prop({ maxlength: 200 })
  clinicAddress?: string;

  @Prop({
    required: true,
    enum: Object.values(DoctorVerificationStatus),
    default: DoctorVerificationStatus.PENDING_VERIFICATION,
  })
  verificationStatus!: DoctorVerificationStatus;

  @Prop({ type: Date })
  verifiedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  verifiedBy?: Types.ObjectId;

  @Prop({ default: 0 })
  ratingSum!: number;

  @Prop({ default: 0 })
  ratingCount!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export type DoctorProfileDocument = HydratedDocument<DoctorProfile>;
export const DoctorProfileSchema = SchemaFactory.createForClass(DoctorProfile);
DoctorProfileSchema.index({ userId: 1 }, { unique: true });
DoctorProfileSchema.index({ verificationStatus: 1, professionalCategory: 1 });
DoctorProfileSchema.index({ verificationStatus: 1, specialties: 1 });
DoctorProfileSchema.index({ verificationStatus: 1, languages: 1 });
DoctorProfileSchema.index({ registrationCouncil: 1, registrationNumber: 1 }, { unique: true });
DoctorProfileSchema.index({ displayName: 'text', bio: 'text', specialties: 'text' });
