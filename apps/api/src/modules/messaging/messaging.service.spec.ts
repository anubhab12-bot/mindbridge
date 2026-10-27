import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DoctorVerificationStatus, Role, RiskLevel } from '@mindbridge/shared-types';
import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { fakeConfig, query } from '../../../test/helpers/fakes.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service.js';
import { MessagingService } from './messaging.service.js';

const crypto = new FieldEncryptionService(fakeConfig());
const patient = { id: new Types.ObjectId().toString(), role: Role.PATIENT } as AuthenticatedUser;
const doctorUserId = new Types.ObjectId();
const doctor = {
  id: doctorUserId.toString(), role: Role.DOCTOR, doctorStatus: DoctorVerificationStatus.APPROVED,
  doctorProfileId: new Types.ObjectId().toString(),
} as AuthenticatedUser;
const stranger = { id: new Types.ObjectId().toString(), role: Role.PATIENT } as AuthenticatedUser;

function setup(careActive = true) {
  const thread = {
    _id: new Types.ObjectId(), patientId: new Types.ObjectId(patient.id), doctorProfileId: new Types.ObjectId(doctor.doctorProfileId),
    doctorUserId, unreadForDoctor: 0, unreadForPatient: 0, lastMessageAt: new Date(), save: vi.fn(),
  };
  const created: Record<string, unknown>[] = [];
  const messages = {
    create: vi.fn(async (d: Record<string, unknown>) => {
      created.push(d);
      const full = { ...d, _id: new Types.ObjectId(), createdAt: new Date(), readAt: null };
      return { ...full, toObject: () => full };
    }),
  };
  const gateway = { notifyUser: vi.fn() };
  const safetyEvents = { create: vi.fn() };
  const svc = new MessagingService(
    { findById: vi.fn().mockResolvedValue(thread) } as never, messages as never, {} as never,
    { findById: vi.fn(() => query({ country: 'IN' })) } as never, safetyEvents as never,
    { isActive: vi.fn().mockResolvedValue(careActive) } as never,
    { forCountry: vi.fn().mockResolvedValue({ country: 'IN', resources: [{ phone: '14416' }], fallbackAdvice: '' }) } as never,
    crypto, { notify: vi.fn() } as never, gateway as never, { record: vi.fn() } as never,
  );
  return { svc, thread, created, gateway, safetyEvents };
}

describe('MessagingService', () => {
  it('hides threads from non-participants', async () => {
    const { svc, thread } = setup();
    await expect(svc.listMessages(stranger, thread._id.toString(), undefined, 10)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.send(stranger, thread._id.toString(), 'hi')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks unverified professionals', async () => {
    const { svc, thread } = setup();
    const pending = { ...doctor, doctorStatus: DoctorVerificationStatus.PENDING_VERIFICATION };
    await expect(svc.send(pending, thread._id.toString(), 'hi')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks new messages after the care relationship ends', async () => {
    const { svc, thread } = setup(false);
    await expect(svc.send(patient, thread._id.toString(), 'hi')).rejects.toMatchObject({ response: { code: 'CARE_ENDED' } });
  });

  it('encrypts content and pushes only ids over the socket', async () => {
    const { svc, thread, created, gateway } = setup();
    const res = await svc.send(patient, thread._id.toString(), 'Can we move our session?');
    expect(String(created[0]!['contentEnc'])).toMatch(/^enc:v1:/);
    expect(res.message.content).toBe('Can we move our session?');
    const payload = gateway.notifyUser.mock.calls[0]![2] as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(['messageId', 'threadId']);
    expect(thread.unreadForDoctor).toBe(1);
    expect(res.safety).toBeUndefined();
  });

  it('shows crisis resources immediately when a patient message signals high risk', async () => {
    const { svc, thread, safetyEvents } = setup();
    const res = await svc.send(patient, thread._id.toString(), "I don't want to live anymore");
    expect(res.safety?.riskLevel).toBe(RiskLevel.HIGH);
    expect(res.safety?.resources?.resources).toHaveLength(1);
    expect(res.safety?.notice).toMatch(/not monitored around the clock/);
    expect(safetyEvents.create).toHaveBeenCalled();
  });
});
