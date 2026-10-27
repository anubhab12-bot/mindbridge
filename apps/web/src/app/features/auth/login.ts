import { Component, inject, input, signal } from '@angular/core';
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
      <div class="card">
        @if (!mfaToken()) {
          <h1>Sign in</h1>
          @if (error()) { <div class="alert alert-danger" role="alert">{{ error() }}</div> }
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="field">
              <label for="email">Email</label>
              <input id="email" class="input" type="email" formControlName="email" autocomplete="email" />
              <mb-field-error [control]="form.controls.email" label="Email" />
            </div>
            <div class="field">
              <label for="password">Password</label>
              <input id="password" class="input" type="password" formControlName="password" autocomplete="current-password" />
              <mb-field-error [control]="form.controls.password" label="Password" />
            </div>
            <button class="btn btn-block" type="submit" [disabled]="busy()">{{ busy() ? 'Signing in…' : 'Sign in' }}</button>
          </form>
          <p class="row-between small links">
            <a routerLink="/forgot-password">Forgot your password?</a>
            <a routerLink="/register">Create an account</a>
          </p>
        } @else {
          <h1>Two-step verification</h1>
          <p class="muted">Enter the 6-digit code from your authenticator app.</p>
          @if (error()) { <div class="alert alert-danger" role="alert">{{ error() }}</div> }
          <form [formGroup]="mfaForm" (ngSubmit)="submitMfa()" novalidate>
            <div class="field">
              <label for="code">Code</label>
              <input id="code" class="input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" formControlName="code" />
              <mb-field-error [control]="mfaForm.controls.code" label="Code" />
            </div>
            <button class="btn btn-block" type="submit" [disabled]="busy()">Verify</button>
          </form>
          <button class="btn btn-ghost btn-block" type="button" (click)="mfaToken.set(null)">Use a different account</button>
        }
      </div>
    </div>
  `,
  styles: `.auth { max-width: 460px; } .links { margin-top: var(--mb-space-4); margin-bottom: 0; }`,
})
export class LoginPage {
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
  protected readonly mfaForm = this.fb.group({ code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] });

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
    // Only follow same-origin, path-only return URLs to avoid open redirects.
    const target = this.returnUrl();
    const safe = target && target.startsWith('/') && !target.startsWith('//') ? target : this.auth.homeFor();
    return this.router.navigateByUrl(safe);
  }
}
