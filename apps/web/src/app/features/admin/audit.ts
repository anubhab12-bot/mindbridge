import { DatePipe, JsonPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { PageMeta } from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { errorMessage } from '../../core/api/api-error';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/ui/pagination';
import { EmptyStateComponent, LoadingComponent } from '../../shared/ui/states';

interface AuditRow {
  _id: string;
  actorId: string | null;
  actorRole?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  outcome: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

@Component({
  selector: 'mb-admin-audit',
  imports: [DatePipe, JsonPipe, FormsModule, LoadingComponent, EmptyStateComponent, PaginationComponent],
  template: `
    <div class="page">
      <header class="page-header"><h1>Audit log</h1><p>Who did what and when. Entries never contain health content. Your searches are logged too.</p></header>
      <form class="row filters" (ngSubmit)="load()">
        <input class="input" name="action" [(ngModel)]="f.action" placeholder="Action, e.g. auth.login" aria-label="Action" />
        <input class="input" name="actor" [(ngModel)]="f.actorId" placeholder="Actor id" aria-label="Actor id" />
        <input class="input" name="rt" [(ngModel)]="f.resourceType" placeholder="Resource type" aria-label="Resource type" />
        <select class="input" name="outcome" [(ngModel)]="f.outcome" aria-label="Outcome"><option value="">Any outcome</option><option>SUCCESS</option><option>FAILURE</option><option>DENIED</option></select>
        <button class="btn" type="submit">Search</button>
      </form>
      @if (loading()) { <mb-loading [lines]="6" /> } @else if (!rows().length) { <mb-empty title="No entries" /> } @else {
        <div class="table-wrap">
          <table class="table small">
            <thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Resource</th><th>Outcome</th><th>Details</th></tr></thead>
            <tbody>
              @for (r of rows(); track r._id) {
                <tr>
                  <td>{{ r.createdAt | date: 'medium' }}</td>
                  <td><code>{{ r.action }}</code></td>
                  <td>{{ r.actorRole ?? 'system' }}<div class="muted">{{ r.actorId }}</div></td>
                  <td>{{ r.resourceType }}<div class="muted">{{ r.resourceId }}</div></td>
                  <td><span class="badge" [class.badge-danger]="r.outcome !== 'SUCCESS'">{{ r.outcome }}</span></td>
                  <td>@if (r.metadata) { <details><summary>View</summary><pre>{{ r.metadata | json }}</pre></details> }</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <mb-pagination [meta]="meta()" (page)="load($event)" />
      }
    </div>
  `,
  styles: `.filters { margin-bottom: var(--mb-space-4); } .filters .input { width: auto; min-width: 150px; } pre { white-space: pre-wrap; max-width: 320px; font-size: 0.8rem; }`,
})
export class AuditPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly rows = signal<AuditRow[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly loading = signal(true);
  protected f = { action: '', actorId: '', resourceType: '', outcome: '' };

  ngOnInit() {
    void this.load();
  }

  async load(page = 1) {
    this.loading.set(true);
    try {
      const res = await this.api.page<AuditRow>('/admin/audit-logs', { ...this.f, action: this.f.action.trim(), actorId: this.f.actorId.trim(), page, pageSize: 50 });
      this.rows.set(res.items);
      this.meta.set(res.meta);
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}

interface SecurityOverview {
  last24Hours: { failedLogins: number; lockouts: number; authorizationDenials: number; refreshTokenReuse: number };
  mfaAdoption: { admins: { enabled: number; total: number }; doctors: { enabled: number; total: number } };
}

@Component({
  selector: 'mb-admin-security',
  imports: [LoadingComponent],
  template: `
    <div class="page">
      <header class="page-header"><h1>Security</h1></header>
      @if (!data()) { <mb-loading /> } @else {
        @let d = data()!;
        <h2>Last 24 hours</h2>
        <div class="grid stats">
          <div class="card-flat"><span class="num">{{ d.last24Hours.failedLogins }}</span><span class="small">Failed sign-ins</span></div>
          <div class="card-flat"><span class="num">{{ d.last24Hours.lockouts }}</span><span class="small">Account lockouts</span></div>
          <div class="card-flat"><span class="num">{{ d.last24Hours.authorizationDenials }}</span><span class="small">Access denied</span></div>
          <div class="card-flat" [class.warn]="d.last24Hours.refreshTokenReuse > 0"><span class="num">{{ d.last24Hours.refreshTokenReuse }}</span><span class="small">Refresh token reuse (possible theft)</span></div>
        </div>
        <h2>Two-step verification adoption</h2>
        <div class="grid stats">
          <div class="card-flat"><span class="num">{{ d.mfaAdoption.admins.enabled }}/{{ d.mfaAdoption.admins.total }}</span><span class="small">Administrators</span></div>
          <div class="card-flat"><span class="num">{{ d.mfaAdoption.doctors.enabled }}/{{ d.mfaAdoption.doctors.total }}</span><span class="small">Professionals</span></div>
        </div>
        <p class="small muted">Investigate details in the audit log (for example action <code>auth.refresh_token_reuse</code>).</p>
      }
    </div>
  `,
  styles: `.stats { margin-bottom: var(--mb-space-5); } .stats > div { display: flex; flex-direction: column; } .num { font-size: 2rem; font-weight: 700; } .warn { border-color: var(--mb-danger); background: var(--mb-danger-soft); }`,
})
export class SecurityPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly data = signal<SecurityOverview | null>(null);

  async ngOnInit() {
    try {
      this.data.set(await this.api.get<SecurityOverview>('/admin/security'));
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }
}
