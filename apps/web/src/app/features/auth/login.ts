import { Component, inject, input, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { FieldErrorComponent } from '../../shared/ui/field-error';

@Component({
  selector: 'mb-login',
  imports: [ReactiveFormsModule, RouterLink, FieldErrorComponent],
  template: `
    <div class="container page auth">
      <div class="card card-interactive auth-card">
        @if (!mfaToken()) {
          <div class="auth-header">
            <h1>Welcome back</h1>
            <p class="muted small">Sign in to your MindBridge account or use Google</p>
          </div>

          @if (error()) {
            <div class="alert alert-danger" role="alert">{{ error() }}</div>
          }

          <!-- Google Sign In Button -->
          <button class="btn btn-google btn-block" type="button" (click)="signInWithGoogle()" [disabled]="busy()">
            @if (busy()) {
              <span class="spinner-sm"></span>
              <span>Connecting to Google…</span>
            } @else {
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              <span>Continue with Google</span>
            }
          </button>

          <div class="auth-separator">
            <span>or sign in with email</span>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="field">
              <label for="email">Email</label>
              <input
                id="email"
                class="input"
                type="email"
                formControlName="email"
                autocomplete="email"
                placeholder="you@example.com"
              />
              <mb-field-error [control]="form.controls.email" label="Email" />
            </div>
            <div class="field">
              <label for="password">Password</label>
              <input
                id="password"
                class="input"
                type="password"
                formControlName="password"
                autocomplete="current-password"
                placeholder="••••••••••••"
              />
              <mb-field-error [control]="form.controls.password" label="Password" />
            </div>
            <button class="btn btn-block" type="submit" [disabled]="busy()">
              {{ busy() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>

          <p class="row-between small links">
            <a routerLink="/forgot-password">Forgot password?</a>
            <a routerLink="/register">Create an account</a>
          </p>
        } @else {
          <h1>Two-step verification</h1>
          <p class="muted">Enter the 6-digit code from your authenticator app.</p>
          @if (error()) {
            <div class="alert alert-danger" role="alert">{{ error() }}</div>
          }
          <form [formGroup]="mfaForm" (ngSubmit)="submitMfa()" novalidate>
            <div class="field">
              <label for="code">Code</label>
              <input
                id="code"
                class="input"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                formControlName="code"
              />
              <mb-field-error [control]="mfaForm.controls.code" label="Verification code" />
            </div>
            <button class="btn btn-block" type="submit" [disabled]="busy()">
              {{ busy() ? 'Verifying…' : 'Verify' }}
            </button>
          </form>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .auth {
      max-width: 460px;
      margin: 0 auto;
      padding: clamp(30px, 5vw, 60px) 16px;
    }
    .auth-card {
      padding: 32px 28px;
      box-shadow: var(--mb-shadow-lg);
    }
    .auth-header {
      margin-bottom: 20px;
      h1 { margin: 0 0 6px; font-size: 1.6rem; }
    }
    .auth-separator {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 18px 0;
      color: var(--mb-text-muted);
      font-size: 0.85rem;
      &::before, &::after {
        content: '';
        flex: 1;
        border-bottom: 1px solid var(--mb-border);
      }
      span {
        padding: 0 10px;
      }
    }
    .btn-google {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .spinner-sm {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(0, 0, 0, 0.2);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .links {
      margin-top: var(--mb-space-4);
    }
    .demo-hints {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px dashed var(--mb-border);
      font-size: 0.8rem;
    }
  `,
})
export class LoginPage implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly returnUrl = input<string>();

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mfaToken = signal<string | null>(null);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly mfaForm = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  ngOnInit() {
    this.initGoogleIdentity();
  }

  private async initGoogleIdentity() {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch('/api/v1/auth/google/config').then(r => r.json());
      if (res?.clientId && (window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: res.clientId,
          callback: async (response: any) => {
            if (response?.credential) {
              this.busy.set(true);
              this.error.set(null);
              try {
                await this.auth.loginWithGoogleCredential(response.credential);
                await this.done();
              } catch (err) {
                this.error.set(errorMessage(err));
              } finally {
                this.busy.set(false);
              }
            }
          },
        });
        (window as any).google.accounts.id.prompt();
      }
    } catch {
      // Gracefully silent if script or config unavailable
    }
  }

  signInWithGoogle() {
    this.busy.set(true);
    this.error.set(null);
    const existing = this.form.controls.email.value?.trim();
    if (existing && existing.includes('@')) {
      window.location.href = `/api/v1/auth/google?email=${encodeURIComponent(existing)}`;
    } else {
      window.location.href = '/api/v1/auth/google';
    }
  }

  async submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.busy.set(true);
    this.error.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      const res = await this.auth.login(email, password);
      if (res.status === 'mfa') this.mfaToken.set(res.mfaToken);
      else await this.done();
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async submitMfa() {
    if (this.mfaForm.invalid) return this.mfaForm.markAllAsTouched();
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.verifyMfa(this.mfaToken()!, this.mfaForm.getRawValue().code);
      await this.done();
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  private done() {
    const target = this.returnUrl();
    const safe =
      target && target.startsWith('/') && !target.startsWith('//') ? target : this.auth.homeFor();
    return this.router.navigateByUrl(safe);
  }
}
