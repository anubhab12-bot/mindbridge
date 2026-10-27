import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AdminPermission, DoctorVerificationStatus, Role } from '@mindbridge/shared-types';
import { AuthService } from './auth.service';

/** UX-only guards. The API enforces every rule again; these just keep people on the right pages. */
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
    if (user && roles.includes(user.role)) return true;
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
