import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

export const EMOTION_TAGS = [
  'calm',
  'content',
  'hopeful',
  'grateful',
  'tired',
  'lonely',
  'sad',
  'anxious',
  'stressed',
  'frustrated',
  'angry',
  'overwhelmed',
  'numb',
  'restless',
] as const;
export type EmotionTag = (typeof EMOTION_TAGS)[number];

/**
 * Optional self-reported mood check-in. Owner-only. Shared with a professional only as an
 * aggregated summary when the patient grants SHARE_MOOD_SUMMARY for that professional.
 * No diagnostic labels are ever derived from this data.
 */
@Schema({ timestamps: true, collection: 'mood_entries' })
export class MoodEntry {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId!: Types.ObjectId;

  /** 1 (very low) … 5 (very good). */
  @Prop({ required: true, min: 1, max: 5 })
  score!: number;

  @Prop({ type: [String], enum: EMOTION_TAGS, default: [] })
  emotions!: EmotionTag[];

  /** Optional short note, encrypted. */
  @Prop()
  noteEnc?: string;

  /** Calendar day (YYYY-MM-DD) in the patient's timezone. */
  @Prop({ required: true, match: /^\d{4}-\d{2}-\d{2}$/ })
  entryDate!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export type MoodEntryDocument = HydratedDocument<MoodEntry>;
export const MoodEntrySchema = SchemaFactory.createForClass(MoodEntry);
MoodEntrySchema.index({ patientId: 1, entryDate: -1, createdAt: -1 });
