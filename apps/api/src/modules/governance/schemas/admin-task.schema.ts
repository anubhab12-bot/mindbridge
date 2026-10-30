import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type AdminTaskDocument = HydratedDocument<AdminTask>;

@Schema({ timestamps: true, collection: 'council_tasks' })
export class AdminTask {
  @Prop({ required: true, type: String, enum: ['SPECIALIST', 'NGO', 'INFLUENCER'] })
  targetCategory!: 'SPECIALIST' | 'NGO' | 'INFLUENCER';

  @Prop({ trim: true })
  assigneeId?: string;

  @Prop({ trim: true })
  assigneeName?: string;

  @Prop({ required: true, trim: true, maxlength: 200 })
  title!: string;

  @Prop({ required: true, trim: true, maxlength: 2000 })
  description!: string;

  @Prop({ required: true, trim: true, maxlength: 100 })
  deliverableFormat!: string;

  @Prop({
    required: true,
    type: String,
    enum: ['ASSIGNED', 'PROOF_SUBMITTED', 'VERIFIED', 'REVISION_REQUESTED'],
    default: 'ASSIGNED',
  })
  status!: 'ASSIGNED' | 'PROOF_SUBMITTED' | 'VERIFIED' | 'REVISION_REQUESTED';

  @Prop({ type: Object })
  proof?: {
    url?: string;
    screenshotUrl?: string;
    notes?: string;
    impressions?: number;
    submittedAt?: Date;
  };

  @Prop({ default: false })
  aiGenerated!: boolean;

  @Prop({ type: Date })
  dueDate?: Date;
}

export const AdminTaskSchema = SchemaFactory.createForClass(AdminTask);
AdminTaskSchema.index({ targetCategory: 1, status: 1 });
