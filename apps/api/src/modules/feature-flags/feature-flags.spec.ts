import { type ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { query } from '../../../test/helpers/fakes.js';
import { FeatureFlagsService } from './feature-flags.service.js';
import { FeatureFlagGuard } from './require-feature.js';

const ctx = { getHandler: () => undefined, getClass: () => undefined } as unknown as ExecutionContext;

describe('feature flags', () => {
  it('uses defaults and stored overrides, ignoring unknown keys', async () => {
    const svc = new FeatureFlagsService({ find: vi.fn(() => query([{ key: 'ai.companion', enabled: false }, { key: 'rogue', enabled: true }])) } as never, { record: vi.fn() } as never);
    expect(await svc.isEnabled('ai.companion')).toBe(false);
    expect(await svc.isEnabled('booking.enabled')).toBe(true);
    expect(await svc.isEnabled('rogue')).toBe(false);
    expect(await svc.set({ id: '65f000000000000000000001' } as never, 'rogue', true)).toBeNull();
  });

  it('guard blocks disabled features with 503', async () => {
    const flags = { isEnabled: vi.fn().mockResolvedValue(false) };
    const guard = new FeatureFlagGuard({ getAllAndOverride: () => 'ai.companion' } as unknown as Reflector, flags as never);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
