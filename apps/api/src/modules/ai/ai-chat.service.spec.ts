import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RiskLevel } from '@mindbridge/shared-types';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeConfig, query } from '../../../test/helpers/fakes.js';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service.js';
import { AiChatService } from './ai-chat.service.js';
import { AiServiceUnavailableError, type SupportReply } from './ai-client.service.js';

const PATIENT = new Types.ObjectId().toString();
const OTHER = new Types.ObjectId().toString();
const config = fakeConfig({ AI_DAILY_MESSAGE_QUOTA: 3 });
const crypto = new FieldEncryptionService(config);

const VERIFIED = {
  country: 'IN',
  resources: [{ id: 'r1', name: 'Tele-MANAS', phone: '14416', serviceType: 'MENTAL_HEALTH_HELPLINE' }],
  altPhones: {},
  fallbackAdvice: 'call local emergency number',
};

function reply(over: Partial<SupportReply['safety']> = {}, text = 'That sounds hard. What has helped before?'): SupportReply {
  return {
    reply: text,
    safety: {
      risk_level: RiskLevel.NONE,
      crisis_mode: false,
      signals: [],
      show_human_support: false,
      ask_safety_question: false,
      classifier: 'keyword',
      classifier_degraded: false,
      ...over,
    },
    meta: {
      provider: 'scripted', model: 'm', prompt_version: 'p', policy_version: 'v', input_tokens: 1, output_tokens: 1,
      latency_ms: 5, is_mock: false, fallback_used: false, output_guard_actions: [], sources: [],
    },
  };
}

function setup() {
  const convId = new Types.ObjectId();
  const conv = {
    _id: convId,
    patientId: new Types.ObjectId(PATIENT),
    ref: 'opaque-ref',
    messageCount: 0,
    highestRisk: RiskLevel.NONE,
    save: vi.fn().mockResolvedValue(undefined),
  };
  const created: Record<string, unknown>[] = [];
  const messages = {
    find: vi.fn(() => query([])),
    create: vi.fn(async (docs: Record<string, unknown>[]) => {
      created.push(...docs);
      return docs.map((d) => ({ toObject: () => ({ ...d, _id: new Types.ObjectId(), createdAt: new Date() }) }));
    }),
  };
  const conversations = {
    findOne: vi.fn(async (f: { patientId: Types.ObjectId }) => (f.patientId.toString() === PATIENT ? conv : null)),
  };
  const safetyEvents = { create: vi.fn().mockResolvedValue({}) };
  const interactions = { create: vi.fn().mockResolvedValue({}) };
  const users = { findById: vi.fn(() => query({ country: 'IN', locale: 'en', timezone: 'Asia/Kolkata' })) };
  let counter = 0;
  const redis = { incr: vi.fn(async () => ++counter), expire: vi.fn() };
  const consent = { has: vi.fn().mockResolvedValue(true) };
  const crisis = { forCountry: vi.fn().mockResolvedValue(VERIFIED), forAi: vi.fn().mockResolvedValue([]) };
  const ai = { respond: vi.fn().mockResolvedValue(reply()) };
  const audit = { record: vi.fn() };
  const svc = new AiChatService(
    conversations as never, messages as never, interactions as never, safetyEvents as never, users as never, {} as never,
    redis as never, config, crypto, consent as never, crisis as never, ai as never, {} as never, {} as never, audit as never,
  );
  return { svc, conv, convId, created, ai, consent, safetyEvents, interactions, redis };
}

