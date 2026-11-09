function sanitizeAuthUser(u: AuthUser): AuthUser {
  if (u.displayName) {
    u.displayName = u.displayName
      .replace(/[._-]admin\b/gi, '')
      .replace(/\badmin[._-]/gi, '')
      .replace(/\badmin\b/gi, '')
      .replace(/^[._-]+|[._-]+$/g, '')
      .trim();
  }
  if (!u.displayName && u.email) {
    u.displayName = u.email
      .split('@')[0]
      .replace(/[._-]admin\b/gi, '')
      .replace(/\badmin[._-]/gi, '')
      .replace(/\badmin\b/gi, '')
      .replace(/^[._-]+|[._-]+$/g, '')
      .trim();
  }
  if (!u.displayName) {
    u.displayName = 'User';
  } else {
    u.displayName = u.displayName.charAt(0).toUpperCase() + u.displayName.slice(1);
  }

  if (
    u.role === Role.ADMIN ||
    u.email?.toLowerCase().includes('anubhab') ||
    u.email?.toLowerCase().includes('admin')
  ) {
    u.role = Role.PATIENT;
    delete u.adminPermissions;
    delete (u as any).adminRolePreset;
    u.mfaEnabled = false;
  }
  return u;
}

import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  AccountStatus,
  type AuthTokenResponse,
  type AuthUser,
  DoctorVerificationStatus,
  type MfaChallengeResponse,
  Role,
} from '@mindbridge/shared-types';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../api/api-error';
import { API_BASE, apiUrl } from '../api/api.service';

export const GOOGLE_CLIENT_ID =
  '881519533012-cvjl7g673bc5mj5145l74nkkdkmr7qku.apps.googleusercontent.com';

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
    if (res.user) sanitizeAuthUser(res.user);
    this.user.set(res.user);
    return res.user;
  }

  /** Called once at start-up: restores the session from token handoff or refresh cookie. */
    /** Called once at start-up: restores the session from token handoff or refresh cookie. */
  async init(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        const search = window.location?.search || '';
        const urlParams = new URLSearchParams(search);
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('mb_dev_admin_active');
        }
        const urlToken = urlParams.get('token');
        if (urlToken) {
          const req = firstValueFrom(
            this.http.get<{ data: AuthUser }>(`${API_BASE}/auth/me`, {
              headers: { Authorization: `Bearer ${urlToken}` },
            }),
          );
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
          const res = await Promise.race([req, timeoutPromise]);
          if (res?.data) {
            this.accessToken = urlToken;
            const sanitized = sanitizeAuthUser(res.data);
            this.user.set(sanitized);
            urlParams.delete('token');
            const newSearch = urlParams.toString();
            const cleanUrl =
              window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
            window.history.replaceState({}, document.title, cleanUrl);
            this.initialised.set(true);
            return;
          }
        }

        const pathname = window.location?.pathname || '';
        const isPublicPath =
          pathname === '' ||
          pathname === '/' ||
          pathname === '/mindbridge' ||
          pathname === '/mindbridge/' ||
          pathname.includes('/crisis') ||
          pathname.includes('/how-it-works') ||
          pathname.includes('/for-professionals') ||
          pathname.includes('/self-help') ||
          pathname.includes('/impact') ||
          pathname.includes('/login') ||
          pathname.includes('/register') ||
          pathname.includes('/legal') ||
          pathname.includes('/verify-email') ||
          pathname.includes('/forgot-password') ||
          pathname.includes('/reset-password') ||
          pathname.includes('/portal-select');

        if (isPublicPath) {
          this.initialised.set(true);
          void this.refresh(3500);
          return;
        }
      }
    } catch {
      // Fall through to cookie refresh
    }
    await this.refresh(2500);
    this.initialised.set(true);
  }

    async loginWithGoogleEmail(email: string, displayName?: string): Promise<AuthUser> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ data: AuthTokenResponse }>(
          `${API_BASE}/auth/google/signin`,
          { email, displayName },
          this.cookieOptions(),
        ),
      );
      return this.accept(res.data);
    } catch (err) {
      throw ApiError.from(err);
    }
  }

  async loginWithGoogleCredential(credential: string): Promise<AuthUser> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ data: AuthTokenResponse }>(
          `${API_BASE}/auth/google/credential`,
          { credential },
          this.cookieOptions(),
        ),
      );
      return this.accept(res.data);
    } catch (err) {
      throw ApiError.from(err);
    }
  }

  async signInWithGoogle(): Promise<AuthUser> {
    fetch(apiUrl('/health')).catch(() => {});

    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      try {
        return await new Promise<AuthUser>((resolve, reject) => {
          const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'openid email profile',
            callback: async (tokenResponse: any) => {
              if (tokenResponse?.error) {
                this.redirectToGoogleOAuth();
                return;
              }
              if (tokenResponse?.access_token) {
                try {
                  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                  });
                  const userInfo = (await res.json()) as { email?: string; name?: string };
                  if (userInfo?.email) {
                    const u = await this.loginWithGoogleEmail(userInfo.email, userInfo.name);
                    resolve(u);
                  } else {
                    reject(new Error('Google did not return an email address.'));
                  }
                } catch (err) {
                  reject(err);
                }
              }
            },
            error_callback: () => {
              reject(
                new Error(
                  "Google blocked this request (origin_mismatch): Please add 'https://anubhab12-bot.github.io' to Authorized JavaScript origins in Google Cloud Console, or enter your email below to sign in directly.",
                ),
              );
            },
          });
          client.requestAccessToken({ prompt: 'select_account' });
        });
      } catch (err) {
        throw err;
      }
    }

    this.redirectToGoogleOAuth();
    return new Promise(() => {});
  }

  redirectToGoogleOAuth() {
    if (typeof window === 'undefined') return;
    const origin = window.location.origin;
    const hasMindbridge = window.location.pathname.startsWith('/mindbridge');
    const returnBase = `${origin}${hasMindbridge ? '/mindbridge' : ''}`;
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.set('redirect_uri', 'https://mindbridge-api-x99i.onrender.com/api/v1/auth/google/callback');
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'select_account');
    googleAuthUrl.searchParams.set('state', encodeURIComponent(JSON.stringify({ clientUrl: returnBase })));
    window.location.href = googleAuthUrl.toString();
  }

  /** Single-flight refresh. Resolves false (and clears state) when the session has ended. */
    /** Single-flight refresh. Resolves false (and clears state) when the session has ended. */
  refresh(timeoutMs = 3000): Promise<boolean> {
    this.refreshing ??= (async () => {
      try {
        const req = firstValueFrom(
          this.http.post<{ data: AuthTokenResponse }>(`${API_BASE}/auth/refresh`, {}, this.cookieOptions()),
        );
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Refresh timeout')), timeoutMs),
        );
        const res = await Promise.race([req, timeoutPromise]);
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
      if (res?.data) { this.user.set(sanitizeAuthUser(res.data)); }
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
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('mb_dev_admin_active');
    }
  }

  /** Where a signed-in user belongs by default. */
  homeFor(user: AuthUser | null = this.user()): string {
    if (!user) return '/login';
    if (user.role === Role.DOCTOR) {
      return user.doctorVerificationStatus === DoctorVerificationStatus.APPROVED ? '/doctor/dashboard' : '/doctor/verification-pending';
    }
    return '/patient/dashboard';
  }
}
