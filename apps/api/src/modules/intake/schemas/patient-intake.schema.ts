import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

/**
 * Patient-written pre-consultation intake attached to an appointment. Answers are encrypted.
 * Visible to the patient always; to the professional only with an active care relationship
 * AND SHARE_INTAKE consent for that professional.
 */
@Schema({ timestamps: true, collection: 'patient_intakes' })
export class PatientIntake {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: true })
  appointmentId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'DoctorProfile', required: true })
  doctorProfileId!: Types.ObjectId;

  /** JSON of IntakeAnswers, encrypted. */
  @Prop({ required: true })
  answersEnc!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export interface IntakeAnswers {
  mainConcerns: string;
  goals?: string;
  duration?: string;
  previousSupport?: string;
  currentMedicationsMentioned?: string;
  preferredLanguage?: string;
  anythingElse?: string;
}

export type PatientIntakeDocument = HydratedDocument<PatientIntake>;
export const PatientIntakeSchema = SchemaFactory.createForClass(PatientIntake);
PatientIntakeSchema.index({ appointmentId: 1 }, { unique: true });
PatientIntakeSchema.index({ patientId: 1, doctorProfileId: 1, createdAt: -1 });
