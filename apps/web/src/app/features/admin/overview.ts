import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminPermission } from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { errorMessage } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ErrorStateComponent, LoadingComponent } from '../../shared/ui/states';
import { humanize, saveBlob } from '../../shared/util/format';

export interface Count {
  key: string;
  count: number | null;
  suppressed: boolean;
}

interface Dashboard {
  generatedAt: string;
  minGroupSize: number;
  users: {
    byRole: Count[];
    byStatus: Count[];
    newLast30Days: { count: number | null; suppressed: boolean };
  };
  doctors: { byVerificationStatus: Count[] };
  appointments: { byStatusLast30Days: Count[]; weeklyCreated: Count[] };
  ai: {
    byKind: {
      kind: string;
      count: number | null;
      suppressed: boolean;
      fallbackRate: number | null;
      mockResponses: number;
      avgLatencyMs: number | null;
    }[];
    safetyEventsByLevelLast30Days: Count[];
  };
  operations: {
    staleCrisisResources: number;
    openSupportTickets: number;
    pendingFeedbackModeration: number;
    queue: Record<string, unknown> | null;
  };
}

@Component({
  selector: 'mb-admin-overview',
  imports: [DatePipe, RouterLink, LoadingComponent, ErrorStateComponent],
  template: `
    <div class="page">
      <header class="page-header row-between">
        <div>
          <h1>Overview</h1>
          <p class="small">
            Aggregate figures only. Counts below {{ d()?.minGroupSize ?? '…' }} are hidden (shown as
            "&lt;{{ d()?.minGroupSize }}") to protect privacy.
          </p>
        </div>
        @if (canExport()) {
          <button class="btn btn-secondary btn-sm" type="button" (click)="exportCsv()">
            Download CSV report
          </button>
        }
      </header>
      @if (loading()) {
        <mb-loading [lines]="6" />
      } @else if (error()) {
        <mb-error [message]="error()!" (retry)="load()" />
      } @else if (d(); as d) {
        <div class="grid ops">
          <a
            class="card-flat stat"
            routerLink="/admin/crisis-resources"
            [class.warn]="d.operations.staleCrisisResources > 0"
          >
            <span class="num">{{ d.operations.staleCrisisResources }}</span
            ><span class="small">Crisis resources needing re-verification</span>
          </a>
          <a class="card-flat stat" routerLink="/admin/verifications"
            ><span class="num">{{ pendingDoctors() }}</span
            ><span class="small">Applications awaiting review</span></a
          >
          <a class="card-flat stat" routerLink="/admin/support"
            ><span class="num">{{ d.operations.openSupportTickets }}</span
            ><span class="small">Open support tickets</span></a
          >
          <a class="card-flat stat" routerLink="/admin/feedback"
            ><span class="num">{{ d.operations.pendingFeedbackModeration }}</span
            ><span class="small">Reviews to moderate</span></a
          >
        </div>
        <div class="grid-2">
          <section class="card">
            <h2>Users by role</h2>
            <table class="table">
              <tbody>
                @for (c of d.users.byRole; track c.key) {
                  <tr>
                    <td>{{ h(c.key) }}</td>
                    <td>{{ show(c) }}</td>
                  </tr>
                }
              </tbody>
            </table>
            <p class="small muted">
              New in the last 30 days:
              {{
                d.users.newLast30Days.suppressed
                  ? '<' + d.minGroupSize
                  : d.users.newLast30Days.count
              }}
            </p>
          </section>
          <section class="card">
            <h2>Professionals</h2>
            <table class="table">
              <tbody>
                @for (c of d.doctors.byVerificationStatus; track c.key) {
                  <tr>
                    <td>{{ h(c.key) }}</td>
                    <td>{{ show(c) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
          <section class="card">
            <h2>Appointments (30 days)</h2>
            <table class="table">
              <tbody>
                @for (c of d.appointments.byStatusLast30Days; track c.key) {
                  <tr>
                    <td>{{ h(c.key) }}</td>
                    <td>{{ show(c) }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td class="muted">None</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
          <section class="card">
            <h2>Safety events (30 days)</h2>
            <table class="table">
              <tbody>
                @for (c of d.ai.safetyEventsByLevelLast30Days; track c.key) {
                  <tr>
                    <td>{{ h(c.key) }}</td>
                    <td>{{ show(c) }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td class="muted">None</td>
                  </tr>
                }
              </tbody>
            </table>
            <p class="small muted">
              Counts only. Message content is never shown to administrators.
            </p>
          </section>
          <section class="card">
            <h2>AI usage (30 days)</h2>
            <table class="table">
              <thead>
                <tr>
                  <th>Kind</th>
                  <th>Calls</th>
                  <th>Fallback %</th>
                  <th>Mock</th>
                  <th>Avg ms</th>
                </tr>
              </thead>
              <tbody>
                @for (k of d.ai.byKind; track k.kind) {
                  <tr>
                    <td>{{ h(k.kind) }}</td>
                    <td>{{ k.suppressed ? '<' + d.minGroupSize : k.count }}</td>
                    <td>{{ k.fallbackRate ?? '—' }}</td>
                    <td>{{ k.mockResponses }}</td>
                    <td>{{ k.avgLatencyMs ?? '—' }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td class="muted" colspan="5">No usage yet</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        </div>
        <p class="small muted">Generated {{ d.generatedAt | date: 'medium' }}</p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .ops {
      margin-bottom: var(--mb-space-5);
    }
    .stat {
      display: flex;
      flex-direction: column;
      text-decoration: none;
      color: inherit;
    }
    .stat:hover {
      border-color: var(--mb-primary);
    }
    .num {
      font-size: 2rem;
      font-weight: 700;
    }
    .warn {
      border-color: var(--mb-crisis);
      background: var(--mb-crisis-soft);
    }
    .card {
      margin-bottom: 0;
    }
  `,
})
export class AdminOverviewPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly d = signal<Dashboard | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly h = humanize;
  protected readonly canExport = computed(
    () => this.auth.user()?.adminPermissions?.includes(AdminPermission.REPORTS_EXPORT) ?? false,
  );
  protected readonly pendingDoctors = computed(() =>
    (this.d()?.doctors.byVerificationStatus ?? [])
      .filter((c) => c.key === 'PENDING_VERIFICATION')
      .reduce((a, c) => a + (c.count ?? 0), 0),
  );

  protected show(c: Count) {
    return c.suppressed ? `<${this.d()?.minGroupSize}` : c.count;
  }

  ngOnInit() {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.d.set(await this.api.get<Dashboard>('/admin/dashboard'));
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async exportCsv() {
    try {
      saveBlob(
        await this.api.download('/admin/reports/summary.csv'),
        `mindbridge-summary-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }
}
