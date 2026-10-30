import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  ConsultationMode,
  type DoctorPublicProfile,
  type PageMeta,
  ProfessionalCategory,
  Role,
  SCOPE_OF_PRACTICE,
  type TimeSlot,
  type AppointmentSummary,
} from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { ApiError, errorMessage } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { FeatureFlagsService } from '../../core/services/feature-flags.service';
import { PaginationComponent } from '../../shared/ui/pagination';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../shared/ui/states';
import { categoryLabel, humanize, isoDate, localTimezone, money } from '../../shared/util/format';

function basePath(router: Router) {
  return router.url.startsWith('/patient') ? '/patient/professionals' : '/professionals';
}

@Component({
  selector: 'mb-professionals',
  imports: [
    FormsModule,
    RouterLink,
    LoadingComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    PaginationComponent,
  ],
  template: `
    <div class="container page">
      <header class="page-header">
        <h1>Find a professional</h1>
        <p>Every professional listed here has had their registration checked by our team.</p>
      </header>

      <form class="card-flat filters" (ngSubmit)="load()" role="search">
        <div class="field">
          <label for="q">Search</label>
          <input
            id="q"
            class="input"
            name="q"
            [(ngModel)]="filters.q"
            placeholder="Name or area, e.g. anxiety"
          />
        </div>
        <div class="field">
          <label for="category">Type of professional</label>
          <select id="category" class="input" name="category" [(ngModel)]="filters.category">
            <option value="">Any</option>
            @for (c of categories; track c) {
              <option [value]="c">{{ scope[c].label }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label for="language">Language</label>
          <select id="language" class="input" name="language" [(ngModel)]="filters.language">
            <option value="">Any</option>
            @for (l of facets().languages; track l) {
              <option [value]="l">{{ l }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label for="mode">Session type</label>
          <select id="mode" class="input" name="mode" [(ngModel)]="filters.mode">
            <option value="">Any</option>
            <option value="ONLINE">Online</option>
            <option value="IN_PERSON">In person</option>
          </select>
        </div>
        <div class="field">
          <label for="maxFee">Max fee</label>
          <input
            id="maxFee"
            class="input"
            type="number"
            min="0"
            name="maxFee"
            [(ngModel)]="filters.maxFee"
          />
        </div>
        <div class="actions"><button class="btn" type="submit">Search</button></div>
      </form>

      @if (loading()) {
        <mb-loading [lines]="5" />
      } @else if (error()) {
        <mb-error [message]="error()!" (retry)="load()" />
      } @else if (!items().length) {
        <mb-empty title="No professionals match" text="Try removing a filter." />
      } @else {
        <div class="grid">
          @for (d of items(); track d.id) {
            <article class="card-flat pro">
              <div class="row-between">
                <h2 class="h3">{{ d.displayName }}</h2>
                @if (d.verified) {
                  <span class="badge badge-success">Verified</span>
                }
              </div>
              <p class="small">
                <strong>{{ label(d.professionalCategory) }}</strong> · {{ d.yearsExperience }} yrs
              </p>
              <p class="small muted">{{ d.specialties.join(', ') }}</p>
              <p class="small">
                {{ fee(d.consultationFee) }} · {{ d.consultationModes.map(modeLabel).join(' / ') }}
              </p>
              @if (d.ratingAverage !== null) {
                <p class="small muted">★ {{ d.ratingAverage.toFixed(1) }} ({{ d.ratingCount }})</p>
              }
              <a class="btn btn-secondary btn-sm" [routerLink]="[base, d.id]">View profile</a>
            </article>
          }
        </div>
        <mb-pagination [meta]="meta()" (page)="load($event)" />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .filters {
      display: grid;
      gap: var(--mb-space-3);
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      align-items: end;
      margin-bottom: var(--mb-space-5);
    }
    .filters .field {
      margin: 0;
    }
    .actions {
      padding-bottom: 2px;
    }
    .pro {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .pro p {
      margin: 0;
    }
    .h3 {
      font-size: 1.1rem;
      margin: 0;
    }
    .pro .btn {
      margin-top: 8px;
      align-self: flex-start;
    }
  `,
})
export class ProfessionalsPage {
  private readonly api = inject(ApiService);
  protected readonly base = basePath(inject(Router));
  protected readonly scope = SCOPE_OF_PRACTICE;
  protected readonly categories = Object.values(ProfessionalCategory);
  protected readonly items = signal<DoctorPublicProfile[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly facets = signal<{ specialties: string[]; languages: string[] }>({
    specialties: [],
    languages: [],
  });
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected filters = {
    q: '',
    category: '',
    language: '',
    mode: '',
    maxFee: null as number | null,
  };
  protected readonly label = categoryLabel;
  protected readonly fee = money;
  protected readonly modeLabel = (m: string) =>
    m === ConsultationMode.ONLINE ? 'Online' : 'In person';

  constructor() {
    void this.load();
    this.api.get<{ specialties: string[]; languages: string[] }>('/doctors/facets').then(
      (f) => this.facets.set(f),
      () => undefined,
    );
  }

  async load(page = 1) {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.api.page<DoctorPublicProfile>('/doctors', {
        ...this.filters,
        page,
        pageSize: 12,
      });
      this.items.set(res.items);
      this.meta.set(res.meta);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}

interface DaySlots {
  date: string;
  slots: TimeSlot[];
}

@Component({
  selector: 'mb-professional-detail',
  imports: [DatePipe, RouterLink, ReactiveFormsModule, LoadingComponent, ErrorStateComponent],
  template: `
    <div class="container page">
      <a [routerLink]="base" class="small">← All professionals</a>
      @if (loading()) {
        <mb-loading [lines]="6" />
      } @else if (error()) {
        <mb-error [message]="error()!" (retry)="load()" />
      } @else if (doctor(); as d) {
        <div class="layout">
          <section class="card">
            <div class="row-between">
              <h1>{{ d.displayName }}</h1>
              @if (d.verified) {
                <span class="badge badge-success">Registration verified</span>
              }
            </div>
            <p>
              <strong>{{ label(d.professionalCategory) }}</strong> · {{ d.yearsExperience }} years
              of experience
            </p>
            <p class="small muted">{{ scope[d.professionalCategory].description }}</p>
            <p class="small">
              @if (scope[d.professionalCategory].mayPrescribe) {
                Can assess and diagnose, and may prescribe medication in person. MindBridge itself
                does not issue prescriptions.
              } @else if (scope[d.professionalCategory].mayDiagnose) {
                Can provide psychological assessment and therapy. Does not prescribe medication.
              } @else {
                Provides counselling and support. Does not diagnose or prescribe medication.
              }
            </p>
            <hr class="divider" />
            <h2 class="h3">About</h2>
            <p class="bio">{{ d.bio || 'This professional has not added a biography yet.' }}</p>
            <dl class="facts">
              <dt>Qualifications</dt>
              <dd>{{ d.qualifications.join(', ') }}</dd>
              <dt>Areas of focus</dt>
              <dd>{{ d.specialties.join(', ') }}</dd>
              <dt>Languages</dt>
              <dd>{{ d.languages.join(', ') }}</dd>
              <dt>Fee</dt>
              <dd>{{ fee(d.consultationFee) }} for {{ d.slotDurationMinutes }} minutes</dd>
              <dt>Sessions</dt>
              <dd>{{ modes(d.consultationModes) }}</dd>
              @if (d.ratingAverage !== null) {
                <dt>Rating</dt>
                <dd>★ {{ d.ratingAverage.toFixed(1) }} from {{ d.ratingCount }} reviews</dd>
              }
            </dl>
          </section>

          <section class="card booking" aria-labelledby="book-title">
            <h2 id="book-title">Book a session</h2>
            @if (!flags.enabled('booking.enabled')) {
              <div class="alert alert-warning">
                Booking is paused at the moment. Please try again later.
              </div>
            } @else if (auth.role() && auth.role() !== 'PATIENT') {
              <p class="muted">Only patient accounts can book sessions.</p>
            } @else {
              <p class="small muted">Times are shown in your timezone ({{ tz }}).</p>
              @if (slotsLoading()) {
                <mb-loading [lines]="3" label="Loading available times" />
              } @else if (!days().length) {
                <p class="muted">No open times in the next two weeks.</p>
              } @else {
                <div class="days" role="listbox" aria-label="Available times">
                  @for (day of days(); track day.date) {
                    <div class="day">
                      <div class="day-label">{{ day.slots[0].startAt | date: 'EEE d MMM' }}</div>
                      <div class="slots">
                        @for (s of day.slots; track s.startAt) {
                          <button
                            type="button"
                            class="btn btn-sm"
                            [class.btn-secondary]="selected()?.startAt !== s.startAt"
                            role="option"
                            [attr.aria-selected]="selected()?.startAt === s.startAt"
                            (click)="selected.set(s)"
                          >
                            {{ s.startAt | date: 'shortTime' }}
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              }

              @if (selected(); as s) {
                <form [formGroup]="form" (ngSubmit)="book()" class="book-form">
                  <p>
                    <strong
                      >{{ s.startAt | date: 'fullDate' }} at
                      {{ s.startAt | date: 'shortTime' }}</strong
                    >
                  </p>
                  <div class="field">
                    <label for="mode">Session type</label>
                    <select id="mode" class="input" formControlName="mode">
                      @for (m of d.consultationModes; track m) {
                        <option [value]="m">{{ modes([m]) }}</option>
                      }
                    </select>
                  </div>
                  <div class="field">
                    <label for="reason"
                      >What would you like help with? <span class="muted">(optional)</span></label
                    >
                    <textarea
                      id="reason"
                      class="textarea"
                      formControlName="reasonForVisit"
                      maxlength="500"
                    ></textarea>
                  </div>
                  <details>
                    <summary>Add an intake form (optional)</summary>
                    <div formGroupName="intake" class="intake">
                      <div class="field">
                        <label for="mc">Main concerns</label
                        ><textarea
                          id="mc"
                          class="textarea"
                          formControlName="mainConcerns"
                          maxlength="2000"
                        ></textarea>
                      </div>
                      <div class="field">
                        <label for="goals">What you hope to get from sessions</label
                        ><textarea
                          id="goals"
                          class="textarea"
                          formControlName="goals"
                          maxlength="1000"
                        ></textarea>
                      </div>
                      <div class="field">
                        <label for="dur">How long has this been going on?</label
                        ><input id="dur" class="input" formControlName="duration" maxlength="200" />
                      </div>
                      <div class="field">
                        <label for="prev">Any previous support</label
                        ><textarea
                          id="prev"
                          class="textarea"
                          formControlName="previousSupport"
                          maxlength="1000"
                        ></textarea>
                      </div>
                    </div>
                    <label class="checkbox">
                      <input type="checkbox" formControlName="shareIntake" />
                      <span
                        >Share this intake form with {{ d.displayName }}. You can withdraw this
                        later.</span
                      >
                    </label>
                  </details>
                  @if (bookError()) {
                    <div class="alert alert-danger" role="alert">{{ bookError() }}</div>
                  }
                  <button class="btn btn-block" type="submit" [disabled]="booking()">
                    {{
                      auth.isAuthenticated()
                        ? booking()
                          ? 'Requesting…'
                          : 'Request appointment'
                        : 'Sign in to book'
                    }}
                  </button>
                  <p class="small muted">
                    Your professional will confirm the request. You can cancel from your
                    appointments.
                  </p>
                </form>
              }
            }
          </section>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .layout {
      display: grid;
      gap: var(--mb-space-5);
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
      align-items: start;
      margin-top: var(--mb-space-3);
    }
    @media (max-width: 900px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }
    .h3 {
      font-size: 1.1rem;
    }
    .bio {
      white-space: pre-wrap;
    }
    .facts {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 6px 16px;
    }
    dt {
      font-weight: 600;
    }
    dd {
      margin: 0;
    }
    .days {
      display: grid;
      gap: var(--mb-space-3);
      max-height: 360px;
      overflow: auto;
    }
    .day-label {
      font-weight: 600;
      margin-bottom: 6px;
    }
    .slots {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .book-form {
      margin-top: var(--mb-space-4);
    }
    details {
      margin-bottom: var(--mb-space-4);
    }
    summary {
      cursor: pointer;
      font-weight: 600;
      margin-bottom: 8px;
    }
  `,
})
export class ProfessionalDetailPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly flags = inject(FeatureFlagsService);
  readonly id = input.required<string>();
  protected readonly base = basePath(this.router);
  protected readonly scope = SCOPE_OF_PRACTICE;
  protected readonly tz = localTimezone();
  protected readonly doctor = signal<DoctorPublicProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly slots = signal<TimeSlot[]>([]);
  protected readonly slotsLoading = signal(false);
  protected readonly selected = signal<TimeSlot | null>(null);
  protected readonly booking = signal(false);
  protected readonly bookError = signal<string | null>(null);
  protected readonly label = categoryLabel;
  protected readonly fee = money;

  protected readonly days = computed<DaySlots[]>(() => {
    const map = new Map<string, TimeSlot[]>();
    for (const s of this.slots()) {
      const key = isoDate(new Date(s.startAt));
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map.entries()].map(([date, slots]) => ({ date, slots }));
  });

  protected readonly form = inject(FormBuilder).nonNullable.group({
    mode: [ConsultationMode.ONLINE as ConsultationMode, Validators.required],
    reasonForVisit: [''],
    shareIntake: [true],
    intake: inject(FormBuilder).nonNullable.group({
      mainConcerns: [''],
      goals: [''],
      duration: [''],
      previousSupport: [''],
    }),
  });

  constructor() {
    effect(() => {
      this.id();
      void this.load();
    });
  }

  protected modes(ms: ConsultationMode[]) {
    return ms.map((m) => (m === ConsultationMode.ONLINE ? 'Online' : 'In person')).join(' or ');
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const d = await this.api.get<DoctorPublicProfile>(`/doctors/${this.id()}`);
      this.doctor.set(d);
      this.form.controls.mode.setValue(d.consultationModes[0] ?? ConsultationMode.ONLINE);
      void this.loadSlots();
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async loadSlots() {
    this.slotsLoading.set(true);
    try {
      const from = new Date();
      const to = new Date(Date.now() + 13 * 86400_000);
      this.slots.set(
        await this.api.get<TimeSlot[]>(`/doctors/${this.id()}/slots`, {
          from: isoDate(from),
          to: isoDate(to),
        }),
      );
    } catch {
      this.slots.set([]);
    } finally {
      this.slotsLoading.set(false);
    }
  }

  async book() {
    if (!this.auth.isAuthenticated()) {
      await this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/patient/professionals/${this.id()}` },
      });
      return;
    }
    if (this.auth.role() !== Role.PATIENT) return;
    const slot = this.selected();
    if (!slot) return;
    const v = this.form.getRawValue();
    const hasIntake = v.intake.mainConcerns.trim().length > 0;
    this.booking.set(true);
    this.bookError.set(null);
    try {
      const appt = await this.api.post<AppointmentSummary>('/appointments', {
        doctorId: this.id(),
        startAt: slot.startAt,
        mode: v.mode,
        reasonForVisit: v.reasonForVisit.trim() || undefined,
        patientTimezone: this.tz,
        intake: hasIntake
          ? Object.fromEntries(
              Object.entries(v.intake)
                .filter(([, x]) => x.trim())
                .map(([k, x]) => [k, x.trim()]),
            )
          : undefined,
        shareIntake: hasIntake && v.shareIntake,
      });
      await this.router.navigate(['/patient/appointments', appt.id], {
        queryParams: { booked: 1 },
      });
    } catch (err) {
      const e = ApiError.from(err);
      this.bookError.set(e.message);
      if (e.status === 409) {
        this.selected.set(null);
        void this.loadSlots();
      }
    } finally {
      this.booking.set(false);
    }
  }

  protected readonly humanize = humanize;
}
