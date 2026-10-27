import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { RiskLevel } from '@mindbridge/shared-types';
import { type HydratedDocument, Types } from 'mongoose';

/** A patient's AI companion conversation. Owner-only; expires after the retention period. */
@Schema({ timestamps: true, collection: 'ai_conversations' })
export class Conversation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId!: Types.ObjectId;

  /** Opaque reference sent to the AI service instead of any identifier. */
  @Prop({ required: true, unique: true })
  ref!: string;

  /** Encrypted user-chosen title. */
  @Prop()
  titleEnc?: string;

  @Prop({ default: 0 })
  messageCount!: number;

  @Prop({ type: Date, default: () => new Date() })
  lastMessageAt!: Date;

  /** Highest risk level seen in this conversation (no content). */
  @Prop({ type: String, enum: Object.values(RiskLevel), default: RiskLevel.NONE })
  highestRisk!: RiskLevel;

  /** Encrypted patient-facing summary, generated on request. */
  @Prop()
  summaryEnc?: string;

  @Prop({ type: Date })
  summaryUpdatedAt?: Date;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ConversationDocument = HydratedDocument<Conversation>;
export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ patientId: 1, lastMessageAt: -1 });
ConversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
