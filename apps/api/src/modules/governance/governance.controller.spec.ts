import { type ExecutionContext, ForbiddenException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminPermission, DoctorVerificationStatus, Role } from '@mindbridge/shared-types';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user.js';
import {
  ADMIN_PERMISSIONS_KEY,
  IS_PUBLIC_KEY,
  ROLES_KEY,
} from '../../common/auth/decorators.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { GovernanceController } from './governance.controller.js';
import { GovernanceService } from './governance.service.js';
import { generateTotpSecret, totpAt } from '../auth/totp.js';

function makeContext(handler: Function, req: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => GovernanceController,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

const makeAdminUser = (perms: AdminPermission[] = []): AuthenticatedUser => ({
  id: '65f000000000000000000001',
  role: Role.ADMIN,
  sessionId: 'sess_1',
  status: 'ACTIVE',
  emailVerified: true,
  adminPermissions: perms,
});

const makePatientUser = (): AuthenticatedUser => ({
  id: '65f000000000000000000002',
  role: Role.PATIENT,
  sessionId: 'sess_2',
  status: 'ACTIVE',
  emailVerified: true,
  adminPermissions: [],
});

describe('PHASE 0: GovernanceController Authorization & Route Lockdown', () => {
  const reflector = new Reflector();
  const mockAudit = { record: vi.fn().mockResolvedValue(undefined) };
  const rolesGuard = new RolesGuard(reflector, mockAudit as any);

  // Mock JwtAuthGuard for verifying 401 unauthenticated behavior
  const mockJwtGuard = {
    canActivate: (ctx: ExecutionContext) => {
      const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
      const req = ctx.switchToHttp().getRequest();
      const auth = req.headers?.authorization;
      if (!auth) {
        if (isPublic) return true;
        throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Please sign in.' });
      }
      return true;
    },
  };

  const mockService = {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    getPolicy: vi.fn(),
    updatePolicies: vi.fn(),
    applyForCouncil: vi.fn(),
    listApplications: vi.fn(),
    reviewApplication: vi.fn(),
    listTasks: vi.fn(),
    generateAiTasks: vi.fn(),
    submitProof: vi.fn(),
    verifyProof: vi.fn(),
    getCouncilStats: vi.fn(),
    planFeatureWithAi: vi.fn(),
    publishDynamicFeature: vi.fn(),
    toggleDynamicFeature: vi.fn(),
    deleteDynamicFeature: vi.fn(),
    listDoctors: vi.fn(),
    approveDoctor: vi.fn(),
    purgeDemoData: vi.fn(),
  } as unknown as GovernanceService;

  const controller = new GovernanceController(mockService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Public vs Protected route classification', () => {
    it('GET /settings is public for client bootstrapping', () => {
      const handler = controller.getSettings;
      const isPublic = reflector.get<boolean>(IS_PUBLIC_KEY, handler);
      expect(isPublic).toBe(true);

      const ctxNoToken = makeContext(handler, { headers: {} });
      expect(mockJwtGuard.canActivate(ctxNoToken)).toBe(true);
    });

    it('GET /policies/:type is public for legal text viewing', () => {
      const handler = controller.getPolicy;
      const isPublic = reflector.get<boolean>(IS_PUBLIC_KEY, handler);
      expect(isPublic).toBe(true);

      const ctxNoToken = makeContext(handler, { headers: {} });
      expect(mockJwtGuard.canActivate(ctxNoToken)).toBe(true);
    });

    it('GET /stats is public with small-group suppression', () => {
      const handler = controller.getStats;
      const isPublic = reflector.get<boolean>(IS_PUBLIC_KEY, handler);
      expect(isPublic).toBe(true);

      const ctxNoToken = makeContext(handler, { headers: {} });
      expect(mockJwtGuard.canActivate(ctxNoToken)).toBe(true);
    });

    it('POST /apply is public for external candidate submissions', () => {
      const handler = controller.applyForCouncil;
      const isPublic = reflector.get<boolean>(IS_PUBLIC_KEY, handler);
      expect(isPublic).toBe(true);

      const ctxNoToken = makeContext(handler, { headers: {} });
      expect(mockJwtGuard.canActivate(ctxNoToken)).toBe(true);
    });
  });

  // Test suite covering every administrative route
  const adminRouteMatrix = [
    {
      name: 'PUT /governance/settings',
      handler: controller.updateSettings,
      requiredPermission: AdminPermission.PUBLISH_MANAGE,
    },
    {
      name: 'PUT /governance/policies',
      handler: controller.updatePolicies,
      requiredPermission: AdminPermission.PUBLISH_MANAGE,
    },
    {
      name: 'GET /governance/applications',
      handler: controller.listApplications,
      requiredPermission: AdminPermission.MODERATION_REVIEW,
    },
    {
      name: 'POST /governance/applications/:id/decision',
      handler: controller.reviewApplication,
      requiredPermission: AdminPermission.MODERATION_REVIEW,
    },
    {
      name: 'GET /governance/doctors',
      handler: controller.listDoctors,
      requiredPermission: AdminPermission.DOCTORS_VERIFY,
    },
    {
      name: 'POST /governance/doctors/:id/approve',
      handler: controller.approveDoctor,
      requiredPermission: AdminPermission.DOCTORS_VERIFY,
    },
    {
      name: 'GET /governance/tasks',
      handler: controller.listTasks,
      requiredPermission: AdminPermission.SECURITY_MANAGE,
    },
    {
      name: 'POST /governance/tasks/generate-ai',
      handler: controller.generateAiTasks,
      requiredPermission: AdminPermission.SECURITY_MANAGE,
    },
    {
      name: 'POST /governance/tasks/:id/submit-proof',
      handler: controller.submitProof,
      requiredPermission: AdminPermission.SECURITY_MANAGE,
    },
    {
      name: 'POST /governance/tasks/:id/verify-proof',
      handler: controller.verifyProof,
      requiredPermission: AdminPermission.MODERATION_REVIEW,
    },
    {
      name: 'POST /governance/features/ai-plan',
      handler: controller.planFeatureWithAi,
      requiredPermission: AdminPermission.SECURITY_MANAGE,
    },
    {
      name: 'POST /governance/features/publish',
      handler: controller.publishDynamicFeature,
      requiredPermission: AdminPermission.PUBLISH_MANAGE,
    },
    {
      name: 'PATCH /governance/features/:id/toggle',
      handler: controller.toggleDynamicFeature,
      requiredPermission: AdminPermission.SECURITY_MANAGE,
    },
    {
      name: 'DELETE /governance/features/:id',
      handler: controller.deleteDynamicFeature,
      requiredPermission: AdminPermission.SECURITY_MANAGE,
    },
    {
      name: 'POST /governance/purge-demo-data',
      handler: controller.purgeDemoData,
      requiredPermission: AdminPermission.SECURITY_MANAGE,
    },
  ];

  describe.each(adminRouteMatrix)('Lockdown assertion: $name', ({ name, handler, requiredPermission }) => {
    it(`asserts 401 without token for ${name}`, () => {
      const isPublic = reflector.get<boolean>(IS_PUBLIC_KEY, handler);
      expect(isPublic).toBeUndefined();

      const ctxNoToken = makeContext(handler, { headers: {} });
      expect(() => mockJwtGuard.canActivate(ctxNoToken)).toThrow(UnauthorizedException);
    });

    it(`asserts 403 for non-admin patient role for ${name}`, async () => {
      const ctxPatient = makeContext(handler, { headers: { authorization: 'Bearer valid_jwt' }, user: makePatientUser() });
      await expect(rolesGuard.canActivate(ctxPatient)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it(`asserts 403 for admin lacking ${requiredPermission} for ${name}`, async () => {
      // Admin with empty permissions or different permission
      const otherPerm = requiredPermission === AdminPermission.SETTINGS_MANAGE
        ? AdminPermission.AUDIT_READ
        : AdminPermission.SETTINGS_MANAGE;
      const ctxLackingPerm = makeContext(handler, {
        headers: { authorization: 'Bearer valid_jwt' },
        user: makeAdminUser([otherPerm]),
      });
      await expect(rolesGuard.canActivate(ctxLackingPerm)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it(`asserts 200 allowed for admin possessing ${requiredPermission} for ${name}`, async () => {
      const ctxWithPerm = makeContext(handler, {
        headers: { authorization: 'Bearer valid_jwt' },
        user: makeAdminUser([requiredPermission]),
      });
      expect(await rolesGuard.canActivate(ctxWithPerm)).toBe(true);
    });
  });
});

describe('PHASE 0: Doctor Verification Strict Evidence Requirements', () => {
  let service: GovernanceService;
  const mockDoctorModel = {
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    deleteMany: vi.fn(),
  };
  const mockUserModel = {
    find: vi.fn(),
    findById: vi.fn(),
    deleteMany: vi.fn(),
  };
  const mockSettingsModel = {
    findOne: vi.fn(),
    create: vi.fn(),
    updateOne: vi.fn(),
  };
  const mockAppModel = {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  };
  const mockTaskModel = {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  };
  const mockAudit = { record: vi.fn().mockResolvedValue(undefined) };
  const mockCrypto = {
    encrypt: vi.fn((s: string) => `enc_${s}`),
    decrypt: vi.fn((s: string) => s.replace('enc_', '')),
  };
  const mockAiScreener = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService(
      mockAppModel as any,
      mockTaskModel as any,
      mockSettingsModel as any,
      mockUserModel as any,
      mockDoctorModel as any,
      mockAiScreener,
      mockAudit as any,
      mockCrypto as any,
    );
  });

  it('REFUSES approval when externalRegisterChecked is false or missing', async () => {
    const admin = makeAdminUser([AdminPermission.DOCTORS_VERIFY]);
    await expect(
      service.approveDoctor('doc_123', {
        evidenceNote: 'Verified with state council',
        externalRegisterChecked: false,
      }, admin),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'EVIDENCE_REQUIRED' }),
    });
    expect(mockDoctorModel.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(mockAudit.record).not.toHaveBeenCalled();
  });

  it('REFUSES approval when evidenceNote is empty or missing', async () => {
    const admin = makeAdminUser([AdminPermission.DOCTORS_VERIFY]);
    await expect(
      service.approveDoctor('doc_123', {
        evidenceNote: '   ',
        externalRegisterChecked: true,
      }, admin),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'EVIDENCE_REQUIRED' }),
    });
    expect(mockDoctorModel.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(mockAudit.record).not.toHaveBeenCalled();
  });

  it('approves doctor and audits evidence when both note and register check are supplied', async () => {
    const admin = makeAdminUser([AdminPermission.DOCTORS_VERIFY]);
    mockDoctorModel.findByIdAndUpdate.mockResolvedValue({
      _id: 'doc_123',
      registrationNumber: 'MED-99481',
      registrationCouncil: 'Karnataka Medical Council',
      verificationStatus: DoctorVerificationStatus.APPROVED,
    });

    const result = await service.approveDoctor('doc_123', {
      evidenceNote: 'Inspected registration MED-99481 against official KMC register; matches Dr. John Doe active license.',
      externalRegisterChecked: true,
    }, admin);

    expect(mockDoctorModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'doc_123',
      expect.objectContaining({
        $set: expect.objectContaining({
          verificationStatus: DoctorVerificationStatus.APPROVED,
        }),
      }),
      { new: true },
    );
    expect(result.verificationStatus).toBe(DoctorVerificationStatus.APPROVED);
    expect(mockAudit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'doctor.verified',
      actorId: admin.id,
      outcome: 'SUCCESS',
      metadata: expect.objectContaining({
        externalRegisterChecked: true,
        evidenceNote: expect.stringContaining('Inspected registration MED-99481'),
        registrationNumber: 'MED-99481',
      }),
    }));
  });
});

