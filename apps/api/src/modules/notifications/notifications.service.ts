import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model, Types } from 'mongoose';
import { Notification } from './schemas/notification.schema.js';

@Injectable()
export class NotificationsService {
  constructor(@InjectModel(Notification.name) private readonly model: Model<Notification>) {}

  async notify(userId: string | Types.ObjectId, n: { type: string; title: string; body?: string; link?: string }) {
    await this.model.create({ userId: new Types.ObjectId(userId.toString()), ...n });
  }

  async list(userId: string, skip: number, limit: number, unreadOnly = false) {
    const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
    if (unreadOnly) filter['readAt'] = null;
    const [items, total, unread] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-__v -userId').lean(),
      this.model.countDocuments(filter),
      this.model.countDocuments({ userId: new Types.ObjectId(userId), readAt: null }),
    ]);
    return { items: items.map((i) => ({ ...i, id: i._id.toString() })), total, unread };
  }

  /** Ownership enforced in the filter: a user can only mark their own notifications. */
  async markRead(userId: string, id: string) {
    await this.model.updateOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) }, { $set: { readAt: new Date() } });
  }

  async markAllRead(userId: string) {
    await this.model.updateMany({ userId: new Types.ObjectId(userId), readAt: null }, { $set: { readAt: new Date() } });
  }

  async deleteAllForUser(userId: string) {
    await this.model.deleteMany({ userId: new Types.ObjectId(userId) });
  }

  async countByType(since: Date) {
    return this.model.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
  }
}