describe('AiChatService.send', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  it('requires AI processing consent', async () => {
    t.consent.has.mockResolvedValue(false);
    await expect(t.svc.send(PATIENT, t.convId.toString(), 'hi')).rejects.toMatchObject({
      response: { code: 'AI_CONSENT_REQUIRED' },
    });
    expect(t.ai.respond).not.toHaveBeenCalled();
  });

  it("returns 404 for another patient's conversation", async () => {
    await expect(t.svc.send(OTHER, t.convId.toString(), 'hi')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('stores both messages encrypted and returns the reply', async () => {
    const res = await t.svc.send(PATIENT, t.convId.toString(), 'I feel lonely');
    expect(res.reply.content).toContain('That sounds hard');
    expect(res.reply.safety?.riskLevel).toBe(RiskLevel.NONE);
    for (const doc of t.created) expect(String(doc['contentEnc'])).toMatch(/^enc:v1:/);
    expect(JSON.stringify(t.created)).not.toContain('lonely');
    expect(t.safetyEvents.create).not.toHaveBeenCalled();
    // The AI service receives an opaque reference, never the patient id.
    expect(JSON.stringify(t.ai.respond.mock.calls[0])).not.toContain(PATIENT);
  });

  it('shows verified resources and records a safety event for high risk', async () => {
    t.ai.respond.mockResolvedValue(reply({ risk_level: RiskLevel.HIGH, crisis_mode: true, show_human_support: true, signals: ['suicidal_intent'] }));
    const res = await t.svc.send(PATIENT, t.convId.toString(), 'I want to kill myself');
    expect(res.reply.safety?.crisisMode).toBe(true);
    expect(res.reply.safety?.resources?.resources[0]?.phone).toBe('14416');
    expect(t.safetyEvents.create).toHaveBeenCalledWith(expect.objectContaining({ riskLevel: RiskLevel.HIGH, source: 'ai_service' }));
  });

  it('local screen raises the level when the AI service under-classifies', async () => {
    t.ai.respond.mockResolvedValue(reply({ risk_level: RiskLevel.NONE }, 'Sounds like a busy day!'));
    const res = await t.svc.send(PATIENT, t.convId.toString(), "I'm going to kill myself tonight");
    expect(res.reply.safety?.riskLevel).toBe(RiskLevel.IMMINENT);
    expect(res.reply.content).not.toContain('busy day');
    expect(res.reply.content).toContain('emergency');
  });

  it('falls back safely when the AI service is unavailable', async () => {
    t.ai.respond.mockRejectedValue(new AiServiceUnavailableError('unreachable'));
    const calm = await t.svc.send(PATIENT, t.convId.toString(), 'rough day');
    expect(calm.reply.content).toContain('having trouble responding');
    expect(calm.reply.isMock).toBeUndefined();

    const crisis = await t.svc.send(PATIENT, t.convId.toString(), 'I want to end my life');
    expect(crisis.reply.safety?.crisisMode).toBe(true);
    expect(crisis.reply.safety?.resources?.resources.length).toBe(1);
    expect(t.safetyEvents.create).toHaveBeenCalledWith(expect.objectContaining({ source: 'local_fallback' }));
    expect(t.interactions.create).toHaveBeenCalledWith(expect.objectContaining({ serviceUnavailable: true }));
  });

  it('enforces the daily quota but never blocks crisis support', async () => {
    for (let i = 0; i < 3; i++) await t.svc.send(PATIENT, t.convId.toString(), 'hello');
    t.ai.respond.mockClear();
    const over = await t.svc.send(PATIENT, t.convId.toString(), 'hello again');
    expect(over.reply.content).toContain("today's limit");
    expect(t.ai.respond).not.toHaveBeenCalled();

    const crisis = await t.svc.send(PATIENT, t.convId.toString(), 'I want to kill myself');
    expect(crisis.reply.safety?.crisisMode).toBe(true);
    expect(crisis.reply.content).toContain('are you safe right now');
  });

  it('flags mock replies', async () => {
    const mock = reply();
    mock.meta.is_mock = true;
    t.ai.respond.mockResolvedValue(mock);
    const res = await t.svc.send(PATIENT, t.convId.toString(), 'hi');
    expect(res.reply.isMock).toBe(true);
  });
});

describe('AiChatService.professionalSummary', () => {
  it('requires the per-doctor sharing consent', async () => {
    const t = setup();
    t.consent.has.mockResolvedValue(false);
    await expect(t.svc.professionalSummary(PATIENT, new Types.ObjectId().toString())).rejects.toBeInstanceOf(ForbiddenException);
  });
});