describe('PHASE 0: Policy Writes Audit Trail', () => {
  let service: GovernanceService;
  const mockSettingsModel = {
    findOne: vi.fn(),
  };
  const mockAudit = { record: vi.fn().mockResolvedValue(undefined) };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService(
      {} as any,
      {} as any,
      mockSettingsModel as any,
      {} as any,
      {} as any,
      {} as any,
      mockAudit as any,
      {} as any,
    );
  });

  it('persists old text, new text, and actor into audit log for policy updates', async () => {
    const admin = makeAdminUser([AdminPermission.SETTINGS_MANAGE]);
    const mockSave = vi.fn().mockResolvedValue(undefined);
    mockSettingsModel.findOne.mockResolvedValue({
      policies: {
        terms: 'Old terms of service text v1.0',
        privacy: 'Old privacy policy text v1.0',
        ai: 'Old AI disclaimer text v1.0',
      },
      save: mockSave,
    });

    await service.updatePolicies({
      terms: 'New updated clinical terms of service v2.0',
    }, admin);

    expect(mockSave).toHaveBeenCalled();
    expect(mockAudit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'governance.policy_updated',
      actorId: admin.id,
      actorRole: Role.ADMIN,
      resourceType: 'policy',
      resourceId: 'terms',
      metadata: expect.objectContaining({
        policyType: 'terms',
        oldText: 'Old terms of service text v1.0',
        newText: 'New updated clinical terms of service v2.0',
      }),
    }));
  });
});

