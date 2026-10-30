import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccountStatus, ConsentType } from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { errorMessage } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../shared/ui/confirm';
import { LoadingComponent } from '../../shared/ui/states';
import { categoryLabel, saveBlob } from '../../shared/util/format';

interface ConsentState {
  type: ConsentType;
  granted: boolean;
  doctorId: string | null;
  updatedAt: string;
}

interface CareMember {
  doctorId: string;
  displayName: string;
  professionalCategory?: string;
  status: 'ACTIVE' | 'ENDED';
  establishedAt: string;
  endedAt?: string | null;
}

const GLOBAL_CONSENTS: { type: ConsentType; label: string; help: string }[] = [
  {
    type: ConsentType.AI_PROCESSING,
    label: 'AI companion',
    help: 'Let the AI companion process your chat messages so it can reply.',
  },
  {
    type: ConsentType.REMINDERS,
    label: 'Reminders',
    help: 'Send me appointment and check-in reminders by email.',
  },
  {
    type: ConsentType.MODEL_TRAINING,
    label: 'Help improve MindBridge',
    help: 'Allow de-identified data to be used to improve our services. Off unless you turn it on.',
  },
];

const DOCTOR_CONSENTS: { type: ConsentType; label: string }[] = [
  { type: ConsentType.SHARE_MOOD_SUMMARY, label: 'See a summary of my mood check-ins (no notes)' },
  {
    type: ConsentType.SHARE_AI_SUMMARY,
    label: 'See an AI-written summary of my companion conversations',
  },
  { type: ConsentType.SHARE_INTAKE, label: 'See intake forms I submit with bookings' },
  { type: ConsentType.DOCTOR_AI_ASSIST, label: 'Use AI drafting tools with my information' },
];

const CATEGORIES = [
  { key: 'mood', label: 'Mood check-ins' },
  { key: 'journal', label: 'Journal entries' },
  { key: 'ai_conversations', label: 'AI companion conversations' },
];

