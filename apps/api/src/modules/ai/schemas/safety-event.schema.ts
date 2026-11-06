import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { RiskLevel, SafetyEventStatus } from '@mindbridge/shared-types';
import { type HydratedDocument, Types } from 'mongoose';

/**
 * Records that the crisis workflow was triggered: risk level, reason codes and what was shown.
 * Contains no message text. Used for safety monitoring and triage.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: true }, collection: 'safety_events' })
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

  /** Triage state: unacknowledged, assigned to on-call clinician, resolved, or escalated */
  @Prop({
    type: String,
    enum: Object.values(SafetyEventStatus),
    default: SafetyEventStatus.UNACKNOWLEDGED,
    index: true,
  })
  status!: SafetyEventStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assigneeUserId?: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  acknowledgedAt?: Date | null;

  @Prop({ type: Date, default: null })
  resolvedAt?: Date | null;

  @Prop({ type: String, maxlength: 100, default: null })
  outcomeReasonCode?: string | null;

  @Prop({ type: String, maxlength: 1000, default: null })
  notes?: string | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export type SafetyEventDocument = HydratedDocument<SafetyEvent>;
export const SafetyEventSchema = SchemaFactory.createForClass(SafetyEvent);
SafetyEventSchema.index({ createdAt: -1 });
SafetyEventSchema.index({ patientId: 1, createdAt: -1 });
SafetyEventSchema.index({ status: 1, riskLevel: 1, createdAt: -1 });
SafetyEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 3600 });