describe('PHASE 0: Destructive Actions Require Fresh TOTP', () => {
  let service: GovernanceService;
  const mockUserModel = {
    findById: vi.fn(),
    find: vi.fn(),
    deleteMany: vi.fn(),
  };
  const mockDoctorModel = {
    deleteMany: vi.fn(),
  };
  const mockSettingsModel = {
    findOne: vi.fn(),
  };
  const mockAudit = { record: vi.fn().mockResolvedValue(undefined) };
  const mockCrypto = {
    encrypt: vi.fn((s: string) => `enc_${s}`),
    decrypt: vi.fn((s: string) => s.replace('enc_', '')),
  };

  const totpSecret = generateTotpSecret();

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService(
      {} as any,
      {} as any,
      mockSettingsModel as any,
      mockUserModel as any,
      mockDoctorModel as any,
      {} as any,
      mockAudit as any,
      mockCrypto as any,
    );
  });

  it('rejects deleteDynamicFeature when no TOTP code is provided', async () => {
    const admin = makeAdminUser([AdminPermission.SECURITY_MANAGE]);
    await expect(service.deleteDynamicFeature('feat_1', admin)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'TOTP_REQUIRED' }),
    });
  });

  it('rejects purgeDemoData when invalid TOTP code is provided', async () => {
    const admin = makeAdminUser([AdminPermission.SECURITY_MANAGE]);
    mockUserModel.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: admin.id,
        mfaEnabled: true,
        mfaSecretEnc: `enc_${totpSecret}`,
      }),
    });

    await expect(service.purgeDemoData(admin, '000000')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'TOTP_INVALID' }),
    });
  });

  it('executes deleteDynamicFeature when valid TOTP code is provided', async () => {
    const admin = makeAdminUser([AdminPermission.SECURITY_MANAGE]);
    const validCode = totpAt(totpSecret, Date.now());

    mockUserModel.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: admin.id,
        mfaEnabled: true,
        mfaSecretEnc: `enc_${totpSecret}`,
      }),
    });

    const mockSave = vi.fn().mockResolvedValue(undefined);
    mockSettingsModel.findOne.mockResolvedValue({
      dynamicFeatures: [{ id: 'feat_1', title: 'Feature 1' }],
      save: mockSave,
    });

    const res = await service.deleteDynamicFeature('feat_1', admin, validCode);
    expect(res.success).toBe(true);
    expect(mockSave).toHaveBeenCalled();
    expect(mockAudit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'governance.feature_deleted',
      actorId: admin.id,
      resourceId: 'feat_1',
    }));
  });

  it('executes purgeDemoData when valid TOTP code is provided and does NOT auto-verify doctors', async () => {
    const admin = makeAdminUser([AdminPermission.SECURITY_MANAGE]);
    const validCode = totpAt(totpSecret, Date.now());

    mockUserModel.findById.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: admin.id,
        mfaEnabled: true,
        mfaSecretEnc: `enc_${totpSecret}`,
      }),
    });

    mockUserModel.find.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ _id: 'demo_user_1' }]),
      }),
    });
    mockDoctorModel.deleteMany.mockResolvedValue({ deletedCount: 1 });
    mockUserModel.deleteMany.mockResolvedValue({ deletedCount: 1 });

    const res = await service.purgeDemoData(admin, validCode);
    expect(res.success).toBe(true);
    expect(mockDoctorModel.deleteMany).toHaveBeenCalled();
    expect(mockAudit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'governance.demo_purged',
      actorId: admin.id,
    }));
  });
});

