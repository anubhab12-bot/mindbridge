import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service.js';
import { JournalEntry } from './schemas/journal-entry.schema.js';

export const REFLECTION_PROMPTS = [
  'What is one thing that felt manageable today?',
  'What would you say to a friend who felt the way you feel right now?',
  'Who or what helped you, even a little, this week?',
  'What is weighing on you, and what part of it is in your control?',
  'Describe a small moment of calm you noticed recently.',
  'What do you need more of right now? What do you need less of?',
];

/** Private journal: owner-only in every method. No other role has a code path to journals. */
@Injectable()
export class JournalService {
  constructor(
    @InjectModel(JournalEntry.name) private readonly model: Model<JournalEntry>,
    private readonly crypto: FieldEncryptionService,
  ) {}

  private toView(e: JournalEntry & { _id: Types.ObjectId }, full = true) {
    const body = this.crypto.decrypt(e.bodyEnc);
    return {
      id: e._id.toString(),
      title: this.crypto.decryptOptional(e.titleEnc) ?? '',
      body: full ? body : undefined,
      preview: full ? undefined : body.slice(0, 160),
      prompt: e.prompt,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }

  private ownerFilter(patientId: string, id: string) {
    return { _id: new Types.ObjectId(id), patientId: new Types.ObjectId(patientId) };
  }

  async create(patientId: string, dto: { title?: string; body: string; prompt?: string }) {
    const prompt = dto.prompt && REFLECTION_PROMPTS.includes(dto.prompt) ? dto.prompt : undefined;
    const e = await this.model.create({
      patientId: new Types.ObjectId(patientId),
      titleEnc: this.crypto.encryptOptional(dto.title?.trim()),
      bodyEnc: this.crypto.encrypt(dto.body),
      prompt,
    });
    return this.toView(e.toObject());
  }

  async list(patientId: string, skip: number, limit: number) {
    const filter = { patientId: new Types.ObjectId(patientId) };
    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);
    return { items: items.map((i) => this.toView(i, false)), total };
  }

  async get(patientId: string, id: string) {
    const e = await this.model.findOne(this.ownerFilter(patientId, id)).lean();
    if (!e) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Entry not found.' });
    return this.toView(e);
  }

  async update(patientId: string, id: string, dto: { title?: string; body?: string }) {
    const set: Record<string, unknown> = {};
    if (dto.title !== undefined) set['titleEnc'] = this.crypto.encryptOptional(dto.title.trim());
    if (dto.body !== undefined) set['bodyEnc'] = this.crypto.encrypt(dto.body);
    const e = await this.model.findOneAndUpdate(this.ownerFilter(patientId, id), { $set: set }, { new: true }).lean();
    if (!e) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Entry not found.' });
    return this.toView(e);
  }

  async remove(patientId: string, id: string) {
    const res = await this.model.deleteOne(this.ownerFilter(patientId, id));
    if (res.deletedCount === 0) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Entry not found.' });
  }

  async exportAll(patientId: string) {
    const items = await this.model.find({ patientId: new Types.ObjectId(patientId) }).sort({ createdAt: 1 }).lean();
    return items.map((i) => this.toView(i));
  }

  async deleteAll(patientId: string) {
    const res = await this.model.deleteMany({ patientId: new Types.ObjectId(patientId) });
    return res.deletedCount;
  }
}
