import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { DoctorVerificationStatus } from '@mindbridge/shared-types';
import { type HydratedDocument, Types } from 'mongoose';

export const VerificationDocumentType = {
  REGISTRATION_CERTIFICATE: 'REGISTRATION_CERTIFICATE',
  DEGREE_CERTIFICATE: 'DEGREE_CERTIFICATE',
  GOVERNMENT_ID: 'GOVERNMENT_ID',
  OTHER: 'OTHER',
} as const;
export type VerificationDocumentType = (typeof VerificationDocumentType)[keyof typeof VerificationDocumentType];

@Schema({ timestamps: { createdAt: 'uploadedAt', updatedAt: false } })
export class VerificationDocument {
  _id!: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(VerificationDocumentType) })
  type!: VerificationDocumentType;

  @Prop({ required: true, maxlength: 120 })
  originalName!: string;

  @Prop({ required: true })
  storageKey!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true })
  size!: number;

  uploadedAt!: Date;
}
const VerificationDocumentSchema = SchemaFactory.createForClass(VerificationDocument);

@Schema({ _id: false })
export class VerificationEvent {
  @Prop({ required: true, enum: Object.values(DoctorVerificationStatus) })
  status!: DoctorVerificationStatus;

  @Prop({ maxlength: 1000 })
  reason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  actorId?: Types.ObjectId;

  @Prop({ required: true })
  at!: Date;
}
const VerificationEventSchema = SchemaFactory.createForClass(VerificationEvent);

/**
 * Verification application for one professional. Readable by the owning doctor (documents
 * metadata and status history) and by admins with `doctors:verify`. Status changes happen only
 * through VerificationService admin methods, which record the reviewer and reason.
 */
@Schema({ timestamps: true, collection: 'professional_verifications' })
export class ProfessionalVerification {
  @Prop({ type: Types.ObjectId, ref: 'DoctorProfile', required: true })
  doctorProfileId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
    enum: Object.values(DoctorVerificationStatus),
    default: DoctorVerificationStatus.PENDING_VERIFICATION,
  })
  status!: DoctorVerificationStatus;

  @Prop({ type: [VerificationDocumentSchema], default: [] })
  documents!: Types.DocumentArray<VerificationDocument>;

  @Prop({ type: [VerificationEventSchema], default: [] })
  history!: VerificationEvent[];

  /** Message shown to the doctor when more information is requested. */
  @Prop({ maxlength: 1000 })
  requestedInfo?: string;

  @Prop({ type: Date })
  submittedAt?: Date;

  @Prop({ type: Date })
  decidedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  decidedBy?: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ProfessionalVerificationDocument = HydratedDocument<ProfessionalVerification>;
export const ProfessionalVerificationSchema = SchemaFactory.createForClass(ProfessionalVerification);
ProfessionalVerificationSchema.index({ doctorProfileId: 1 }, { unique: true });
ProfessionalVerificationSchema.index({ status: 1, createdAt: 1 });
