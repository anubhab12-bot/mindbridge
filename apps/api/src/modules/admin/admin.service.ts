import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  AccountStatus,
  AdminPermission,
  AdminRolePreset,
  ADMIN_ROLE_PRESET_PERMISSIONS,
  ContentStatus,
  DoctorVerificationStatus,
  ModerationStatus,
  RiskLevel,
  Role,
  SafetyEventStatus,
  SupportTicketCategory,
  SupportTicketStatus,
} from '@mindbridge/shared-types';
import { type Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { AppConfigService } from '../../config/app-config.service.js';
import { AiChatService } from '../ai/ai-chat.service.js';
import { AiClientService } from '../ai/ai-client.service.js';
import { SafetyEvent } from '../ai/schemas/safety-event.schema.js';
import { AppointmentsService } from '../appointments/appointments.service.js';
import { AuditService } from '../audit/audit.service.js';
import { SessionService } from '../auth/session.service.js';
import { CareService } from '../care/care.service.js';
import { PolicyDocument, type PolicyDocumentType } from '../consent/schemas/policy-document.schema.js';
import { CrisisResourcesService } from '../crisis-resources/crisis-resources.service.js';
import { DoctorProfile } from '../doctors/schemas/doctor-profile.schema.js';
import { Feedback } from '../feedback/schemas/feedback.schema.js';
import { JobsService } from '../queues/jobs.service.js';
import { SupportTicket } from '../support/schemas/support-ticket.schema.js';
import { SupportService } from '../support/support.service.js';
import { User } from '../users/schemas/user.schema.js';
import { VerificationService } from '../verification/verification.service.js';
import { suppressCounts, suppressOne } from './suppression.js';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Administrative operations. Admins manage accounts, content and safety configuration; they
 * never read journals, mood notes, AI conversations, secure messages or clinical notes, and
 * every metric derived from patients is aggregated with small-group suppression.
 */
@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(DoctorProfile.name) private readonly doctors: Model<DoctorProfile>,
    @InjectModel(Feedback.name) private readonly feedback: Model<Feedback>,
    @InjectModel(PolicyDocument.name) private readonly policies: Model<PolicyDocument>,
    @InjectModel(SafetyEvent.name) private readonly safetyEvents: Model<SafetyEvent>,
    @InjectModel(SupportTicket.name) private readonly supportTickets: Model<SupportTicket>,
    private readonly config: AppConfigService,
    private readonly appointments: AppointmentsService,
    private readonly verification: VerificationService,
    private readonly aiChat: AiChatService,
    private readonly ai: AiClientService,
    private readonly crisis: CrisisResourcesService,
    private readonly support: SupportService,
    private readonly jobs: JobsService,
    private readonly sessions: SessionService,
    private readonly care: CareService,
    private readonly audit: AuditService,
  ) {}

  private get minGroup() {
    return this.config.get('ANALYTICS_MIN_GROUP_SIZE');
  }

  async dashboard() {
    const since30 = new Date(Date.now() - 30 * 86_400_000);
    const [usersByRole, usersByStatus, doctorsByVerification, apptByStatus, apptTrend, aiUsage, staleCrisis, openTickets, pendingFeedback, queue, newUsers] =
      await Promise.all([
        this.users.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
        this.users.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        this.verification.countsByStatus(),
        this.appointments.countsByStatus(since30),
        this.appointments.weeklyTrend(8),
        this.aiChat.usageStats(since30),
        this.crisis.countStale(),
        this.support.openCount(),
        this.feedback.countDocuments({ moderationStatus: ModerationStatus.PENDING }),
        this.jobs.queueHealth(),
        this.users.countDocuments({ createdAt: { $gte: since30 } }),
      ]);
    const min = this.minGroup;
    return {
      generatedAt: new Date().toISOString(),
      minGroupSize: min,
      users: { byRole: suppressCounts(usersByRole, min), byStatus: suppressCounts(usersByStatus, min), newLast30Days: suppressOne(newUsers, min) },
      doctors: { byVerificationStatus: suppressCounts(doctorsByVerification, 1) },
      appointments: { byStatusLast30Days: suppressCounts(apptByStatus, min), weeklyCreated: suppressCounts(apptTrend, min) },
      ai: {
        byKind: aiUsage.byKind.map((k) => ({
          kind: k._id,
          ...suppressOne(k.count, min),
          fallbackRate: k.count >= min ? Math.round((k.fallback / k.count) * 1000) / 10 : null,
          serviceUnavailable: suppressOne(k.unavailable, min),
          mockResponses: k.mock,
          avgLatencyMs: k.count >= min ? Math.round(k.avgLatency) : null,
          tokens: k.tokens,
        })),
        safetyEventsByLevelLast30Days: suppressCounts(aiUsage.safetyEventsByLevel, min),
      },
      operations: { staleCrisisResources: staleCrisis, openSupportTickets: openTickets, pendingFeedbackModeration: pendingFeedback, queue },
    };
  }

  // ------------------------------------------------------------------ users

  async searchUsers(q: { q?: string; role?: Role; status?: AccountStatus; skip: number; limit: number }) {
    const filter: Record<string, unknown> = {};
    if (q.role) filter['role'] = q.role;
    if (q.status) filter['status'] = q.status;
    if (q.q) {
      const rx = new RegExp(escapeRegex(q.q.trim().slice(0, 100)), 'i');
      filter['$or'] = [{ email: rx }, { displayName: rx }];
    }
    const [rows, total] = await Promise.all([
      this.users
        .find(filter)
        .select('email displayName role status emailVerifiedAt mfaEnabled lastLoginAt createdAt adminPermissions')
        .sort({ createdAt: -1 })
        .skip(q.skip)
        .limit(q.limit)
        .lean(),
      this.users.countDocuments(filter),
    ]);
    return {
      items: rows.map((u) => ({
        id: u._id.toString(),
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        status: u.status,
        emailVerified: !!u.emailVerifiedAt,
        mfaEnabled: u.mfaEnabled,
        lastLoginAt: u.lastLoginAt ?? null,
        createdAt: u.createdAt,
        adminPermissions: u.role === Role.ADMIN ? u.adminPermissions : undefined,
      })),
      total,
    };
  }

  async suspend(admin: AuthenticatedUser, userId: string, reason: string) {
    if (userId === admin.id) throw new BadRequestException({ code: 'SELF_ACTION', message: 'You cannot suspend your own account.' });
    const user = await this.users.findById(userId);
    if (!user || user.status === AccountStatus.DELETED) throw new NotFoundException();
    if (user.role === Role.ADMIN && !admin.adminPermissions.includes(AdminPermission.SECURITY_MANAGE)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Suspending an administrator requires security:manage.' });
    }
    if (user.status === AccountStatus.SUSPENDED) throw new ConflictException({ code: 'ALREADY_SUSPENDED', message: 'Account is already suspended.' });
    user.status = AccountStatus.SUSPENDED;
    user.statusReason = reason;
    await user.save();
    await this.sessions.revokeAllForUser(userId, 'suspended');
    if (user.role === Role.DOCTOR) {
      const profile = await this.doctors.findOne({ userId: user._id }).select('_id').lean();
      if (profile) await this.appointments.cancelAllFutureForDoctor(profile._id.toString(), 'The professional is unavailable');
    }
    await this.audit.record({ actorId: admin.id, actorRole: admin.role, action: 'admin.user_suspended', resourceType: 'User', resourceId: userId, metadata: { reason } });
    return { id: userId, status: user.status };
  }

  async reactivate(admin: AuthenticatedUser, userId: string) {
    const user = await this.users.findById(userId);
    if (!user || user.status !== AccountStatus.SUSPENDED) throw new NotFoundException({ code: 'NOT_SUSPENDED', message: 'Account is not suspended.' });
    user.status = AccountStatus.ACTIVE;
    user.statusReason = undefined;
    await user.save();
    await this.audit.record({ actorId: admin.id, actorRole: admin.role, action: 'admin.user_reactivated', resourceType: 'User', resourceId: userId });
    return { id: userId, status: user.status };
  }

  async setAdminPermissions(admin: AuthenticatedUser, userId: string, permissions: AdminPermission[]) {
    if (userId === admin.id) throw new BadRequestException({ code: 'SELF_ACTION', message: 'Ask another administrator to change your permissions.' });
    const res = await this.users.updateOne({ _id: new Types.ObjectId(userId), role: Role.ADMIN }, { $set: { adminPermissions: [...new Set(permissions)] } });
    if (!res.matchedCount) throw new NotFoundException();
    await this.sessions.revokeAllForUser(userId, 'permissions_changed');
    await this.audit.record({ actorId: admin.id, actorRole: admin.role, action: 'admin.permissions_changed', resourceType: 'User', resourceId: userId, metadata: { permissions } });
    return { id: userId, permissions };
  }

  // --------------------------------------------------------- feedback moderation

  async pendingFeedback(skip: number, limit: number) {
    const filter = { moderationStatus: ModerationStatus.PENDING };
    const [rows, total] = await Promise.all([
      this.feedback.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).select('rating comment doctorProfileId createdAt').lean(),
      this.feedback.countDocuments(filter),
    ]);
    // The patient is not identified to moderators.
    return { items: rows.map((f) => ({ id: f._id.toString(), rating: f.rating, comment: f.comment ?? null, doctorProfileId: f.doctorProfileId.toString(), createdAt: f.createdAt })), total };
  }

  async moderateFeedback(admin: AuthenticatedUser, id: string, decision: 'APPROVED' | 'REJECTED') {
    const f = await this.feedback.findOneAndUpdate(
      { _id: new Types.ObjectId(id), moderationStatus: ModerationStatus.PENDING },
      { $set: { moderationStatus: decision, moderatedBy: new Types.ObjectId(admin.id), moderatedAt: new Date() } },
      { new: true },
    );
    if (!f) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Feedback not found or already moderated.' });
    if (decision === ModerationStatus.APPROVED) {
      await this.doctors.updateOne({ _id: f.doctorProfileId }, { $inc: { ratingSum: f.rating, ratingCount: 1 } });
    }
    await this.audit.record({ actorId: admin.id, actorRole: admin.role, action: 'admin.feedback_moderated', resourceType: 'Feedback', resourceId: id, metadata: { decision } });
    return { id, moderationStatus: decision };
  }

  // ------------------------------------------------------------ policy documents

  async listPolicies() {
    return this.policies.find().sort({ type: 1, createdAt: -1 }).select('type version title status effectiveAt createdAt').lean();
  }

  async createPolicy(admin: AuthenticatedUser, dto: { type: PolicyDocumentType; version: string; title: string; body: string }) {
    if (await this.policies.exists({ type: dto.type, version: dto.version })) {
      throw new ConflictException({ code: 'VERSION_EXISTS', message: 'That version already exists.' });
    }
    const doc = await this.policies.create({ ...dto, status: ContentStatus.DRAFT });
    await this.audit.record({ actorId: admin.id, actorRole: admin.role, action: 'admin.policy_created', resourceType: 'PolicyDocument', resourceId: doc._id.toString(), metadata: { type: dto.type, version: dto.version } });
    return doc.toObject();
  }

  /** Publishing a new version means users are asked to review and accept it again. */
  async publishPolicy(admin: AuthenticatedUser, id: string, effectiveAt?: Date) {
    const doc = await this.policies.findById(id);
    if (!doc || doc.status !== ContentStatus.DRAFT) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Draft not found.' });
    doc.status = ContentStatus.PUBLISHED;
    doc.effectiveAt = effectiveAt ?? new Date();
    await doc.save();
    await this.audit.record({ actorId: admin.id, actorRole: admin.role, action: 'admin.policy_published', resourceType: 'PolicyDocument', resourceId: id, metadata: { type: doc.type, version: doc.version } });
    return doc.toObject();
  }

  // ------------------------------------------------------------------ security

  async securityOverview() {
    const since = new Date(Date.now() - 24 * 3600_000);
    const [failedLogins, lockouts, denied, tokenReuse, mfaAdmins, totalAdmins, mfaDoctors, totalDoctors] = await Promise.all([
      this.audit.countSince('auth.login', since, 'FAILURE'),
      this.audit.countSince('auth.account_locked', since),
      this.audit.countSince('authz.denied', since, 'DENIED'),
      this.audit.countSince('auth.refresh_token_reuse', since),
      this.users.countDocuments({ role: Role.ADMIN, status: AccountStatus.ACTIVE, mfaEnabled: true }),
      this.users.countDocuments({ role: Role.ADMIN, status: AccountStatus.ACTIVE }),
      this.users.countDocuments({ role: Role.DOCTOR, status: AccountStatus.ACTIVE, mfaEnabled: true }),
      this.users.countDocuments({ role: Role.DOCTOR, status: AccountStatus.ACTIVE }),
    ]);
    return {
      last24Hours: { failedLogins, lockouts, authorizationDenials: denied, refreshTokenReuse: tokenReuse },
      mfaAdoption: { admins: { enabled: mfaAdmins, total: totalAdmins }, doctors: { enabled: mfaDoctors, total: totalDoctors } },
    };
  }

  async aiOverview() {
    const [health, metrics, usage] = await Promise.all([
      this.ai.health(),
      this.ai.metrics(),
      this.aiChat.usageStats(new Date(Date.now() - 7 * 86_400_000)),
    ]);
    const min = this.minGroup;
    return {
      service: health,
      serviceMetrics: metrics,
      last7Days: {
        byKind: usage.byKind.map((k) => ({ kind: k._id, ...suppressOne(k.count, min), mock: k.mock, tokens: k.tokens })),
        safetyEventsByLevel: suppressCounts(usage.safetyEventsByLevel, min),
      },
    };
  }

  /** Aggregate-only CSV for reporting; never contains identifiers or free text. */
  async exportReportCsv(admin: AuthenticatedUser) {
    const d = await this.dashboard();
    const lines = ['section,key,count,suppressed'];
    const push = (section: string, rows: { key: string; count: number | null; suppressed: boolean }[]) =>
      rows.forEach((r) => lines.push(`${section},${r.key},${r.count ?? ''},${r.suppressed}`));
    push('users_by_role', d.users.byRole);
    push('users_by_status', d.users.byStatus);
    push('doctors_by_verification', d.doctors.byVerificationStatus);
    push('appointments_by_status_30d', d.appointments.byStatusLast30Days);
    push('appointments_weekly', d.appointments.weeklyCreated);
    push('safety_events_by_level_30d', d.ai.safetyEventsByLevelLast30Days);
    await this.audit.record({ actorId: admin.id, actorRole: admin.role, action: 'admin.report_exported' });
    return lines.join('\n') + '\n';
  }

  // --------------------------------------------------------- Phase 1: Preset assignment

  async setAdminRolePreset(admin: AuthenticatedUser, userId: string, preset: AdminRolePreset) {
    if (userId === admin.id) {
      throw new BadRequestException({ code: 'SELF_ACTION', message: 'Ask another administrator to modify your permissions or preset.' });
    }
    const permissions = ADMIN_ROLE_PRESET_PERMISSIONS[preset];
    if (!permissions) {
      throw new BadRequestException({ code: 'INVALID_PRESET', message: 'Invalid admin role preset requested.' });
    }
    const res = await this.users.updateOne(
      { _id: new Types.ObjectId(userId), role: Role.ADMIN },
      { $set: { adminRolePreset: preset, adminPermissions: [...permissions] } },
    );
    if (!res.matchedCount) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Admin user not found.' });
    }
    await this.sessions.revokeAllForUser(userId, 'preset_assigned');
    await this.audit.record({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'admin.preset_assigned',
      resourceType: 'User',
      resourceId: userId,
      metadata: { preset, permissions },
    });
    return { id: userId, preset, permissions };
  }

  // --------------------------------------------------------- Phase 2: Prioritized worklist

  async getWorklist() {
    const now = Date.now();
    const items: Array<{
      kind: 'SAFETY_EVENT' | 'SUPPORT_HANDOFF' | 'DOCTOR_VERIFICATION' | 'SAFETY_CONCERN_TICKET' | 'CRISIS_RESOURCE_STALE' | 'CONTENT_REVIEW';
      severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      harmRank: number;
      id: string;
      title: string;
      meta: string;
      ageMinutes: number;
      primaryAction: { label: string; url: string };
    }> = [];

    // 1. Safety Events (HIGH or IMMINENT, unacknowledged or assigned)
    try {
      const activeSafetyEvents = await this.safetyEvents
        .find({
          status: { $in: [SafetyEventStatus.UNACKNOWLEDGED, SafetyEventStatus.ASSIGNED] },
        })
        .sort({ createdAt: 1 })
        .lean();

      for (const ev of activeSafetyEvents) {
        const ageMinutes = Math.max(0, Math.floor((now - new Date(ev.createdAt).getTime()) / 60000));
        const isImminent = ev.riskLevel === RiskLevel.IMMINENT;
        const isHigh = ev.riskLevel === RiskLevel.HIGH;

        if (isImminent || isHigh) {
          items.push({
            kind: 'SAFETY_EVENT',
            severity: isImminent ? 'CRITICAL' : 'HIGH',
            harmRank: isImminent ? 1 : 2,
            id: ev._id.toString(),
            title: `${isImminent ? 'IMMINENT' : 'HIGH'} Risk Signal (${ev.signals.join(', ') || 'Crisis trigger'})`,
            meta: `SLA timer: ${ageMinutes}m · Status: ${ev.status} · Source: ${ev.source}`,
            ageMinutes,
            primaryAction: {
              label: 'Triage Event',
              url: `/admin/safety-triage?id=${ev._id.toString()}`,
            },
          });
        }

        if (ev.handoffRequested && ev.status !== SafetyEventStatus.RESOLVED) {
          items.push({
            kind: 'SUPPORT_HANDOFF',
            severity: 'HIGH',
            harmRank: 3,
            id: `handoff-${ev._id.toString()}`,
            title: `Human Support Handoff Requested by Patient`,
            meta: `Waiting: ${ageMinutes}m · Risk: ${ev.riskLevel} · Care Team: ${ev.careTeamNotified > 0 ? 'Notified' : 'None'}`,
            ageMinutes,
            primaryAction: {
              label: 'Connect Care Team',
              url: `/admin/safety-triage?id=${ev._id.toString()}`,
            },
          });
        }
      }
    } catch {
      // Non-fatal if safety events collection is empty
    }

    // 2. SAFETY_CONCERN support tickets
    try {
      const safetyTickets = await this.supportTickets
        .find({
          category: SupportTicketCategory.SAFETY_CONCERN,
          status: SupportTicketStatus.OPEN,
        })
        .sort({ createdAt: 1 })
        .lean();

      for (const ticket of safetyTickets) {
        const ageMinutes = Math.max(0, Math.floor((now - new Date(ticket.createdAt).getTime()) / 60000));
        items.push({
          kind: 'SAFETY_CONCERN_TICKET',
          severity: 'MEDIUM',
          harmRank: 4,
          id: ticket._id.toString(),
          title: `Safety Concern Support Ticket: ${ticket.subject.slice(0, 50)}`,
          meta: `Opened ${ageMinutes}m ago · Role: ${ticket.userRole}`,
          ageMinutes,
          primaryAction: {
            label: 'Resolve Ticket',
            url: `/admin/support?id=${ticket._id.toString()}`,
          },
        });
      }
    } catch {
      // Non-fatal if support tickets collection is empty
    }

    // 3. Doctor verifications waiting
    try {
      const pendingDoctors = await this.doctors
        .find({ verificationStatus: DoctorVerificationStatus.PENDING_VERIFICATION })
        .sort({ createdAt: 1 })
        .lean();

      for (const doc of pendingDoctors) {
        const ageMinutes = Math.max(0, Math.floor((now - new Date(doc.createdAt).getTime()) / 60000));
        items.push({
          kind: 'DOCTOR_VERIFICATION',
          severity: 'MEDIUM',
          harmRank: 5,
          id: doc._id.toString(),
          title: `Doctor Credentials Review (${doc.registrationNumber || 'Pending Document'})`,
          meta: `Council: ${doc.council || 'State Medical Council'} · Waiting: ${ageMinutes}m`,
          ageMinutes,
          primaryAction: {
            label: 'Review Credentials',
            url: `/admin/verifications/${doc._id.toString()}`,
          },
        });
      }
    } catch {
      // Non-fatal
    }

    // 4. Stale crisis resources
    try {
      const staleRes = await this.crisis.adminList({ stale: true, skip: 0, limit: 10 });
      for (const res of staleRes.items) {
        const ageMinutes = Math.max(0, Math.floor((now - new Date(res.verifiedAt).getTime()) / 60000));
        items.push({
          kind: 'CRISIS_RESOURCE_STALE',
          severity: 'MEDIUM',
          harmRank: 6,
          id: res.id,
          title: `Stale Crisis Resource: ${res.name} (${res.country})`,
          meta: `Verification expired · Stale since ${new Date(res.verifiedAt).toLocaleDateString()}`,
          ageMinutes,
          primaryAction: {
            label: 'Verify Helpline',
            url: `/admin/crisis-resources?q=${encodeURIComponent(res.name)}`,
          },
        });
      }
    } catch {
      // Non-fatal
    }

    // 5. Content awaiting review / feedback moderation
    try {
      const pendingFeedbacks = await this.feedback
        .find({ moderationStatus: ModerationStatus.PENDING })
        .sort({ createdAt: 1 })
        .limit(10)
        .lean();

      for (const fb of pendingFeedbacks) {
        const ageMinutes = Math.max(0, Math.floor((now - new Date(fb.createdAt).getTime()) / 60000));
        items.push({
          kind: 'CONTENT_REVIEW',
          severity: 'LOW',
          harmRank: 7,
          id: fb._id.toString(),
          title: `Public Feedback Moderation Pending (${fb.rating}/5 stars)`,
          meta: `Submitted ${ageMinutes}m ago`,
          ageMinutes,
          primaryAction: {
            label: 'Moderate Feedback',
            url: `/admin/feedback`,
          },
        });
      }
    } catch {
      // Non-fatal
    }

    // Sort strictly by potential harm, not by date:
    // harmRank ascending (CRITICAL -> HIGH -> MEDIUM -> LOW)
    // Within same rank: oldest first (ageMinutes descending)
    items.sort((a, b) => {
      if (a.harmRank !== b.harmRank) return a.harmRank - b.harmRank;
      return b.ageMinutes - a.ageMinutes;
    });

    return items.map(({ harmRank, ...rest }) => rest);
  }

  // --------------------------------------------------------- Phase 3: Safety triage board

  async getSafetyEvents(q: { status?: SafetyEventStatus; risk?: RiskLevel; from?: Date; to?: Date }) {
    const filter: Record<string, unknown> = {};
    if (q.status) filter['status'] = q.status;
    if (q.risk) filter['riskLevel'] = q.risk;
    if (q.from || q.to) {
      filter['createdAt'] = {};
      if (q.from) (filter['createdAt'] as Record<string, unknown>)['$gte'] = q.from;
      if (q.to) (filter['createdAt'] as Record<string, unknown>)['$lte'] = q.to;
    }

    const events = await this.safetyEvents
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('assigneeUserId', 'displayName email')
      .lean();

    const now = Date.now();
    return events.map((e) => {
      const ageMinutes = Math.max(0, Math.floor((now - new Date(e.createdAt).getTime()) / 60000));
      const isUnack = e.status === SafetyEventStatus.UNACKNOWLEDGED;
      const isHighOrImminent = e.riskLevel === RiskLevel.HIGH || e.riskLevel === RiskLevel.IMMINENT;

      let slaState: 'NORMAL' | 'WARNING_15M' | 'BREACHED_30M' = 'NORMAL';
      if (isUnack && isHighOrImminent) {
        if (ageMinutes >= 30) slaState = 'BREACHED_30M';
        else if (ageMinutes >= 15) slaState = 'WARNING_15M';
      }

      const assignee = e.assigneeUserId as unknown as { _id?: Types.ObjectId; displayName?: string; email?: string } | null;

      // Hard rule: Never render journal, chat, or transcript text. Only signal codes.
      return {
        id: e._id.toString(),
        patientReference: `PT-${e.patientId.toString().slice(-6).toUpperCase()}`,
        riskLevel: e.riskLevel,
        signals: e.signals ?? [],
        source: e.source,
        hasCareTeam: (e.careTeamNotified ?? 0) > 0,
        careTeamNotified: e.careTeamNotified ?? 0,
        handoffRequested: Boolean(e.handoffRequested),
        status: e.status ?? SafetyEventStatus.UNACKNOWLEDGED,
        assignee: assignee ? { id: assignee._id?.toString(), name: assignee.displayName, email: assignee.email } : null,
        timerMinutes: ageMinutes,
        slaState,
        acknowledgedAt: e.acknowledgedAt ?? null,
        resolvedAt: e.resolvedAt ?? null,
        outcomeReasonCode: e.outcomeReasonCode ?? null,
        notes: e.notes ?? null,
        createdAt: e.createdAt,
      };
    });
  }

  async acknowledgeSafetyEvent(admin: AuthenticatedUser, id: string) {
    const ev = await this.safetyEvents.findById(id);
    if (!ev) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Safety event not found.' });

    ev.status = SafetyEventStatus.ASSIGNED;
    ev.assigneeUserId = new Types.ObjectId(admin.id);
    ev.acknowledgedAt = new Date();
    await ev.save();

    await this.audit.record({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'safety_event.acknowledged',
      resourceType: 'SafetyEvent',
      resourceId: id,
      metadata: { riskLevel: ev.riskLevel, signals: ev.signals },
    });

    return {
      id,
      status: ev.status,
      acknowledgedAt: ev.acknowledgedAt,
      assigneeUserId: admin.id,
    };
  }

  async patchSafetyEvent(
    admin: AuthenticatedUser,
    id: string,
    dto: { action: 'assign' | 'resolve' | 'escalate'; assigneeUserId?: string; outcomeReasonCode?: string; notes?: string },
  ) {
    const ev = await this.safetyEvents.findById(id);
    if (!ev) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Safety event not found.' });

    if (dto.action === 'assign') {
      if (!dto.assigneeUserId) {
        throw new BadRequestException({ code: 'ASSIGNEE_REQUIRED', message: 'assigneeUserId is required when assigning.' });
      }
      ev.status = SafetyEventStatus.ASSIGNED;
      ev.assigneeUserId = new Types.ObjectId(dto.assigneeUserId);
      if (!ev.acknowledgedAt) ev.acknowledgedAt = new Date();
      if (dto.notes) ev.notes = dto.notes;
    } else if (dto.action === 'resolve') {
      if (!dto.outcomeReasonCode) {
        throw new BadRequestException({ code: 'OUTCOME_REQUIRED', message: 'outcomeReasonCode is mandatory to resolve.' });
      }
      ev.status = SafetyEventStatus.RESOLVED;
      ev.resolvedAt = new Date();
      ev.outcomeReasonCode = dto.outcomeReasonCode;
      if (dto.notes) ev.notes = dto.notes;
    } else if (dto.action === 'escalate') {
      ev.status = SafetyEventStatus.ESCALATED;
      if (dto.notes) ev.notes = dto.notes;
    }

    await ev.save();

    await this.audit.record({
      actorId: admin.id,
      actorRole: admin.role,
      action: `safety_event.${dto.action}`,
      resourceType: 'SafetyEvent',
      resourceId: id,
      metadata: {
        action: dto.action,
        status: ev.status,
        outcomeReasonCode: ev.outcomeReasonCode,
        notes: dto.notes,
      },
    });

    return {
      id,
      status: ev.status,
      assigneeUserId: ev.assigneeUserId?.toString() ?? null,
      resolvedAt: ev.resolvedAt ?? null,
      outcomeReasonCode: ev.outcomeReasonCode ?? null,
      notes: ev.notes ?? null,
    };
  }
}
