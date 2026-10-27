import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

export const CareRelationshipStatus = { ACTIVE: 'ACTIVE', ENDED: 'ENDED' } as const;
export type CareRelationshipStatus = (typeof CareRelationshipStatus)[keyof typeof CareRelationshipStatus];

/**
 * The authorization anchor for any doctor access to patient data. Created when a professional
 * confirms an appointment; ended by the patient at any time (which immediately removes the
 * professional's access) or by an admin suspension of the professional.
 */
@Schema({ timestamps: true, collection: 'care_relationships' })
export class CareRelationship {
  @Prop({ type: Types.ObjectId, ref: 'DoctorProfile', required: true })
  doctorProfileId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId!: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(CareRelationshipStatus), default: CareRelationshipStatus.ACTIVE })
  status!: CareRelationshipStatus;

  @Prop({ required: true })
  establishedAt!: Date;

  @Prop({ type: Date })
  endedAt?: Date;

  @Prop({ enum: ['PATIENT', 'DOCTOR', 'SYSTEM'] })
  endedBy?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export type CareRelationshipDocument = HydratedDocument<CareRelationship>;
export const CareRelationshipSchema = SchemaFactory.createForClass(CareRelationship);
CareRelationshipSchema.index({ doctorProfileId: 1, patientId: 1 }, { unique: true });
CareRelationshipSchema.index({ patientId: 1, status: 1 });
CareRelationshipSchema.index({ doctorProfileId: 1, status: 1 });
