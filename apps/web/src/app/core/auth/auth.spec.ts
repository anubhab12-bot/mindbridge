import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { type ActivatedRouteSnapshot, provideRouter, type RouterStateSnapshot, UrlTree } from '@angular/router';
import { type AuthUser, DoctorVerificationStatus, Role } from '@mindbridge/shared-types';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService, CSRF_HEADER } from './auth.service';
import { authGuard, roleGuard, verifiedDoctorGuard } from './guards';

const user = (over: Partial<AuthUser> = {}): AuthUser => ({
  id: 'u1', email: 'a@example.test', displayName: 'A', role: Role.PATIENT, status: 'ACTIVE', emailVerified: true, mfaEnabled: false, timezone: 'UTC', ...over,
});

describe('auth', () => {
  let http: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => http.verify());

  const run = (guard: unknown, url = '/x') =>
    TestBed.runInInjectionContext(() =>
      (guard as (r: ActivatedRouteSnapshot, s: RouterStateSnapshot) => unknown)({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

  it('authGuard sends signed-out users to login with a return URL', () => {
    const res = run(authGuard, '/patient/mood') as UrlTree;
    expect(res).toBeInstanceOf(UrlTree);
    expect(res.toString()).toBe('/login?returnUrl=%2Fpatient%2Fmood');
  });

  it('roleGuard redirects other roles to their own home', () => {
    auth.user.set(user({ role: Role.DOCTOR, doctorVerificationStatus: DoctorVerificationStatus.APPROVED }));
    expect((run(roleGuard(Role.ADMIN)) as UrlTree).toString()).toBe('/doctor/dashboard');
    expect(run(roleGuard(Role.DOCTOR))).toBe(true);
  });

  it('verifiedDoctorGuard keeps unverified professionals on the pending page', () => {
    auth.user.set(user({ role: Role.DOCTOR, doctorVerificationStatus: DoctorVerificationStatus.PENDING_VERIFICATION }));
    expect((run(verifiedDoctorGuard) as UrlTree).toString()).toBe('/doctor/verification-pending');
  });

  it('refresh sends the CSRF header with credentials and keeps the token in memory only', async () => {
    const p = auth.refresh();
    const req = http.expectOne('/api/v1/auth/refresh');
    expect(req.request.headers.get(CSRF_HEADER)).toBe('1');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ data: { accessToken: 'tok', expiresIn: 900, user: user() } });
    expect(await p).toBe(true);
    expect(auth.token).toBe('tok');
    expect(localStorage.getItem('tok')).toBeNull();
    expect(JSON.stringify({ ...localStorage })).not.toContain('tok');
  });

  it('interceptor refreshes once on 401 and retries with the new token', async () => {
    auth.user.set(user());
    (auth as unknown as { accessToken: string }).accessToken = 'old';
    const client = TestBed.inject(HttpClient);
    const result = firstValueFrom(client.get('/api/v1/patients/mood-entries'));

    const first = http.expectOne('/api/v1/patients/mood-entries');
    expect(first.request.headers.get('Authorization')).toBe('Bearer old');
    first.flush({}, { status: 401, statusText: 'Unauthorized' });

    http.expectOne('/api/v1/auth/refresh').flush({ data: { accessToken: 'new', expiresIn: 900, user: user() } });
    await new Promise((r) => setTimeout(r, 0));
    const retry = http.expectOne('/api/v1/patients/mood-entries');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new');
    retry.flush({ data: [] });
    expect(await result).toEqual({ data: [] });
  });

  it('does not attach tokens to non-API requests', () => {
    (auth as unknown as { accessToken: string }).accessToken = 'secret';
    TestBed.inject(HttpClient).get('https://example.org/x').subscribe();
    expect(http.expectOne('https://example.org/x').request.headers.has('Authorization')).toBe(false);
  });
});
