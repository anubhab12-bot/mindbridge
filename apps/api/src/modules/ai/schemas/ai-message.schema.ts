import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { RiskLevel } from '@mindbridge/shared-types';
import { type HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class MessageSafety {
  @Prop({ type: String, enum: Object.values(RiskLevel), required: true })
  riskLevel!: RiskLevel;

  @Prop({ default: false })
  crisisMode!: boolean;

  @Prop({ type: [String], default: [] })
  signals!: string[];

  @Prop({ default: false })
  showHumanSupport!: boolean;
}

/** One message in a conversation. Content is always encrypted at rest. */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'ai_messages' })
export class AiMessage {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ['user', 'assistant', 'notice'] })
  role!: 'user' | 'assistant' | 'notice';

  @Prop({ required: true })
  contentEnc!: string;

  @Prop({ type: MessageSafety })
  safety?: MessageSafety;

  /** True when produced by the development mock provider; always shown in the UI. */
  @Prop({ default: false })
  isMock!: boolean;

  /** True when produced by a deterministic template or fallback rather than a model. */
  @Prop({ default: false })
  templated!: boolean;

  @Prop({ type: [{ title: String, publisher: String, url: String, _id: false }], default: [] })
  sources!: { title: string; publisher?: string; url?: string }[];

  @Prop({ type: String, enum: ['HELPFUL', 'NOT_HELPFUL', 'REPORTED'] })
  feedback?: 'HELPFUL' | 'NOT_HELPFUL' | 'REPORTED';

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  createdAt!: Date;
}

export type AiMessageDocument = HydratedDocument<AiMessage>;
export const AiMessageSchema = SchemaFactory.createForClass(AiMessage);
AiMessageSchema.index({ conversationId: 1, createdAt: 1 });
AiMessageSchema.index({ patientId: 1, createdAt: -1 });
AiMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
