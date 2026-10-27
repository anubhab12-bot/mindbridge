import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { type AppointmentSummary, AppointmentStatus, ConsultationMode, type PageMeta, Role, type TimeSlot } from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { ApiError, errorMessage } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../shared/ui/confirm';
import { PaginationComponent } from '../../shared/ui/pagination';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../shared/ui/states';
import { categoryLabel, humanize, isoDate } from '../../shared/util/format';

const STATUS_BADGE: Record<string, string> = {
  REQUESTED: 'badge-warning',
  CONFIRMED: 'badge-primary',
  COMPLETED: 'badge-success',
  CANCELLED: 'badge',
  NO_SHOW: 'badge-danger',
};

export function statusBadge(s: string) {
  return STATUS_BADGE[s] ?? 'badge';
}

@Component({
  selector: 'mb-appointments',
  imports: [DatePipe, RouterLink, LoadingComponent, ErrorStateComponent, EmptyStateComponent, PaginationComponent],
  template: `
    <div class="page">
      <header class="page-header row-between">
        <h1>Appointments</h1>
        @if (!isDoctor()) { <a routerLink="/patient/professionals" class="btn btn-sm">Book a session</a> }
      </header>
      <div class="tabs" role="tablist">
        @for (t of tabs; track t.key) {
          <button type="button" role="tab" [attr.aria-selected]="tab() === t.key" (click)="setTab(t.key)">{{ t.label }}</button>
        }
      </div>
      @if (loading()) {
        <mb-loading [lines]="4" />
      } @else if (error()) {
        <mb-error [message]="error()!" (retry)="load()" />
      } @else if (!items().length) {
        <mb-empty title="No appointments here" />
      } @else {
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>When</th><th>{{ isDoctor() ? 'Patient' : 'Professional' }}</th><th>Type</th><th>Status</th><th><span class="visually-hidden">Actions</span></th></tr></thead>
            <tbody>
              @for (a of items(); track a.id) {
                <tr>
                  <td>{{ a.startAt | date: 'EEE d MMM y, h:mm a' }}</td>
                  <td>
                    @if (isDoctor()) { {{ a.patient?.displayName }} } @else { {{ a.doctor.displayName }} <div class="small muted">{{ label(a.doctor.professionalCategory) }}</div> }
                  </td>
                  <td>{{ a.mode === 'ONLINE' ? 'Online' : 'In person' }}</td>
                  <td><span class="badge" [class]="badge(a.status)">{{ human(a.status) }}</span></td>
                  <td><a [routerLink]="[base(), a.id]">Details</a></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <mb-pagination [meta]="meta()" (page)="load($event)" />
      }
    </div>
  `,
})
export class AppointmentsPage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  protected readonly isDoctor = computed(() => this.auth.role() === Role.DOCTOR);
  protected readonly base = computed(() => (this.isDoctor() ? '/doctor/appointments' : '/patient/appointments'));
  protected readonly tab = signal<string>('upcoming');
  protected readonly items = signal<AppointmentSummary[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly label = categoryLabel;
  protected readonly human = humanize;
  protected readonly badge = statusBadge;
  protected readonly tabs = this.isDoctor()
    ? [
        { key: 'upcoming', label: 'Upcoming' },
        { key: 'REQUESTED', label: 'Requests' },
        { key: 'past', label: 'Past' },
      ]
    : [
        { key: 'upcoming', label: 'Upcoming' },
        { key: 'past', label: 'Past' },
        { key: 'all', label: 'All' },
      ];

  constructor() {
    void this.load();
  }

  setTab(t: string) {
    this.tab.set(t);
    void this.load();
  }

  async load(page = 1) {
    this.loading.set(true);
    this.error.set(null);
    try {
      let res;
      if (this.isDoctor()) {
        const now = new Date().toISOString();
        const t = this.tab();
        const params =
          t === 'REQUESTED' ? { status: AppointmentStatus.REQUESTED } : t === 'past' ? { to: now } : { from: now };
        res = await this.api.page<AppointmentSummary>('/doctors/me/appointments', { ...params, page, pageSize: 20 });
      } else {
        res = await this.api.page<AppointmentSummary>('/patients/appointments', { scope: this.tab(), page, pageSize: 20 });
      }
      this.items.set(res.items);
      this.meta.set(res.meta);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}

interface AppointmentDetail extends AppointmentSummary {
  history: { action: string; actorRole: string; at: string }[];
  outcome?: { summary?: string; followUpRecommended?: boolean; followUpInWeeks?: number } | null;
  cancellation?: { by: string; reason?: string; at: string } | null;
  intake: { shared: boolean; answers?: Record<string, string> } | null;
}

const INTAKE_LABELS: Record<string, string> = {
  mainConcerns: 'Main concerns',
  goals: 'Goals',
  duration: 'How long',
  previousSupport: 'Previous support',
  currentMedicationsMentioned: 'Medications mentioned',
  preferredLanguage: 'Preferred language',
  anythingElse: 'Anything else',
};

@Component({
  selector: 'mb-appointment-detail',
  imports: [DatePipe, RouterLink, FormsModule, LoadingComponent, ErrorStateComponent],
  template: `
    <div class="page narrow">
      <a [routerLink]="base()" class="small">← Appointments</a>
      @if (booked()) {
        <div class="alert alert-success" role="status">Your request has been sent. You'll be notified when it's confirmed.</div>
      }
      @if (loading()) {
        <mb-loading [lines]="6" />
      } @else if (error()) {
        <mb-error [message]="error()!" (retry)="load()" />
      } @else if (appt(); as a) {
        <section class="card">
          <div class="row-between">
            <h1>{{ a.startAt | date: 'EEEE d MMMM, h:mm a' }}</h1>
            <span class="badge" [class]="badge(a.status)">{{ human(a.status) }}</span>
          </div>
          <dl class="facts">
            @if (isDoctor()) {
              <dt>Patient</dt><dd>{{ a.patient?.displayName }} · <a [routerLink]="['/doctor/patients', a.patient?.id]">Open record</a></dd>
            } @else {
              <dt>Professional</dt><dd><a [routerLink]="['/patient/professionals', a.doctor.id]">{{ a.doctor.displayName }}</a> · {{ label(a.doctor.professionalCategory) }}</dd>
            }
            <dt>Ends</dt><dd>{{ a.endAt | date: 'h:mm a' }}</dd>
            <dt>Type</dt><dd>{{ a.mode === 'ONLINE' ? 'Online' : 'In person' }}</dd>
            @if (a.reasonForVisit) { <dt>Reason</dt><dd class="pre">{{ a.reasonForVisit }}</dd> }
            @if (a.cancellation) { <dt>Cancelled</dt><dd>By {{ human(a.cancellation.by) }}@if (a.cancellation.reason) {: {{ a.cancellation.reason }}}</dd> }
            @if (a.outcome?.summary) { <dt>Session summary</dt><dd class="pre">{{ a.outcome!.summary }}</dd> }
            @if (a.outcome?.followUpRecommended) { <dt>Follow-up</dt><dd>Recommended in about {{ a.outcome!.followUpInWeeks ?? '?' }} weeks</dd> }
          </dl>

          <div class="row actions">
            @if (a.mode === 'ONLINE' && a.status === 'CONFIRMED') {
              <button class="btn" type="button" (click)="join()">Join video</button>
            }
            @if (isDoctor() && a.status === 'REQUESTED') {
              <button class="btn" type="button" (click)="act('confirm')">Confirm</button>
              <button class="btn btn-secondary" type="button" (click)="act('decline', true)">Decline</button>
            }
            @if (a.canReschedule) { <button class="btn btn-secondary" type="button" (click)="startReschedule()">Reschedule</button> }
            @if (a.canCancel) { <button class="btn btn-ghost" type="button" (click)="act('cancel', true)">Cancel appointment</button> }
            @if (isDoctor() && a.status === 'CONFIRMED' && isPast(a)) {
              <button class="btn btn-ghost" type="button" (click)="act('no-show')">Mark no-show</button>
            }
          </div>
          @if (videoMessage()) { <div class="alert alert-info small">{{ videoMessage() }}</div> }
        </section>

        @if (rescheduling()) {
          <section class="card">
            <h2>Choose a new time</h2>
            @if (!slots()) { <mb-loading /> } @else if (!slots()!.length) { <p class="muted">No open times in the next two weeks.</p> } @else {
              <div class="slots">
                @for (s of slots(); track s.startAt) {
                  <button type="button" class="btn btn-sm btn-secondary" (click)="reschedule(s)">{{ s.startAt | date: 'EEE d MMM, h:mm a' }}</button>
                }
              </div>
            }
            <button class="btn btn-ghost btn-sm" type="button" (click)="rescheduling.set(false)">Close</button>
          </section>
        }

        @if (isDoctor() && a.status === 'CONFIRMED' && isStarted(a)) {
          <section class="card">
            <h2>Complete session</h2>
            <div class="field">
              <label for="sum">Summary for the patient <span class="muted">(optional, visible to them)</span></label>
              <textarea id="sum" class="textarea" [(ngModel)]="completion.summary" maxlength="2000"></textarea>
            </div>
            <label class="checkbox"><input type="checkbox" [(ngModel)]="completion.followUpRecommended" /><span>Recommend a follow-up</span></label>
            @if (completion.followUpRecommended) {
              <div class="field small-field"><label for="weeks">In how many weeks?</label><input id="weeks" class="input" type="number" min="1" max="52" [(ngModel)]="completion.followUpInWeeks" /></div>
            }
            <button class="btn" type="button" (click)="complete()">Mark as completed</button>
            <p class="small muted">Private clinical notes go in the patient record, not here.</p>
          </section>
        }

        @if (!isDoctor() && a.status === 'COMPLETED' && !rated()) {
          <section class="card">
            <h2>How was your session?</h2>
            <div class="stars" role="radiogroup" aria-label="Rating">
              @for (n of [1, 2, 3, 4, 5]; track n) {
                <button type="button" class="star" role="radio" [attr.aria-checked]="rating === n" [attr.aria-label]="n + ' out of 5'" (click)="rating = n">{{ n <= rating ? '★' : '☆' }}</button>
              }
            </div>
            <div class="field"><label for="cm">Comment <span class="muted">(optional, reviewed before it's shown)</span></label><textarea id="cm" class="textarea" [(ngModel)]="comment" maxlength="1000"></textarea></div>
            <button class="btn" type="button" [disabled]="!rating" (click)="rate()">Submit feedback</button>
          </section>
        }

        @if (a.intake) {
          <section class="card">
            <h2>Intake form</h2>
            @if (!a.intake.shared) {
              <p class="muted">The patient has not shared their intake form with you.</p>
            } @else {
              <dl class="facts">
                @for (e of intakeEntries(); track e[0]) { <dt>{{ e[0] }}</dt><dd class="pre">{{ e[1] }}</dd> }
              </dl>
            }
          </section>
        }

        <section class="card-flat">
          <h2 class="h3">History</h2>
          <ul class="list small">
            @for (h of a.history; track $index) { <li>{{ h.at | date: 'medium' }} · {{ human(h.action) }} by {{ human(h.actorRole) }}</li> }
          </ul>
        </section>
      }
    </div>
  `,
  styles: `.narrow { max-width: 860px; } .card { margin: var(--mb-space-4) 0; }
    .facts { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; } dt { font-weight: 600; } dd { margin: 0; } .pre { white-space: pre-wrap; }
    .actions { margin-top: var(--mb-space-4); } .slots { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: var(--mb-space-3); }
    .stars { display: flex; gap: 4px; margin-bottom: var(--mb-space-3); } .star { all: unset; cursor: pointer; font-size: 1.8rem; color: var(--mb-warning); }
    .star:focus-visible { outline: 3px solid var(--mb-focus); } .small-field { max-width: 200px; } .h3 { font-size: 1.05rem; }`,
})
export class AppointmentDetailPage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  readonly id = input.required<string>();
  readonly bookedParam = input<string>(undefined, { alias: 'booked' });
  protected readonly booked = computed(() => this.bookedParam() === '1');
  protected readonly isDoctor = computed(() => this.auth.role() === Role.DOCTOR);
  protected readonly base = computed(() => (this.isDoctor() ? '/doctor/appointments' : '/patient/appointments'));
  protected readonly appt = signal<AppointmentDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly videoMessage = signal<string | null>(null);
  protected readonly rescheduling = signal(false);
  protected readonly slots = signal<TimeSlot[] | null>(null);
  protected readonly rated = signal(false);
  protected readonly label = categoryLabel;
  protected readonly human = humanize;
  protected readonly badge = statusBadge;
  protected rating = 0;
  protected comment = '';
  protected completion = { summary: '', followUpRecommended: false, followUpInWeeks: 4 };

  protected readonly intakeEntries = computed(() =>
    Object.entries(this.appt()?.intake?.answers ?? {}).map(([k, v]) => [INTAKE_LABELS[k] ?? humanize(k), v] as const),
  );

  constructor() {
    effect(() => {
      this.id();
      void this.load();
    });
  }

  protected isPast(a: AppointmentSummary) {
    return new Date(a.endAt).getTime() < Date.now();
  }
  protected isStarted(a: AppointmentSummary) {
    return new Date(a.startAt).getTime() <= Date.now();
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.appt.set(await this.api.get<AppointmentDetail>(`/appointments/${this.id()}`));
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async act(action: 'confirm' | 'decline' | 'cancel' | 'no-show', askReason = false) {
    let reason: string | undefined;
    if (askReason) {
      const ok = await this.confirm.ask({
        title: action === 'decline' ? 'Decline this request?' : 'Cancel this appointment?',
        message: 'The other person will be notified.',
        confirmLabel: action === 'decline' ? 'Decline' : 'Cancel appointment',
        danger: true,
      });
      if (!ok) return;
      reason = undefined;
    }
    try {
      await this.api.post(`/appointments/${this.id()}/${action}`, reason ? { reason } : {});
      this.toast.success('Appointment updated.');
      await this.load();
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async join() {
    this.videoMessage.set(null);
    try {
      const res = await this.api.get<{ joinUrl: string }>(`/appointments/${this.id()}/video-access`);
      if (res.joinUrl.startsWith('https://')) window.open(res.joinUrl, '_blank', 'noopener');
    } catch (err) {
      this.videoMessage.set(ApiError.from(err).message);
    }
  }

  async startReschedule() {
    const a = this.appt();
    if (!a) return;
    this.rescheduling.set(true);
    this.slots.set(null);
    try {
      this.slots.set(
        await this.api.get<TimeSlot[]>(`/doctors/${a.doctor.id}/slots`, { from: isoDate(new Date()), to: isoDate(new Date(Date.now() + 13 * 86400_000)) }),
      );
    } catch {
      this.slots.set([]);
    }
  }

  async reschedule(s: TimeSlot) {
    try {
      await this.api.post(`/appointments/${this.id()}/reschedule`, { startAt: s.startAt });
      this.rescheduling.set(false);
      this.toast.success('Appointment moved.');
      await this.load();
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async complete() {
    try {
      const c = this.completion;
      await this.api.post(`/appointments/${this.id()}/complete`, {
        summary: c.summary.trim() || undefined,
        followUpRecommended: c.followUpRecommended,
        followUpInWeeks: c.followUpRecommended ? Number(c.followUpInWeeks) : undefined,
      });
      this.toast.success('Session marked as completed.');
      await this.load();
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async rate() {
    try {
      await this.api.post(`/appointments/${this.id()}/feedback`, { rating: this.rating, comment: this.comment.trim() || undefined });
      this.rated.set(true);
      this.toast.success('Thank you for your feedback.');
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  protected readonly modes = ConsultationMode;
}
