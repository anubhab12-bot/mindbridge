import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AccountStatus,
  AdminPermission,
  AdminRolePreset,
  ADMIN_ROLE_PRESET_PERMISSIONS,
  ALL_ADMIN_PERMISSIONS,
  ContentStatus,
  Role,
} from '@mindbridge/shared-types';
import { Types } from 'mongoose';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fakeConfig } from '../../../test/helpers/fakes.js';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import { FieldEncryptionService } from '../../common/crypto/field-encryption.service.js';
import { generateTotpSecret, totpAt } from '../auth/totp.js';
import { AdminService } from './admin.service.js';

describe('PHASE 1: Target Role Model, Segregation of Duties & Maker-Checker', () => {
  let svc: AdminService;
  let usersModel: any;
  let promotionsModel: any;
  let policiesModel: any;
  let sessions: any;
  let audit: any;
  let notifications: any;
  let crypto: FieldEncryptionService;

  const superAdminAId = new Types.ObjectId().toString();
  const superAdminBId = new Types.ObjectId().toString();
  const operatorAdminId = new Types.ObjectId().toString();
  const targetPatientId = new Types.ObjectId().toString();

  const superAdminA: AuthenticatedUser = {
    id: superAdminAId,
    role: Role.ADMIN,
    status: AccountStatus.ACTIVE,
    emailVerified: true,
    adminRolePreset: AdminRolePreset.SUPER_ADMIN,
    adminPermissions: [...ALL_ADMIN_PERMISSIONS],
    sessionId: 'sess_super_a',
  };

  const superAdminB: AuthenticatedUser = {
    id: superAdminBId,
    role: Role.ADMIN,
    status: AccountStatus.ACTIVE,
    emailVerified: true,
    adminRolePreset: AdminRolePreset.SUPER_ADMIN,
    adminPermissions: [...ALL_ADMIN_PERMISSIONS],
    sessionId: 'sess_super_b',
  };

  const operatorAdmin: AuthenticatedUser = {
    id: operatorAdminId,
    role: Role.ADMIN,
    status: AccountStatus.ACTIVE,
    emailVerified: true,
    adminRolePreset: AdminRolePreset.OPERATOR,
    adminPermissions: [...ADMIN_ROLE_PRESET_PERMISSIONS.OPERATOR],
    sessionId: 'sess_operator',
  };

  const totpSecret = generateTotpSecret();

  beforeEach(() => {
    crypto = new FieldEncryptionService(fakeConfig({ FIELD_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64') }));
    sessions = { revokeAllForUser: vi.fn().mockResolvedValue(undefined) };
    audit = { record: vi.fn().mockResolvedValue(undefined) };
    notifications = { notify: vi.fn().mockResolvedValue(undefined) };

    const superAdminAUser = {
      _id: new Types.ObjectId(superAdminAId),
      role: Role.ADMIN,
      status: AccountStatus.ACTIVE,
      mfaEnabled: true,
      mfaSecretEnc: crypto.encrypt(totpSecret),
      adminRolePreset: AdminRolePreset.SUPER_ADMIN,
      adminPermissions: [...ALL_ADMIN_PERMISSIONS],
      save: vi.fn().mockResolvedValue(true),
    };

    const superAdminBUser = {
      _id: new Types.ObjectId(superAdminBId),
      role: Role.ADMIN,
      status: AccountStatus.ACTIVE,
      mfaEnabled: true,
      mfaSecretEnc: crypto.encrypt(totpSecret),
      adminRolePreset: AdminRolePreset.SUPER_ADMIN,
      adminPermissions: [...ALL_ADMIN_PERMISSIONS],
      save: vi.fn().mockResolvedValue(true),
    };

    const targetPatientUser = {
      _id: new Types.ObjectId(targetPatientId),
      role: Role.PATIENT,
      status: AccountStatus.ACTIVE,
      email: 'candidate@mindbridge.health',
      adminRolePreset: null,
      adminPermissions: [],
      save: vi.fn().mockResolvedValue(true),
    };

    usersModel = {
      findById: vi.fn((id: any) => {
        const idStr = id?.toString();
        if (idStr === superAdminAId) return { select: () => ({ lean: () => Promise.resolve(superAdminAUser) }), ...superAdminAUser };
        if (idStr === superAdminBId) return { select: () => ({ lean: () => Promise.resolve(superAdminBUser) }), ...superAdminBUser };
        if (idStr === targetPatientId) return targetPatientUser;
        return null;
      }),
      findOne: vi.fn((query: any) => {
        const idStr = query?._id?.toString();
        if (idStr === superAdminAId) return superAdminAUser;
        if (idStr === superAdminBId) return superAdminBUser;
        if (idStr === targetPatientId) return targetPatientUser;
        return null;
      }),
      find: vi.fn().mockReturnValue({ select: () => ({ lean: () => Promise.resolve([superAdminAUser, superAdminBUser]) }) }),
      updateOne: vi.fn().mockResolvedValue({ matchedCount: 1 }),
      countDocuments: vi.fn().mockResolvedValue(2),
    };

    const promotionStore: Record<string, any> = {};
    promotionsModel = {
      create: vi.fn((doc: any) => {
        const _id = new Types.ObjectId();
        const obj = { ...doc, _id, createdAt: new Date(), save: vi.fn().mockResolvedValue(true) };
        promotionStore[_id.toString()] = obj;
        return Promise.resolve(obj);
      }),
      findOne: vi.fn((q: any) => {
        const found = Object.values(promotionStore).find((p: any) => p.targetUserId.toString() === q.targetUserId?.toString() && p.status === q.status);
        return Promise.resolve(found ?? null);
      }),
      findById: vi.fn((id: any) => Promise.resolve(promotionStore[id.toString()] ?? null)),
      find: vi.fn().mockReturnValue({ sort: () => ({ lean: () => Promise.resolve(Object.values(promotionStore)) }) }),
    };

    policiesModel = {
      findById: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        type: 'TERMS',
        version: '1.0.0',
        status: ContentStatus.DRAFT,
        save: vi.fn().mockResolvedValue(true),
        toObject: () => ({ status: ContentStatus.PUBLISHED }),
      }),
    };

    svc = new AdminService(
      usersModel as any,
      {} as any, // doctors
      {} as any, // feedback
      policiesModel as any,
      {} as any, // safetyEvents
      {} as any, // supportTickets
      promotionsModel as any,
      fakeConfig({ ANALYTICS_MIN_GROUP_SIZE: 5 }),
      {} as any, // appointments
      {} as any, // verification
      {} as any, // aiChat
      {} as any, // ai
      {} as any, // crisis
      {} as any, // support
      {} as any, // jobs
      sessions as any,
      {} as any, // care
      audit as any,
      notifications as any,
      crypto as any,
    );
  });

  describe('1. Target Role Model & Presets', () => {
    it('contains all required permissions in AdminPermission', () => {
      expect(AdminPermission.MODERATION_REVIEW).toBe('moderation:review');
      expect(AdminPermission.INSIGHTS_READ).toBe('insights:read');
      expect(AdminPermission.ROLES_MANAGE).toBe('roles:manage');
      expect(AdminPermission.PUBLISH_MANAGE).toBe('publish:manage');
    });

    it('resolves named presets to exact permission contracts', () => {
      expect(ADMIN_ROLE_PRESET_PERMISSIONS[AdminRolePreset.SPECIALIST]).toEqual([
        AdminPermission.DOCTORS_VERIFY,
        AdminPermission.USERS_MANAGE,
        AdminPermission.AUDIT_READ,
      ]);

      expect(ADMIN_ROLE_PRESET_PERMISSIONS[AdminRolePreset.COMPLIANCE]).toEqual([
        AdminPermission.MODERATION_REVIEW,
        AdminPermission.USERS_MANAGE,
        AdminPermission.AUDIT_READ,
      ]);

      expect(ADMIN_ROLE_PRESET_PERMISSIONS[AdminRolePreset.COORDINATOR]).toEqual([
        AdminPermission.MODERATION_REVIEW,
        AdminPermission.SUPPORT_MANAGE,
      ]);

      expect(ADMIN_ROLE_PRESET_PERMISSIONS[AdminRolePreset.INVESTOR]).toEqual([
        AdminPermission.INSIGHTS_READ,
      ]);

      expect(ADMIN_ROLE_PRESET_PERMISSIONS[AdminRolePreset.OPERATOR]).toEqual([
        AdminPermission.SUPPORT_MANAGE,
        AdminPermission.SETTINGS_MANAGE,
        AdminPermission.CRISIS_MANAGE,
        AdminPermission.REPORTS_EXPORT,
      ]);

      expect(ADMIN_ROLE_PRESET_PERMISSIONS[AdminRolePreset.ADMIN]).not.toContain(AdminPermission.ROLES_MANAGE);
      expect(ADMIN_ROLE_PRESET_PERMISSIONS[AdminRolePreset.ADMIN]).not.toContain(AdminPermission.PUBLISH_MANAGE);

      expect(ADMIN_ROLE_PRESET_PERMISSIONS[AdminRolePreset.SUPER_ADMIN]).toEqual(ALL_ADMIN_PERMISSIONS);
    });
  });

  describe('2. Segregation of Duties & Self-Escalation Protection', () => {
    it('refuses self-action when modifying permissions and records security audit + alert', async () => {
      await expect(
        svc.setAdminPermissions(superAdminA, superAdminA.id, [AdminPermission.ROLES_MANAGE]),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.self_escalation_attempt',
          outcome: 'DENIED',
          resourceId: superAdminA.id,
        }),
      );
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'security.alert' }),
      );
    });

    it('refuses self-action when modifying preset and records security audit + alert', async () => {
      await expect(
        svc.setAdminRolePreset(superAdminA, superAdminA.id, AdminRolePreset.OPERATOR),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.self_escalation_attempt',
          outcome: 'DENIED',
          resourceId: superAdminA.id,
        }),
      );
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'security.alert' }),
      );
    });

    it('refuses granting unheld permissions by a non-super administrator', async () => {
      const targetUserId = new Types.ObjectId().toString();
      usersModel.findOne.mockResolvedValueOnce({
        _id: new Types.ObjectId(targetUserId),
        role: Role.ADMIN,
        adminPermissions: [],
        save: vi.fn().mockResolvedValue(true),
      });

      // Operator admin does not hold doctors:verify or roles:manage
      await expect(
        svc.setAdminPermissions(operatorAdmin, targetUserId, [AdminPermission.DOCTORS_VERIFY]),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.self_escalation_attempt',
          outcome: 'DENIED',
        }),
      );
    });
  });

  describe('3. Maker-Checker Admin Promotion Workflow', () => {
    it('refuses self-promotion proposal', async () => {
      await expect(
        svc.proposeAdminPromotion(superAdminA, {
          targetUserId: superAdminA.id,
          preset: AdminRolePreset.SUPER_ADMIN,
          rationale: 'Self escalation',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.self_escalation_attempt',
          outcome: 'DENIED',
        }),
      );
    });

    it('proposes admin promotion and target user remains in previous role until confirmed', async () => {
      const res = await svc.proposeAdminPromotion(superAdminA, {
        targetUserId: targetPatientId,
        preset: AdminRolePreset.SPECIALIST,
        rationale: 'Clinician onboarding verification team',
      });

      expect(res.status).toBe('PENDING');
      expect(res.targetUserId).toBe(targetPatientId);
      expect(res.preset).toBe(AdminRolePreset.SPECIALIST);

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.role_promotion_proposed',
          metadata: expect.objectContaining({ newPreset: AdminRolePreset.SPECIALIST }),
        }),
      );
      expect(notifications.notify).toHaveBeenCalled();

      // Target user remains PATIENT until confirmed
      const targetInDb = await usersModel.findById(targetPatientId);
      expect(targetInDb.role).toBe(Role.PATIENT);
    });

    it('prevents Maker from confirming own proposal (maker !== checker)', async () => {
      const proposed = await svc.proposeAdminPromotion(superAdminA, {
        targetUserId: targetPatientId,
        preset: AdminRolePreset.SPECIALIST,
        rationale: 'Promote clinician',
      });

      // SuperAdminA attempts to self-confirm their own proposal
      await expect(
        svc.confirmAdminPromotion(superAdminA, proposed.id),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.self_escalation_attempt',
          outcome: 'DENIED',
          metadata: expect.objectContaining({ reason: 'maker_cannot_be_checker' }),
        }),
      );
    });

    it('allows a SECOND Super Admin to confirm promotion and applies role + revokes sessions', async () => {
      const proposed = await svc.proposeAdminPromotion(superAdminA, {
        targetUserId: targetPatientId,
        preset: AdminRolePreset.SPECIALIST,
        rationale: 'Promote clinician reviewer',
      });

      const confirmRes = await svc.confirmAdminPromotion(superAdminB, proposed.id);
      expect(confirmRes.status).toBe('CONFIRMED');

      const targetInDb = await usersModel.findById(targetPatientId);
      expect(targetInDb.role).toBe(Role.ADMIN);
      expect(targetInDb.adminRolePreset).toBe(AdminRolePreset.SPECIALIST);
      expect(targetInDb.adminPermissions).toEqual(ADMIN_ROLE_PRESET_PERMISSIONS.SPECIALIST);

      expect(sessions.revokeAllForUser).toHaveBeenCalledWith(targetPatientId, 'admin_role_promoted');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.role_promotion_confirmed',
        }),
      );
    });
  });

  describe('4. Step-Up TOTP Verification', () => {
    it('requires X-TOTP-Code header when provided', async () => {
      await expect(
        svc.verifyStepUpTotp(superAdminA.id, ''),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects invalid TOTP code', async () => {
      await expect(
        svc.verifyStepUpTotp(superAdminA.id, '000000'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('accepts valid RFC 6238 TOTP code', async () => {
      const validCode = totpAt(totpSecret, Date.now());
      await expect(svc.verifyStepUpTotp(superAdminA.id, validCode)).resolves.not.toThrow();
    });
  });

  describe('5. Minimum Quorum for Production Publishing', () => {
    it('blocks publishPolicy when registered MFA Super Admin count is below 2', async () => {
      usersModel.countDocuments.mockResolvedValueOnce(1); // Only 1 Super Admin

      await expect(
        svc.publishPolicy(superAdminA, new Types.ObjectId().toString()),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows publishPolicy when minimum quorum of 2+ MFA Super Admins exists', async () => {
      usersModel.countDocuments.mockResolvedValueOnce(2); // 2 Super Admins

      const res = await svc.publishPolicy(superAdminA, new Types.ObjectId().toString());
      expect(res.status).toBe(ContentStatus.PUBLISHED);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'admin.policy_published' }),
      );
    });
  });
});
