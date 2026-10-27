import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AppointmentSummary } from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { LoadingComponent } from '../../shared/ui/states';
import { MOOD_LABELS } from '../../shared/ui/mood-scale';
import { categoryLabel } from '../../shared/util/format';
import type { MoodEntryView } from './mood';

@Component({
  selector: 'mb-patient-dashboard',
  imports: [RouterLink, DatePipe, LoadingComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Hi {{ auth.user()?.displayName }}</h1>
        <p>How are things today? Take whatever you need from here.</p>
      </header>

      <div class="grid-2">
        <section class="card">
          <h2>Today's check-in</h2>
          @if (loading()) {
            <mb-loading [lines]="2" />
          } @else if (today(); as t) {
            <p>You checked in as <strong>{{ moodLabel(t.score) }}</strong>@if (t.emotions.length) {, feeling {{ t.emotions.join(', ') }}}.</p>
            <a routerLink="/patient/mood" class="btn btn-secondary btn-sm">See your mood history</a>
          } @else {
            <p class="muted">You haven't checked in yet today.</p>
            <a routerLink="/patient/mood" class="btn">Check in now</a>
          }
        </section>

        <section class="card">
          <h2>Upcoming sessions</h2>
          @if (loading()) {
            <mb-loading [lines]="2" />
          } @else if (!upcoming().length) {
            <p class="muted">No sessions booked.</p>
            <a routerLink="/patient/professionals" class="btn btn-secondary btn-sm">Find a professional</a>
          } @else {
            <ul class="list">
              @for (a of upcoming(); track a.id) {
                <li>
                  <a [routerLink]="['/patient/appointments', a.id]">{{ a.startAt | date: 'EEE d MMM, h:mm a' }}</a>
                  <div class="small muted">{{ a.doctor.displayName }} · {{ label(a.doctor.professionalCategory) }} · {{ a.status === 'REQUESTED' ? 'Awaiting confirmation' : 'Confirmed' }}</div>
                </li>
              }
            </ul>
          }
        </section>
      </div>

      <h2 class="section">Quick links</h2>
      <div class="grid">
        <a class="card-flat quick" routerLink="/patient/companion"><strong>Talk to the AI companion</strong><span class="small muted">A supportive listener, any time.</span></a>
        <a class="card-flat quick" routerLink="/patient/journal"><strong>Write in your journal</strong><span class="small muted">Private and encrypted.</span></a>
        <a class="card-flat quick" routerLink="/patient/self-help"><strong>Try a short exercise</strong><span class="small muted">Breathing, grounding, sleep.</span></a>
        <a class="card-flat quick" routerLink="/patient/messages"><strong>Message your care team</strong><span class="small muted">For non-urgent questions.</span></a>
      </div>

      <section class="alert alert-crisis help">
        <strong>If you're in crisis</strong>, please don't wait for a reply here. <a routerLink="/crisis">See crisis contacts</a>.
      </section>
    </div>
  `,
  styles: `.section { margin-top: var(--mb-space-6); } .quick { display: flex; flex-direction: column; gap: 4px; text-decoration: none; color: inherit; }
    .quick:hover { border-color: var(--mb-primary); } .help { margin-top: var(--mb-space-6); }`,
})
export class PatientDashboardPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  protected readonly loading = signal(true);
  protected readonly today = signal<MoodEntryView | null>(null);
  protected readonly upcoming = signal<AppointmentSummary[]>([]);
  protected readonly label = categoryLabel;
  protected readonly moodLabel = (s: number) => MOOD_LABELS[s - 1]?.toLowerCase() ?? '';

  async ngOnInit() {
    const [today, appts] = await Promise.allSettled([
      this.api.get<MoodEntryView | null>('/patients/mood-entries/today'),
      this.api.page<AppointmentSummary>('/patients/appointments', { scope: 'upcoming', pageSize: 3 }),
    ]);
    if (today.status === 'fulfilled') this.today.set(today.value);
    if (appts.status === 'fulfilled') this.upcoming.set(appts.value.items);
    this.loading.set(false);
  }
}
