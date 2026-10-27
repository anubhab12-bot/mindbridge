import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type AiChatMessage, ConsentType, RiskLevel, type SafetyInfo } from '@mindbridge/shared-types';
import type { Redis } from 'ioredis';
import { type Model, Types } from 'mongoose';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service.js';
import { generateOpaqueToken } from '../../common/crypto/tokens.js';
import { REDIS } from '../../common/redis/redis.module.js';
import { localDate } from '../../common/utils/dates.js';
import { AppConfigService } from '../../config/app-config.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CareService } from '../care/care.service.js';
import { ConsentService } from '../consent/consent.service.js';
import { CrisisResourcesService } from '../crisis-resources/crisis-resources.service.js';
import { DoctorProfile } from '../doctors/schemas/doctor-profile.schema.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { User } from '../users/schemas/user.schema.js';
import { AiClientService, type AiMeta, AiServiceUnavailableError } from './ai-client.service.js';
import { crisisTemplate, localScreen, maxRisk, QUOTA_TEMPLATE, riskRank, UNAVAILABLE_TEMPLATE } from './local-safety.js';
import { AiInteraction } from './schemas/ai-interaction.schema.js';
import { AiMessage } from './schemas/ai-message.schema.js';
import { Conversation } from './schemas/conversation.schema.js';
import { SafetyEvent } from './schemas/safety-event.schema.js';

type LeanMessage = AiMessage & { _id: Types.ObjectId };
type LeanConversation = Conversation & { _id: Types.ObjectId };

const HISTORY_TURNS = 10;

export interface SendResult {
  userMessage: AiChatMessage;
  reply: AiChatMessage;
  quota: { used: number; limit: number };
}

/**
 * Orchestrates the patient AI companion. Responsibilities kept here (not in the AI service):
 * consent, ownership, quota, encryption at rest, crisis-resource lookup, safety-event records,
 * and the local fallback when the AI service is unavailable.
 */
