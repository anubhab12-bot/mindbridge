import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DoctorVerificationStatus, Role, RiskLevel } from '@mindbridge/shared-types';
import { type Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service.js';
import { localScreen, riskRank } from '../ai/local-safety.js';
import { SafetyEvent } from '../ai/schemas/safety-event.schema.js';
import { AuditService } from '../audit/audit.service.js';
import { CareService } from '../care/care.service.js';
import { CrisisResourcesService } from '../crisis-resources/crisis-resources.service.js';
import { DoctorProfile } from '../doctors/schemas/doctor-profile.schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { User } from '../users/schemas/user.schema.js';
import { MessagingGateway } from './messaging.gateway.js';
import { MessageThread } from './schemas/message-thread.schema.js';
import { SecureMessage } from './schemas/secure-message.schema.js';

type LeanThread = MessageThread & { _id: Types.ObjectId };
type LeanMessage = SecureMessage & { _id: Types.ObjectId };

export const MESSAGING_RESPONSE_NOTICE =
  'Messages are not monitored around the clock. Your professional will reply when they are available. ' +
  'If you are in crisis or might act on thoughts of harming yourself, please use the crisis support options now.';

@Injectable()
export class MessagingService {
  constructor(
    @InjectModel(MessageThread.name) private readonly threads: Model<MessageThread>,
    @InjectModel(SecureMessage.name) private readonly messages: Model<SecureMessage>,
    @InjectModel(DoctorProfile.name) private readonly doctors: Model<DoctorProfile>,
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(SafetyEvent.name) private readonly safetyEvents: Model<SafetyEvent>,
    private readonly care: CareService,
    private readonly crisis: CrisisResourcesService,
    private readonly crypto: FieldEncryptionService,
    private readonly notifications: NotificationsService,
    private readonly gateway: MessagingGateway,
    private readonly audit: AuditService,
  ) {}

  private assertDoctorVerified(user: AuthenticatedUser) {
    if (user.role === Role.DOCTOR && user.doctorStatus !== DoctorVerificationStatus.APPROVED) {
      throw new ForbiddenException({ code: 'DOCTOR_NOT_VERIFIED', message: 'Messaging is available once you are verified.' });
    }
  }

  /** Participant check plus an active care relationship; 404 for everyone else. */
  private async participantThread(user: AuthenticatedUser, threadId: string) {
    const thread = await this.threads.findById(threadId);
    const isPatient = user.role === Role.PATIENT && thread?.patientId.toString() === user.id;
    const isDoctor = user.role === Role.DOCTOR && thread?.doctorUserId.toString() === user.id;
    if (!thread || (!isPatient && !isDoctor)) {
      await this.audit.record({ actorId: user.id, actorRole: user.role, action: 'messaging.thread_access', outcome: 'DENIED', resourceType: 'MessageThread', resourceId: threadId });
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Conversation not found.' });
    }
    this.assertDoctorVerified(user);
    return { thread, side: isPatient ? ('PATIENT' as const) : ('DOCTOR' as const) };
  }

  private async assertActiveCare(thread: MessageThread) {
    if (!(await this.care.isActive(thread.doctorProfileId.toString(), thread.patientId.toString()))) {
      throw new ForbiddenException({ code: 'CARE_ENDED', message: 'This care relationship has ended, so new messages cannot be sent.' });
    }
  }

  async openThread(user: AuthenticatedUser, counterpartId: string) {
    this.assertDoctorVerified(user);
    let patientId: string;
    let doctorProfileId: string;
    if (user.role === Role.PATIENT) {
      patientId = user.id;
      doctorProfileId = counterpartId;
    } else {
      patientId = counterpartId;
      doctorProfileId = user.doctorProfileId!;
    }
    if (!(await this.care.isActive(doctorProfileId, patientId))) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'You can message professionals you have a confirmed appointment with.' });
    }
    const doctor = await this.doctors.findById(doctorProfileId).select('userId').lean();
    if (!doctor) throw new NotFoundException();
    const thread = await this.threads.findOneAndUpdate(
      { patientId: new Types.ObjectId(patientId), doctorProfileId: new Types.ObjectId(doctorProfileId) },
      { $setOnInsert: { doctorUserId: doctor.userId, lastMessageAt: new Date() } },
      { upsert: true, new: true },
    );
    return (await this.decorate([thread!.toObject()], user))[0];
  }

  private async decorate(threads: LeanThread[], user: AuthenticatedUser) {
    const isPatient = user.role === Role.PATIENT;
    const doctorIds = threads.map((t) => t.doctorProfileId);
    const patientIds = threads.map((t) => t.patientId);
    const [doctors, patients] = await Promise.all([
      this.doctors.find({ _id: { $in: doctorIds } }).select('displayName').lean(),
      isPatient ? Promise.resolve([]) : this.users.find({ _id: { $in: patientIds } }).select('displayName').lean(),
    ]);
    const dn = new Map(doctors.map((d) => [d._id.toString(), d.displayName]));
    const pn = new Map(patients.map((p) => [p._id.toString(), p.displayName]));
    return Promise.all(
      threads.map(async (t) => ({
        id: t._id.toString(),
        counterpart: isPatient
          ? { id: t.doctorProfileId.toString(), displayName: dn.get(t.doctorProfileId.toString()) ?? 'Professional', role: 'DOCTOR' }
          : { id: t.patientId.toString(), displayName: pn.get(t.patientId.toString()) ?? 'Patient', role: 'PATIENT' },
        lastMessageAt: t.lastMessageAt,
        unread: isPatient ? t.unreadForPatient : t.unreadForDoctor,
        canSend: await this.care.isActive(t.doctorProfileId.toString(), t.patientId.toString()),
      })),
    );
  }

  async listThreads(user: AuthenticatedUser) {
    this.assertDoctorVerified(user);
    const filter = user.role === Role.PATIENT ? { patientId: new Types.ObjectId(user.id) } : { doctorUserId: new Types.ObjectId(user.id) };
    const rows = await this.threads.find(filter).sort({ lastMessageAt: -1 }).limit(100).lean<LeanThread[]>();
    return this.decorate(rows, user);
  }

  private toView(m: LeanMessage, viewerId: string) {
    return {
      id: m._id.toString(),
      mine: m.senderId.toString() === viewerId,
      senderRole: m.senderRole,
      content: this.crypto.decrypt(m.contentEnc),
      createdAt: m.createdAt,
      readAt: m.readAt,
    };
  }

  async listMessages(user: AuthenticatedUser, threadId: string, before: Date | undefined, limit: number) {
    const { thread } = await this.participantThread(user, threadId);
    const filter: Record<string, unknown> = { threadId: thread._id };
    if (before) filter['createdAt'] = { $lt: before };
    const rows = await this.messages.find(filter).sort({ createdAt: -1 }).limit(limit).lean<LeanMessage[]>();
    return rows.reverse().map((m) => this.toView(m, user.id));
  }

  async send(user: AuthenticatedUser, threadId: string, content: string) {
    const { thread, side } = await this.participantThread(user, threadId);
    await this.assertActiveCare(thread);
    const msg = await this.messages.create({
      threadId: thread._id,
      senderId: new Types.ObjectId(user.id),
      senderRole: side,
      contentEnc: this.crypto.encrypt(content),
    });
    thread.lastMessageAt = new Date();
    if (side === 'PATIENT') thread.unreadForDoctor += 1;
    else thread.unreadForPatient += 1;
    await thread.save();

    const recipient = side === 'PATIENT' ? thread.doctorUserId : thread.patientId;
    this.gateway.notifyUser(recipient.toString(), 'message:new', { threadId: thread._id.toString(), messageId: msg._id.toString() });
    await this.notifications.notify(recipient, {
      type: 'message.new',
      title: 'You have a new secure message',
      link: side === 'PATIENT' ? '/doctor/messages' : '/patient/messages',
    });

    // Patients writing to a professional may be in crisis while nobody is reading: screen and
    // show resources immediately rather than relying on a reply.
    let safety: { riskLevel: RiskLevel; resources?: Awaited<ReturnType<CrisisResourcesService['forCountry']>>; notice: string } | undefined;
    if (side === 'PATIENT') {
      const screen = localScreen(content);
      if (riskRank(screen.riskLevel) >= riskRank(RiskLevel.HIGH)) {
        const u = await this.users.findById(user.id).select('country').lean();
        const resources = await this.crisis.forCountry(u?.country ?? 'IN');
        await this.safetyEvents.create({
          patientId: thread.patientId,
          riskLevel: screen.riskLevel,
          signals: [...screen.signals, 'secure_message'],
          source: 'local_fallback',
          resourcesShown: resources.resources.length,
        });
        safety = { riskLevel: screen.riskLevel, resources, notice: MESSAGING_RESPONSE_NOTICE };
      }
    }
    return { message: this.toView(msg.toObject(), user.id), safety };
  }

  async markRead(user: AuthenticatedUser, threadId: string) {
    const { thread, side } = await this.participantThread(user, threadId);
    const otherRole = side === 'PATIENT' ? 'DOCTOR' : 'PATIENT';
    await this.messages.updateMany({ threadId: thread._id, senderRole: otherRole, readAt: null }, { $set: { readAt: new Date() } });
    if (side === 'PATIENT') thread.unreadForPatient = 0;
    else thread.unreadForDoctor = 0;
    await thread.save();
  }

  async exportForPatient(patientId: string) {
    const threads = await this.threads.find({ patientId: new Types.ObjectId(patientId) }).lean<LeanThread[]>();
    const out = [];
    for (const t of threads) {
      const msgs = await this.messages.find({ threadId: t._id }).sort({ createdAt: 1 }).lean<LeanMessage[]>();
      out.push({ threadId: t._id.toString(), doctorProfileId: t.doctorProfileId.toString(), messages: msgs.map((m) => this.toView(m, patientId)) });
    }
    return out;
  }

  /**
   * Erases only the patient's own messages. Messages written by professionals may form part of
   * their professional records; retention of those is a policy decision (see docs/SECURITY.md).
   */
  async deletePatientMessages(patientId: string) {
    const threads = await this.threads.find({ patientId: new Types.ObjectId(patientId) }).select('_id').lean();
    await this.messages.deleteMany({ threadId: { $in: threads.map((t) => t._id) }, senderRole: 'PATIENT' });
  }
}
