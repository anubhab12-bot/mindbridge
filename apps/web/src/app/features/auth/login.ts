import { Component, inject, input, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/api/api-error';
import { apiUrl } from '../../core/api/api.service';
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

          @if (expired()) {
            <div class="alert alert-warning" role="alert" style="margin-bottom: 1rem; text-align: left;">
              <div>Session has expired or connected from a new device. Please sign in again.</div>
            </div>
          }

          @if (error()) {
            <div class="alert alert-danger" role="alert">{{ error() }}</div>
          }

          <!-- Google Sign In Button -->
          <button class="btn btn-google btn-block" type="button" (click)="signInWithGoogle()" [disabled]="busy()">
            @if (busy()) {
              <span class="spinner-sm"></span>
              <span>Connecting to Google...</span>
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
                placeholder="Enter your password"
              />
              <mb-field-error [control]="form.controls.password" label="Password" />
            </div>
            <button class="btn btn-block" type="submit" [disabled]="busy()">
              {{ busy() ? 'Signing in...' : 'Sign in' }}
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
              {{ busy() ? 'Verifying...' : 'Verify' }}
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
      padding-top: var(--mb-space-8);
      padding-bottom: var(--mb-space-12);
    }
    .auth-header {
      margin-bottom: var(--mb-space-4);
      text-align: center;
    }
    .auth-card {
      padding: var(--mb-space-6);
    }
    .btn-google {
      background: #ffffff;
      color: #3c4043;
      border: 1px solid #dadce0;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 10px 16px;
      font-size: 0.95rem;
      border-radius: var(--mb-radius);
      box-shadow: 0 1px 2px rgba(60,64,67,0.08), 0 1px 3px 1px rgba(60,64,67,0.06);
      transition: background-color 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }
    .btn-google:hover:not(:disabled) {
      background: #f8f9fa;
      border-color: #d2e3fc;
      box-shadow: 0 1px 3px rgba(60,64,67,0.12), 0 2px 6px 2px rgba(60,64,67,0.08);
    }
    .auth-separator {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 20px 0 16px 0;
      color: var(--mb-muted);
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .auth-separator::before,
    .auth-separator::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid var(--mb-border);
    }
    .auth-separator span {
      padding: 0 12px;
    }
    .spinner-sm {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(0, 0, 0, 0.2);
      border-top-color: #4285f4;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
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
  private readonly route = inject(ActivatedRoute);
  readonly returnUrl = input<string>();
  readonly expired = input<string>();

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mfaToken = signal<string | null>(null);
  protected readonly googleConfig = signal<{ clientId: string; enabled: boolean } | null>(null);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly mfaForm = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  ngOnInit() {
    const qp = this.route.snapshot.queryParams;
    const qpEmail = qp?.['email'] || qp?.['user'];
    if (qpEmail) {
      this.form.patchValue({ email: qpEmail });
    }
    this.initGoogleIdentity();
  }

  private async initGoogleIdentity() {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch(apiUrl('/auth/google/config')).then((r) => r.json());
      const conf = res?.data || res;
      this.googleConfig.set(conf);
      if (conf?.enabled && conf?.clientId && (window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: conf.clientId,
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
    const conf = this.googleConfig();
    if (conf?.enabled && conf?.clientId) {
      this.busy.set(true);
      this.error.set(null);
      const origin = window.location.origin;
      const hasMindbridge = window.location.pathname.startsWith('/mindbridge');
      const returnBase = `${origin}${hasMindbridge ? '/mindbridge' : ''}`;
      window.location.href = apiUrl(`/auth/google?client_url=${encodeURIComponent(returnBase)}`);
      return;
    }

    const email = this.form.getRawValue().email?.trim();
    if (email && email.includes('@')) {
      this.busy.set(true);
      this.error.set(null);
      this.auth.loginWithGoogleEmail(email)
        .then(() => this.done())
        .catch((err) => this.error.set(errorMessage(err)))
        .finally(() => this.busy.set(false));
      return;
    }

    const emailInput = document.getElementById('email');
    if (emailInput) {
      emailInput.focus();
    }
    this.error.set('Please enter your email in the Email field below to sign in directly.');
  }

  async submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.busy.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    const cleanEmail = email.trim();
    try {
      let res;
      try {
        res = await this.auth.login(cleanEmail, password);
      } catch (err: any) {
        // Fallback for direct Google/OAuth created accounts without an explicit password
        try {
          await this.auth.loginWithGoogleEmail(cleanEmail);
          await this.done();
          return;
        } catch {
          throw err;
        }
      }
      if (res && res.status === 'mfa') {
        this.mfaToken.set(res.mfaToken);
      } else {
        await this.done();
      }
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
      target &&
      target.startsWith('/') &&
      !target.startsWith('//') &&
      !target.includes('admin') &&
      !target.includes('portal-select')
        ? target
        : this.auth.homeFor();
    return this.router.navigateByUrl(safe);
  }
}
