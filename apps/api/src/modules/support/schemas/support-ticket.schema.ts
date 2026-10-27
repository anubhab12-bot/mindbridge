import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SupportTicketCategory, SupportTicketStatus } from '@mindbridge/shared-types';
import { type HydratedDocument, Types } from 'mongoose';

@Schema({ _id: true, timestamps: { createdAt: true, updatedAt: false } })
export class TicketReply {
  @Prop({ type: String, required: true, enum: ['USER', 'ADMIN'] })
  from!: 'USER' | 'ADMIN';

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId!: Types.ObjectId;

  @Prop({ required: true })
  bodyEnc!: string;

  createdAt!: Date;
}

/**
 * Help-desk ticket. Admins see the ticket text but never any health data: the ticket is not
 * linked to journals, AI conversations or clinical notes. Text is encrypted at rest.
 */
@Schema({ timestamps: true, collection: 'support_tickets' })
export class SupportTicket {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  userRole!: string;

  @Prop({ type: String, required: true, enum: Object.values(SupportTicketCategory) })
  category!: SupportTicketCategory;

  @Prop({ required: true, maxlength: 140 })
  subject!: string;

  @Prop({ type: String, required: true, enum: Object.values(SupportTicketStatus), default: SupportTicketStatus.OPEN })
  status!: SupportTicketStatus;

  @Prop({ type: [SchemaFactory.createForClass(TicketReply)], default: [] })
  replies!: (TicketReply & { _id: Types.ObjectId })[];

  createdAt!: Date;
  updatedAt!: Date;
}

export type SupportTicketDocument = HydratedDocument<SupportTicket>;
export const SupportTicketSchema = SchemaFactory.createForClass(SupportTicket);
SupportTicketSchema.index({ userId: 1, updatedAt: -1 });
SupportTicketSchema.index({ status: 1, updatedAt: -1 });
