import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ContentStatus, WellnessContentType } from '@mindbridge/shared-types';
import { type HydratedDocument, Types } from 'mongoose';

/**
 * Self-help content (articles, breathing and grounding exercises). Educational only; it never
 * diagnoses or recommends medication. Published content must have been reviewed by an admin
 * with content:manage, and only published content is synced to the AI knowledge base.
 */
@Schema({ timestamps: true, collection: 'wellness_content' })
export class WellnessContent {
  @Prop({ required: true, unique: true, lowercase: true, trim: true, maxlength: 120, match: /^[a-z0-9-]+$/ })
  slug!: string;

  @Prop({ type: String, required: true, enum: Object.values(WellnessContentType) })
  type!: WellnessContentType;

  @Prop({ required: true, trim: true, maxlength: 200 })
  title!: string;

  @Prop({ required: true, trim: true, maxlength: 500 })
  summary!: string;

  /** Plain text with simple paragraphs; rendered as text (never as HTML). */
  @Prop({ required: true, maxlength: 50000 })
  body!: string;

  /** Ordered steps for exercises. */
  @Prop({ type: [String], default: [] })
  steps!: string[];

  @Prop({ min: 1, max: 120 })
  durationMinutes?: number;

  @Prop({ default: 'en', maxlength: 10 })
  language!: string;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ trim: true, maxlength: 200 })
  publisher?: string;

  @Prop({ trim: true, maxlength: 500 })
  sourceUrl?: string;

  @Prop({ type: String, required: true, enum: Object.values(ContentStatus), default: ContentStatus.DRAFT })
  status!: ContentStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  @Prop({ type: Date })
  reviewedAt?: Date;

  @Prop({ type: Date })
  publishedAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export type WellnessContentDocument = HydratedDocument<WellnessContent>;
export const WellnessContentSchema = SchemaFactory.createForClass(WellnessContent);
WellnessContentSchema.index({ status: 1, type: 1, language: 1 });
