import { UnauthorizedException } from '@nestjs/common';
import { AccountStatus, Role } from '@mindbridge/shared-types';
import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { fakeConfig, query } from '../../../test/helpers/fakes.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service.js';
import { PrivacyService } from './privacy.service.js';

function make(userDoc: Record<string, unknown>, due: Record<string, unknown>[] = []) {
  const deps = {
    users: { findById: vi.fn(() => ({ select: () => Promise.resolve(userDoc) })), find: vi.fn(() => query(due)), updateOne: vi.fn() },
    profiles: { deleteOne: vi.fn() },
    passwords: { verify: vi.fn(async (_h: string, pw: string) => pw === 'right-password') },
    sessions: { revokeAllForUser: vi.fn() },
    mood: { deleteAll: vi.fn() },
    journal: { deleteAll: vi.fn() },
    aiChat: { deleteAll: vi.fn() },
    appointments: { cancelAllFutureForPatient: vi.fn(), cancelAllFutureForDoctor: vi.fn() },
    messaging: { deletePatientMessages: vi.fn() },
    notifications: { deleteAllForUser: vi.fn() },
    care: { endAllForPatient: vi.fn() },
    mail: { send: vi.fn() },
    jobs: { register: vi.fn() },
    audit: { record: vi.fn() },
  };
  const svc = new PrivacyService(
    deps.users as never, deps.profiles as never, fakeConfig({ ACCOUNT_DELETION_GRACE_DAYS: 7 }),
    new FieldEncryptionService(fakeConfig()), deps.passwords as never, deps.sessions as never, {} as never,
    deps.mood as never, deps.journal as never, deps.aiChat as never, deps.appointments as never, deps.messaging as never,
    deps.notifications as never, deps.care as never, deps.mail as never, deps.jobs as never, deps.audit as never,
  );
  return { svc, deps };
}

const patient = { id: new Types.ObjectId().toString(), role: Role.PATIENT, sessionId: 's1' } as AuthenticatedUser;

describe('PrivacyService', () => {
  it('requires the password to schedule deletion', async () => {
    const { svc } = make({ passwordHash: 'h', save: vi.fn() });
    await expect(svc.requestDeletion(patient, 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('schedules deletion after the grace period and cancels future appointments', async () => {
    const doc: Record<string, unknown> = { passwordHash: 'h', email: 'p@example.org', displayName: 'P', save: vi.fn() };
    const { svc, deps } = make(doc);
    const res = await svc.requestDeletion(patient, 'right-password');
    expect(doc['status']).toBe(AccountStatus.PENDING_DELETION);
    expect(Math.round((res.scheduledFor.getTime() - Date.now()) / 86_400_000)).toBe(7);
    expect(deps.appointments.cancelAllFutureForPatient).toHaveBeenCalled();
    expect(deps.sessions.revokeAllForUser).toHaveBeenCalledWith(patient.id, 'deletion_requested', 's1');
  });

  it('purges personal content and pseudonymises due accounts', async () => {
    const id = new Types.ObjectId();
    const { svc, deps } = make({}, [{ _id: id, role: Role.PATIENT }]);
    expect(await svc.purgeDue()).toBe(1);
    for (const d of [deps.mood.deleteAll, deps.journal.deleteAll, deps.aiChat.deleteAll, deps.messaging.deletePatientMessages]) {
      expect(d).toHaveBeenCalledWith(id.toString());
    }
    const update = deps.users.updateOne.mock.calls[0]![1] as { $set: Record<string, unknown> };
    expect(update.$set['status']).toBe(AccountStatus.DELETED);
    expect(update.$set['email']).toMatch(/@deleted\.invalid$/);
  });
});
