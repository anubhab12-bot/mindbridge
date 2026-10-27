import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service.js';
import { addDays, localDate } from '../../common/utils/dates.js';
import { User } from '../users/schemas/user.schema.js';
import { type EmotionTag, MoodEntry } from './schemas/mood-entry.schema.js';

export interface MoodEntryView {
  id: string;
  score: number;
  emotions: EmotionTag[];
  note?: string;
  entryDate: string;
  createdAt: Date;
}

/**
 * Mood data is owner-only. `summaryForDoctor` returns aggregates only (no notes) and must be
 * called by code that has already checked SHARE_MOOD_SUMMARY consent for that professional.
 */
@Injectable()
export class MoodService {
  constructor(
    @InjectModel(MoodEntry.name) private readonly model: Model<MoodEntry>,
    @InjectModel(User.name) private readonly users: Model<User>,
    private readonly crypto: FieldEncryptionService,
  ) {}

  private toView(e: MoodEntry & { _id: Types.ObjectId }): MoodEntryView {
    return {
      id: e._id.toString(),
      score: e.score,
      emotions: e.emotions,
      note: this.crypto.decryptOptional(e.noteEnc),
      entryDate: e.entryDate,
      createdAt: e.createdAt,
    };
  }

  private async tz(patientId: string) {
    const u = await this.users.findById(patientId).select('timezone').lean();
    return u?.timezone ?? 'Asia/Kolkata';
  }

  async create(patientId: string, dto: { score: number; emotions?: EmotionTag[]; note?: string }) {
    const entry = await this.model.create({
      patientId: new Types.ObjectId(patientId),
      score: dto.score,
      emotions: [...new Set(dto.emotions ?? [])],
      noteEnc: this.crypto.encryptOptional(dto.note?.trim()),
      entryDate: localDate(new Date(), await this.tz(patientId)),
    });
    return this.toView(entry.toObject());
  }

  async list(patientId: string, opts: { from?: string; to?: string; skip: number; limit: number }) {
    const filter: Record<string, unknown> = { patientId: new Types.ObjectId(patientId) };
    if (opts.from || opts.to) {
      filter['entryDate'] = { ...(opts.from ? { $gte: opts.from } : {}), ...(opts.to ? { $lte: opts.to } : {}) };
    }
    const [items, total] = await Promise.all([
      this.model.find(filter).sort({ entryDate: -1, createdAt: -1 }).skip(opts.skip).limit(opts.limit).lean(),
      this.model.countDocuments(filter),
    ]);
    return { items: items.map((i) => this.toView(i)), total };
  }

  async remove(patientId: string, id: string) {
    const res = await this.model.deleteOne({ _id: new Types.ObjectId(id), patientId: new Types.ObjectId(patientId) });
    if (res.deletedCount === 0) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Entry not found.' });
  }

  async today(patientId: string) {
    const date = localDate(new Date(), await this.tz(patientId));
    const e = await this.model.findOne({ patientId: new Types.ObjectId(patientId), entryDate: date }).sort({ createdAt: -1 }).lean();
    return e ? this.toView(e) : null;
  }

  /** Daily averages for charts. Purely descriptive: no thresholds, labels or diagnoses. */
  async trend(patientId: string, days: number) {
    const tz = await this.tz(patientId);
    const to = localDate(new Date(), tz);
    const from = addDays(to, -(days - 1));
    const rows = await this.model.aggregate<{ _id: string; avg: number; count: number; emotions: EmotionTag[][] }>([
      { $match: { patientId: new Types.ObjectId(patientId), entryDate: { $gte: from, $lte: to } } },
      { $group: { _id: '$entryDate', avg: { $avg: '$score' }, count: { $sum: 1 }, emotions: { $push: '$emotions' } } },
      { $sort: { _id: 1 } },
    ]);
    const tagCounts = new Map<string, number>();
    for (const r of rows) for (const list of r.emotions) for (const t of list) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    return {
      from,
      to,
      days: rows.map((r) => ({ date: r._id, average: Math.round(r.avg * 10) / 10, entries: r.count })),
      topEmotions: [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, count]) => ({ tag, count })),
    };
  }

  /** Aggregated, note-free summary for a consenting patient's professional. */
  async summaryForDoctor(patientId: string, days = 30) {
    const t = await this.trend(patientId, days);
    const all = t.days.reduce((acc, d) => acc + d.average * d.entries, 0);
    const n = t.days.reduce((acc, d) => acc + d.entries, 0);
    return { ...t, overallAverage: n ? Math.round((all / n) * 10) / 10 : null, checkIns: n };
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