@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    @InjectModel(Conversation.name) private readonly conversations: Model<Conversation>,
    @InjectModel(AiMessage.name) private readonly messages: Model<AiMessage>,
    @InjectModel(AiInteraction.name) private readonly interactions: Model<AiInteraction>,
    @InjectModel(SafetyEvent.name) private readonly safetyEvents: Model<SafetyEvent>,
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(DoctorProfile.name) private readonly doctors: Model<DoctorProfile>,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly config: AppConfigService,
    private readonly crypto: FieldEncryptionService,
    private readonly consent: ConsentService,
    private readonly crisis: CrisisResourcesService,
    private readonly ai: AiClientService,
    private readonly care: CareService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  // ----------------------------------------------------------------- helpers

  private expiry() {
    return new Date(Date.now() + this.config.get('AI_CONVERSATION_RETENTION_DAYS') * 86_400_000);
  }

  private async assertConsent(patientId: string) {
    if (!(await this.consent.has(patientId, ConsentType.AI_PROCESSING))) {
      throw new ForbiddenException({
        code: 'AI_CONSENT_REQUIRED',
        message: 'Please review and accept how the AI companion processes your messages before using it.',
      });
    }
  }

  private async ownConversation(patientId: string, id: string) {
    const conv = await this.conversations.findOne({ _id: new Types.ObjectId(id), patientId: new Types.ObjectId(patientId) });
    // 404 (not 403) so existence of other people's conversations is not revealed.
    if (!conv) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Conversation not found.' });
    return conv;
  }

  private toMessage(m: LeanMessage, resources?: SafetyInfo['resources']): AiChatMessage {
    return {
      id: m._id.toString(),
      role: m.role,
      content: this.crypto.decrypt(m.contentEnc),
      createdAt: m.createdAt.toISOString(),
      isMock: m.isMock || undefined,
      safety: m.safety
        ? {
            riskLevel: m.safety.riskLevel,
            crisisMode: m.safety.crisisMode,
            signals: m.safety.signals,
            showHumanSupport: m.safety.showHumanSupport,
            resources,
          }
        : undefined,
    };
  }

  /** Increments today's counter. Fails open if Redis is down (quota is cost control, not security). */
  private async consumeQuota(patientId: string, tz: string): Promise<{ used: number; limit: number; exceeded: boolean }> {
    const limit = this.config.get('AI_DAILY_MESSAGE_QUOTA');
    const key = `ai:quota:${patientId}:${localDate(new Date(), tz)}`;
    try {
      const used = await this.redis.incr(key);
      if (used === 1) await this.redis.expire(key, 2 * 86_400);
      return { used, limit, exceeded: used > limit };
    } catch {
      return { used: 0, limit, exceeded: false };
    }
  }

  private async recordInteraction(userId: string, kind: AiInteraction['kind'], meta: AiMeta | null, extra: Partial<AiInteraction> = {}) {
    await this.interactions
      .create({
        userId: new Types.ObjectId(userId),
        kind,
        provider: meta?.provider ?? 'none',
        model: meta?.model ?? 'none',
        promptVersion: meta?.prompt_version,
        policyVersion: meta?.policy_version,
        inputTokens: meta?.input_tokens ?? 0,
        outputTokens: meta?.output_tokens ?? 0,
        latencyMs: meta?.latency_ms ?? 0,
        isMock: meta?.is_mock ?? false,
        fallbackUsed: meta?.fallback_used ?? true,
        guardActions: meta?.output_guard_actions ?? [],
        ...extra,
      })
      .catch((err: Error) => this.logger.warn(`could not record AI interaction: ${err.message}`));
  }

  // ------------------------------------------------------------ conversations

  async createConversation(patientId: string, title?: string) {
    await this.assertConsent(patientId);
    const conv = await this.conversations.create({
      patientId: new Types.ObjectId(patientId),
      ref: generateOpaqueToken(18),
      titleEnc: this.crypto.encryptOptional(title?.trim()),
      expiresAt: this.expiry(),
    });
    return this.toConversationView(conv.toObject());
  }

  private toConversationView(c: LeanConversation) {
    return {
      id: c._id.toString(),
      title: this.crypto.decryptOptional(c.titleEnc) ?? null,
      messageCount: c.messageCount,
      lastMessageAt: c.lastMessageAt,
      highestRisk: c.highestRisk,
      hasSummary: Boolean(c.summaryEnc),
      expiresAt: c.expiresAt,
      createdAt: c.createdAt,
    };
  }

  async listConversations(patientId: string, skip: number, limit: number) {
    const filter = { patientId: new Types.ObjectId(patientId) };
    const [rows, total] = await Promise.all([
      this.conversations.find(filter).sort({ lastMessageAt: -1 }).skip(skip).limit(limit).lean<LeanConversation[]>(),
      this.conversations.countDocuments(filter),
    ]);
    return { items: rows.map((c) => this.toConversationView(c)), total };
  }

  async getMessages(patientId: string, conversationId: string, skip: number, limit: number) {
    const conv = await this.ownConversation(patientId, conversationId);
    const filter = { conversationId: conv._id };
    const [rows, total] = await Promise.all([
      this.messages.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).lean<LeanMessage[]>(),
      this.messages.countDocuments(filter),
    ]);
    return { items: rows.map((m) => this.toMessage(m)), total };
  }

  async renameConversation(patientId: string, id: string, title: string) {
    const conv = await this.ownConversation(patientId, id);
    conv.titleEnc = this.crypto.encryptOptional(title.trim());
    await conv.save();
    return this.toConversationView(conv.toObject());
  }

  async deleteConversation(patientId: string, id: string) {
    const conv = await this.ownConversation(patientId, id);
    await this.messages.deleteMany({ conversationId: conv._id });
    await conv.deleteOne();
    await this.audit.record({ actorId: patientId, action: 'ai.conversation_deleted', resourceType: 'Conversation', resourceId: id });
  }

  // ----------------------------------------------------------------- messaging

  async send(patientId: string, conversationId: string, text: string): Promise<SendResult> {
    await this.assertConsent(patientId);
    const conv = await this.ownConversation(patientId, conversationId);
    const user = await this.users.findById(patientId).select('country locale timezone').lean();
    const country = user?.country ?? 'IN';

    const history = (
      await this.messages
        .find({ conversationId: conv._id, role: { $in: ['user', 'assistant'] } })
        .sort({ createdAt: -1 })
        .limit(HISTORY_TURNS)
        .lean<LeanMessage[]>()
    )
      .reverse()
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: this.crypto.decrypt(m.contentEnc) }));

    const quota = await this.consumeQuota(patientId, user?.timezone ?? 'Asia/Kolkata');
    const resources = await this.crisis.forCountry(country);
    const hasResources = resources.resources.length > 0;

    let replyText: string;
    let riskLevel: RiskLevel;
    let signals: string[];
    let crisisMode: boolean;
    let showHumanSupport: boolean;
    let isMock = false;
    let templated = false;
    let sources: AiMessage['sources'] = [];
    let source: 'ai_service' | 'local_fallback' = 'ai_service';

    // Quota never blocks crisis support: an over-quota message is still screened locally.
    const local = localScreen(text);
    if (quota.exceeded) {
      source = 'local_fallback';
      riskLevel = local.riskLevel;
      signals = [...local.signals, 'quota_exceeded'];
      crisisMode = riskRank(riskLevel) >= riskRank(RiskLevel.HIGH);
      showHumanSupport = crisisMode;
      replyText = crisisMode ? crisisTemplate(riskLevel, hasResources) : QUOTA_TEMPLATE;
      templated = true;
      await this.recordInteraction(patientId, 'support', null, { riskLevel, fallbackUsed: true });
    } else {
      try {
        const res = await this.ai.respond({
          sessionRef: conv.ref,
          message: text,
          history,
          locale: user?.locale ?? 'en',
          country,
          crisisResources: await this.crisis.forAi(country),
        });
        // Defence in depth: the local screen can raise, never lower, the AI service's level.
        riskLevel = maxRisk(res.safety.risk_level, local.riskLevel);
        signals = res.safety.signals;
        crisisMode = res.safety.crisis_mode || riskRank(riskLevel) >= riskRank(RiskLevel.HIGH);
        showHumanSupport = res.safety.show_human_support || crisisMode;
        if (riskLevel !== res.safety.risk_level) {
          replyText = crisisTemplate(riskLevel, hasResources);
          templated = true;
          signals = [...signals, ...local.signals];
        } else {
          replyText = res.reply;
          templated = res.meta.provider === 'template' || res.meta.fallback_used;
        }
        isMock = res.meta.is_mock;
        sources = res.meta.sources.map((s) => ({ title: s.title, publisher: s.publisher ?? undefined, url: s.url ?? undefined }));
        await this.recordInteraction(patientId, 'support', res.meta, { riskLevel });
      } catch (err) {
        if (!(err instanceof AiServiceUnavailableError)) throw err;
        source = 'local_fallback';
        riskLevel = local.riskLevel;
        signals = [...local.signals, 'ai_service_unavailable'];
        crisisMode = riskRank(riskLevel) >= riskRank(RiskLevel.HIGH);
        showHumanSupport = crisisMode;
        replyText = crisisMode ? crisisTemplate(riskLevel, hasResources) : UNAVAILABLE_TEMPLATE;
        templated = true;
        await this.recordInteraction(patientId, 'support', null, { riskLevel, serviceUnavailable: true });
      }
    }

    const safety = { riskLevel, crisisMode, signals, showHumanSupport };
    const expiresAt = this.expiry();
    const [userMsg, replyMsg] = await this.messages.create([
      {
        conversationId: conv._id,
        patientId: conv.patientId,
        role: 'user',
        contentEnc: this.crypto.encrypt(text),
        safety: { riskLevel, crisisMode: false, signals: [], showHumanSupport: false },
        expiresAt,
      },
      {
        conversationId: conv._id,
        patientId: conv.patientId,
        role: 'assistant',
        contentEnc: this.crypto.encrypt(replyText),
        safety,
        isMock,
        templated,
        sources,
        expiresAt,
      },
    ]);

    conv.messageCount += 2;
    conv.lastMessageAt = new Date();
    conv.expiresAt = expiresAt;
    conv.highestRisk = maxRisk(conv.highestRisk, riskLevel);
    await conv.save();

    if (riskRank(riskLevel) >= riskRank(RiskLevel.ELEVATED)) {
      await this.safetyEvents.create({
        patientId: conv.patientId,
        conversationId: conv._id,
        riskLevel,
        signals,
        source,
        resourcesShown: crisisMode ? resources.resources.length : 0,
      });
    }

    const shownResources = crisisMode || showHumanSupport ? resources : undefined;
    return {
      userMessage: this.toMessage(userMsg!.toObject()),
      reply: this.toMessage(replyMsg!.toObject(), shownResources),
      quota: { used: Math.min(quota.used, quota.limit), limit: quota.limit },
    };
  }

  async setFeedback(patientId: string, messageId: string, feedback: 'HELPFUL' | 'NOT_HELPFUL' | 'REPORTED') {
    const res = await this.messages.updateOne(
      { _id: new Types.ObjectId(messageId), patientId: new Types.ObjectId(patientId), role: 'assistant' },
      { $set: { feedback } },
    );
    if (!res.matchedCount) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Message not found.' });
    if (feedback === 'REPORTED') {
      // Metadata only: reviewers see that a reply was reported, not the conversation.
      await this.audit.record({ actorId: patientId, action: 'ai.reply_reported', resourceType: 'AiMessage', resourceId: messageId });
    }
  }

  /**
   * The patient explicitly asks for human support. Their active care team (if any) receives a
   * generic notification with no conversation content; the patient always gets resources.
   */
  async requestHumanSupport(patientId: string, conversationId?: string) {
    if (conversationId) await this.ownConversation(patientId, conversationId);
    const user = await this.users.findById(patientId).select('country').lean();
    const resources = await this.crisis.forCountry(user?.country ?? 'IN');
    const active = (await this.care.listForPatient(patientId)).filter((c) => c.status === 'ACTIVE');
    const doctorProfiles = await this.doctors
      .find({ _id: { $in: active.map((c) => c.doctorProfileId) } })
      .select('userId displayName')
      .lean();
    for (const d of doctorProfiles) {
      await this.notifications.notify(d.userId, {
        type: 'care.support_requested',
        title: 'A patient in your care asked for support',
        body: 'Please check your messages and upcoming appointments. This notice contains no conversation content.',
        link: '/doctor/patients',
      });
    }
    await this.safetyEvents.create({
      patientId: new Types.ObjectId(patientId),
      conversationId: conversationId ? new Types.ObjectId(conversationId) : undefined,
      riskLevel: RiskLevel.NONE,
      signals: ['human_support_requested'],
      source: 'patient_request',
      resourcesShown: resources.resources.length,
      handoffRequested: true,
      careTeamNotified: doctorProfiles.length,
    });
    return {
      resources,
      careTeam: doctorProfiles.map((d) => ({ doctorId: d._id.toString(), displayName: d.displayName })),
      careTeamNotified: doctorProfiles.length,
      bookingLink: '/patient/professionals',
    };
  }

  // ------------------------------------------------------------------ summaries

  async summarize(patientId: string, conversationId: string) {
    await this.assertConsent(patientId);
    const conv = await this.ownConversation(patientId, conversationId);
    const history = (await this.messages
      .find({ conversationId: conv._id, role: { $in: ['user', 'assistant'] } })
      .sort({ createdAt: -1 })
      .limit(60)
      .lean<LeanMessage[]>())
      .reverse()
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: this.crypto.decrypt(m.contentEnc) }));
    if (!history.length) return { summary: null, isMock: false };
    try {
      const res = await this.ai.summarize(conv.ref, history, 'patient');
      conv.summaryEnc = this.crypto.encrypt(res.summary);
      conv.summaryUpdatedAt = new Date();
      await conv.save();
      await this.recordInteraction(patientId, 'summary', res.meta);
      return { summary: res.summary, isMock: res.meta.is_mock, updatedAt: conv.summaryUpdatedAt };
    } catch (err) {
      if (err instanceof AiServiceUnavailableError) {
        throw new ForbiddenException({ code: 'AI_UNAVAILABLE', message: 'Summaries are temporarily unavailable. Please try again later.' });
      }
      throw err;
    }
  }

  /**
   * Professional-facing summary of the patient's recent AI conversations. Caller MUST have
   * verified the care relationship; this method checks the per-doctor SHARE_AI_SUMMARY consent.
   */
  async professionalSummary(patientId: string, doctorProfileId: string) {
    if (!(await this.consent.has(patientId, ConsentType.SHARE_AI_SUMMARY, doctorProfileId))) {
      throw new ForbiddenException({ code: 'CONSENT_REQUIRED', message: 'The patient has not shared AI conversation summaries with you.' });
    }
    const since = new Date(Date.now() - 30 * 86_400_000);
    const rows = await this.messages
      .find({ patientId: new Types.ObjectId(patientId), role: { $in: ['user', 'assistant'] }, createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(60)
      .lean<LeanMessage[]>();
    if (!rows.length) return { summary: null, label: 'AI_DRAFT_REQUIRES_PROFESSIONAL_REVIEW' as const };
    const history = rows.reverse().map((m) => ({ role: m.role as 'user' | 'assistant', content: this.crypto.decrypt(m.contentEnc) }));
    const res = await this.ai.summarize(generateOpaqueToken(12), history, 'professional').catch((err: unknown) => {
      if (err instanceof AiServiceUnavailableError) return null;
      throw err;
    });
    if (!res) throw new ForbiddenException({ code: 'AI_UNAVAILABLE', message: 'Summaries are temporarily unavailable.' });
    await this.recordInteraction(patientId, 'summary', res.meta);
    const highestRisk = rows.reduce<RiskLevel>((acc, m) => maxRisk(acc, m.safety?.riskLevel ?? RiskLevel.NONE), RiskLevel.NONE);
    return {
      summary: res.summary,
      label: 'AI_DRAFT_REQUIRES_PROFESSIONAL_REVIEW' as const,
      isMock: res.meta.is_mock,
      periodDays: 30,
      highestRiskLevel: highestRisk,
    };
  }

  // ------------------------------------------------------------- privacy rights

  async exportAll(patientId: string) {
    const convs = await this.conversations.find({ patientId: new Types.ObjectId(patientId) }).lean<LeanConversation[]>();
    const out = [];
    for (const c of convs) {
      const msgs = await this.messages.find({ conversationId: c._id }).sort({ createdAt: 1 }).lean<LeanMessage[]>();
      out.push({
        ...this.toConversationView(c),
        summary: this.crypto.decryptOptional(c.summaryEnc) ?? null,
        messages: msgs.map((m) => this.toMessage(m)),
      });
    }
    return out;
  }

  async deleteAll(patientId: string) {
    const id = new Types.ObjectId(patientId);
    await this.messages.deleteMany({ patientId: id });
    await this.conversations.deleteMany({ patientId: id });
  }

  // --------------------------------------------------------------- monitoring

  async usageStats(since: Date) {
    const [byKind, safety] = await Promise.all([
      this.interactions.aggregate<{ _id: string; count: number; fallback: number; unavailable: number; mock: number; avgLatency: number; tokens: number }>([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: '$kind',
            count: { $sum: 1 },
            fallback: { $sum: { $cond: ['$fallbackUsed', 1, 0] } },
            unavailable: { $sum: { $cond: ['$serviceUnavailable', 1, 0] } },
            mock: { $sum: { $cond: ['$isMock', 1, 0] } },
            avgLatency: { $avg: '$latencyMs' },
            tokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } },
          },
        },
      ]),
      this.safetyEvents.aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
      ]),
    ]);
    return { byKind, safetyEventsByLevel: safety };
  }
}
