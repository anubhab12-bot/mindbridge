import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ContentStatus } from '@mindbridge/shared-types';
import type { HydratedDocument } from 'mongoose';

export const PolicyDocumentType = {
  TERMS: 'TERMS',
  PRIVACY_POLICY: 'PRIVACY_POLICY',
  AI_PROCESSING: 'AI_PROCESSING',
} as const;
export type PolicyDocumentType = (typeof PolicyDocumentType)[keyof typeof PolicyDocumentType];

/** Versioned legal texts (terms, privacy notice, AI notice). Admin-managed with `settings:manage`. */
@Schema({ timestamps: true, collection: 'policy_documents' })
export class PolicyDocument {
  @Prop({ type: String, required: true, enum: Object.values(PolicyDocumentType) })
  type!: PolicyDocumentType;

  @Prop({ required: true, maxlength: 20 })
  version!: string;

  @Prop({ required: true, maxlength: 200 })
  title!: string;

  /** Markdown. Rendered as text in the web app (no raw HTML). */
  @Prop({ required: true, maxlength: 100000 })
  body!: string;

  @Prop({ type: String, required: true, enum: Object.values(ContentStatus), default: ContentStatus.DRAFT })
  status!: ContentStatus;

  @Prop({ type: Date })
  effectiveAt?: Date;
}

export type PolicyDocumentDocument = HydratedDocument<PolicyDocument>;
export const PolicyDocumentSchema = SchemaFactory.createForClass(PolicyDocument);
PolicyDocumentSchema.index({ type: 1, version: 1 }, { unique: true });
PolicyDocumentSchema.index({ type: 1, status: 1, effectiveAt: -1 });
