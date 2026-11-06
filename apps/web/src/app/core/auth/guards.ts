import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AdminPermission, DoctorVerificationStatus, Role } from '@mindbridge/shared-types';
import { AuthService } from './auth.service';

/**
 * UX-only guards. Client guards are UX only; the API is the authority so it is never mistaken for the control.
 * These client guards keep users on the appropriate views, while the backend API strictly enforces authorization.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() ? inject(Router).parseUrl(auth.homeFor()) : true;
};

export const roleGuard =
  (...roles: Role[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const user = auth.user();
    if (user && (roles.includes(user.role) || (user.role === Role.ADMIN && roles.includes(Role.PATIENT)))) return true;
    return inject(Router).parseUrl(auth.homeFor());
  };

export const verifiedDoctorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const user = auth.user();
  if (user?.role === Role.DOCTOR && user.doctorVerificationStatus === DoctorVerificationStatus.APPROVED) return true;
  return inject(Router).parseUrl(user?.role === Role.DOCTOR ? '/doctor/verification-pending' : auth.homeFor());
};

export const adminPermissionGuard =
  (permission: AdminPermission): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    if (auth.user()?.adminPermissions?.includes(permission)) return true;
    return inject(Router).parseUrl('/admin');
  };
