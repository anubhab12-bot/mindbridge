import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { RiskLevel } from '@mindbridge/shared-types';
import { type HydratedDocument, Types } from 'mongoose';

/**
 * Operational metadata for each AI call. Never contains message content, so it can be used
 * for monitoring cost, latency, fallback rate and guard activity.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'ai_interactions' })
export class AiInteraction {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ['support', 'summary', 'doctor_assist', 'screen'] })
  kind!: 'support' | 'summary' | 'doctor_assist' | 'screen';

  @Prop({ required: true })
  provider!: string;

  @Prop({ required: true })
  model!: string;

  @Prop()
  promptVersion?: string;

  @Prop()
  policyVersion?: string;

  @Prop({ default: 0 })
  inputTokens!: number;

  @Prop({ default: 0 })
  outputTokens!: number;

  @Prop({ default: 0 })
  latencyMs!: number;

  @Prop({ default: false })
  isMock!: boolean;

  @Prop({ default: false })
  fallbackUsed!: boolean;

  /** True when the AI service itself was unreachable and the API answered locally. */
  @Prop({ default: false })
  serviceUnavailable!: boolean;

  @Prop({ type: [String], default: [] })
  guardActions!: string[];

  @Prop({ type: String, enum: Object.values(RiskLevel) })
  riskLevel?: RiskLevel;

  createdAt!: Date;
}

export type AiInteractionDocument = HydratedDocument<AiInteraction>;
export const AiInteractionSchema = SchemaFactory.createForClass(AiInteraction);
AiInteractionSchema.index({ createdAt: -1 });
AiInteractionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 400 * 24 * 3600 });
