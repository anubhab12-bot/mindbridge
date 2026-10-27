import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { RiskLevel } from '@mindbridge/shared-types';
import { type HydratedDocument, Types } from 'mongoose';

/**
 * Records that the crisis workflow was triggered: risk level, reason codes and what was shown.
 * Contains no message text. Used for safety monitoring and to review the workflow itself.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'safety_events' })
export class SafetyEvent {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conversation' })
  conversationId?: Types.ObjectId;

  @Prop({ type: String, required: true, enum: Object.values(RiskLevel) })
  riskLevel!: RiskLevel;

  @Prop({ type: [String], default: [] })
  signals!: string[];

  @Prop({ type: String, required: true, enum: ['ai_service', 'local_fallback', 'patient_request'] })
  source!: 'ai_service' | 'local_fallback' | 'patient_request';

  @Prop({ default: 0 })
  resourcesShown!: number;

  /** Patient explicitly asked for human support from their care team. */
  @Prop({ default: false })
  handoffRequested!: boolean;

  @Prop({ default: 0 })
  careTeamNotified!: number;

  createdAt!: Date;
}

export type SafetyEventDocument = HydratedDocument<SafetyEvent>;
export const SafetyEventSchema = SchemaFactory.createForClass(SafetyEvent);
SafetyEventSchema.index({ createdAt: -1 });
SafetyEventSchema.index({ patientId: 1, createdAt: -1 });
SafetyEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 3600 });
