import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Role } from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { ApiError, errorMessage } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../shared/ui/confirm';
import { FieldErrorComponent } from '../../shared/ui/field-error';
import { LoadingComponent } from '../../shared/ui/states';
import { matchPasswords } from '../auth/account-recovery';

interface SessionRow {
  id: string;
  userAgent?: string;
  createdAt: string;
  lastUsedAt?: string;
  current: boolean;
}

interface PatientProfileView {
  pronouns: string | null;
  preferredLanguage: string;
  region: string | null;
  trustedContact: string | null;
  moodRemindersEnabled: boolean;
  showReadReceipts: boolean;
}

@Component({
  selector: 'mb-settings',
  imports: [ReactiveFormsModule, DatePipe, FieldErrorComponent, LoadingComponent],
  template: `
    <div class="page">
      <header class="page-header"><h1>Settings</h1></header>
      <div class="tabs" role="tablist">
        @for (t of tabs(); track t.key) {
          <button type="button" role="tab" [attr.aria-selected]="tab() === t.key" (click)="tab.set(t.key)">{{ t.label }}</button>
        }
      </div>

      @switch (tab()) {
        @case ('account') {
          <section class="card narrow">
            <h2>Your account</h2>
            <p class="small muted">Signed in as {{ auth.user()?.email }}</p>
            <form [formGroup]="account" (ngSubmit)="saveAccount()">
              <div class="field">
                <label for="name">Display name</label>
                <input id="name" class="input" formControlName="displayName" />
                <mb-field-error [control]="account.controls.displayName" label="Display name" />
              </div>
              <div class="field">
                <label for="tz">Timezone</label>
                <input id="tz" class="input" formControlName="timezone" list="tz-list" />
                <datalist id="tz-list">@for (z of zones; track z) { <option [value]="z"></option> }</datalist>
              </div>
              <button class="btn" type="submit" [disabled]="busy()">Save</button>
            </form>
          </section>
          @if (isPatient()) {
            <section class="card narrow">
              <h2>Personal preferences</h2>
              @if (!profileLoaded()) {
                <mb-loading />
              } @else {
                <form [formGroup]="profile" (ngSubmit)="saveProfile()">
                  <div class="grid-2">
                    <div class="field"><label for="pronouns">Pronouns <span class="muted">(optional)</span></label><input id="pronouns" class="input" formControlName="pronouns" /></div>
                    <div class="field"><label for="lang">Preferred language code</label><input id="lang" class="input" formControlName="preferredLanguage" placeholder="en" /></div>
                  </div>
                  <div class="field">
                    <label for="trusted">Trusted contact <span class="muted">(optional)</span></label>
                    <input id="trusted" class="input" formControlName="trustedContact" aria-describedby="trusted-hint" />
                    <span class="hint" id="trusted-hint">For your own reference, e.g. a name and number. It is encrypted, and MindBridge never contacts this person.</span>
                  </div>
                  <label class="checkbox"><input type="checkbox" formControlName="moodRemindersEnabled" /><span>Remind me to check in</span></label>
                  <label class="checkbox"><input type="checkbox" formControlName="showReadReceipts" /><span>Show read receipts in messages</span></label>
                  <button class="btn" type="submit" [disabled]="busy()">Save preferences</button>
                </form>
              }
            </section>
          }
        }
        @case ('security') {
          <section class="card narrow">
            <h2>Change password</h2>
            @if (pwErrors().length) { <div class="alert alert-danger" role="alert">@for (e of pwErrors(); track e) { <div>{{ e }}</div> }</div> }
            <form [formGroup]="password" (ngSubmit)="changePassword()">
              <div class="field"><label for="cur">Current password</label><input id="cur" class="input" type="password" autocomplete="current-password" formControlName="currentPassword" /></div>
              <div class="field">
                <label for="new">New password</label><input id="new" class="input" type="password" autocomplete="new-password" formControlName="password" />
                <mb-field-error [control]="password.controls.password" label="New password" />
              </div>
              <div class="field">
                <label for="confirm">Confirm new password</label><input id="confirm" class="input" type="password" autocomplete="new-password" formControlName="confirm" />
                <mb-field-error [control]="password.controls.confirm" label="Confirmation" />
              </div>
              <button class="btn" type="submit" [disabled]="busy()">Change password</button>
              <p class="small muted">Your other sessions will be signed out.</p>
            </form>
          </section>

          @if (canUseMfa()) {
            <section class="card narrow">
              <h2>Two-step verification</h2>
              @if (auth.user()?.mfaEnabled) {
                <p><span class="badge badge-success">On</span> You'll be asked for a code from your authenticator app when you sign in.</p>
                <form [formGroup]="mfaDisable" (ngSubmit)="disableMfa()" class="grid-2">
                  <div class="field"><label for="mpw">Password</label><input id="mpw" class="input" type="password" formControlName="password" /></div>
                  <div class="field"><label for="mcode">Current code</label><input id="mcode" class="input" inputmode="numeric" maxlength="6" formControlName="code" /></div>
                  <div><button class="btn btn-danger" type="submit" [disabled]="busy()">Turn off</button></div>
                </form>
              } @else if (mfaSetup(); as s) {
                <ol>
                  <li>Open your authenticator app and add an account manually.</li>
                  <li>Enter this key: <code class="secret">{{ s.secret }}</code></li>
                  <li>Enter the 6-digit code the app shows.</li>
                </ol>
                <form [formGroup]="mfaEnable" (ngSubmit)="enableMfa()" class="row">
                  <input class="input code" inputmode="numeric" maxlength="6" formControlName="code" aria-label="Code" />
                  <button class="btn" type="submit" [disabled]="busy()">Confirm</button>
                </form>
              } @else {
                <p class="muted">Add a second step to sign-in using an authenticator app. Strongly recommended for professional and admin accounts.</p>
                <button class="btn" type="button" (click)="startMfa()" [disabled]="busy()">Set up</button>
              }
            </section>
          }

          <section class="card narrow">
            <div class="row-between">
              <h2>Where you're signed in</h2>
              <button class="btn btn-secondary btn-sm" type="button" (click)="logoutAll()">Sign out everywhere</button>
            </div>
            @if (!sessions()) {
              <mb-loading />
            } @else {
              <ul class="list">
                @for (s of sessions(); track s.id) {
                  <li class="row-between">
                    <div>
                      <div>{{ device(s.userAgent) }} @if (s.current) { <span class="badge badge-primary">This device</span> }</div>
                      <div class="small muted">Signed in {{ s.createdAt | date: 'medium' }} · last active {{ (s.lastUsedAt ?? s.createdAt) | date: 'medium' }}</div>
                    </div>
                    @if (!s.current) { <button class="btn btn-ghost btn-sm" type="button" (click)="revoke(s)">Sign out</button> }
                  </li>
                }
              </ul>
            }
          </section>
        }
      }
    </div>
  `,
  styles: `.narrow { max-width: 720px; margin-bottom: var(--mb-space-5); } .secret { font-size: 1.05rem; letter-spacing: 0.08em; word-break: break-all; } .code { max-width: 160px; }`,
})
export class SettingsPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly auth = inject(AuthService);

  protected readonly tab = signal<'account' | 'security'>('account');
  protected readonly busy = signal(false);
  protected readonly sessions = signal<SessionRow[] | null>(null);
  protected readonly profileLoaded = signal(false);
  protected readonly mfaSetup = signal<{ secret: string; otpauthUrl: string } | null>(null);
  protected readonly pwErrors = signal<string[]>([]);
  protected readonly zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];

  protected readonly tabs = () => [
    { key: 'account' as const, label: 'Account' },
    { key: 'security' as const, label: 'Security' },
  ];
  protected readonly isPatient = () => this.auth.role() === Role.PATIENT;
  protected readonly canUseMfa = () => this.auth.role() === Role.DOCTOR || this.auth.role() === Role.ADMIN;

  protected readonly account = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    timezone: ['', Validators.required],
  });
  protected readonly profile = this.fb.group({
    pronouns: [''],
    preferredLanguage: ['en', Validators.pattern(/^[a-z]{2,3}$/)],
    trustedContact: [''],
    moodRemindersEnabled: [false],
    showReadReceipts: [true],
  });
  protected readonly password = this.fb.group(
    {
      currentPassword: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(128)]],
      confirm: ['', Validators.required],
    },
    { validators: matchPasswords },
  );
  protected readonly mfaEnable = this.fb.group({ code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] });
  protected readonly mfaDisable = this.fb.group({ password: ['', Validators.required], code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] });

  ngOnInit() {
    const u = this.auth.user();
    if (u) this.account.setValue({ displayName: u.displayName, timezone: u.timezone });
    void this.loadSessions();
    if (this.isPatient()) void this.loadProfile();
  }

  protected device(ua?: string) {
    if (!ua) return 'Unknown device';
    const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
    return os ? `${browser} on ${os}` : browser;
  }

  private async run(fn: () => Promise<void>) {
    this.busy.set(true);
    try {
      await fn();
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  saveAccount() {
    if (this.account.invalid) return this.account.markAllAsTouched();
    return this.run(async () => {
      await this.api.patch('/users/me', this.account.getRawValue());
      await this.auth.reloadUser();
      this.toast.success('Account updated.');
    });
  }

  async loadProfile() {
    try {
      const p = await this.api.get<PatientProfileView | null>('/patients/me/profile');
      if (p) {
        this.profile.setValue({
          pronouns: p.pronouns ?? '',
          preferredLanguage: p.preferredLanguage ?? 'en',
          trustedContact: p.trustedContact ?? '',
          moodRemindersEnabled: p.moodRemindersEnabled,
          showReadReceipts: p.showReadReceipts,
        });
      }
    } finally {
      this.profileLoaded.set(true);
    }
  }

  saveProfile() {
    if (this.profile.invalid) return this.profile.markAllAsTouched();
    return this.run(async () => {
      const v = this.profile.getRawValue();
      await this.api.patch('/patients/me/profile', { ...v, pronouns: v.pronouns.trim() || undefined });
      this.toast.success('Preferences saved.');
    });
  }

  async changePassword() {
    if (this.password.invalid) return this.password.markAllAsTouched();
    this.pwErrors.set([]);
    this.busy.set(true);
    try {
      const v = this.password.getRawValue();
      await this.api.post('/auth/change-password', { currentPassword: v.currentPassword, newPassword: v.password });
      this.password.reset();
      this.toast.success('Password changed. Other sessions were signed out.');
      void this.loadSessions();
    } catch (err) {
      const e = ApiError.from(err);
      this.pwErrors.set(Array.isArray(e.details) ? (e.details as unknown[]).map(String) : [e.message]);
    } finally {
      this.busy.set(false);
    }
  }

  startMfa() {
    return this.run(async () => this.mfaSetup.set(await this.api.post('/auth/mfa/setup')));
  }

  enableMfa() {
    if (this.mfaEnable.invalid) return this.mfaEnable.markAllAsTouched();
    return this.run(async () => {
      await this.api.post('/auth/mfa/enable', this.mfaEnable.getRawValue());
      this.mfaSetup.set(null);
      this.mfaEnable.reset();
      await this.auth.reloadUser();
      this.toast.success('Two-step verification is on.');
    });
  }

  disableMfa() {
    if (this.mfaDisable.invalid) return this.mfaDisable.markAllAsTouched();
    return this.run(async () => {
      await this.api.post('/auth/mfa/disable', this.mfaDisable.getRawValue());
      this.mfaDisable.reset();
      await this.auth.reloadUser();
      this.toast.success('Two-step verification is off.');
    });
  }

  async loadSessions() {
    try {
      this.sessions.set(await this.api.get<SessionRow[]>('/auth/sessions'));
    } catch {
      this.sessions.set([]);
    }
  }

  revoke(s: SessionRow) {
    return this.run(async () => {
      await this.api.delete(`/auth/sessions/${s.id}`);
      await this.loadSessions();
    });
  }

  async logoutAll() {
    const ok = await this.confirm.ask({ title: 'Sign out everywhere?', message: 'You will be signed out on every device, including this one.', confirmLabel: 'Sign out' });
    if (!ok) return;
    await this.run(async () => {
      await this.api.post('/auth/logout-all');
      await this.auth.logout();
    });
  }
}
