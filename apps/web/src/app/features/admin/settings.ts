import { DatePipe, JsonPipe } from '@angular/common';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { ApiError, errorMessage } from '../../core/api/api-error';
import { FeatureFlagsService } from '../../core/services/feature-flags.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../shared/ui/confirm';
import { LoadingComponent } from '../../shared/ui/states';
import { humanize } from '../../shared/util/format';

interface Flag {
  key: string;
  enabled: boolean;
  description: string;
  updatedAt: string | null;
}

interface Policy {
  _id: string;
  type: string;
  version: string;
  title: string;
  status: string;
  effectiveAt?: string;
  createdAt: string;
}

@Component({
  selector: 'mb-admin-settings',
  imports: [DatePipe, JsonPipe, FormsModule, LoadingComponent],
  template: `
    <div class="page">
      <header class="page-header"><h1>AI &amp; settings</h1></header>
      <div class="tabs" role="tablist">
        @for (t of tabs; track t.key) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="tab() === t.key"
            (click)="tab.set(t.key)"
          >
            {{ t.label }}
          </button>
        }
      </div>
      @switch (tab()) {
        @case ('flags') {
          <section class="card narrow">
            <h2>Feature switches</h2>
            <p class="small muted">Crisis resources and safety screening cannot be switched off.</p>
            @if (!flags()) {
              <mb-loading />
            } @else {
              @for (f of flags(); track f.key) {
                <label class="checkbox"
                  ><input
                    type="checkbox"
                    [checked]="f.enabled"
                    (change)="setFlag(f, $any($event.target).checked)"
                  />
                  <span
                    ><strong>{{ f.key }}</strong
                    ><br /><span class="small muted">{{ f.description }}</span></span
                  ></label
                >
              }
            }
          </section>
        }
        @case ('ai') {
          <section class="card">
            <h2>AI service</h2>
            @if (!ai()) {
              <mb-loading />
            } @else {
              <pre class="json">{{ ai() | json }}</pre>
              <p class="small muted">
                Provider and model are configured with environment variables on the AI service,
                never in the database. "mock" means replies are simulated.
              </p>
            }
          </section>
        }
        @case ('policies') {
          <section class="card">
            <h2>Policies</h2>
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Version</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Effective</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of policies(); track p._id) {
                    <tr>
                      <td>{{ h(p.type) }}</td>
                      <td>{{ p.version }}</td>
                      <td>{{ p.title }}</td>
                      <td>{{ h(p.status) }}</td>
                      <td>{{ p.effectiveAt ? (p.effectiveAt | date: 'mediumDate') : '—' }}</td>
                      <td>
                        @if (p.status === 'DRAFT') {
                          <button class="btn btn-ghost btn-sm" type="button" (click)="publish(p)">
                            Publish
                          </button>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="muted">
                        No policies yet. Publish terms, a privacy notice and an AI notice before
                        launch.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <h3 class="mt">New version</h3>
            <div class="grid-2">
              <div class="field">
                <label for="pt">Type</label
                ><select id="pt" class="input" [(ngModel)]="np.type">
                  <option value="TERMS">Terms</option>
                  <option value="PRIVACY_POLICY">Privacy policy</option>
                  <option value="AI_PROCESSING">AI notice</option>
                </select>
              </div>
              <div class="field">
                <label for="pv">Version</label
                ><input id="pv" class="input" [(ngModel)]="np.version" placeholder="1.0" />
              </div>
            </div>
            <div class="field">
              <label for="ptt">Title</label><input id="ptt" class="input" [(ngModel)]="np.title" />
            </div>
            <div class="field">
              <label for="pb">Text</label
              ><textarea id="pb" class="textarea tall" [(ngModel)]="np.body"></textarea
              ><span class="hint"
                >Have legal text reviewed by a qualified lawyer before publishing.</span
              >
            </div>
            @if (policyError()) {
              <div class="alert alert-danger">{{ policyError() }}</div>
            }
            <button class="btn" type="button" (click)="createPolicy()">Save draft</button>
          </section>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .narrow {
      max-width: 720px;
    }
    .json {
      white-space: pre-wrap;
      font-size: 0.85rem;
      background: var(--mb-surface-2);
      padding: 12px;
      border-radius: var(--mb-radius-sm);
    }
    .tall {
      min-height: 220px;
    }
    .mt {
      margin-top: var(--mb-space-5);
    }
  `,
})
export class AdminSettingsPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly clientFlags = inject(FeatureFlagsService);
  protected readonly tabs = [
    { key: 'flags', label: 'Features' },
    { key: 'ai', label: 'AI service' },
    { key: 'policies', label: 'Policies' },
  ];
  protected readonly h = humanize;
  protected readonly tab = signal('flags');
  protected readonly flags = signal<Flag[] | null>(null);
  protected readonly ai = signal<unknown>(null);
  protected readonly policies = signal<Policy[]>([]);
  protected readonly policyError = signal<string | null>(null);
  protected np = { type: 'TERMS', version: '', title: '', body: '' };

  ngOnInit() {
    this.api.get<Flag[]>('/admin/feature-flags').then(
      (f) => this.flags.set(f),
      (e) => this.toast.error(errorMessage(e)),
    );
    this.api.get('/admin/ai').then(
      (a) => this.ai.set(a),
      (e) => this.ai.set({ error: errorMessage(e) }),
    );
    void this.loadPolicies();
  }

  async setFlag(f: Flag, enabled: boolean) {
    const ok = await this.confirm.ask({
      title: `${enabled ? 'Turn on' : 'Turn off'} ${f.key}?`,
      message: 'This takes effect for everyone within about 30 seconds.',
      confirmLabel: enabled ? 'Turn on' : 'Turn off',
    });
    if (!ok) {
      this.flags.update((l) => (l ? [...l] : l));
      return;
    }
    try {
      await this.api.put(`/admin/feature-flags/${encodeURIComponent(f.key)}`, { enabled });
      this.flags.update((l) => l?.map((x) => (x.key === f.key ? { ...x, enabled } : x)) ?? l);
      void this.clientFlags.load();
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async loadPolicies() {
    try {
      this.policies.set(await this.api.get<Policy[]>('/admin/policies'));
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async createPolicy() {
    this.policyError.set(null);
    try {
      await this.api.post('/admin/policies', {
        ...this.np,
        version: this.np.version.trim(),
        title: this.np.title.trim(),
      });
      this.np = { type: 'TERMS', version: '', title: '', body: '' };
      await this.loadPolicies();
    } catch (err) {
      const e = ApiError.from(err);
      this.policyError.set(
        Array.isArray(e.details) ? (e.details as unknown[]).join(' ') : e.message,
      );
    }
  }

  async publish(p: Policy) {
    const ok = await this.confirm.ask({
      title: `Publish ${p.title} v${p.version}?`,
      message: 'It becomes the current version immediately. Users may be asked to accept it again.',
      confirmLabel: 'Publish',
    });
    if (!ok) return;
    try {
      await this.api.post(`/admin/policies/${p._id}/publish`, {});
      await this.loadPolicies();
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }
}
