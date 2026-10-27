import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CrisisServiceType } from '@mindbridge/shared-types';
import { type HydratedDocument, Types } from 'mongoose';

/**
 * Admin-maintained registry of crisis and emergency resources. Nothing in the codebase
 * hardcodes a phone number: the AI service, the crisis banner and the web app all read from
 * here. A resource is only served as current while `verifiedAt` is within
 * CRISIS_RESOURCE_MAX_AGE_DAYS and it is ACTIVE.
 */
@Schema({ timestamps: true, collection: 'crisis_resources' })
export class CrisisResource {
  @Prop({ required: true, trim: true, maxlength: 120 })
  name!: string;

  /** ISO 3166-1 alpha-2. */
  @Prop({ required: true, uppercase: true, minlength: 2, maxlength: 2 })
  country!: string;

  /** State/region name, or empty for national services. */
  @Prop({ trim: true, maxlength: 80 })
  region?: string;

  @Prop({ type: String, required: true, enum: Object.values(CrisisServiceType) })
  serviceType!: CrisisServiceType;

  @Prop({ trim: true, maxlength: 40 })
  phone?: string;

  /** Alternative numbers for the same service (e.g. a long-form toll-free number). */
  @Prop({ type: [String], default: [] })
  altPhones!: string[];

  @Prop({ trim: true, maxlength: 40 })
  sms?: string;

  @Prop({ trim: true, maxlength: 500 })
  url?: string;

  /** Language names or ISO 639-1 codes as published by the service. */
  @Prop({ type: [String], default: [] })
  languages!: string[];

  @Prop({ required: true, trim: true, maxlength: 120 })
  availability!: string;

  @Prop({ trim: true, maxlength: 500 })
  description?: string;

  /** Official page the details were checked against. Required. */
  @Prop({ required: true, trim: true, maxlength: 500 })
  sourceUrl!: string;

  @Prop({ required: true, type: Date })
  verifiedAt!: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  verifiedBy?: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' })
  status!: 'ACTIVE' | 'INACTIVE';

  /** Lower first. Emergency services are typically listed first. */
  @Prop({ default: 100 })
  priority!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export type CrisisResourceDocument = HydratedDocument<CrisisResource>;
export const CrisisResourceSchema = SchemaFactory.createForClass(CrisisResource);
CrisisResourceSchema.index({ country: 1, status: 1, priority: 1 });
