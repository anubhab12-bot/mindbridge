import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AccountStatus, AdminPermission, Role } from '@mindbridge/shared-types';
import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { fakeConfig } from '../../../test/helpers/fakes.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { AdminService } from './admin.service.js';
import { suppressCounts, suppressOne } from './suppression.js';

describe('small-group suppression', () => {
  it('hides non-zero counts below the threshold', () => {
    const out = suppressCounts([{ _id: 'HIGH', count: 2 }, { _id: 'NONE', count: 40 }, { _id: 'IMMINENT', count: 0 }], 5);
    expect(out).toEqual([
      { key: 'HIGH', count: null, suppressed: true },
      { key: 'IMMINENT', count: 0, suppressed: false },
      { key: 'NONE', count: 40, suppressed: false },
    ]);
    expect(suppressOne(4, 5)).toEqual({ count: null, suppressed: true });
    expect(suppressOne(5, 5)).toEqual({ count: 5, suppressed: false });
  });
});

describe('AdminService safeguards', () => {
  const admin = { id: new Types.ObjectId().toString(), role: Role.ADMIN, adminPermissions: [AdminPermission.USERS_MANAGE] } as AuthenticatedUser;

  function make(target: Record<string, unknown> | null) {
    const sessions = { revokeAllForUser: vi.fn() };
    const svc = new AdminService(
      { findById: vi.fn().mockResolvedValue(target), updateOne: vi.fn() } as never, { findOne: vi.fn() } as never, {} as never, {} as never,
      fakeConfig({ ANALYTICS_MIN_GROUP_SIZE: 5 }), { cancelAllFutureForDoctor: vi.fn() } as never, {} as never, {} as never, {} as never,
      {} as never, {} as never, {} as never, sessions as never, {} as never, { record: vi.fn() } as never,
    );
    return { svc, sessions };
  }

  it('cannot suspend itself', async () => {
    const { svc } = make(null);
    await expect(svc.suspend(admin, admin.id, 'testing reason')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('needs security:manage to suspend another admin', async () => {
    const { svc } = make({ role: Role.ADMIN, status: AccountStatus.ACTIVE, save: vi.fn() });
    await expect(svc.suspend(admin, new Types.ObjectId().toString(), 'testing reason')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('suspending ends all sessions immediately', async () => {
    const target = { _id: new Types.ObjectId(), role: Role.PATIENT, status: AccountStatus.ACTIVE, save: vi.fn() };
    const { svc, sessions } = make(target);
    await svc.suspend(admin, target._id.toString(), 'abuse of messaging');
    expect(target.status).toBe(AccountStatus.SUSPENDED);
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith(target._id.toString(), 'suspended');
  });
});
