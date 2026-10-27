import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type SupportTicketCategory, SupportTicketStatus } from '@mindbridge/shared-types';
import { type Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { SupportTicket } from './schemas/support-ticket.schema.js';

type Lean = SupportTicket & { _id: Types.ObjectId };

export const SAFETY_TICKET_NOTICE =
  'Support tickets are answered during working hours. If you or someone else is in immediate danger, ' +
  'please use the crisis support options or contact your local emergency number now.';

@Injectable()
export class SupportService {
  constructor(
    @InjectModel(SupportTicket.name) private readonly model: Model<SupportTicket>,
    private readonly crypto: FieldEncryptionService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  private toView(t: Lean) {
    return {
      id: t._id.toString(),
      category: t.category,
      subject: t.subject,
      status: t.status,
      replies: t.replies.map((r) => ({ id: r._id.toString(), from: r.from, body: this.crypto.decrypt(r.bodyEnc), createdAt: r.createdAt })),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }

  async create(user: AuthenticatedUser, input: { category: SupportTicketCategory; subject: string; message: string }) {
    const t = await this.model.create({
      userId: new Types.ObjectId(user.id),
      userRole: user.role,
      category: input.category,
      subject: input.subject,
      replies: [{ from: 'USER', authorId: new Types.ObjectId(user.id), bodyEnc: this.crypto.encrypt(input.message) }],
    });
    await this.audit.record({ actorId: user.id, actorRole: user.role, action: 'support.ticket_created', resourceType: 'SupportTicket', resourceId: t._id.toString(), metadata: { category: input.category } });
    return { ticket: this.toView(t.toObject()), notice: SAFETY_TICKET_NOTICE };
  }

  async listOwn(user: AuthenticatedUser, skip: number, limit: number) {
    const filter = { userId: new Types.ObjectId(user.id) };
    const [rows, total] = await Promise.all([
      this.model.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean<Lean[]>(),
      this.model.countDocuments(filter),
    ]);
    return { items: rows.map((r) => this.toView(r)), total };
  }

  private async load(id: string, ownerId?: string) {
    const filter: Record<string, unknown> = { _id: new Types.ObjectId(id) };
    if (ownerId) filter['userId'] = new Types.ObjectId(ownerId);
    const t = await this.model.findOne(filter);
    if (!t) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Ticket not found.' });
    return t;
  }

  async getOwn(user: AuthenticatedUser, id: string) {
    return this.toView((await this.load(id, user.id)).toObject());
  }

  async replyOwn(user: AuthenticatedUser, id: string, message: string) {
    const t = await this.load(id, user.id);
    t.replies.push({ from: 'USER', authorId: new Types.ObjectId(user.id), bodyEnc: this.crypto.encrypt(message) } as never);
    if (t.status === SupportTicketStatus.RESOLVED || t.status === SupportTicketStatus.CLOSED) t.status = SupportTicketStatus.OPEN;
    await t.save();
    return this.toView(t.toObject());
  }

  // ------------------------------------------------------------------ admin

  async adminList(q: { status?: SupportTicketStatus; category?: SupportTicketCategory; skip: number; limit: number }) {
    const filter: Record<string, unknown> = {};
    if (q.status) filter['status'] = q.status;
    if (q.category) filter['category'] = q.category;
    const [rows, total] = await Promise.all([
      this.model.find(filter).sort({ updatedAt: -1 }).skip(q.skip).limit(q.limit).lean<Lean[]>(),
      this.model.countDocuments(filter),
    ]);
    return { items: rows.map((r) => ({ ...this.toView(r), userId: r.userId.toString(), userRole: r.userRole })), total };
  }

  async adminGet(admin: AuthenticatedUser, id: string) {
    const t = await this.load(id);
    await this.audit.record({ actorId: admin.id, actorRole: admin.role, action: 'support.ticket_viewed', resourceType: 'SupportTicket', resourceId: id });
    return { ...this.toView(t.toObject()), userId: t.userId.toString(), userRole: t.userRole };
  }

  async adminReply(admin: AuthenticatedUser, id: string, message: string, status?: SupportTicketStatus) {
    const t = await this.load(id);
    t.replies.push({ from: 'ADMIN', authorId: new Types.ObjectId(admin.id), bodyEnc: this.crypto.encrypt(message) } as never);
    t.status = status ?? SupportTicketStatus.IN_PROGRESS;
    await t.save();
    await this.notifications.notify(t.userId, { type: 'support.reply', title: 'Support replied to your request', link: '/support' });
    await this.audit.record({ actorId: admin.id, actorRole: admin.role, action: 'support.ticket_replied', resourceType: 'SupportTicket', resourceId: id });
    return this.toView(t.toObject());
  }

  async adminSetStatus(admin: AuthenticatedUser, id: string, status: SupportTicketStatus) {
    const t = await this.load(id);
    t.status = status;
    await t.save();
    await this.audit.record({ actorId: admin.id, actorRole: admin.role, action: 'support.ticket_status', resourceType: 'SupportTicket', resourceId: id, metadata: { status } });
    return this.toView(t.toObject());
  }

  async openCount() {
    return this.model.countDocuments({ status: { $in: [SupportTicketStatus.OPEN, SupportTicketStatus.IN_PROGRESS] } });
  }
}
