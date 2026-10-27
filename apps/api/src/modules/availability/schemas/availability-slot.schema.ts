import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

export const AvailabilityKind = {
  /** Leave, holidays or any blocked time. Overrides working hours. */
  UNAVAILABLE: 'UNAVAILABLE',
  /** One-off extra availability outside regular working hours. */
  EXTRA_AVAILABLE: 'EXTRA_AVAILABLE',
} as const;
export type AvailabilityKind = (typeof AvailabilityKind)[keyof typeof AvailabilityKind];

/**
 * Exceptions to a professional's weekly working hours. Owned and edited only by that
 * professional; patients see only the resulting free slots (never the reason text).
 */
@Schema({ timestamps: true, collection: 'availability_slots' })
export class AvailabilitySlot {
  @Prop({ type: Types.ObjectId, ref: 'DoctorProfile', required: true })
  doctorProfileId!: Types.ObjectId;

  @Prop({ required: true })
  startAt!: Date;

  @Prop({ required: true })
  endAt!: Date;

  @Prop({ required: true, enum: Object.values(AvailabilityKind) })
  kind!: AvailabilityKind;

  @Prop({ maxlength: 200 })
  note?: string;
}

export type AvailabilitySlotDocument = HydratedDocument<AvailabilitySlot>;
export const AvailabilitySlotSchema = SchemaFactory.createForClass(AvailabilitySlot);
AvailabilitySlotSchema.index({ doctorProfileId: 1, startAt: 1, endAt: 1 });
// Past exceptions are cleaned up after a year.
AvailabilitySlotSchema.index({ endAt: 1 }, { expireAfterSeconds: 365 * 24 * 3600 });