@Component({
  selector: 'mb-privacy',
  imports: [FormsModule, DatePipe, LoadingComponent],
  template: `
    <div class="page narrow">
      <header class="page-header">
        <h1>Privacy &amp; data</h1>
        <p>Choose what is shared and with whom. Changes take effect immediately.</p>
      </header>

      @if (loading()) {
        <mb-loading [lines]="6" />
      } @else {
        <section class="card">
          <h2>General permissions</h2>
          @for (c of globals; track c.type) {
            <label class="checkbox">
              <input
                type="checkbox"
                [checked]="granted(c.type, null)"
                (change)="setConsent(c.type, $any($event.target).checked, null)"
              />
              <span
                ><strong>{{ c.label }}</strong
                ><br /><span class="small muted">{{ c.help }}</span></span
              >
            </label>
          }
        </section>

        <section class="card">
          <h2>Your care team</h2>
          <p class="small muted">
            Professionals you've had a confirmed session with. They can only see what you allow
            below.
          </p>
          @if (!careTeam().length) {
            <p class="muted">No professionals yet.</p>
          }
          @for (m of careTeam(); track m.doctorId) {
            <div class="member">
              <div class="row-between">
                <div>
                  <strong>{{ m.displayName }}</strong>
                  <span class="small muted">{{ label(m.professionalCategory) }}</span>
                  <div class="small muted">
                    @if (m.status === 'ACTIVE') {
                      Since {{ m.establishedAt | date: 'mediumDate' }}
                    } @else {
                      Ended {{ m.endedAt | date: 'mediumDate' }}
                    }
                  </div>
                </div>
                @if (m.status === 'ACTIVE') {
                  <button class="btn btn-secondary btn-sm" type="button" (click)="endCare(m)">
                    Remove access
                  </button>
                } @else {
                  <span class="badge">No access</span>
                }
              </div>
              @if (m.status === 'ACTIVE') {
                <fieldset>
                  <legend class="visually-hidden">What {{ m.displayName }} can see</legend>
                  @for (c of doctorConsents; track c.type) {
                    <label class="checkbox">
                      <input
                        type="checkbox"
                        [checked]="granted(c.type, m.doctorId)"
                        (change)="setConsent(c.type, $any($event.target).checked, m.doctorId)"
                      />
                      <span>{{ c.label }}</span>
                    </label>
                  }
                </fieldset>
              }
            </div>
          }
        </section>

        <section class="card">
          <h2>Download your data</h2>
          <p class="small muted">
            A JSON file with your account, check-ins, journal, conversations, appointments and
            messages.
          </p>
          <button
            class="btn btn-secondary"
            type="button"
            (click)="exportData()"
            [disabled]="busy()"
          >
            Download my data
          </button>
        </section>

        <section class="card">
          <h2>Delete specific data</h2>
          @for (c of categories; track c.key) {
            <div class="row-between item">
              <span>{{ c.label }}</span>
              <button class="btn btn-ghost btn-sm" type="button" (click)="deleteCategory(c)">
                Delete all
              </button>
            </div>
          }
        </section>

        <section class="card danger">
          <h2>Delete your account</h2>
          @if (pendingDeletion()) {
            <p>
              Your account is scheduled for deletion
              @if (scheduledFor()) {
                on <strong>{{ scheduledFor() | date: 'mediumDate' }}</strong>
              }
              . You can cancel until then.
            </p>
            <button class="btn" type="button" (click)="cancelDeletion()" [disabled]="busy()">
              Cancel deletion
            </button>
          } @else {
            <p class="small">
              Your account will be closed after a grace period, upcoming appointments will be
              cancelled, and your personal data will be erased. Some records may be kept where the
              law requires it.
            </p>
            <div class="field">
              <label for="pw">Confirm with your password</label>
              <input
                id="pw"
                class="input"
                type="password"
                autocomplete="current-password"
                [(ngModel)]="password"
              />
            </div>
            <button
              class="btn btn-danger"
              type="button"
              (click)="requestDeletion()"
              [disabled]="busy() || !password"
            >
              Delete my account
            </button>
          }
        </section>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .narrow {
      max-width: 820px;
    }
    .card {
      margin-bottom: var(--mb-space-4);
    }
    .member {
      border-top: 1px solid var(--mb-border);
      padding-top: var(--mb-space-3);
      margin-top: var(--mb-space-3);
    }
    .member fieldset {
      margin: var(--mb-space-3) 0 0;
    }
    .item {
      padding: 6px 0;
    }
    .danger {
      border-color: var(--mb-danger);
    }
  `,
})
export class PrivacyPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly globals = GLOBAL_CONSENTS;
  protected readonly doctorConsents = DOCTOR_CONSENTS;
  protected readonly categories = CATEGORIES;
  protected readonly label = categoryLabel;
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly consents = signal<ConsentState[]>([]);
  protected readonly careTeam = signal<CareMember[]>([]);
  protected readonly scheduledFor = signal<string | null>(null);
  protected readonly pendingDeletion = computed(
    () => this.auth.user()?.status === AccountStatus.PENDING_DELETION || !!this.scheduledFor(),
  );
  protected password = '';

  async ngOnInit() {
    try {
      const [consents, team] = await Promise.all([
        this.api.get<ConsentState[]>('/consents/me'),
        this.api.get<CareMember[]>('/patients/care-team'),
      ]);
      this.consents.set(consents);
      this.careTeam.set(team);
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected granted(type: ConsentType, doctorId: string | null) {
    return this.consents().some((c) => c.type === type && c.doctorId === doctorId && c.granted);
  }

  async setConsent(type: ConsentType, granted: boolean, doctorId: string | null) {
    try {
      const row = await this.api.post<ConsentState>('/consents', {
        type,
        granted,
        doctorId: doctorId ?? undefined,
      });
      this.consents.update((list) => [
        ...list.filter((c) => !(c.type === type && c.doctorId === doctorId)),
        row,
      ]);
      this.toast.success(granted ? 'Permission granted.' : 'Permission withdrawn.');
    } catch (err) {
      this.toast.error(errorMessage(err));
      this.consents.update((l) => [...l]);
    }
  }

  async endCare(m: CareMember) {
    const ok = await this.confirm.ask({
      title: `Remove ${m.displayName}'s access?`,
      message:
        'They will immediately lose access to your shared information and you will no longer be able to message each other. Past appointments stay in your history.',
      confirmLabel: 'Remove access',
      danger: true,
    });
    if (!ok) return;
    try {
      await this.api.delete(`/patients/care-team/${m.doctorId}`);
      this.careTeam.set(await this.api.get<CareMember[]>('/patients/care-team'));
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async exportData() {
    this.busy.set(true);
    try {
      const data = await this.api.get<unknown>('/privacy/export');
      saveBlob(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
        `mindbridge-export-${new Date().toISOString().slice(0, 10)}.json`,
      );
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async deleteCategory(c: { key: string; label: string }) {
    const ok = await this.confirm.ask({
      title: `Delete all ${c.label.toLowerCase()}?`,
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await this.api.delete(`/privacy/data/${c.key}`);
      this.toast.success(`${c.label} deleted.`);
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async requestDeletion() {
    const ok = await this.confirm.ask({
      title: 'Delete your account?',
      message:
        'Your account will be scheduled for deletion. You can cancel during the grace period.',
      confirmLabel: 'Schedule deletion',
      danger: true,
    });
    if (!ok) return;
    this.busy.set(true);
    try {
      const res = await this.api.post<{ scheduledFor: string; graceDays: number }>(
        '/privacy/deletion-request',
        { password: this.password },
      );
      this.password = '';
      this.scheduledFor.set(res.scheduledFor);
      await this.auth.reloadUser();
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async cancelDeletion() {
    this.busy.set(true);
    try {
      await this.api.post('/privacy/deletion-cancel');
      this.scheduledFor.set(null);
      await this.auth.reloadUser();
      this.toast.success('Deletion cancelled. Your account stays open.');
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
