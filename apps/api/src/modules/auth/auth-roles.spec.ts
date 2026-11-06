import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  AccountStatus,
  AdminPermission,
  AdminRolePreset,
  ADMIN_ROLE_PRESET_PERMISSIONS,
  ALL_ADMIN_PERMISSIONS,
  Role,
} from '@mindbridge/shared-types';
import { Types } from 'mongoose';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { AuthService } from './auth.service.js';

describe('AuthService - Admin Escalation Hardening & Key Enrollment (Phase 0)', () => {
  let authService: AuthService;
  let mockUsersModel: any;
  let mockPatientsModel: any;
  let mockSessions: any;
  let mockAudit: any;
  let mockConfig: any;
  let mockJwt: any;

  beforeEach(() => {
    mockUsersModel = {
      findOne: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      updateOne: vi.fn().mockResolvedValue({ matchedCount: 1 }),
    };
    mockPatientsModel = {
      findOne: vi.fn(),
      create: vi.fn(),
    };
    mockSessions = {
      revokeAllForUser: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue({ session: { _id: new Types.ObjectId(), expiresAt: new Date() }, refreshToken: 'rt' }),
    };
    mockAudit = {
      record: vi.fn().mockResolvedValue(undefined),
    };
    mockConfig = {
      get: vi.fn((key: string) => {
        if (key === 'ADMIN_EMAIL') return 'real-superadmin@mindbridge.health';
        if (key === 'JWT_ACCESS_TTL_SECONDS') return 900;
        return null;
      }),
    };
    mockJwt = {
      signAsync: vi.fn().mockResolvedValue('test_token'),
    };

    authService = new AuthService(
      mockUsersModel,
      mockPatientsModel,
      {} as never, // doctors
      {} as never, // authTokens
      {} as never, // passwords
      mockSessions,
      mockJwt,
      mockConfig,
      {} as never, // consent
      {} as never, // mail
      mockAudit,
      {} as never, // crypto
      {} as never, // verification
    );
  });

  describe('findOrCreateUserByEmail hardening (0.2)', () => {
    it('rejects missing or invalid emails', async () => {
      await expect(authService.findOrCreateUserByEmail('')).rejects.toBeInstanceOf(BadRequestException);
      await expect(authService.findOrCreateUserByEmail(undefined)).rejects.toBeInstanceOf(BadRequestException);
      await expect(authService.findOrCreateUserByEmail('invalid-string')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('NEVER grants admin role to emails containing "admin" substring', async () => {
      mockUsersModel.findOne.mockResolvedValue(null);
      mockUsersModel.create.mockImplementation((doc: any) => Promise.resolve({ ...doc, _id: new Types.ObjectId() }));
      mockPatientsModel.findOne.mockResolvedValue(null);
      mockPatientsModel.create.mockResolvedValue(null);

      const user = await authService.findOrCreateUserByEmail('admin-fan@gmail.com');
      expect(user.role).toBe(Role.PATIENT);
      expect(user.adminPermissions).toEqual([]);
      expect(mockUsersModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: Role.PATIENT,
          adminPermissions: [],
        }),
      );
    });

    it('NEVER grants admin role to emails containing hardcoded personal names', async () => {
      mockUsersModel.findOne.mockResolvedValue(null);
      mockUsersModel.create.mockImplementation((doc: any) => Promise.resolve({ ...doc, _id: new Types.ObjectId() }));
      mockPatientsModel.findOne.mockResolvedValue(null);
      mockPatientsModel.create.mockResolvedValue(null);

      const user = await authService.findOrCreateUserByEmail('anubhab.singh@gmail.com');
      expect(user.role).toBe(Role.PATIENT);
      expect(user.adminPermissions).toEqual([]);
    });

    it('NEVER escalates an existing patient account to admin on login', async () => {
      const existingPatient = {
        _id: new Types.ObjectId(),
        email: 'attacker.admin@example.org',
        role: Role.PATIENT,
        adminPermissions: [],
        emailVerifiedAt: new Date(),
        save: vi.fn().mockResolvedValue(true),
      };
      mockUsersModel.findOne.mockResolvedValue(existingPatient);

      const user = await authService.findOrCreateUserByEmail('attacker.admin@example.org');
      expect(user.role).toBe(Role.PATIENT);
      expect(user.adminPermissions).toEqual([]);
      expect(existingPatient.role).toBe(Role.PATIENT);
      expect(existingPatient.save).not.toHaveBeenCalled();
    });
  });

  describe('Admin Enrollment Keys (MB-SUPERADMIN-ENBLE2026 & MB-ADMIN-ENBLE2026)', () => {
    const user: AuthenticatedUser = {
      id: new Types.ObjectId().toString(),
      role: Role.PATIENT,
      status: AccountStatus.ACTIVE,
      sessionId: 'sess_1',
      emailVerified: true,
      adminPermissions: [],
    };
    const meta = { ip: '127.0.0.1', userAgent: 'test' };

    it('enrolls as SUPER_ADMIN with MB-SUPERADMIN-ENBLE2026, revokes sessions, and audits', async () => {
      const res = await authService.enrollAdmin(user, 'MB-SUPERADMIN-ENBLE2026', meta);
      expect(res.success).toBe(true);
      expect(res.role).toBe(Role.ADMIN);
      expect(res.preset).toBe(AdminRolePreset.SUPER);

      expect(mockUsersModel.updateOne).toHaveBeenCalledWith(
        { _id: new Types.ObjectId(user.id) },
        {
          $set: {
            role: Role.ADMIN,
            adminRolePreset: AdminRolePreset.SUPER,
            adminPermissions: [...ALL_ADMIN_PERMISSIONS],
          },
        },
      );
      expect(mockSessions.revokeAllForUser).toHaveBeenCalledWith(user.id, 'enrolled_superadmin');
      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: user.id,
          actorRole: Role.ADMIN,
          action: 'auth.admin_enrolled',
          outcome: 'SUCCESS',
        }),
      );
    });

    it('enrolls as staff admin with MB-ADMIN-ENBLE2026', async () => {
      const res = await authService.enrollAdmin(user, 'MB-ADMIN-ENBLE2026', meta);
      expect(res.success).toBe(true);
      expect(res.role).toBe(Role.ADMIN);
      expect(res.preset).toBe(AdminRolePreset.OPERATIONS);

      expect(mockUsersModel.updateOne).toHaveBeenCalledWith(
        { _id: new Types.ObjectId(user.id) },
        {
          $set: {
            role: Role.ADMIN,
            adminRolePreset: AdminRolePreset.OPERATIONS,
            adminPermissions: [...ADMIN_ROLE_PRESET_PERMISSIONS[AdminRolePreset.OPERATIONS]],
          },
        },
      );
      expect(mockSessions.revokeAllForUser).toHaveBeenCalledWith(user.id, 'enrolled_admin');
    });

    it('rejects invalid enrollment key with ForbiddenException and logs denied audit', async () => {
      await expect(authService.enrollAdmin(user, 'INVALID-KEY-1234', meta)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      expect(mockAudit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: user.id,
          action: 'auth.admin_enroll_failed',
          outcome: 'DENIED',
        }),
      );
    });
  });
});
