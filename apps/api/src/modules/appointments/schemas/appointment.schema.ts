import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AppointmentStatus, ConsultationMode, SLOT_HOLDING_STATUSES } from '@mindbridge/shared-types';
import { type HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class AppointmentEvent {
  @Prop({ required: true, maxlength: 40 })
  action!: string;

  @Prop({ required: true, maxlength: 16 })
  actorRole!: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  actorId?: Types.ObjectId;

  @Prop({ required: true })
  at!: Date;

  @Prop({ type: Object })
  meta?: Record<string, unknown>;
}
const AppointmentEventSchema = SchemaFactory.createForClass(AppointmentEvent);

/**
 * Access control: visible to the booking patient and the professional only. Admins see
 * aggregate counts and minimal operational fields (no reason text). All times are UTC.
 */
@Schema({ timestamps: true, collection: 'appointments' })
export class Appointment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'DoctorProfile', required: true })
  doctorProfileId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  doctorUserId!: Types.ObjectId;

  @Prop({ required: true })
  startAt!: Date;

  @Prop({ required: true })
  endAt!: Date;

  @Prop({ required: true, enum: Object.values(ConsultationMode) })
  mode!: ConsultationMode;

  @Prop({ required: true, enum: Object.values(AppointmentStatus), default: AppointmentStatus.REQUESTED })
  status!: AppointmentStatus;

  /**
   * True while the appointment holds the slot (REQUESTED or CONFIRMED). Backed by a partial
   * unique index so two bookings can never hold the same doctor start time, even under races.
   */
  @Prop({ type: Boolean, default: undefined })
  holdsSlot?: boolean;

  @Prop({ maxlength: 64 })
  patientTimezone?: string;

  /** Short patient-provided reason, encrypted. */
  @Prop()
  reasonEnc?: string;

  @Prop({ type: { amount: Number, currency: String } })
  fee?: { amount: number; currency: string };

  @Prop({ type: Object })
  cancellation?: { by: 'PATIENT' | 'DOCTOR' | 'SYSTEM'; reason?: string; at: Date; late: boolean };

  /** Brief, non-clinical outcome recorded by the professional (clinical content goes to ClinicalNote). */
  @Prop({ type: Object })
  outcome?: { summary?: string; followUpRecommended: boolean; followUpInWeeks?: number; recordedAt: Date };

  @Prop({ default: 0 })
  rescheduleCount!: number;

  @Prop({ type: [AppointmentEventSchema], default: [] })
  history!: AppointmentEvent[];

  createdAt!: Date;
  updatedAt!: Date;
}

export type AppointmentDocument = HydratedDocument<Appointment>;
export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
AppointmentSchema.index(
  { doctorProfileId: 1, startAt: 1 },
  { unique: true, partialFilterExpression: { holdsSlot: true }, name: 'doctor_slot_unique' },
);
AppointmentSchema.index({ patientId: 1, startAt: -1 });
AppointmentSchema.index({ doctorProfileId: 1, status: 1, startAt: 1 });
AppointmentSchema.index({ status: 1, startAt: 1 });

export const holdsSlot = (status: AppointmentStatus) => (SLOT_HOLDING_STATUSES.includes(status) ? true : undefined);
