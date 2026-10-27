import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminPermission, DoctorVerificationStatus, Role } from '@mindbridge/shared-types';
import { describe, expect, it, vi } from 'vitest';
import { fakeConfig } from '../../../../test/helpers/fakes.js';
import type { AuthenticatedUser } from '../../../common/auth/authenticated-user.js';
import {
  ADMIN_PERMISSIONS_KEY,
  IS_PUBLIC_KEY,
  REQUIRE_EMAIL_VERIFIED_KEY,
  REQUIRE_VERIFIED_DOCTOR_KEY,
  ROLES_KEY,
} from '../../../common/auth/decorators.js';
import type { AuditService } from '../../audit/audit.service.js';
import { CsrfGuard } from './csrf.guard.js';
import { RolesGuard } from './roles.guard.js';

function ctx(req: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function guardWith(meta: Record<string, unknown>) {
  const reflector = { getAllAndOverride: (key: string) => meta[key] } as unknown as Reflector;
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  return { guard: new RolesGuard(reflector, audit as unknown as AuditService), audit };
}

const user = (over: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  id: '65f000000000000000000001',
  role: Role.PATIENT,
  sessionId: 's',
  status: 'ACTIVE',
  emailVerified: true,
  adminPermissions: [],
  ...over,
}) as AuthenticatedUser;

describe('RolesGuard', () => {
  it('allows public routes', async () => {
    const { guard } = guardWith({ [IS_PUBLIC_KEY]: true });
    expect(await guard.canActivate(ctx({}))).toBe(true);
  });

  it('denies by default when a route declares no roles, and audits it', async () => {
    const { guard, audit } = guardWith({});
    await expect(guard.canActivate(ctx({ user: user() }))).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'authz.denied', outcome: 'DENIED' }));
  });

  it('blocks a patient from a doctor route', async () => {
    const { guard } = guardWith({ [ROLES_KEY]: [Role.DOCTOR] });
    await expect(guard.canActivate(ctx({ user: user() }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks a patient from an admin route', async () => {
    const { guard } = guardWith({ [ROLES_KEY]: [Role.ADMIN] });
    await expect(guard.canActivate(ctx({ user: user() }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks an unverified doctor from verified-only routes', async () => {
    const { guard } = guardWith({ [ROLES_KEY]: [Role.DOCTOR], [REQUIRE_VERIFIED_DOCTOR_KEY]: true });
    const pending = user({ role: Role.DOCTOR, doctorStatus: DoctorVerificationStatus.PENDING_VERIFICATION });
    await expect(guard.canActivate(ctx({ user: pending }))).rejects.toMatchObject({
      response: { code: 'DOCTOR_NOT_VERIFIED' },
    });
    const approved = user({ role: Role.DOCTOR, doctorStatus: DoctorVerificationStatus.APPROVED });
    expect(await guard.canActivate(ctx({ user: approved }))).toBe(true);
  });

  it('requires a verified email where declared', async () => {
    const { guard } = guardWith({ [ROLES_KEY]: [Role.PATIENT], [REQUIRE_EMAIL_VERIFIED_KEY]: true });
    await expect(guard.canActivate(ctx({ user: user({ emailVerified: false }) }))).rejects.toMatchObject({
      response: { code: 'EMAIL_NOT_VERIFIED' },
    });
  });

  it('checks admin permissions', async () => {
    const { guard } = guardWith({ [ROLES_KEY]: [Role.ADMIN], [ADMIN_PERMISSIONS_KEY]: [AdminPermission.CRISIS_MANAGE] });
    await expect(guard.canActivate(ctx({ user: user({ role: Role.ADMIN, adminPermissions: [AdminPermission.AUDIT_READ] }) }))).rejects.toBeInstanceOf(ForbiddenException);
    expect(await guard.canActivate(ctx({ user: user({ role: Role.ADMIN, adminPermissions: [AdminPermission.CRISIS_MANAGE] }) }))).toBe(true);
  });
});

describe('CsrfGuard', () => {
  const guard = new CsrfGuard(fakeConfig({ CORS_ORIGINS: 'http://localhost:4200' }));

  it('requires the custom header', () => {
    expect(() => guard.canActivate(ctx({ headers: {} }))).toThrow(ForbiddenException);
  });

  it('rejects foreign origins', () => {
    expect(() => guard.canActivate(ctx({ headers: { 'x-mindbridge-csrf': '1', origin: 'https://evil.example' } }))).toThrow(ForbiddenException);
  });

  it('accepts allowed origins', () => {
    expect(guard.canActivate(ctx({ headers: { 'x-mindbridge-csrf': '1', origin: 'http://localhost:4200' } }))).toBe(true);
  });
});