describe('PHASE 0: Statistics Endpoint Small-Group Suppression', () => {
  let service: GovernanceService;
  const mockAppModel = {
    countDocuments: vi.fn(),
  };
  const mockUserModel = {
    countDocuments: vi.fn(),
  };
  const mockSettingsModel = {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ totalCouncilSeats: 12 }),
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GovernanceService(
      mockAppModel as any,
      {} as any,
      mockSettingsModel as any,
      mockUserModel as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('suppresses counts between 1 and 4 (small-group suppression) and does not emit fake recovery rates', async () => {
    // 3 active patients (less than 5 -> should be suppressed)
    // 40 registered users (>= 5 -> unsuppressed)
    mockAppModel.countDocuments.mockImplementation((filter?: any) => {
      if (filter?.status === 'APPROVED') return Promise.resolve(2); // suppressed
      if (filter?.status === 'PENDING_REVIEW') return Promise.resolve(0); // 0 is not suppressed
      return Promise.resolve(10);
    });
    mockUserModel.countDocuments.mockImplementation((filter?: any) => {
      if (filter?.role === Role.PATIENT) return Promise.resolve(3); // suppressed
      if (filter?.role === Role.DOCTOR) return Promise.resolve(12); // unsuppressed
      return Promise.resolve(45); // total users
    });

    const stats = await service.getCouncilStats();

    expect(stats.dataSource).toBe('AGGREGATED_SUPPRESSED_TELEMETRY');
    // Suppressed: count is null, suppressed is true
    expect(stats.liveDatabaseMetrics.activePatients).toEqual({ count: null, suppressed: true });
    expect(stats.applications.approved).toEqual({ count: null, suppressed: true });
    // Zero count: not suppressed
    expect(stats.applications.pending).toEqual({ count: 0, suppressed: false });
    // Unsuppressed: >= 5
    expect(stats.liveDatabaseMetrics.registeredUsers).toEqual({ count: 45, suppressed: false });
    expect(stats.liveDatabaseMetrics.verifiedDoctors).toEqual({ count: 12, suppressed: false });

    // No fabricated populationMetrics claims
    expect((stats as any).populationMetrics).toBeUndefined();
  });
});
