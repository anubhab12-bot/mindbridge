import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

/** Patient-professional message. Content encrypted at rest; participants only. */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'secure_messages' })
export class SecureMessage {
  @Prop({ type: Types.ObjectId, ref: 'MessageThread', required: true })
  threadId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ['PATIENT', 'DOCTOR'] })
  senderRole!: 'PATIENT' | 'DOCTOR';

  @Prop({ required: true })
  contentEnc!: string;

  @Prop({ type: Date, default: null })
  readAt!: Date | null;

  createdAt!: Date;
}

export type SecureMessageDocument = HydratedDocument<SecureMessage>;
export const SecureMessageSchema = SchemaFactory.createForClass(SecureMessage);
SecureMessageSchema.index({ threadId: 1, createdAt: -1 });
