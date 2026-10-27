import { BadRequestException } from '@nestjs/common';
import { CrisisServiceType, Role } from '@mindbridge/shared-types';
import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { fakeConfig, query } from '../../../test/helpers/fakes.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { CrisisResourcesService } from './crisis-resources.service.js';
import { VERIFIED_SEED_RESOURCES } from './crisis-resources.seed-data.js';

const admin = { id: new Types.ObjectId().toString(), role: Role.ADMIN } as AuthenticatedUser;

function make(model: Record<string, unknown>) {
  const audit = { record: vi.fn() };
  return { svc: new CrisisResourcesService(model as never, fakeConfig({ CRISIS_RESOURCE_MAX_AGE_DAYS: 180 }), audit as never), audit };
}

describe('CrisisResourcesService', () => {
  it('only serves active resources verified within the max age', async () => {
    const find = vi.fn(() => query([]));
    const { svc } = make({ find });
    const res = await svc.forCountry('in');
    const filter = (find.mock.calls[0] as unknown as [Record<string, any>])[0];
    expect(filter['country']).toBe('IN');
    expect(filter['status']).toBe('ACTIVE');
    const cutoff: Date = filter['verifiedAt'].$gte;
    const days = (Date.now() - cutoff.getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(180);
    expect(res.resources).toEqual([]);
    expect(res.fallbackAdvice).toMatch(/emergency/);
  });

  it('requires at least one contact method', async () => {
    const { svc } = make({ create: vi.fn() });
    await expect(
      svc.create(admin, { name: 'X', country: 'IN', serviceType: CrisisServiceType.OTHER, availability: '24x7', sourceUrl: 'https://gov.example' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a verification date in the future', async () => {
    const { svc } = make({ create: vi.fn() });
    await expect(
      svc.create(admin, {
        name: 'X', country: 'IN', serviceType: CrisisServiceType.OTHER, availability: '24x7', phone: '123',
        sourceUrl: 'https://gov.example', verifiedAt: '2999-01-01T00:00:00Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('forces re-verification when contact details change', async () => {
    const row = {
      phone: '14416', url: undefined, sms: undefined, verifiedAt: new Date(),
      save: vi.fn(), toObject() { return { ...this, _id: new Types.ObjectId(), languages: [], verifiedAt: this.verifiedAt }; },
    };
    const { svc, audit } = make({ findById: vi.fn().mockResolvedValue(row) });
    await svc.update(admin, new Types.ObjectId().toString(), { phone: '99999' });
    expect(row.verifiedAt.getTime()).toBe(0);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ requiresReverification: true }) }));
  });

  it('seed data carries official sources and a verification date', () => {
    for (const r of VERIFIED_SEED_RESOURCES) {
      expect(r.sourceUrl).toMatch(/^https:\/\/([a-z0-9.]+\.)?(gov\.in)\//);
      expect(r.verifiedAt.toISOString().slice(0, 10)).toBe('2026-10-27');
    }
  });
});
