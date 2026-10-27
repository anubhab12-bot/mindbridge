import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  type AuthTokenResponse,
  type AuthUser,
  DoctorVerificationStatus,
  type MfaChallengeResponse,
  Role,
} from '@mindbridge/shared-types';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../api/api-error';
import { API_BASE } from '../api/api.service';

export const CSRF_HEADER = 'x-mindbridge-csrf';

export type LoginResult = { status: 'ok'; user: AuthUser } | { status: 'mfa'; mfaToken: string };

/**
 * Session state. The access token lives only in memory (never localStorage); the refresh
 * token is an HttpOnly, SameSite=Strict cookie the browser sends to /api/v1/auth only.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  // A raw client (no interceptors) so refresh calls cannot recurse through the auth interceptor.
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly router = inject(Router);
  private accessToken: string | null = null;
  private refreshing: Promise<boolean> | null = null;

  readonly user = signal<AuthUser | null>(null);
  readonly initialised = signal(false);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly role = computed(() => this.user()?.role ?? null);

  get token(): string | null {
    return this.accessToken;
  }

  private cookieOptions() {
    return { withCredentials: true, headers: new HttpHeaders({ [CSRF_HEADER]: '1' }) };
  }

  private accept(res: AuthTokenResponse) {
    this.accessToken = res.accessToken;
    this.user.set(res.user);
    return res.user;
  }

  /** Called once at start-up: restores the session from the refresh cookie if there is one. */
  async init(): Promise<void> {
    await this.refresh();
    this.initialised.set(true);
  }

  /** Single-flight refresh. Resolves false (and clears state) when the session has ended. */
  refresh(): Promise<boolean> {
    this.refreshing ??= (async () => {
      try {
        const res = await firstValueFrom(
          this.http.post<{ data: AuthTokenResponse }>(`${API_BASE}/auth/refresh`, {}, this.cookieOptions()),
        );
        this.accept(res.data);
        return true;
      } catch {
        this.clear();
        return false;
      } finally {
        this.refreshing = null;
      }
    })();
    return this.refreshing;
  }

  async login(email: string, password: string): Promise<LoginResult> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ data: AuthTokenResponse | MfaChallengeResponse }>(`${API_BASE}/auth/login`, { email, password }, { withCredentials: true }),
      );
      if ('mfaRequired' in res.data) return { status: 'mfa', mfaToken: res.data.mfaToken };
      return { status: 'ok', user: this.accept(res.data) };
    } catch (err) {
      throw ApiError.from(err);
    }
  }

  async verifyMfa(mfaToken: string, code: string): Promise<AuthUser> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ data: AuthTokenResponse }>(`${API_BASE}/auth/mfa/verify`, { mfaToken, code }, { withCredentials: true }),
      );
      return this.accept(res.data);
    } catch (err) {
      throw ApiError.from(err);
    }
  }

  async register(body: Record<string, unknown>): Promise<AuthUser> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ data: AuthTokenResponse }>(`${API_BASE}/auth/register`, body, { withCredentials: true }),
      );
      return this.accept(res.data);
    } catch (err) {
      throw ApiError.from(err);
    }
  }

  /** Re-reads the profile (e.g. after email verification or a verification decision). */
  async reloadUser(): Promise<void> {
    if (!this.accessToken) return;
    try {
      const res = await firstValueFrom(
        this.http.get<{ data: AuthUser }>(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${this.accessToken}` } }),
      );
      this.user.set(res.data);
    } catch {
      /* the interceptor-free client does not refresh; the next API call will */
    }
  }

  async logout(redirect = true): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${API_BASE}/auth/logout`, {}, {
          ...this.cookieOptions(),
          headers: this.cookieOptions().headers.set('Authorization', `Bearer ${this.accessToken ?? ''}`),
        }),
      );
    } catch {
      /* ending the local session matters more than the server reply */
    }
    this.clear();
    if (redirect) await this.router.navigateByUrl('/login');
  }

  clear() {
    this.accessToken = null;
    this.user.set(null);
  }

  /** Where a signed-in user belongs by default. */
  homeFor(user: AuthUser | null = this.user()): string {
    if (!user) return '/login';
    if (user.role === Role.ADMIN) return '/admin';
    if (user.role === Role.DOCTOR) {
      return user.doctorVerificationStatus === DoctorVerificationStatus.APPROVED ? '/doctor/dashboard' : '/doctor/verification-pending';
    }
    return '/patient/dashboard';
  }
}
