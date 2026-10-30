import { Component, inject, input, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProfessionalCategory, Role, SCOPE_OF_PRACTICE } from '@mindbridge/shared-types';
import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { FeatureFlagsService } from '../../core/services/feature-flags.service';
import { FieldErrorComponent } from '../../shared/ui/field-error';
import { localTimezone, splitList } from '../../shared/util/format';

@Component({
  selector: 'mb-register',
  imports: [ReactiveFormsModule, RouterLink, FieldErrorComponent],
  template: `
    <div class="container page auth">
      <div class="card">
        <h1>Create your account</h1>
        <div class="tabs" role="tablist" aria-label="Account type">
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="role() === 'PATIENT'"
            (click)="setRole('PATIENT')"
          >
            I'm looking for support
          </button>
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="role() === 'DOCTOR'"
            (click)="setRole('DOCTOR')"
          >
            I'm a professional
          </button>
        </div>

        @if (role() === 'DOCTOR' && !flags.enabled('registration.doctor')) {
          <div class="alert alert-warning">
            Professional sign-up is paused at the moment. Please check back soon.
          </div>
        }
        @if (errors().length) {
          <div class="alert alert-danger" role="alert">
            @for (e of errors(); track e) {
              <div>{{ e }}</div>
            }
          </div>
        }

                @if (role() === 'PATIENT') {
          <button class="btn btn-google btn-block" type="button" (click)="signUpWithGoogle()" style="margin-bottom: 16px;">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
            </svg>
            <span>Sign up with Google</span>
          </button>
          <div style="display: flex; align-items: center; text-align: center; margin: 12px 0 18px; color: var(--mb-text-muted); font-size: 0.85rem;">
            <div style="flex: 1; border-bottom: 1px solid var(--mb-border);"></div>
            <span style="padding: 0 10px;">or continue with email</span>
            <div style="flex: 1; border-bottom: 1px solid var(--mb-border);"></div>
          </div>
        }
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label for="displayName">{{
              role() === 'DOCTOR' ? 'Full name as registered' : 'What should we call you?'
            }}</label>
            <input
              id="displayName"
              class="input"
              formControlName="displayName"
              autocomplete="name"
            />
            <mb-field-error [control]="form.controls.displayName" label="Name" />
          </div>
          <div class="field">
            <label for="email">Email</label>
            <input
              id="email"
              class="input"
              type="email"
              formControlName="email"
              autocomplete="email"
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
              autocomplete="new-password"
              aria-describedby="pw-hint"
            />
            <span class="hint" id="pw-hint"
              >At least 10 characters. Mix upper and lower case, numbers or symbols, or use a long
              passphrase.</span
            >
            <mb-field-error [control]="form.controls.password" label="Password" />
          </div>

          @if (role() === 'DOCTOR') {
            <fieldset formGroupName="doctor">
              <legend>Professional details</legend>
              <div class="field">
                <label for="category">Professional category</label>
                <select id="category" class="input" formControlName="professionalCategory">
                  @for (c of categories; track c) {
                    <option [value]="c">{{ scope[c].label }}</option>
                  }
                </select>
                <span class="hint">{{
                  scope[form.controls.doctor.controls.professionalCategory.value].description
                }}</span>
              </div>
              <div class="grid-2">
                <div class="field">
                  <label for="regNo">Registration number</label>
                  <input id="regNo" class="input" formControlName="registrationNumber" />
                  <mb-field-error
                    [control]="form.controls.doctor.controls.registrationNumber"
                    label="Registration number"
                  />
                </div>
                <div class="field">
                  <label for="council">Registering council</label>
                  <input
                    id="council"
                    class="input"
                    formControlName="registrationCouncil"
                    placeholder="e.g. State Medical Council, RCI"
                  />
                  <mb-field-error
                    [control]="form.controls.doctor.controls.registrationCouncil"
                    label="Council"
                  />
                </div>
              </div>
              <div class="field">
                <label for="quals">Qualifications</label>
                <input
                  id="quals"
                  class="input"
                  formControlName="qualifications"
                  placeholder="Comma separated, e.g. MBBS, MD Psychiatry"
                />
                <mb-field-error
                  [control]="form.controls.doctor.controls.qualifications"
                  label="Qualifications"
                />
              </div>
              <div class="field">
                <label for="specs">Areas you work with</label>
                <input
                  id="specs"
                  class="input"
                  formControlName="specialties"
                  placeholder="Comma separated, e.g. Anxiety, Sleep"
                />
                <mb-field-error
                  [control]="form.controls.doctor.controls.specialties"
                  label="Areas"
                />
              </div>
              <div class="grid-2">
                <div class="field">
                  <label for="years">Years of experience</label>
                  <input
                    id="years"
                    class="input"
                    type="number"
                    min="0"
                    max="70"
                    formControlName="yearsExperience"
                  />
                </div>
                <div class="field">
                  <label for="langs">Languages</label>
                  <input
                    id="langs"
                    class="input"
                    formControlName="languages"
                    placeholder="e.g. en, hi"
                  />
                  <mb-field-error
                    [control]="form.controls.doctor.controls.languages"
                    label="Languages"
                  />
                </div>
              </div>
              <p class="small muted">
                After you sign up you'll upload documents so our team can verify your registration.
              </p>
            </fieldset>
          } @else {
            <label class="checkbox">
              <input type="checkbox" formControlName="ageConfirmedAdult" />
              <span>I am 18 or older.</span>
            </label>
            <label class="checkbox">
              <input type="checkbox" formControlName="aiProcessingConsent" />
              <span
                >Allow the AI companion to process my chat messages.
                <span class="muted">Optional, and you can change this later.</span></span
              >
            </label>
          }

          <label class="checkbox">
            <input type="checkbox" formControlName="acceptTerms" />
            <span
              >I accept the <a routerLink="/legal/terms" target="_blank">terms of service</a>.</span
            >
          </label>
          <label class="checkbox">
            <input type="checkbox" formControlName="acceptPrivacy" />
            <span
              >I have read the
              <a routerLink="/legal/privacy" target="_blank">privacy notice</a>.</span
            >
          </label>

          <button class="btn btn-block" type="submit" [disabled]="busy()">
            {{ busy() ? 'Creating account…' : 'Create account' }}
          </button>
        </form>
        <p class="small center links">
          Already have an account? <a routerLink="/login">Sign in</a>
        </p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .auth {
      max-width: 640px;
    }
    .links {
      margin: var(--mb-space-4) 0 0;
    }
  `,
})
export class RegisterPage implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly flags = inject(FeatureFlagsService);
  readonly roleParam = input<string>(undefined, { alias: 'role' });

  protected readonly scope = SCOPE_OF_PRACTICE;
  protected readonly categories = Object.values(ProfessionalCategory);
  protected readonly role = signal<'PATIENT' | 'DOCTOR'>('PATIENT');
  protected readonly busy = signal(false);
  protected readonly errors = signal<string[]>([]);

  protected readonly form = this.fb.group({
    displayName: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(128)]],
    acceptTerms: [false, Validators.requiredTrue],
    acceptPrivacy: [false, Validators.requiredTrue],
    ageConfirmedAdult: [false],
    aiProcessingConsent: [false],
    doctor: this.fb.group({
      professionalCategory: this.fb.control<ProfessionalCategory>(
        ProfessionalCategory.CLINICAL_PSYCHOLOGIST,
      ),
      registrationNumber: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(60),
          Validators.pattern(/^[A-Za-z0-9/\-. ]+$/),
        ],
      ],
      registrationCouncil: [
        '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(120)],
      ],
      qualifications: ['', Validators.required],
      specialties: ['', Validators.required],
      yearsExperience: [0, [Validators.min(0), Validators.max(70)]],
      languages: ['en', Validators.required],
    }),
  });

  ngOnInit() {
    this.setRole(this.roleParam() === Role.DOCTOR ? 'DOCTOR' : 'PATIENT');
  }

  protected setRole(role: 'PATIENT' | 'DOCTOR') {
    this.role.set(role);
    const doctor = this.form.controls.doctor;
    const adult = this.form.controls.ageConfirmedAdult;
    if (role === 'DOCTOR') {
      doctor.enable();
      adult.clearValidators();
    } else {
      doctor.disable();
      adult.setValidators(Validators.requiredTrue);
    }
    adult.updateValueAndValidity();
  }

  signUpWithGoogle() { window.location.href = '/api/v1/auth/google'; }
  async submit() {
    this.errors.set([]);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const v = this.form.getRawValue();
      const msgs: string[] = [];
      if (!v.acceptTerms || !v.acceptPrivacy)
        msgs.push('Please accept the terms and privacy notice to continue.');
      if (this.role() === 'PATIENT' && !v.ageConfirmedAdult)
        msgs.push('MindBridge is currently available to adults (18+) only.');
      this.errors.set(msgs);
      return;
    }
    const v = this.form.getRawValue();
    const body: Record<string, unknown> = {
      role: this.role(),
      displayName: v.displayName.trim(),
      email: v.email.trim(),
      password: v.password,
      acceptTerms: true,
      acceptPrivacy: true,
      timezone: localTimezone(),
      country: 'IN',
    };
    if (this.role() === 'PATIENT') {
      body['ageConfirmedAdult'] = true;
      body['aiProcessingConsent'] = v.aiProcessingConsent;
    } else {
      body['doctor'] = {
        professionalCategory: v.doctor.professionalCategory,
        registrationNumber: v.doctor.registrationNumber.trim(),
        registrationCouncil: v.doctor.registrationCouncil.trim(),
        qualifications: splitList(v.doctor.qualifications),
        specialties: splitList(v.doctor.specialties),
        languages: splitList(v.doctor.languages),
        yearsExperience: Number(v.doctor.yearsExperience),
      };
    }
    this.busy.set(true);
    try {
      const user = await this.auth.register(body);
      await this.router.navigateByUrl(this.auth.homeFor(user));
    } catch (err) {
      const e = ApiError.from(err);
      const details = Array.isArray(e.details) ? (e.details as unknown[]).map(String) : [];
      this.errors.set(details.length ? details : [e.message]);
    } finally {
      this.busy.set(false);
    }
  }
}
