import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type AppointmentSummary, AppointmentStatus } from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { LoadingComponent } from '../../shared/ui/states';
import type { OwnDoctorProfile } from './profile';

@Component({
  selector: 'mb-doctor-dashboard',
  imports: [DatePipe, RouterLink, LoadingComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Welcome, {{ auth.user()?.displayName }}</h1>
      </header>
      @if (!auth.user()?.mfaEnabled) {
        <div class="alert alert-warning">
          Protect patient data: <a routerLink="/settings">turn on two-step verification</a>.
        </div>
      }
      @if (profile() && profile()!.completeness.percent < 100) {
        <div class="alert alert-info">
          Your profile is {{ profile()!.completeness.percent }}% complete.
          <a routerLink="/doctor/profile">Finish it</a> so patients can find you.
        </div>
      }
      <div class="grid stats">
        <div class="card-flat stat">
          <span class="num">{{ stats()?.byStatus?.['REQUESTED'] ?? 0 }}</span
          ><span class="small muted">Requests waiting</span>
        </div>
        <div class="card-flat stat">
          <span class="num">{{ upcoming().length }}</span
          ><span class="small muted">Upcoming (next 7 days)</span>
        </div>
        <div class="card-flat stat">
          <span class="num">{{ stats()?.completedLast30Days ?? 0 }}</span
          ><span class="small muted">Completed (30 days)</span>
        </div>
      </div>
      <div class="grid-2">
        <section class="card">
          <h2>Requests</h2>
          @if (loading()) {
            <mb-loading />
          } @else if (!requests().length) {
            <p class="muted">No pending requests.</p>
          } @else {
            <ul class="list">
              @for (a of requests(); track a.id) {
                <li>
                  <a [routerLink]="['/doctor/appointments', a.id]">{{ a.patient?.displayName }}</a>
                  <span class="small muted">· {{ a.startAt | date: 'EEE d MMM, h:mm a' }}</span>
                </li>
              }
            </ul>
          }
        </section>
        <section class="card">
          <h2>Coming up</h2>
          @if (loading()) {
            <mb-loading />
          } @else if (!upcoming().length) {
            <p class="muted">Nothing in the next 7 days.</p>
          } @else {
            <ul class="list">
              @for (a of upcoming(); track a.id) {
                <li>
                  <a [routerLink]="['/doctor/appointments', a.id]">{{
                    a.startAt | date: 'EEE d MMM, h:mm a'
                  }}</a>
                  <span class="small muted"
                    >· {{ a.patient?.displayName }} ·
                    {{ a.mode === 'ONLINE' ? 'Online' : 'In person' }}</span
                  >
                </li>
              }
            </ul>
          }
        </section>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .stats {
      margin-bottom: var(--mb-space-5);
    }
    .stat {
      display: flex;
      flex-direction: column;
    }
    .num {
      font-size: 2rem;
      font-weight: 700;
    }
  `,
})
export class DoctorDashboardPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  protected readonly loading = signal(true);
  protected readonly profile = signal<OwnDoctorProfile | null>(null);
  protected readonly stats = signal<{
    byStatus: Record<string, number>;
    completedLast30Days: number;
  } | null>(null);
  protected readonly requests = signal<AppointmentSummary[]>([]);
  protected readonly upcoming = signal<AppointmentSummary[]>([]);

  async ngOnInit() {
    const now = new Date();
    const week = new Date(Date.now() + 7 * 86400_000);
    const [p, s, r, u] = await Promise.allSettled([
      this.api.get<OwnDoctorProfile>('/doctors/me'),
      this.api.get<{ byStatus: Record<string, number>; completedLast30Days: number }>(
        '/doctors/me/appointment-stats',
      ),
      this.api.page<AppointmentSummary>('/doctors/me/appointments', {
        status: AppointmentStatus.REQUESTED,
        from: now.toISOString(),
        pageSize: 10,
      }),
      this.api.page<AppointmentSummary>('/doctors/me/appointments', {
        status: AppointmentStatus.CONFIRMED,
        from: now.toISOString(),
        to: week.toISOString(),
        pageSize: 20,
      }),
    ]);
    if (p.status === 'fulfilled') this.profile.set(p.value);
    if (s.status === 'fulfilled') this.stats.set(s.value);
    if (r.status === 'fulfilled') this.requests.set(r.value.items);
    if (u.status === 'fulfilled') this.upcoming.set(u.value.items);
    this.loading.set(false);
  }
}
