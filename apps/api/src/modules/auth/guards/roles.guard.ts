import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type AdminPermission, DoctorVerificationStatus, type Role } from '@mindbridge/shared-types';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../../common/auth/authenticated-user.js';
import {
  ADMIN_PERMISSIONS_KEY,
  IS_PUBLIC_KEY,
  REQUIRE_EMAIL_VERIFIED_KEY,
  REQUIRE_VERIFIED_DOCTOR_KEY,
  ROLES_KEY,
} from '../../../common/auth/decorators.js';
import { AuditService } from '../../audit/audit.service.js';

/**
 * Global authorization guard (runs after JwtAuthGuard). Enforces @Roles, @RequireVerifiedDoctor,
 * @RequireEmailVerified and @RequireAdminPermissions. Every authenticated route must declare
 * @Roles; a route that forgets is denied by default rather than left open.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser; id?: string }>();
    const user = req.user;
    if (!user) return false;

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets);
    if (!roles || roles.length === 0) {
      return this.deny(req, user, 'route_has_no_roles');
    }
    if (!roles.includes(user.role)) return this.deny(req, user, 'role');

    const needsVerifiedDoctor = this.reflector.getAllAndOverride<boolean>(REQUIRE_VERIFIED_DOCTOR_KEY, targets);
    if (needsVerifiedDoctor && user.role === 'DOCTOR' && user.doctorStatus !== DoctorVerificationStatus.APPROVED) {
      return this.deny(req, user, 'doctor_not_verified', 'DOCTOR_NOT_VERIFIED',
        'This feature becomes available once your professional verification is approved.');
    }

    const needsEmail = this.reflector.getAllAndOverride<boolean>(REQUIRE_EMAIL_VERIFIED_KEY, targets);
    if (needsEmail && !user.emailVerified) {
      return this.deny(req, user, 'email_not_verified', 'EMAIL_NOT_VERIFIED',
        'Please confirm your email address to use this feature.');
    }

    const perms = this.reflector.getAllAndOverride<AdminPermission[] | undefined>(ADMIN_PERMISSIONS_KEY, targets);
    if (perms?.length && user.role === 'ADMIN' && !perms.every((p) => user.adminPermissions.includes(p))) {
      return this.deny(req, user, 'admin_permission');
    }
    return true;
  }

  private async deny(
    req: Request & { id?: string },
    user: AuthenticatedUser,
    reason: string,
    code = 'FORBIDDEN',
    message = 'You do not have access to this.',
  ): Promise<never> {
    await this.audit.record({
      actorId: user.id,
      actorRole: user.role,
      action: 'authz.denied',
      outcome: 'DENIED',
      requestId: req.id,
      metadata: { reason, method: req.method, route: req.route?.path },
    });
    throw new ForbiddenException({ code, message });
  }
}
