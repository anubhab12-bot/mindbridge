import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

/**
 * Private journal. Owner-only, always. Never shared with professionals, admins or the AI
 * service: there is no consent type that unlocks journals. Title and body are encrypted.
 */
@Schema({ timestamps: true, collection: 'journal_entries' })
export class JournalEntry {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId!: Types.ObjectId;

  @Prop()
  titleEnc?: string;

  @Prop({ required: true })
  bodyEnc!: string;

  /** Optional reflection prompt the patient chose (plain text from a fixed list). */
  @Prop({ maxlength: 200 })
  prompt?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export type JournalEntryDocument = HydratedDocument<JournalEntry>;
export const JournalEntrySchema = SchemaFactory.createForClass(JournalEntry);
JournalEntrySchema.index({ patientId: 1, createdAt: -1 });
