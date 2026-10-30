import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type AdminApplicationDocument = HydratedDocument<AdminApplication>;

@Schema({ timestamps: true, collection: 'council_applications' })
export class AdminApplication {
  @Prop({ required: true, trim: true, maxlength: 100 })
  fullName!: string;

  @Prop({ required: true, lowercase: true, trim: true, maxlength: 254 })
  email!: string;

  @Prop({ trim: true, maxlength: 30 })
  phone?: string;

  @Prop({ required: true, type: String, enum: ['SPECIALIST', 'NGO', 'INFLUENCER'] })
  category!: 'SPECIALIST' | 'NGO' | 'INFLUENCER';

  @Prop({
    required: true,
    type: String,
    enum: ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'AI_SAFETY_FLAGGED'],
    default: 'PENDING_REVIEW',
  })
  status!: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'AI_SAFETY_FLAGGED';

  @Prop({ type: Object, default: {} })
  credentials!: {
    licenseNumber?: string;
    yearsExperience?: number;
    specialization?: string;
    hospitalAffiliation?: string;
    organizationName?: string;
    ngoRegistrationNumber?: string;
    operatingRegions?: string[];
    socialHandle?: string;
    platform?: string;
    followersCount?: number;
    portfolioUrl?: string;
    sampleContent?: string;
  };

  @Prop({ type: Object, required: true })
  aiSafety!: {
    isSafe: boolean;
    safetyScore: number;
    riskCategory: 'CLEAN_BRAND_SAFE' | 'POTENTIAL_CONCERN' | 'VULGARITY_OR_ADULT_CONTENT' | 'REJECTED_UNSAFE';
    flaggedReasons: string[];
    summary: string;
    recommendation: 'RECOMMEND_APPROVAL' | 'MANUAL_REVIEW_REQUIRED' | 'AUTOMATIC_REJECTION';
  };

  @Prop({ trim: true, maxlength: 500 })
  decisionNotes?: string;

  @Prop({ type: Number })
  seatNumber?: number; // 1 to 12

  @Prop({ type: Date })
  reviewedAt?: Date;

  @Prop({ trim: true })
  reviewedBy?: string;
}

export const AdminApplicationSchema = SchemaFactory.createForClass(AdminApplication);
AdminApplicationSchema.index({ status: 1, category: 1 });
AdminApplicationSchema.index({ email: 1 });
