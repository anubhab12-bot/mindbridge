import { createParamDecorator, type ExecutionContext, SetMetadata, UnauthorizedException } from '@nestjs/common';
import type { AdminPermission, Role } from '@mindbridge/shared-types';
import type { AuthenticatedUser } from './authenticated-user.js';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
export const REQUIRE_VERIFIED_DOCTOR_KEY = 'requireVerifiedDoctor';
export const REQUIRE_EMAIL_VERIFIED_KEY = 'requireEmailVerified';
export const ADMIN_PERMISSIONS_KEY = 'adminPermissions';

/** Opt a route out of authentication. Every other route requires a valid access token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Restrict a route to the given roles (checked server-side by RolesGuard). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Doctor routes that touch patients or consultations require an APPROVED professional. */
export const RequireVerifiedDoctor = () => SetMetadata(REQUIRE_VERIFIED_DOCTOR_KEY, true);

/** Features that need a confirmed email address (booking, AI chat, messaging). */
export const RequireEmailVerified = () => SetMetadata(REQUIRE_EMAIL_VERIFIED_KEY, true);

/** Admin routes additionally require specific permissions. */
export const RequireAdminPermissions = (...perms: AdminPermission[]) => SetMetadata(ADMIN_PERMISSIONS_KEY, perms);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const req = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
  if (!req.user) throw new UnauthorizedException();
  return req.user;
});
