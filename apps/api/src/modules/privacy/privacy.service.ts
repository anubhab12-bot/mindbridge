import { BadRequestException, Injectable, Logger, type OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AccountStatus, Role } from '@mindbridge/shared-types';
import { type Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service.js';
import { generateOpaqueToken } from '../../common/crypto/tokens.js';
import { AppConfigService } from '../../config/app-config.service.js';
import { AiChatService } from '../ai/ai-chat.service.js';
import { AppointmentsService } from '../appointments/appointments.service.js';
import { AuditService } from '../audit/audit.service.js';
import { PasswordService } from '../auth/password.service.js';
import { SessionService } from '../auth/session.service.js';
import { CareService } from '../care/care.service.js';
import { ConsentService } from '../consent/consent.service.js';
import { JournalService } from '../journal/journal.service.js';
import { MailService } from '../mail/mail.service.js';
import { MessagingService } from '../messaging/messaging.service.js';
import { MoodService } from '../mood/mood.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PatientProfile } from '../patients/schemas/patient-profile.schema.js';
import { JobsService } from '../queues/jobs.service.js';
import { User } from '../users/schemas/user.schema.js';

export const PURGE_SWEEP_JOB = 'privacy.purge-sweep';
export type ErasableCategory = 'mood' | 'journal' | 'ai_conversations';

/**
 * Data-subject rights: access (export), correction (via profile endpoints), erasure (account
 * deletion after a grace period, or immediate per-category deletion), and consent withdrawal
 * (consent module). What is retained after deletion, and why, is documented in docs/SECURITY.md.
 */
@Injectable()
export class PrivacyService implements OnModuleInit {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(PatientProfile.name) private readonly profiles: Model<PatientProfile>,
    private readonly config: AppConfigService,
    private readonly crypto: FieldEncryptionService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly consent: ConsentService,
    private readonly mood: MoodService,
    private readonly journal: JournalService,
    private readonly aiChat: AiChatService,
    private readonly appointments: AppointmentsService,
    private readonly messaging: MessagingService,
    private readonly notifications: NotificationsService,
    private readonly care: CareService,
    private readonly mail: MailService,
    private readonly jobs: JobsService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit() {
    this.jobs.register(PURGE_SWEEP_JOB, async () => {
      await this.purgeDue();
    });
  }

  async export(user: AuthenticatedUser) {
    const u = await this.users.findById(user.id).select('email displayName role timezone locale country createdAt emailVerifiedAt mfaEnabled').lean();
    const base = {
      exportedAt: new Date().toISOString(),
      format: 'mindbridge-export-v1',
      account: u,
      consents: await this.consent.history(user.id),
      notifications: (await this.notifications.list(user.id, 0, 1000)).items,
    };
    await this.audit.record({ actorId: user.id, actorRole: user.role, action: 'privacy.export', resourceType: 'User', resourceId: user.id });
    if (user.role !== Role.PATIENT) return base;
    const profile = await this.profiles.findOne({ userId: new Types.ObjectId(user.id) }).lean();
    return {
      ...base,
      profile: profile
        ? { ...profile, trustedContactEnc: undefined, trustedContact: this.crypto.decryptOptional(profile.trustedContactEnc) ?? null }
        : null,
      moodEntries: await this.mood.exportAll(user.id),
      journalEntries: await this.journal.exportAll(user.id),
      aiConversations: await this.aiChat.exportAll(user.id),
      appointments: await this.appointments.exportForPatient(user),
      secureMessages: await this.messaging.exportForPatient(user.id),
      careTeam: await this.care.listForPatient(user.id),
    };
  }

  async deleteCategory(user: AuthenticatedUser, category: ErasableCategory) {
    if (user.role !== Role.PATIENT) throw new BadRequestException({ code: 'NOT_APPLICABLE', message: 'Not applicable to this account.' });
    if (category === 'mood') await this.mood.deleteAll(user.id);
    else if (category === 'journal') await this.journal.deleteAll(user.id);
    else await this.aiChat.deleteAll(user.id);
    await this.audit.record({ actorId: user.id, actorRole: user.role, action: 'privacy.category_deleted', metadata: { category } });
  }

  async requestDeletion(user: AuthenticatedUser, password: string) {
    if (user.role === Role.ADMIN) {
      throw new BadRequestException({ code: 'ADMIN_DELETION', message: 'Administrator accounts are removed by another administrator.' });
    }
    const u = await this.users.findById(user.id).select('+passwordHash email displayName');
    if (!u || !(await this.passwords.verify(u.passwordHash, password))) {
      throw new UnauthorizedException({ code: 'INVALID_PASSWORD', message: 'Password is incorrect.' });
    }
    const graceDays = this.config.get('ACCOUNT_DELETION_GRACE_DAYS');
    const when = new Date(Date.now() + graceDays * 86_400_000);
    u.deletionRequestedAt = new Date();
    u.deletionScheduledFor = when;
    u.status = AccountStatus.PENDING_DELETION;
    await u.save();
    // Stop anything scheduled: future appointments are cancelled now so professionals can reuse the slots.
    if (user.role === Role.PATIENT) await this.appointments.cancelAllFutureForPatient(user.id, 'Patient closed their account');
    if (user.role === Role.DOCTOR && user.doctorProfileId) {
      await this.appointments.cancelAllFutureForDoctor(user.doctorProfileId, 'Professional closed their account');
    }
    await this.sessions.revokeAllForUser(user.id, 'deletion_requested', user.sessionId);
    await this.mail.send(u.email, 'account-deletion-scheduled', { name: u.displayName, when: when.toISOString().slice(0, 10) });
    await this.audit.record({ actorId: user.id, actorRole: user.role, action: 'privacy.deletion_requested', metadata: { scheduledFor: when.toISOString() } });
    return { scheduledFor: when, graceDays };
  }

  async cancelDeletion(user: AuthenticatedUser) {
    const res = await this.users.updateOne(
      { _id: new Types.ObjectId(user.id), status: AccountStatus.PENDING_DELETION },
      { $set: { status: AccountStatus.ACTIVE }, $unset: { deletionRequestedAt: 1, deletionScheduledFor: 1 } },
    );
    if (res.modifiedCount) {
      await this.audit.record({ actorId: user.id, actorRole: user.role, action: 'privacy.deletion_cancelled' });
    }
    return { cancelled: res.modifiedCount > 0 };
  }

  /** Runs from the worker. Erases personal content and pseudonymises the account record. */
  async purgeDue(now = new Date()) {
    const due = await this.users
      .find({ status: AccountStatus.PENDING_DELETION, deletionScheduledFor: { $lte: now } })
      .select('_id role')
      .limit(100)
      .lean();
    for (const u of due) {
      const id = u._id.toString();
      try {
        if (u.role === Role.PATIENT) {
          await this.mood.deleteAll(id);
          await this.journal.deleteAll(id);
          await this.aiChat.deleteAll(id);
          await this.messaging.deletePatientMessages(id);
          await this.care.endAllForPatient(id);
          await this.profiles.deleteOne({ userId: u._id });
        }
        await this.notifications.deleteAllForUser(id);
        await this.sessions.revokeAllForUser(id, 'account_deleted');
        await this.users.updateOne(
          { _id: u._id },
          {
            $set: {
              status: AccountStatus.DELETED,
              email: `deleted-${id}@deleted.invalid`,
              displayName: 'Deleted user',
              passwordHash: generateOpaqueToken(32),
              mfaEnabled: false,
              adminPermissions: [],
            },
            $unset: { mfaSecretEnc: 1, deletionScheduledFor: 1 },
          },
        );
        await this.audit.record({ action: 'privacy.account_purged', resourceType: 'User', resourceId: id });
      } catch (err) {
        this.logger.error({ msg: 'purge failed', userId: id, error: (err as Error).message });
      }
    }
    return due.length;
  }
}
