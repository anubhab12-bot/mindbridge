import { Component, inject, input, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api/api.service';
import { ApiError, errorMessage } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { FieldErrorComponent } from '../../shared/ui/field-error';

export function matchPasswords(group: AbstractControl): ValidationErrors | null {
  const a = group.get('password')?.value;
  const b = group.get('confirm');
  if (b && a !== b.value) {
    b.setErrors({ ...(b.errors ?? {}), mismatch: true });
    return { mismatch: true };
  }
  if (b?.hasError('mismatch')) {
    const { mismatch: _m, ...rest } = b.errors ?? {};
    b.setErrors(Object.keys(rest).length ? rest : null);
  }
  return null;
}

@Component({
  selector: 'mb-verify-email',
  imports: [RouterLink],
  template: `
    <div class="verify-page-wrapper">
      <div class="verify-card">
        @switch (state()) {
          @case ('working') {
            <div class="state-icon-wrap working">
              <div class="spinner"></div>
            </div>
            <h1 class="verify-title">Confirming Your Email</h1>
            <p class="verify-subtitle">Please wait while we validate your security token with our clinical ledger…</p>
          }

          @case ('done') {
            <div class="state-icon-wrap success">
              <span class="icon">✓</span>
            </div>
            <h1 class="verify-title">Email Confirmed</h1>
            <p class="verify-subtitle">
              Thank you! Your email address has been verified successfully. Your MindBridge account is active with unrestricted access.
            </p>
            <div class="action-stack">
              <a class="btn btn-primary-elevated btn-block" [routerLink]="auth.isAuthenticated() ? auth.homeFor() : '/login'">
                Continue to {{ auth.isAuthenticated() ? 'Dashboard' : 'Sign In' }} →
              </a>
            </div>
          }

          @case ('idle') {
            <div class="state-icon-wrap idle">
              <span class="icon">✉️</span>
            </div>
            <h1 class="verify-title">Confirm Your Email Address</h1>
            <p class="verify-subtitle">
              @if (auth.isAuthenticated()) {
                Signed in as <strong class="highlight-email">{{ auth.user()?.email }}</strong>. Complete verification to book consultations, message clinical professionals, and unlock the AI companion.
              } @else {
                Please confirm your email address to activate your MindBridge account and access all healthcare services.
              }
            </p>

            @if (auth.isAuthenticated()) {
              <div class="staging-callout">
                <div class="callout-badge">⚡ Cloud Staging Mode Active</div>
                <p class="callout-desc">
                  On Render staging, outgoing SMTP is kept in-memory for security. Click below to instantly activate and verify your account:
                </p>
                <button
                  class="btn btn-primary-elevated btn-block"
                  type="button"
                  (click)="instantVerify()"
                  [disabled]="busy()"
                >
                  @if (busy()) {
                    <span class="spinner-sm"></span> Verifying Account…
                  } @else {
                    ⚡ Verify Account Instantly Now
                  }
                </button>
              </div>

              <div class="divider-text"><span>or enter verification token</span></div>

              <form (submit)="submitManualToken($event)" class="token-form">
                <div class="token-input-group">
                  <input
                    type="text"
                    class="input"
                    placeholder="Paste token from link here…"
                    [value]="manualToken()"
                    (input)="onTokenInput($event)"
                  />
                  <button class="btn btn-secondary" type="submit" [disabled]="!manualToken().trim() || busy()">
                    Verify
                  </button>
                </div>
              </form>

              <div class="secondary-actions">
                <button
                  class="btn btn-ghost btn-sm"
                  type="button"
                  (click)="resend()"
                  [disabled]="busy() || resent()"
                >
                  {{ resent() ? '✓ Verification link refreshed' : '📧 Resend verification email' }}
                </button>
                <a class="btn btn-ghost btn-sm" [routerLink]="auth.homeFor()">
                  Back to Dashboard
                </a>
              </div>
            } @else {
              <div class="staging-callout">
                <div class="callout-badge">⚡ Quick Email Verification</div>
                <p class="callout-desc">
                  Enter the email address you registered with to verify your account immediately:
                </p>
                <form (submit)="submitEmailVerify($event)" class="public-verify-form">
                  <div class="field">
                    <input
                      type="email"
                      class="input"
                      placeholder="name@example.com"
                      [value]="emailInput()"
                      (input)="onEmailInput($event)"
                      required
                    />
                  </div>
                  <button
                    class="btn btn-primary-elevated btn-block"
                    type="submit"
                    [disabled]="!emailInput().trim() || busy()"
                  >
                    @if (busy()) {
                      <span class="spinner-sm"></span> Verifying…
                    } @else {
                      ⚡ Instant Verify Email
                    }
                  </button>
                </form>
              </div>

              <div class="action-stack">
                <a class="btn btn-secondary btn-block" routerLink="/login">
                  Sign In to Your Account
                </a>
              </div>
            }
          }

          @default {
            <div class="state-icon-wrap failed">
              <span class="icon">⚠️</span>
            </div>
            <h1 class="verify-title">Verification Notice</h1>
            <div class="alert alert-danger" role="alert">
              {{ error() || 'This verification link is invalid or has expired.' }}
            </div>

            @if (auth.isAuthenticated()) {
              <div class="staging-callout">
                <div class="callout-badge">⚡ Instant Staging Activation</div>
                <p class="callout-desc">
                  You can bypass the token check and verify your account directly right now:
                </p>
                <button
                  class="btn btn-primary-elevated btn-block"
                  type="button"
                  (click)="instantVerify()"
                  [disabled]="busy()"
                >
                  @if (busy()) {
                    <span class="spinner-sm"></span> Activating…
                  } @else {
                    ⚡ Verify Account Instantly Now
                  }
                </button>
              </div>

              <div class="secondary-actions">
                <button
                  class="btn btn-ghost btn-sm"
                  type="button"
                  (click)="resend()"
                  [disabled]="busy() || resent()"
                >
                  {{ resent() ? '✓ New link generated' : 'Send a new verification link' }}
                </button>
                <a class="btn btn-ghost btn-sm" [routerLink]="auth.homeFor()">
                  Return to Dashboard
                </a>
              </div>
            } @else {
              <div class="action-stack">
                <button class="btn btn-secondary btn-block" type="button" (click)="state.set('idle')">
                  Try Another Verification Option
                </button>
                <a class="btn btn-ghost btn-block" routerLink="/login">
                  Sign in to request a new link
                </a>
              </div>
            }
          }
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .verify-page-wrapper {
      min-height: calc(85vh - 80px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
    }
    .verify-card {
      width: 100%;
      max-width: 520px;
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-radius: 20px;
      padding: 36px 30px;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 1px 1px rgba(0, 0, 0, 0.02);
      text-align: center;
    }
    .state-icon-wrap {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30px;
    }
    .state-icon-wrap.success {
      background: #ecfdf5;
      color: #059669;
      box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.12);
    }
    .state-icon-wrap.idle {
      background: #f0fdfa;
      color: #0d9488;
      box-shadow: 0 0 0 8px rgba(13, 148, 136, 0.1);
    }
    .state-icon-wrap.failed {
      background: #fef2f2;
      color: #dc2626;
      box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.1);
    }
    .state-icon-wrap.working {
      background: #f8fafc;
      box-shadow: 0 0 0 8px rgba(100, 116, 139, 0.1);
    }
    .verify-title {
      font-size: 1.55rem;
      font-weight: 700;
      color: var(--mb-text);
      margin: 0 0 10px;
      letter-spacing: -0.02em;
    }
    .verify-subtitle {
      font-size: 0.95rem;
      line-height: 1.6;
      color: var(--mb-text-muted);
      margin: 0 0 22px;
    }
    .highlight-email {
      color: var(--mb-text);
      font-weight: 600;
      word-break: break-all;
    }
    .staging-callout {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.06), rgba(6, 182, 212, 0.08));
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 14px;
      padding: 18px 20px;
      margin-bottom: 20px;
      text-align: left;
    }
    .callout-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #047857;
      background: #d1fae5;
      padding: 3px 10px;
      border-radius: 999px;
      margin-bottom: 8px;
    }
    .callout-desc {
      font-size: 0.88rem;
      line-height: 1.5;
      color: var(--mb-text);
      margin: 0 0 14px;
    }
    .divider-text {
      position: relative;
      text-align: center;
      margin: 20px 0 16px;
      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: var(--mb-border);
      }
      span {
        position: relative;
        background: var(--mb-surface);
        padding: 0 12px;
        font-size: 0.8rem;
        color: var(--mb-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
    }
    .token-form {
      margin-bottom: 16px;
    }
    .token-input-group {
      display: flex;
      gap: 8px;
      .input {
        flex: 1;
        font-size: 0.88rem;
      }
    }
    .action-stack {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 16px;
    }
    .secondary-actions {
      display: flex;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid var(--mb-border);
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(16, 185, 129, 0.2);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .spinner-sm {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 6px;
      vertical-align: middle;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `,
})
export class VerifyEmailPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  readonly token = input<string>();
  protected readonly state = signal<'working' | 'done' | 'failed' | 'idle'>('working');
  protected readonly error = signal('');
  protected readonly resent = signal(false);
  protected readonly busy = signal(false);
  protected readonly manualToken = signal('');
  protected readonly emailInput = signal('');

  async ngOnInit() {
    if (this.auth.user()?.emailVerified) {
      this.state.set('done');
      return;
    }

    const token = this.token();
    if (token) {
      this.state.set('working');
      try {
        await this.api.post('/auth/verify-email', { token });
        this.state.set('done');
        await this.auth.reloadUser();
      } catch (err) {
        this.state.set('failed');
        this.error.set(errorMessage(err));
      }
      return;
    }

    this.state.set('idle');
  }

  async instantVerify() {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.post('/auth/instant-verify');
      await this.auth.reloadUser();
      this.state.set('done');
    } catch (err) {
      this.state.set('failed');
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async submitManualToken(event: Event) {
    event.preventDefault();
    const token = this.manualToken().trim();
    if (!token) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.post('/auth/verify-email', { token });
      await this.auth.reloadUser();
      this.state.set('done');
    } catch (err) {
      this.state.set('failed');
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async submitEmailVerify(event: Event) {
    event.preventDefault();
    const email = this.emailInput().trim();
    if (!email) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.post('/auth/instant-verify-public', { email });
      this.state.set('done');
    } catch (err) {
      this.state.set('failed');
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async resend() {
    this.busy.set(true);
    try {
      const res = await this.api.post<{ sent: boolean; verified?: boolean }>(
        '/auth/resend-verification',
      );
      this.resent.set(true);
      if (res.verified) {
        await this.auth.reloadUser();
        this.state.set('done');
      }
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  onTokenInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.manualToken.set(input.value);
  }

  onEmailInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.emailInput.set(input.value);
  }
}

@Component({
  selector: 'mb-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, FieldErrorComponent],
  template: `
    <div class="verify-page-wrapper">
      <div class="verify-card">
        <div class="state-icon-wrap idle">
          <span class="icon">🔑</span>
        </div>
        <h1 class="verify-title">Reset Your Password</h1>
        @if (message()) {
          <div class="alert alert-success" role="status">{{ message() }}</div>
          <div class="action-stack">
            <a class="btn btn-primary-elevated btn-block" routerLink="/login">Back to Sign In</a>
          </div>
        } @else {
          <p class="verify-subtitle">Enter your email and we'll send you a link to choose a new password.</p>
          @if (error()) {
            <div class="alert alert-danger" role="alert">{{ error() }}</div>
          }
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="field" style="text-align: left;">
              <label for="email">Email</label>
              <input
                id="email"
                class="input"
                type="email"
                formControlName="email"
                autocomplete="email"
                placeholder="name@example.com"
              />
              <mb-field-error [control]="form.controls.email" label="Email" />
            </div>
            <button class="btn btn-primary-elevated btn-block" type="submit" [disabled]="busy()">
              {{ busy() ? 'Sending link…' : 'Send Reset Link' }}
            </button>
          </form>
          <div class="secondary-actions">
            <a class="btn btn-ghost btn-sm" routerLink="/login">Return to Sign In</a>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .verify-page-wrapper {
      min-height: calc(85vh - 80px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
    }
    .verify-card {
      width: 100%;
      max-width: 480px;
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-radius: 20px;
      padding: 36px 30px;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.08);
      text-align: center;
    }
    .state-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      margin: 0 auto 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      background: #f0fdfa;
      color: #0d9488;
      box-shadow: 0 0 0 8px rgba(13, 148, 136, 0.1);
    }
    .verify-title {
      font-size: 1.55rem;
      font-weight: 700;
      color: var(--mb-text);
      margin: 0 0 10px;
    }
    .verify-subtitle {
      font-size: 0.95rem;
      line-height: 1.6;
      color: var(--mb-text-muted);
      margin: 0 0 22px;
    }
    .action-stack {
      margin-top: 16px;
    }
    .secondary-actions {
      display: flex;
      justify-content: center;
      margin-top: 20px;
      padding-top: 14px;
      border-top: 1px solid var(--mb-border);
    }
  `,
})
export class ForgotPasswordPage {
  private readonly api = inject(ApiService);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });
  protected readonly busy = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  async submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.busy.set(true);
    this.error.set(null);
    try {
      const res = await this.api.post<{ message: string }>(
        '/auth/forgot-password',
        this.form.getRawValue(),
      );
      this.message.set(res.message);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}

@Component({
  selector: 'mb-reset-password',
  imports: [ReactiveFormsModule, RouterLink, FieldErrorComponent],
  template: `
    <div class="verify-page-wrapper">
      <div class="verify-card">
        <div class="state-icon-wrap idle">
          <span class="icon">🔒</span>
        </div>
        <h1 class="verify-title">Choose a New Password</h1>
        @if (done()) {
          <div class="alert alert-success" role="status">
            Your password has been changed and you've been signed out everywhere.
          </div>
          <div class="action-stack">
            <a class="btn btn-primary-elevated btn-block" routerLink="/login">Sign In Now</a>
          </div>
        } @else {
          @if (!token()) {
            <div class="alert alert-danger">This link is missing its token. Request a new one.</div>
          }
          @if (errors().length) {
            <div class="alert alert-danger" role="alert">
              @for (e of errors(); track e) {
                <div>{{ e }}</div>
              }
            </div>
          }
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate style="text-align: left;">
            <div class="field">
              <label for="password">New password</label>
              <input
                id="password"
                class="input"
                type="password"
                formControlName="password"
                autocomplete="new-password"
              />
              <mb-field-error [control]="form.controls.password" label="Password" />
            </div>
            <div class="field">
              <label for="confirm">Confirm new password</label>
              <input
                id="confirm"
                class="input"
                type="password"
                formControlName="confirm"
                autocomplete="new-password"
              />
              <mb-field-error [control]="form.controls.confirm" label="Confirmation" />
            </div>
            <button class="btn btn-primary-elevated btn-block" type="submit" [disabled]="busy() || !token()">
              {{ busy() ? 'Changing Password…' : 'Change Password' }}
            </button>
          </form>
          <div class="secondary-actions">
            <a class="btn btn-ghost btn-sm" routerLink="/forgot-password">Request a new link</a>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .verify-page-wrapper {
      min-height: calc(85vh - 80px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
    }
    .verify-card {
      width: 100%;
      max-width: 480px;
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-radius: 20px;
      padding: 36px 30px;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.08);
      text-align: center;
    }
    .state-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      margin: 0 auto 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      background: #f0fdfa;
      color: #0d9488;
      box-shadow: 0 0 0 8px rgba(13, 148, 136, 0.1);
    }
    .verify-title {
      font-size: 1.55rem;
      font-weight: 700;
      color: var(--mb-text);
      margin: 0 0 16px;
    }
    .action-stack {
      margin-top: 16px;
    }
    .secondary-actions {
      display: flex;
      justify-content: center;
      margin-top: 20px;
      padding-top: 14px;
      border-top: 1px solid var(--mb-border);
    }
  `,
})
export class ResetPasswordPage {
  private readonly api = inject(ApiService);
  readonly token = input<string>();
  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(128)]],
      confirm: ['', Validators.required],
    },
    { validators: matchPasswords },
  );
  protected readonly busy = signal(false);
  protected readonly done = signal(false);
  protected readonly errors = signal<string[]>([]);

  async submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.busy.set(true);
    this.errors.set([]);
    try {
      await this.api.post('/auth/reset-password', {
        token: this.token(),
        password: this.form.getRawValue().password,
      });
      this.done.set(true);
    } catch (err) {
      const e = ApiError.from(err);
      this.errors.set(
        Array.isArray(e.details) ? (e.details as unknown[]).map(String) : [e.message],
      );
    } finally {
      this.busy.set(false);
    }
  }
}
