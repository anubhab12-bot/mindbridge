import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  AccountStatus,
  AdminPermission,
  AdminRolePreset,
  ADMIN_ROLE_PRESET_PERMISSIONS,
  ALL_ADMIN_PERMISSIONS,
  RiskLevel,
  Role,
  SafetyEventStatus,
} from '@mindbridge/shared-types';
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
  const superAdmin = { id: new Types.ObjectId().toString(), role: Role.ADMIN, adminRolePreset: AdminRolePreset.SUPER_ADMIN, adminPermissions: [...ALL_ADMIN_PERMISSIONS] } as AuthenticatedUser;

  function make(target: Record<string, unknown> | null, overrides: { safetyEvents?: any; supportTickets?: any } = {}) {
    const sessions = { revokeAllForUser: vi.fn() };
    const audit = { record: vi.fn() };
    const mockTargetUser = target ?? { _id: new Types.ObjectId(), role: Role.ADMIN, status: AccountStatus.ACTIVE, save: vi.fn().mockResolvedValue(true) };
    const usersModel = {
      findById: vi.fn().mockResolvedValue(mockTargetUser),
      findOne: vi.fn().mockResolvedValue(mockTargetUser),
      updateOne: vi.fn().mockResolvedValue({ matchedCount: 1 }),
      countDocuments: vi.fn().mockResolvedValue(2),
    };
    const svc = new AdminService(
      usersModel as never,
      { findOne: vi.fn(), find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }) } as never,
      { find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }) }) } as never,
      {} as never,
      overrides.safetyEvents ?? { find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }) } as never,
      overrides.supportTickets ?? { find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }) } as never,
      { findOne: vi.fn(), find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }), create: vi.fn(), findById: vi.fn() } as never,
      fakeConfig({ ANALYTICS_MIN_GROUP_SIZE: 5 }),
      { cancelAllFutureForDoctor: vi.fn() } as never,
      {} as never,
      {} as never,
      {} as never,
      { adminList: vi.fn().mockResolvedValue({ items: [] }) } as never,
      {} as never,
      {} as never,
      sessions as never,
      {} as never,
      audit as never,
    );
    return { svc, sessions, audit, usersModel };
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

  describe('Phase 1: Admin role presets', () => {
    it('refuses self-action when assigning role preset', async () => {
      const { svc } = make(null);
      await expect(svc.setAdminRolePreset(admin, admin.id, AdminRolePreset.CLINICIAN_ON_CALL)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('assigns named preset and grants matching bundle of permissions', async () => {
      const targetUserId = new Types.ObjectId().toString();
      const { svc, sessions, audit, usersModel } = make(null);
      const res = await svc.setAdminRolePreset(superAdmin, targetUserId, AdminRolePreset.CLINICIAN_ON_CALL);
      expect(res.preset).toBe(AdminRolePreset.CLINICIAN_ON_CALL);
      expect(res.permissions).toEqual(ADMIN_ROLE_PRESET_PERMISSIONS.CLINICIAN_ON_CALL);
      expect(usersModel.updateOne).toHaveBeenCalledWith(
        { _id: new Types.ObjectId(targetUserId), role: Role.ADMIN },
        { $set: { adminRolePreset: AdminRolePreset.CLINICIAN_ON_CALL, adminPermissions: [...ADMIN_ROLE_PRESET_PERMISSIONS.CLINICIAN_ON_CALL] } },
      );
      expect(sessions.revokeAllForUser).toHaveBeenCalledWith(targetUserId, 'preset_assigned');
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
        action: 'admin.preset_assigned',
        resourceType: 'User',
        resourceId: targetUserId,
      }));
    });
  });

  describe('Phase 2: /admin/worklist prioritized worklist', () => {
    it('sorts strictly by potential harm (CRITICAL > HIGH > MEDIUM > LOW)', async () => {
      const safetyEventsMock = {
        find: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([
              {
                _id: new Types.ObjectId(),
                riskLevel: RiskLevel.HIGH,
                status: SafetyEventStatus.UNACKNOWLEDGED,
                signals: ['self_harm_keyword'],
                source: 'local_fallback',
                createdAt: new Date(Date.now() - 10 * 60000),
              },
              {
                _id: new Types.ObjectId(),
                riskLevel: RiskLevel.IMMINENT,
                status: SafetyEventStatus.UNACKNOWLEDGED,
                signals: ['crisis_plan'],
                source: 'ai_service',
                createdAt: new Date(Date.now() - 5 * 60000),
              },
            ]),
          }),
        }),
      };
      const { svc } = make(null, { safetyEvents: safetyEventsMock });
      const worklist = await svc.getWorklist();
      expect(worklist.length).toBe(2);
      expect(worklist[0]!.severity).toBe('CRITICAL');
      expect(worklist[0]!.primaryAction.url).toContain('/admin/safety-triage');
      expect(worklist[1]!.severity).toBe('HIGH');
    });
  });

  describe('Phase 3: Safety triage board', () => {
    it('acknowledging an event assigns it to the acting admin and audits', async () => {
      const evId = new Types.ObjectId();
      const mockEvent = {
        _id: evId,
        riskLevel: RiskLevel.IMMINENT,
        signals: ['crisis_phrase'],
        status: SafetyEventStatus.UNACKNOWLEDGED,
        assigneeUserId: null,
        acknowledgedAt: null,
        save: vi.fn().mockResolvedValue(true),
      };
      const safetyEventsMock = {
        findById: vi.fn().mockResolvedValue(mockEvent),
      };
      const { svc, audit } = make(null, { safetyEvents: safetyEventsMock });
      const res = await svc.acknowledgeSafetyEvent(admin, evId.toString());
      expect(res.status).toBe(SafetyEventStatus.ASSIGNED);
      expect(res.assigneeUserId).toBe(admin.id);
      expect(mockEvent.save).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
        action: 'safety_event.acknowledged',
        resourceType: 'SafetyEvent',
        resourceId: evId.toString(),
      }));
    });

    it('resolving a safety event requires an outcomeReasonCode', async () => {
      const evId = new Types.ObjectId();
      const mockEvent = {
        _id: evId,
        status: SafetyEventStatus.ASSIGNED,
        save: vi.fn().mockResolvedValue(true),
      };
      const safetyEventsMock = {
        findById: vi.fn().mockResolvedValue(mockEvent),
      };
      const { svc } = make(null, { safetyEvents: safetyEventsMock });
      await expect(
        svc.patchSafetyEvent(admin, evId.toString(), { action: 'resolve', outcomeReasonCode: '' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('resolving writes reason and audit trail', async () => {
      const evId = new Types.ObjectId();
      const mockEvent = {
        _id: evId,
        status: SafetyEventStatus.ASSIGNED,
        resolvedAt: null,
        outcomeReasonCode: null,
        notes: null,
        save: vi.fn().mockResolvedValue(true),
      };
      const safetyEventsMock = {
        findById: vi.fn().mockResolvedValue(mockEvent),
      };
      const { svc, audit } = make(null, { safetyEvents: safetyEventsMock });
      const res = await svc.patchSafetyEvent(admin, evId.toString(), {
        action: 'resolve',
        outcomeReasonCode: 'PATIENT_ENGAGED_CARE_TEAM',
        notes: 'Contacted via Tele-MANAS hotline',
      });
      expect(res.status).toBe(SafetyEventStatus.RESOLVED);
      expect(res.outcomeReasonCode).toBe('PATIENT_ENGAGED_CARE_TEAM');
      expect(mockEvent.save).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
        action: 'safety_event.resolve',
        resourceType: 'SafetyEvent',
        resourceId: evId.toString(),
      }));
    });
  });
});
