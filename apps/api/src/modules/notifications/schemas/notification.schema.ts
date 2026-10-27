import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

/**
 * In-app notifications. Titles and bodies are generic notices (no clinical or conversation
 * content). Owner-only access. Auto-expire after 180 days.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'notifications' })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, maxlength: 60 })
  type!: string;

  @Prop({ required: true, maxlength: 140 })
  title!: string;

  @Prop({ maxlength: 500 })
  body?: string;

  /** In-app relative link, e.g. "/patient/appointments". */
  @Prop({ maxlength: 200, match: /^\/[A-Za-z0-9/_\-?=&]*$/ })
  link?: string;

  @Prop({ type: Date, default: null })
  readAt!: Date | null;

  @Prop({ enum: ['PENDING', 'SENT', 'FAILED', 'SKIPPED'], default: 'SKIPPED' })
  emailStatus!: string;

  createdAt!: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 });
