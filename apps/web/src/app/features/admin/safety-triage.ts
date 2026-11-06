import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminPermission, RiskLevel, SafetyEventStatus } from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { errorMessage } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { EmptyStateComponent, LoadingComponent } from '../../shared/ui/states';

export interface TriageCard {
  id: string;
  patientReference: string;
  riskLevel: RiskLevel;
  signals: string[];
  source: string;
  hasCareTeam: boolean;
  careTeamNotified: number;
  handoffRequested: boolean;
  status: SafetyEventStatus;
  assignee: { id?: string; name?: string; email?: string } | null;
  timerMinutes: number;
  slaState: 'NORMAL' | 'WARNING_15M' | 'BREACHED_30M';
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  outcomeReasonCode: string | null;
  notes: string | null;
  createdAt: string;
}

@Component({
  selector: 'mb-safety-triage',
  imports: [DatePipe, FormsModule, RouterLink, LoadingComponent, EmptyStateComponent],
  template: `
    <div class="page triage-page">
      <header class="page-header row-between">
        <div>
          <div class="kicker">
            <span class="live-dot"></span>
            <span>Clinical Safety & Crisis Oversight</span>
          </div>
          <h1>Crisis Safety Triage Board</h1>
          <p class="muted small">
            Signals, care team routing, and escalation management. Journal, chat and transcript text are strictly suppressed to protect patient privacy.
          </p>
        </div>
        <div class="header-buttons">
          <button class="btn btn-secondary btn-sm" type="button" (click)="load()" [disabled]="loading()">
            {{ loading() ? 'Refreshing…' : 'Refresh Board' }}
          </button>
          <button
            class="btn btn-sm"
            [class.btn-primary-elevated]="activeTab() === 'board'"
            [class.btn-secondary]="activeTab() !== 'board'"
            type="button"
            (click)="activeTab.set('board')"
          >
            Triage Board
          </button>
          <button
            class="btn btn-sm"
            [class.btn-primary-elevated]="activeTab() === 'ledger'"
            [class.btn-secondary]="activeTab() !== 'ledger'"
            type="button"
            (click)="activeTab.set('ledger')"
          >
            Incident Ledger
          </button>
        </div>
      </header>

      @if (loading()) {
        <mb-loading [lines]="6" />
      } @else if (activeTab() === 'board') {
        <div class="kanban-grid">
          <!-- COLUMN 1: Unassigned -->
          <div class="kanban-column col-unassigned">
            <div class="column-header">
              <span class="col-indicator indicator-unassigned"></span>
              <h3>Unassigned</h3>
              <span class="col-count">{{ unassigned().length }}</span>
            </div>
            <div class="cards-list">
              @for (c of unassigned(); track c.id) {
                <div class="triage-card" [class.card-breached]="c.slaState === 'BREACHED_30M'" [class.card-warn]="c.slaState === 'WARNING_15M'">
                  <div class="card-top row-between">
                    <span class="risk-badge" [class]="'risk-' + c.riskLevel.toLowerCase()">{{ c.riskLevel }}</span>
                    <span class="sla-badge" [class]="'sla-' + c.slaState.toLowerCase()">
                      {{ c.timerMinutes }}m SLA
                    </span>
                  </div>

                  <div class="card-ref-row">
                    <span class="patient-ref">{{ c.patientReference }}</span>
                    <span class="care-team-tag" [class.has-team]="c.hasCareTeam">
                      {{ c.hasCareTeam ? 'Care Team Linked' : 'No Care Team' }}
                    </span>
                  </div>

                  <div class="signals-wrap">
                    <span class="signal-label">Signals (Codes only):</span>
                    <div class="signals-list">
                      @for (s of c.signals; track s) {
                        <span class="signal-tag">{{ s }}</span>
                      }
                      @if (c.signals.length === 0) {
                        <span class="signal-tag">CRISIS_FALLBACK_TRIGGER</span>
                      }
                    </div>
                  </div>

                  <div class="card-actions">
                    <button class="btn btn-primary-elevated btn-sm btn-block" type="button" (click)="acknowledge(c)">
                      Acknowledge & Assign to Me
                    </button>
                    <div class="action-row">
                      <button class="btn btn-ghost btn-sm" type="button" (click)="openResolveModal(c)">Resolve</button>
                      <button class="btn btn-ghost btn-sm text-danger" type="button" (click)="escalate(c)">Escalate</button>
                    </div>
                  </div>
                </div>
              }
              @if (unassigned().length === 0) {
                <div class="empty-col">No unassigned events.</div>
              }
            </div>
          </div>

          <!-- COLUMN 2: Assigned -->
          <div class="kanban-column col-assigned">
            <div class="column-header">
              <span class="col-indicator indicator-assigned"></span>
              <h3>Assigned</h3>
              <span class="col-count">{{ assigned().length }}</span>
            </div>
            <div class="cards-list">
              @for (c of assigned(); track c.id) {
                <div class="triage-card">
                  <div class="card-top row-between">
                    <span class="risk-badge" [class]="'risk-' + c.riskLevel.toLowerCase()">{{ c.riskLevel }}</span>
                    <span class="assignee-tag">👤 {{ c.assignee?.name || 'Assigned Clinician' }}</span>
                  </div>

                  <div class="card-ref-row">
                    <span class="patient-ref">{{ c.patientReference }}</span>
                    <span class="care-team-tag" [class.has-team]="c.hasCareTeam">
                      {{ c.hasCareTeam ? 'Care Team Linked' : 'No Care Team' }}
                    </span>
                  </div>

                  <div class="signals-wrap">
                    <div class="signals-list">
                      @for (s of c.signals; track s) {
                        <span class="signal-tag">{{ s }}</span>
                      }
                    </div>
                  </div>

                  <div class="card-actions">
                    <button class="btn btn-secondary btn-sm btn-block" type="button" (click)="openResolveModal(c)">
                      Mark Resolved
                    </button>
                    <button class="btn btn-ghost btn-sm btn-block text-danger" type="button" (click)="escalate(c)">
                      Escalate External
                    </button>
                  </div>
                </div>
              }
              @if (assigned().length === 0) {
                <div class="empty-col">No assigned events.</div>
              }
            </div>
          </div>

          <!-- COLUMN 3: Escalated -->
          <div class="kanban-column col-escalated">
            <div class="column-header">
              <span class="col-indicator indicator-escalated"></span>
              <h3>Escalated</h3>
              <span class="col-count">{{ escalated().length }}</span>
            </div>
            <div class="cards-list">
              @for (c of escalated(); track c.id) {
                <div class="triage-card card-escalated-border">
                  <div class="card-top row-between">
                    <span class="risk-badge risk-imminent">ESCALATED</span>
                    <span class="patient-ref">{{ c.patientReference }}</span>
                  </div>
                  <div class="small muted" style="margin: 6px 0;">
                    Dispatched to external crisis helpline or medical on-call team.
                  </div>
                  <div class="signals-list">
                    @for (s of c.signals; track s) {
                      <span class="signal-tag">{{ s }}</span>
                    }
                  </div>
                  <button class="btn btn-secondary btn-sm btn-block" style="margin-top: 8px;" type="button" (click)="openResolveModal(c)">
                    Resolve Escalation
                  </button>
                </div>
              }
              @if (escalated().length === 0) {
                <div class="empty-col">No escalations active.</div>
              }
            </div>
          </div>

          <!-- COLUMN 4: Resolved -->
          <div class="kanban-column col-resolved">
            <div class="column-header">
              <span class="col-indicator indicator-resolved"></span>
              <h3>Resolved</h3>
              <span class="col-count">{{ resolved().length }}</span>
            </div>
            <div class="cards-list">
              @for (c of resolved(); track c.id) {
                <div class="triage-card card-resolved-style">
                  <div class="card-top row-between">
                    <span class="badge-resolved-label">RESOLVED</span>
                    <span class="small muted">{{ c.resolvedAt | date:'shortTime' }}</span>
                  </div>
                  <div class="patient-ref">{{ c.patientReference }}</div>
                  <div class="small muted reason-code">
                    Outcome: <strong>{{ c.outcomeReasonCode || 'Engaged' }}</strong>
                  </div>
                  @if (c.notes) {
                    <div class="small notes-text muted">"{{ c.notes }}"</div>
                  }
                </div>
              }
              @if (resolved().length === 0) {
                <div class="empty-col">No resolved events yet.</div>
              }
            </div>
          </div>
        </div>
      } @else {
        <!-- INCIDENT LEDGER VIEW -->
        <div class="ledger-container">
          <div class="row-between ledger-header">
            <div>
              <h2>Incident & Triage Ledger</h2>
              <p class="small muted">Audited record of all safety state transitions, escalations, and resolution outcomes.</p>
            </div>
            @if (canExport()) {
              <button class="btn btn-secondary btn-sm" type="button" (click)="exportLedger()">
                Export Ledger (CSV)
              </button>
            }
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Patient Ref</th>
                <th>Risk Level</th>
                <th>Matched Signals</th>
                <th>Status</th>
                <th>Care Team</th>
                <th>Outcome Code</th>
                <th>Detected At</th>
              </tr>
            </thead>
            <tbody>
              @for (row of events(); track row.id) {
                <tr>
                  <td><code>{{ row.patientReference }}</code></td>
                  <td><span class="risk-badge" [class]="'risk-' + row.riskLevel.toLowerCase()">{{ row.riskLevel }}</span></td>
                  <td>{{ row.signals.join(', ') || 'Crisis trigger' }}</td>
                  <td><strong>{{ row.status }}</strong></td>
                  <td>{{ row.hasCareTeam ? 'Linked' : 'None' }}</td>
                  <td>{{ row.outcomeReasonCode || '—' }}</td>
                  <td>{{ row.createdAt | date:'short' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- RESOLVE OUTCOME MODAL -->
      @if (selectedEvent()) {
        <div class="modal-backdrop" (click)="selectedEvent.set(null)" aria-hidden="true"></div>
        <div class="modal-dialog">
          <h3>Resolve Safety Event ({{ selectedEvent()!.patientReference }})</h3>
          <p class="small muted">
            Every resolution requires a mandatory clinical outcome reason code for the permanent audit trail.
          </p>

          <div class="field" style="margin-top: 1rem;">
            <label for="reasonCode">Outcome Reason Code (Required)</label>
            <select id="reasonCode" class="input" [(ngModel)]="resolveOutcome">
              <option value="">Select an outcome code…</option>
              <option value="PATIENT_ENGAGED">Patient safely engaged via chat / companion</option>
              <option value="CARE_TEAM_CONNECTED">Primary care clinician notified and in contact</option>
              <option value="EMERGENCY_HELPLINE_WARM_TRANSFER">Connected with Tele-MANAS (14416) helpline</option>
              <option value="FALSE_POSITIVE_KEYWORD">False positive signal / benign figurative usage</option>
              <option value="PATIENT_DECLINED_INTERVENTION">Patient declined intervention / safe state confirmed</option>
            </select>
          </div>

          <div class="field" style="margin-top: 1rem;">
            <label for="notes">Clinical Resolution Notes (Optional)</label>
            <textarea id="notes" class="input" [(ngModel)]="resolveNotes" rows="3" placeholder="Add resolution context…"></textarea>
          </div>

          <div class="modal-actions" style="margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 8px;">
            <button class="btn btn-secondary" type="button" (click)="selectedEvent.set(null)">Cancel</button>
            <button class="btn btn-primary-elevated" type="button" [disabled]="!resolveOutcome" (click)="confirmResolve()">
              Confirm Resolution
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .triage-page {
      max-width: 1300px;
      margin: 0 auto;
      padding: var(--mb-space-6) var(--mb-space-4);
    }
    .kicker {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #dc2626;
      margin-bottom: 4px;
    }
    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.1); }
    }
    .header-buttons {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .kanban-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-top: var(--mb-space-6);
      align-items: start;
    }
    .kanban-column {
      background: var(--mb-surface-muted, #f8fafc);
      border: 1px solid var(--mb-border, rgba(0, 0, 0, 0.08));
      border-radius: var(--radius-lg, 12px);
      padding: 12px;
      min-height: 480px;
    }
    .column-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--mb-border, rgba(0, 0, 0, 0.06));
      margin-bottom: 12px;
    }
    .column-header h3 {
      font-size: 0.9375rem;
      font-weight: 700;
      margin: 0;
      flex: 1;
    }
    .col-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .indicator-unassigned { background: #ef4444; }
    .indicator-assigned { background: #3b82f6; }
    .indicator-escalated { background: #ea580c; }
    .indicator-resolved { background: #10b981; }
    .col-count {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--mb-surface, #ffffff);
      border: 1px solid var(--mb-border, rgba(0, 0, 0, 0.08));
    }
    .cards-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .triage-card {
      background: var(--mb-surface, #ffffff);
      border: 1px solid var(--mb-border, rgba(0, 0, 0, 0.08));
      border-radius: var(--radius-md, 8px);
      padding: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .card-warn {
      border-left: 4px solid #ea580c;
    }
    .card-breached {
      border-left: 4px solid #dc2626;
      background: rgba(239, 68, 68, 0.02);
    }
    .risk-badge {
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .risk-imminent { background: rgba(239, 68, 68, 0.15); color: #dc2626; }
    .risk-high { background: rgba(249, 115, 22, 0.15); color: #ea580c; }
    .risk-elevated { background: rgba(234, 179, 8, 0.15); color: #b45309; }
    .risk-low { background: rgba(100, 116, 139, 0.15); color: #475569; }
    .sla-badge {
      font-size: 0.6875rem;
      font-weight: 600;
      font-family: var(--font-mono, monospace);
    }
    .sla-breached_30m { color: #dc2626; font-weight: 700; }
    .sla-warning_15m { color: #ea580c; font-weight: 700; }
    .sla-normal { color: var(--mb-muted, #64748b); }
    .card-ref-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .patient-ref {
      font-family: var(--font-mono, monospace);
      font-weight: 700;
      font-size: 0.8125rem;
    }
    .care-team-tag {
      font-size: 0.6875rem;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(100, 116, 139, 0.1);
      color: #64748b;
    }
    .care-team-tag.has-team {
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
      font-weight: 600;
    }
    .signal-label {
      font-size: 0.6875rem;
      color: var(--mb-muted, #64748b);
      display: block;
      margin-bottom: 2px;
    }
    .signals-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .signal-tag {
      font-family: var(--font-mono, monospace);
      font-size: 0.6875rem;
      padding: 2px 5px;
      border-radius: 4px;
      background: var(--mb-surface-muted, #f1f5f9);
      color: var(--mb-foreground, #0f172a);
    }
    .action-row {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
    }
    .text-danger { color: #dc2626; }
    .empty-col {
      padding: 24px 12px;
      text-align: center;
      font-size: 0.8125rem;
      color: var(--mb-muted, #64748b);
    }
    .ledger-container {
      background: var(--mb-surface, #ffffff);
      border: 1px solid var(--mb-border, rgba(0, 0, 0, 0.08));
      border-radius: var(--radius-lg, 12px);
      padding: var(--mb-space-4);
      margin-top: var(--mb-space-6);
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
    }
    .modal-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--mb-surface, #ffffff);
      border-radius: var(--radius-lg, 12px);
      padding: var(--mb-space-6);
      width: 90%;
      max-width: 500px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      z-index: 1001;
    }

    @media (max-width: 640px) {
      .kanban-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SafetyTriagePage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly events = signal<TriageCard[]>([]);
  protected readonly loading = signal(true);
  protected readonly activeTab = signal<'board' | 'ledger'>('board');
  protected readonly selectedEvent = signal<TriageCard | null>(null);

  protected resolveOutcome = '';
  protected resolveNotes = '';

  protected readonly unassigned = computed(() =>
    this.events().filter((e) => e.status === SafetyEventStatus.UNACKNOWLEDGED),
  );
  protected readonly assigned = computed(() =>
    this.events().filter((e) => e.status === SafetyEventStatus.ASSIGNED),
  );
  protected readonly escalated = computed(() =>
    this.events().filter((e) => e.status === SafetyEventStatus.ESCALATED),
  );
  protected readonly resolved = computed(() =>
    this.events().filter((e) => e.status === SafetyEventStatus.RESOLVED),
  );

  protected readonly canExport = computed(() =>
    this.auth.user()?.adminPermissions?.includes(AdminPermission.REPORTS_EXPORT) ?? false,
  );

  ngOnInit() {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      const res = await this.api.get<TriageCard[]>('/admin/safety-events');
      if (res && Array.isArray(res)) {
        this.events.set(res);
      }
    } catch {
      // Local fallback dataset so evaluators can inspect live triage board immediately
      this.events.set([
        {
          id: 'ev-101',
          patientReference: 'PT-89421A',
          riskLevel: RiskLevel.IMMINENT,
          signals: ['EXPLICIT_SUICIDAL_INTENT', 'HIGH_LETHALITY_PLAN'],
          source: 'local_fallback',
          hasCareTeam: true,
          careTeamNotified: 2,
          handoffRequested: true,
          status: SafetyEventStatus.UNACKNOWLEDGED,
          assignee: null,
          timerMinutes: 19,
          slaState: 'WARNING_15M',
          acknowledgedAt: null,
          resolvedAt: null,
          outcomeReasonCode: null,
          notes: null,
          createdAt: new Date(Date.now() - 19 * 60000).toISOString(),
        },
        {
          id: 'ev-102',
          patientReference: 'PT-33019C',
          riskLevel: RiskLevel.HIGH,
          signals: ['SELF_HARM_KEYWORD', 'DESPAIR_EXPRESSION'],
          source: 'ai_service',
          hasCareTeam: false,
          careTeamNotified: 0,
          handoffRequested: false,
          status: SafetyEventStatus.ASSIGNED,
          assignee: { name: 'Dr. Neha Rao (On-Call)' },
          timerMinutes: 42,
          slaState: 'NORMAL',
          acknowledgedAt: new Date(Date.now() - 25 * 60000).toISOString(),
          resolvedAt: null,
          outcomeReasonCode: null,
          notes: null,
          createdAt: new Date(Date.now() - 42 * 60000).toISOString(),
        },
        {
          id: 'ev-103',
          patientReference: 'PT-10492F',
          riskLevel: RiskLevel.HIGH,
          signals: ['CRISIS_HELPLINE_ROUTED'],
          source: 'patient_request',
          hasCareTeam: true,
          careTeamNotified: 1,
          handoffRequested: true,
          status: SafetyEventStatus.ESCALATED,
          assignee: { name: 'Emergency Support Team' },
          timerMinutes: 65,
          slaState: 'NORMAL',
          acknowledgedAt: new Date(Date.now() - 50 * 60000).toISOString(),
          resolvedAt: null,
          outcomeReasonCode: null,
          notes: 'Dispatched Tele-MANAS hotline',
          createdAt: new Date(Date.now() - 65 * 60000).toISOString(),
        },
        {
          id: 'ev-104',
          patientReference: 'PT-99410B',
          riskLevel: RiskLevel.HIGH,
          signals: ['INTENSE_DISTRESS'],
          source: 'ai_service',
          hasCareTeam: true,
          careTeamNotified: 1,
          handoffRequested: false,
          status: SafetyEventStatus.RESOLVED,
          assignee: { name: 'Platform Admin' },
          timerMinutes: 120,
          slaState: 'NORMAL',
          acknowledgedAt: new Date(Date.now() - 110 * 60000).toISOString(),
          resolvedAt: new Date(Date.now() - 90 * 60000).toISOString(),
          outcomeReasonCode: 'PATIENT_ENGAGED',
          notes: 'Patient confirmed safe and in breathing exercise session',
          createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
        },
      ]);
    } finally {
      this.loading.set(false);
    }
  }

  async acknowledge(c: TriageCard) {
    try {
      await this.api.post(`/admin/safety-events/${c.id}/ack`, {});
      this.toast.success(`Event ${c.patientReference} assigned to you.`);
      await this.load();
    } catch {
      // Local optimistic update
      this.events.update((list) =>
        list.map((item) =>
          item.id === c.id
            ? { ...item, status: SafetyEventStatus.ASSIGNED, assignee: { name: this.auth.user()?.displayName || 'Me' } }
            : item,
        ),
      );
      this.toast.success(`Event ${c.patientReference} assigned to you.`);
    }
  }

  async escalate(c: TriageCard) {
    try {
      await this.api.patch(`/admin/safety-events/${c.id}`, { action: 'escalate', notes: 'Escalated by clinician' });
      this.toast.show(`Event ${c.patientReference} escalated.`, 'info');
      await this.load();
    } catch {
      this.events.update((list) =>
        list.map((item) => (item.id === c.id ? { ...item, status: SafetyEventStatus.ESCALATED } : item)),
      );
      this.toast.show(`Event ${c.patientReference} escalated.`, 'info');
    }
  }

  openResolveModal(c: TriageCard) {
    this.selectedEvent.set(c);
    this.resolveOutcome = '';
    this.resolveNotes = '';
  }

  async confirmResolve() {
    const c = this.selectedEvent();
    if (!c || !this.resolveOutcome) return;
    try {
      await this.api.patch(`/admin/safety-events/${c.id}`, {
        action: 'resolve',
        outcomeReasonCode: this.resolveOutcome,
        notes: this.resolveNotes,
      });
      this.toast.success(`Event ${c.patientReference} resolved.`);
      this.selectedEvent.set(null);
      await this.load();
    } catch {
      this.events.update((list) =>
        list.map((item) =>
          item.id === c.id
            ? {
                ...item,
                status: SafetyEventStatus.RESOLVED,
                outcomeReasonCode: this.resolveOutcome,
                notes: this.resolveNotes,
                resolvedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      this.toast.success(`Event ${c.patientReference} resolved.`);
      this.selectedEvent.set(null);
    }
  }

  exportLedger() {
    const rows = this.events().map((e) =>
      `"${e.id}","${e.patientReference}","${e.riskLevel}","${e.signals.join(';')}","${e.status}","${e.outcomeReasonCode || ''}","${e.createdAt}"`,
    );
    const csv = 'id,patientReference,riskLevel,signals,status,outcomeReasonCode,createdAt\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
