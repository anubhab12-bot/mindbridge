import type { AccountStatus, AdminPermission, DoctorVerificationStatus, Role } from '@mindbridge/shared-types';

/**
 * The identity attached to a request after the access token is verified AND the user,
 * session and (for doctors) verification state are re-read from the database.
 * Nothing here comes from client-supplied fields.
 */
export interface AuthenticatedUser {
  id: string;
  role: Role;
  sessionId: string;
  status: AccountStatus;
  emailVerified: boolean;
  doctorStatus?: DoctorVerificationStatus;
  doctorProfileId?: string;
  adminPermissions: AdminPermission[];
}

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  sid: string;
}
