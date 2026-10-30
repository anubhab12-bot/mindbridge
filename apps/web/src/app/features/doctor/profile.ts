import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ConsultationMode,
  type DoctorPublicProfile,
  DoctorVerificationStatus,
} from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { ApiError, errorMessage } from '../../core/api/api-error';
import { ToastService } from '../../core/services/toast.service';
import { LoadingComponent } from '../../shared/ui/states';
import { categoryLabel, humanize, splitList } from '../../shared/util/format';

export interface OwnDoctorProfile extends DoctorPublicProfile {
  registrationNumber: string;
  registrationCouncil: string;
  verificationStatus: DoctorVerificationStatus;
  workingHours: { dayOfWeek: number; start: string; end: string }[];
  clinicAddress?: string;
  completeness: { percent: number; checks: { key: string; done: boolean; label: string }[] };
}

@Component({
  selector: 'mb-doctor-profile',
  imports: [ReactiveFormsModule, RouterLink, LoadingComponent],
  template: `
    <div class="page narrow">
      <header class="page-header">
        <h1>Professional profile</h1>
        <p>This is what patients see when they find you.</p>
      </header>
      @if (!profile()) {
        <mb-loading [lines]="6" />
      } @else {
        @let p = profile()!;
        <section class="card-flat summary">
          <div class="row-between">
            <div>
              <strong>{{ p.displayName }}</strong> · {{ label(p.professionalCategory) }}
              <div class="small muted">
                Registration {{ p.registrationNumber }} · {{ p.registrationCouncil }} ·
                {{ human(p.verificationStatus) }}
              </div>
            </div>
            <div class="small">Profile {{ p.completeness.percent }}% complete</div>
          </div>
          <div
            class="progress"
            role="progressbar"
            [attr.aria-valuenow]="p.completeness.percent"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <span [style.width.%]="p.completeness.percent"></span>
          </div>
          @if (p.completeness.percent < 100) {
            <ul class="small todo">
              @for (c of p.completeness.checks; track c.key) {
                @if (!c.done) {
                  <li>{{ c.label }}</li>
                }
              }
            </ul>
          }
          <p class="small muted">
            To change your registration details, contact support. Working hours are set on the
            <a routerLink="/doctor/availability">availability</a> page.
          </p>
        </section>

        <form class="card" [formGroup]="form" (ngSubmit)="save()">
          <div class="field">
            <label for="bio">About you</label>
            <textarea
              id="bio"
              class="textarea tall"
              formControlName="bio"
              maxlength="3000"
            ></textarea>
            <span class="hint"
              >Describe your approach and who you work with. At least 80 characters. Avoid promising
              outcomes.</span
            >
          </div>
          <div class="grid-2">
            <div class="field">
              <label for="q">Qualifications</label
              ><input id="q" class="input" formControlName="qualifications" /><span class="hint"
                >Comma separated</span
              >
            </div>
            <div class="field">
              <label for="s">Areas of focus</label
              ><input id="s" class="input" formControlName="specialties" /><span class="hint"
                >Comma separated</span
              >
            </div>
            <div class="field">
              <label for="l">Languages</label
              ><input id="l" class="input" formControlName="languages" /><span class="hint"
                >Comma separated codes, e.g. en, hi</span
              >
            </div>
            <div class="field">
              <label for="y">Years of experience</label
              ><input
                id="y"
                class="input"
                type="number"
                min="0"
                max="70"
                formControlName="yearsExperience"
              />
            </div>
            <div class="field">
              <label for="fee">Fee per session</label
              ><input id="fee" class="input" type="number" min="0" formControlName="feeAmount" />
            </div>
            <div class="field">
              <label for="cur">Currency</label
              ><input id="cur" class="input" formControlName="feeCurrency" maxlength="3" />
            </div>
            <div class="field">
              <label for="dur">Session length (minutes)</label>
              <select id="dur" class="input" formControlName="slotDurationMinutes">
                @for (d of [30, 45, 50, 60, 90]; track d) {
                  <option [ngValue]="d">{{ d }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label for="tz">Your timezone</label
              ><input id="tz" class="input" formControlName="timezone" />
            </div>
          </div>
          <fieldset>
            <legend>Session types</legend>
            <label class="checkbox"
              ><input type="checkbox" formControlName="online" /><span>Online</span></label
            >
            <label class="checkbox"
              ><input type="checkbox" formControlName="inPerson" /><span>In person</span></label
            >
          </fieldset>
          @if (form.controls.inPerson.value) {
            <div class="field">
              <label for="addr">Clinic address</label
              ><textarea
                id="addr"
                class="textarea"
                formControlName="clinicAddress"
                maxlength="500"
              ></textarea>
            </div>
          }
          @if (errors().length) {
            <div class="alert alert-danger" role="alert">
              @for (e of errors(); track e) {
                <div>{{ e }}</div>
              }
            </div>
          }
          <button class="btn" type="submit" [disabled]="busy()">Save profile</button>
        </form>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .narrow {
      max-width: 860px;
    }
    .summary {
      margin-bottom: var(--mb-space-4);
    }
    .tall {
      min-height: 180px;
    }
    .progress {
      height: 8px;
      background: var(--mb-surface-2);
      border-radius: 999px;
      margin: 10px 0;
      overflow: hidden;
    }
    .progress span {
      display: block;
      height: 100%;
      background: var(--mb-primary);
    }
    .todo {
      margin: 0 0 8px;
      padding-left: 1.2rem;
    }
  `,
})
export class DoctorProfilePage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly label = categoryLabel;
  protected readonly human = humanize;
  protected readonly profile = signal<OwnDoctorProfile | null>(null);
  protected readonly busy = signal(false);
  protected readonly errors = signal<string[]>([]);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    bio: ['', Validators.maxLength(3000)],
    qualifications: [''],
    specialties: [''],
    languages: [''],
    yearsExperience: [0],
    feeAmount: [0, Validators.min(0)],
    feeCurrency: ['INR'],
    slotDurationMinutes: [50],
    timezone: [''],
    online: [true],
    inPerson: [false],
    clinicAddress: [''],
  });

  async ngOnInit() {
    try {
      const p = await this.api.get<OwnDoctorProfile>('/doctors/me');
      this.profile.set(p);
      this.form.setValue({
        bio: p.bio ?? '',
        qualifications: p.qualifications.join(', '),
        specialties: p.specialties.join(', '),
        languages: p.languages.join(', '),
        yearsExperience: p.yearsExperience,
        feeAmount: p.consultationFee.amount,
        feeCurrency: p.consultationFee.currency,
        slotDurationMinutes: p.slotDurationMinutes,
        timezone: p.timezone,
        online: p.consultationModes.includes(ConsultationMode.ONLINE),
        inPerson: p.consultationModes.includes(ConsultationMode.IN_PERSON),
        clinicAddress: p.clinicAddress ?? '',
      });
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async save() {
    const v = this.form.getRawValue();
    const modes = [
      ...(v.online ? [ConsultationMode.ONLINE] : []),
      ...(v.inPerson ? [ConsultationMode.IN_PERSON] : []),
    ];
    if (!modes.length) return this.errors.set(['Choose at least one session type.']);
    this.busy.set(true);
    this.errors.set([]);
    try {
      await this.api.patch('/doctors/me', {
        bio: v.bio.trim(),
        qualifications: splitList(v.qualifications),
        specialties: splitList(v.specialties),
        languages: splitList(v.languages),
        yearsExperience: Number(v.yearsExperience),
        consultationFee: {
          amount: Number(v.feeAmount),
          currency: v.feeCurrency.trim().toUpperCase(),
        },
        consultationModes: modes,
        slotDurationMinutes: Number(v.slotDurationMinutes),
        timezone: v.timezone.trim(),
        clinicAddress: v.inPerson ? v.clinicAddress.trim() : undefined,
      });
      this.profile.set(await this.api.get<OwnDoctorProfile>('/doctors/me'));
      this.toast.success('Profile saved.');
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
