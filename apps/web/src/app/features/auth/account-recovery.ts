import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type AbstractControl, type ValidationErrors } from '@angular/forms';
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
    <div class="container page auth">
      <div class="card center">
        @switch (state()) {
          @case ('working') { <h1>Confirming your email…</h1> }
          @case ('done') {
            <h1>Email confirmed</h1>
            <p class="muted">Thank you. Your email address is confirmed.</p>
            <a class="btn" [routerLink]="auth.isAuthenticated() ? auth.homeFor() : '/login'">Continue</a>
          }
          @default {
            <h1>We couldn't confirm your email</h1>
            <p class="muted">{{ error() }}</p>
            @if (auth.isAuthenticated()) {
              <button class="btn" type="button" (click)="resend()" [disabled]="resent()">{{ resent() ? 'Link sent' : 'Send a new link' }}</button>
            } @else {
              <a class="btn" routerLink="/login">Sign in to request a new link</a>
            }
          }
        }
      </div>
    </div>
  `,
  styles: `.auth { max-width: 520px; }`,
})
export class VerifyEmailPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  readonly token = input<string>();
  protected readonly state = signal<'working' | 'done' | 'failed'>('working');
  protected readonly error = signal('');
  protected readonly resent = signal(false);

  async ngOnInit() {
    const token = this.token();
    if (!token) {
      this.state.set('failed');
      this.error.set('This link is missing its token.');
      return;
    }
    try {
      await this.api.post('/auth/verify-email', { token });
      this.state.set('done');
      await this.auth.reloadUser();
    } catch (err) {
      this.state.set('failed');
      this.error.set(errorMessage(err));
    }
  }

  async resend() {
    try {
      await this.api.post('/auth/resend-verification');
      this.resent.set(true);
    } catch (err) {
      this.error.set(errorMessage(err));
    }
  }
}

@Component({
  selector: 'mb-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, FieldErrorComponent],
  template: `
    <div class="container page auth">
      <div class="card">
        <h1>Reset your password</h1>
        @if (message()) {
          <div class="alert alert-success" role="status">{{ message() }}</div>
          <a routerLink="/login">Back to sign in</a>
        } @else {
          <p class="muted">Enter your email and we'll send you a link to choose a new password.</p>
          @if (error()) { <div class="alert alert-danger" role="alert">{{ error() }}</div> }
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="field">
              <label for="email">Email</label>
              <input id="email" class="input" type="email" formControlName="email" autocomplete="email" />
              <mb-field-error [control]="form.controls.email" label="Email" />
            </div>
            <button class="btn btn-block" type="submit" [disabled]="busy()">Send reset link</button>
          </form>
        }
      </div>
    </div>
  `,
  styles: `.auth { max-width: 460px; }`,
})
export class ForgotPasswordPage {
  private readonly api = inject(ApiService);
  protected readonly form = inject(FormBuilder).nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  protected readonly busy = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  async submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.busy.set(true);
    this.error.set(null);
    try {
      const res = await this.api.post<{ message: string }>('/auth/forgot-password', this.form.getRawValue());
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
    <div class="container page auth">
      <div class="card">
        <h1>Choose a new password</h1>
        @if (done()) {
          <div class="alert alert-success" role="status">Your password has been changed and you've been signed out everywhere.</div>
          <a class="btn" routerLink="/login">Sign in</a>
        } @else {
          @if (!token()) { <div class="alert alert-danger">This link is missing its token. Request a new one.</div> }
          @if (errors().length) {
            <div class="alert alert-danger" role="alert">@for (e of errors(); track e) { <div>{{ e }}</div> }</div>
          }
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="field">
              <label for="password">New password</label>
              <input id="password" class="input" type="password" formControlName="password" autocomplete="new-password" />
              <mb-field-error [control]="form.controls.password" label="Password" />
            </div>
            <div class="field">
              <label for="confirm">Confirm new password</label>
              <input id="confirm" class="input" type="password" formControlName="confirm" autocomplete="new-password" />
              <mb-field-error [control]="form.controls.confirm" label="Confirmation" />
            </div>
            <button class="btn btn-block" type="submit" [disabled]="busy() || !token()">Change password</button>
          </form>
          <p class="small"><a routerLink="/forgot-password">Request a new link</a></p>
        }
      </div>
    </div>
  `,
  styles: `.auth { max-width: 460px; }`,
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
      await this.api.post('/auth/reset-password', { token: this.token(), password: this.form.getRawValue().password });
      this.done.set(true);
    } catch (err) {
      const e = ApiError.from(err);
      this.errors.set(Array.isArray(e.details) ? (e.details as unknown[]).map(String) : [e.message]);
    } finally {
      this.busy.set(false);
    }
  }
}
