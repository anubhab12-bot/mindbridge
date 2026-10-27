import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ClinicalNoteStatus, ClinicalNoteType } from '@mindbridge/shared-types';
import { type HydratedDocument, Types } from 'mongoose';

@Schema({ _id: true, timestamps: { createdAt: true, updatedAt: false } })
export class NoteAddendum {
  @Prop({ required: true })
  contentEnc!: string;

  createdAt!: Date;
}

@Schema({ _id: false })
export class AiProvenance {
  @Prop({ required: true })
  task!: string;

  @Prop({ required: true })
  provider!: string;

  @Prop({ required: true })
  model!: string;

  @Prop({ default: false })
  isMock!: boolean;

  @Prop({ type: Date, required: true })
  draftedAt!: Date;
}

/**
 * Professional documentation. Written and read only by the authoring professional while the
 * care relationship is active. FINAL notes are immutable; corrections are appended as
 * addenda. Content is encrypted. Every read and write is audited (without content).
 */
@Schema({ timestamps: true, collection: 'clinical_notes' })
export class ClinicalNote {
  @Prop({ type: Types.ObjectId, ref: 'DoctorProfile', required: true })
  doctorProfileId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorUserId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Appointment' })
  appointmentId?: Types.ObjectId;

  @Prop({ type: String, required: true, enum: Object.values(ClinicalNoteType) })
  type!: ClinicalNoteType;

  @Prop({ type: String, required: true, enum: Object.values(ClinicalNoteStatus), default: ClinicalNoteStatus.DRAFT })
  status!: ClinicalNoteStatus;

  @Prop({ required: true })
  titleEnc!: string;

  @Prop({ required: true })
  contentEnc!: string;

  /** Set when the note started from an AI draft. The professional still authored and approved it. */
  @Prop({ type: AiProvenance })
  aiProvenance?: AiProvenance;

  @Prop({ type: Date })
  finalizedAt?: Date;

  @Prop({ type: [SchemaFactory.createForClass(NoteAddendum)], default: [] })
  addenda!: (NoteAddendum & { _id: Types.ObjectId })[];

  createdAt!: Date;
  updatedAt!: Date;
}

export type ClinicalNoteDocument = HydratedDocument<ClinicalNote>;
export const ClinicalNoteSchema = SchemaFactory.createForClass(ClinicalNote);
ClinicalNoteSchema.index({ doctorProfileId: 1, patientId: 1, createdAt: -1 });
