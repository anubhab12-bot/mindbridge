import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

/** Runtime switches managed by admins with settings:manage. Flags never weaken security checks. */
@Schema({ timestamps: true, collection: 'feature_flags' })
export class FeatureFlag {
  @Prop({ required: true, unique: true, match: /^[a-z0-9_.]{3,60}$/ })
  key!: string;

  @Prop({ default: false })
  enabled!: boolean;

  @Prop({ maxlength: 300 })
  description?: string;

  /** Exposed to the web app (only non-sensitive UI toggles). */
  @Prop({ default: false })
  clientVisible!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export type FeatureFlagDocument = HydratedDocument<FeatureFlag>;
export const FeatureFlagSchema = SchemaFactory.createForClass(FeatureFlag);
