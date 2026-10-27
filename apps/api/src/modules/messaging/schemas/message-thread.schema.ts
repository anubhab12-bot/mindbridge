import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

/** One thread per patient-professional pair. Usable only while the care relationship is active. */
@Schema({ timestamps: true, collection: 'message_threads' })
export class MessageThread {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'DoctorProfile', required: true })
  doctorProfileId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  doctorUserId!: Types.ObjectId;

  @Prop({ type: Date, default: () => new Date() })
  lastMessageAt!: Date;

  @Prop({ default: 0 })
  unreadForPatient!: number;

  @Prop({ default: 0 })
  unreadForDoctor!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export type MessageThreadDocument = HydratedDocument<MessageThread>;
export const MessageThreadSchema = SchemaFactory.createForClass(MessageThread);
MessageThreadSchema.index({ patientId: 1, doctorProfileId: 1 }, { unique: true });
MessageThreadSchema.index({ doctorUserId: 1, lastMessageAt: -1 });
MessageThreadSchema.index({ patientId: 1, lastMessageAt: -1 });
