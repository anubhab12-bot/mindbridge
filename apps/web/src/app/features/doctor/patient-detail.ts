import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClinicalNoteType } from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { ApiError, errorMessage } from '../../core/api/api-error';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../shared/ui/confirm';
import { ErrorStateComponent, LoadingComponent } from '../../shared/ui/states';
import { humanize } from '../../shared/util/format';
import { statusBadge } from '../shared/appointments';

interface Overview {
  patientId: string;
  displayName: string;
  pronouns: string | null;
  preferredLanguage: string | null;
  timezone: string | null;
  appointments: { id: string; startAt: string; endAt: string; mode: string; status: string }[];
  sharedWithYou: { moodSummary: boolean; aiSummary: boolean; intake: boolean; aiAssist: boolean };
}

interface MoodSummary {
  days: { date: string; average: number; entries: number }[];
  topEmotions: { tag: string; count: number }[];
  overallAverage: number | null;
  checkIns: number;
}

export interface ClinicalNote {
  id: string;
  appointmentId: string | null;
  type: ClinicalNoteType;
  status: 'DRAFT' | 'FINAL';
  title: string;
  content: string;
  aiAssisted: boolean;
  aiProvenance: {
    task: string;
    provider: string;
    model: string;
    isMock: boolean;
    draftedAt: string;
  } | null;
  finalizedAt: string | null;
  addenda: { id: string; content: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'mb-patient-detail',
  imports: [DatePipe, FormsModule, RouterLink, LoadingComponent, ErrorStateComponent],
  template: `
    <div class="page">
      <a routerLink="/doctor/patients" class="small">← Patients</a>
      @if (loading()) {
        <mb-loading [lines]="6" />
      } @else if (error()) {
        <mb-error [message]="error()!" (retry)="load()" />
      } @else if (overview(); as o) {
        <header class="page-header">
          <h1>{{ o.displayName }}</h1>
          <p class="small">
            @if (o.pronouns) {
              {{ o.pronouns }} ·
            }
            @if (o.preferredLanguage) {
              Language: {{ o.preferredLanguage }} ·
            }
            @if (o.timezone) {
              {{ o.timezone }}
            }
          </p>
        </header>
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
          @case ('overview') {
            <div class="grid-2">
              <section class="card">
                <h2>Shared with you</h2>
                <ul class="plain">
                  <li>{{ o.sharedWithYou.moodSummary ? '✓' : '✗' }} Mood summary</li>
                  <li>{{ o.sharedWithYou.aiSummary ? '✓' : '✗' }} AI companion summary</li>
                  <li>{{ o.sharedWithYou.intake ? '✓' : '✗' }} Intake forms</li>
                  <li>
                    {{ o.sharedWithYou.aiAssist ? '✓' : '✗' }} AI drafting with their information
                  </li>
                </ul>
                <p class="small muted">
                  The patient controls these and can change them at any time.
                </p>
              </section>
              <section class="card">
                <h2>Sessions with you</h2>
                <ul class="list">
                  @for (a of o.appointments; track a.id) {
                    <li class="row-between">
                      <a [routerLink]="['/doctor/appointments', a.id]">{{
                        a.startAt | date: 'd MMM y, h:mm a'
                      }}</a>
                      <span class="badge" [class]="badge(a.status)">{{ human(a.status) }}</span>
                    </li>
                  }
                </ul>
              </section>
            </div>
          }
          @case ('shared') {
            <section class="card">
              <h2>Mood (last 30 days)</h2>
              @if (!o.sharedWithYou.moodSummary) {
                <p class="muted">Not shared with you.</p>
              } @else if (mood(); as m) {
                <p>{{ m.checkIns }} check-ins · average {{ m.overallAverage ?? '—' }} out of 5</p>
                <div class="bars" aria-hidden="true">
                  @for (d of m.days; track d.date) {
                    <span
                      class="bar"
                      [style.height.%]="d.average * 20"
                      [title]="d.date + ': ' + d.average"
                    ></span>
                  }
                </div>
                @if (m.topEmotions.length) {
                  <p class="small">Most noted: {{ emotionList(m) }}</p>
                }
                <p class="small muted">Self-reported check-ins. Notes are never shared.</p>
              } @else {
                <button class="btn btn-secondary btn-sm" type="button" (click)="loadMood()">
                  Load
                </button>
              }
            </section>
            <section class="card">
              <h2>AI companion summary</h2>
              @if (!o.sharedWithYou.aiSummary) {
                <p class="muted">Not shared with you.</p>
              } @else if (aiSummary(); as s) {
                <p class="badge badge-warning">
                  AI draft: requires professional review
                  @if (s.isMock) {
                    · simulated (mock)
                  }
                </p>
                <p class="pre">{{ s.summary ?? 'No recent conversations.' }}</p>
              } @else {
                <button
                  class="btn btn-secondary btn-sm"
                  type="button"
                  (click)="loadAiSummary()"
                  [disabled]="busy()"
                >
                  Generate summary
                </button>
              }
            </section>
            <section class="card">
              <h2>Intake forms</h2>
              @if (!o.sharedWithYou.intake) {
                <p class="muted">Not shared with you.</p>
              } @else if (intakes(); as list) {
                @for (i of list; track i.appointmentId) {
                  <div class="intake">
                    <div class="small muted">{{ i.createdAt | date: 'mediumDate' }}</div>
                    @for (e of entries(i.answers); track e[0]) {
                      <p>
                        <strong>{{ e[0] }}:</strong> {{ e[1] }}
                      </p>
                    }
                  </div>
                } @empty {
                  <p class="muted">No intake forms.</p>
                }
              } @else {
                <button class="btn btn-secondary btn-sm" type="button" (click)="loadIntakes()">
                  Load
                </button>
              }
            </section>
          }
          @case ('notes') {
            <section class="card">
              <h2>{{ editing() ? 'Edit draft note' : 'New note' }}</h2>
              <div class="grid-2">
                <div class="field">
                  <label for="nt">Type</label>
                  <select
                    id="nt"
                    class="input"
                    [(ngModel)]="noteForm.type"
                    [disabled]="!!editing()"
                  >
                    @for (t of noteTypes; track t) {
                      <option [value]="t">{{ human(t) }}</option>
                    }
                  </select>
                </div>
                <div class="field">
                  <label for="na">Linked session <span class="muted">(optional)</span></label>
                  <select
                    id="na"
                    class="input"
                    [(ngModel)]="noteForm.appointmentId"
                    [disabled]="!!editing()"
                  >
                    <option value="">None</option>
                    @for (a of o.appointments; track a.id) {
                      <option [value]="a.id">{{ a.startAt | date: 'd MMM y' }}</option>
                    }
                  </select>
                </div>
              </div>
              <div class="field">
                <label for="ntitle">Title</label
                ><input id="ntitle" class="input" [(ngModel)]="noteForm.title" maxlength="140" />
              </div>
              <div class="field">
                <label for="nc">Note</label
                ><textarea
                  id="nc"
                  class="textarea tall"
                  [(ngModel)]="noteForm.content"
                  maxlength="20000"
                ></textarea>
              </div>
              <div class="row">
                <button
                  class="btn"
                  type="button"
                  (click)="saveNote()"
                  [disabled]="busy() || !noteForm.title.trim() || !noteForm.content.trim()"
                >
                  {{ editing() ? 'Save draft' : 'Save as draft' }}
                </button>
                @if (editing()) {
                  <button class="btn btn-ghost" type="button" (click)="resetNote()">Cancel</button>
                }
              </div>
              <p class="small muted">
                Notes are private to you and encrypted. Finalised notes cannot be edited; add an
                addendum instead.
              </p>
            </section>

            @for (n of notes(); track n.id) {
              <article class="card note">
                <div class="row-between">
                  <div>
                    <strong>{{ n.title }}</strong>
                    <span
                      class="badge"
                      [class.badge-success]="n.status === 'FINAL'"
                      [class.badge-warning]="n.status === 'DRAFT'"
                      >{{ human(n.status) }}</span
                    >
                    @if (n.aiAssisted) {
                      <span class="badge badge-accent" [title]="provenance(n)">AI-assisted</span>
                    }
                  </div>
                  <span class="small muted"
                    >{{ human(n.type) }} · {{ n.createdAt | date: 'medium' }}</span
                  >
                </div>
                <p class="pre">{{ n.content }}</p>
                @for (a of n.addenda; track a.id) {
                  <div class="addendum">
                    <div class="small muted">Addendum · {{ a.createdAt | date: 'medium' }}</div>
                    <p class="pre">{{ a.content }}</p>
                  </div>
                }
                <div class="row">
                  @if (n.status === 'DRAFT') {
                    <button class="btn btn-secondary btn-sm" type="button" (click)="edit(n)">
                      Edit
                    </button>
                    <button class="btn btn-sm" type="button" (click)="finalize(n)">Finalise</button>
                    <button class="btn btn-ghost btn-sm" type="button" (click)="deleteNote(n)">
                      Delete draft
                    </button>
                  } @else {
                    @if (addendumFor() === n.id) {
                      <textarea
                        class="textarea"
                        [(ngModel)]="addendumText"
                        aria-label="Addendum"
                        maxlength="5000"
                      ></textarea>
                      <button
                        class="btn btn-sm"
                        type="button"
                        (click)="addAddendum(n)"
                        [disabled]="!addendumText.trim()"
                      >
                        Add addendum
                      </button>
                    } @else {
                      <button
                        class="btn btn-secondary btn-sm"
                        type="button"
                        (click)="addendumFor.set(n.id)"
                      >
                        Add addendum
                      </button>
                    }
                  }
                </div>
              </article>
            }
          }
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .plain {
      list-style: none;
      padding: 0;
    }
    .pre {
      white-space: pre-wrap;
    }
    .tall {
      min-height: 200px;
    }
    .card {
      margin-bottom: var(--mb-space-4);
    }
    .bars {
      display: flex;
      align-items: flex-end;
      gap: 3px;
      height: 100px;
      margin: 10px 0;
    }
    .bar {
      flex: 1;
      background: var(--mb-primary);
      border-radius: 3px 3px 0 0;
      min-height: 2px;
    }
    .intake {
      border-top: 1px solid var(--mb-border);
      padding-top: 8px;
      margin-top: 8px;
    }
    .intake p {
      margin: 4px 0;
    }
    .addendum {
      border-left: 3px solid var(--mb-border);
      padding-left: 12px;
      margin-bottom: 10px;
    }
    .note .badge {
      margin-left: 6px;
    }
  `,
})
export class PatientDetailPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  readonly patientId = input.required<string>();
  protected readonly tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'shared', label: 'Shared information' },
    { key: 'notes', label: 'Clinical notes' },
  ];
  protected readonly noteTypes = Object.values(ClinicalNoteType);
  protected readonly human = humanize;
  protected readonly badge = statusBadge;
  protected readonly tab = signal('overview');
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly overview = signal<Overview | null>(null);
  protected readonly mood = signal<MoodSummary | null>(null);
  protected readonly aiSummary = signal<{ summary: string | null; isMock?: boolean } | null>(null);
  protected readonly intakes = signal<
    { appointmentId: string; createdAt: string; answers: Record<string, string> }[] | null
  >(null);
  protected readonly notes = signal<ClinicalNote[]>([]);
  protected readonly editing = signal<ClinicalNote | null>(null);
  protected readonly addendumFor = signal<string | null>(null);
  protected noteForm = {
    type: ClinicalNoteType.CONSULTATION_NOTE as ClinicalNoteType,
    appointmentId: '',
    title: '',
    content: '',
  };
  protected addendumText = '';

  constructor() {
    effect(() => {
      this.patientId();
      void this.load();
    });
  }

  private get base() {
    return `/doctors/me/patients/${this.patientId()}`;
  }

  protected entries(a: Record<string, string>) {
    return Object.entries(a)
      .filter(([, v]) => v)
      .map(([k, v]) => [humanize(k.replace(/([A-Z])/g, '_$1')), v]);
  }
  protected emotionList(m: MoodSummary) {
    return m.topEmotions.map((t) => `${t.tag} (${t.count})`).join(', ');
  }
  protected provenance(n: ClinicalNote) {
    const p = n.aiProvenance;
    return p
      ? `Drafted with ${p.provider}/${p.model}${p.isMock ? ' (mock)' : ''} for ${humanize(p.task)}`
      : '';
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    this.mood.set(null);
    this.aiSummary.set(null);
    this.intakes.set(null);
    try {
      const o = await this.api.get<Overview>(this.base);
      this.overview.set(o);
      void this.loadNotes();
      if (o.sharedWithYou.moodSummary) void this.loadMood();
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async loadMood() {
    try {
      this.mood.set(await this.api.get<MoodSummary>(`${this.base}/mood-summary`));
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async loadAiSummary() {
    this.busy.set(true);
    try {
      this.aiSummary.set(await this.api.get(`${this.base}/ai-summary`));
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async loadIntakes() {
    try {
      this.intakes.set(await this.api.get(`${this.base}/intakes`));
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async loadNotes() {
    try {
      this.notes.set(
        (await this.api.page<ClinicalNote>(`${this.base}/notes`, { pageSize: 50 })).items,
      );
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  resetNote() {
    this.editing.set(null);
    this.noteForm = {
      type: ClinicalNoteType.CONSULTATION_NOTE,
      appointmentId: '',
      title: '',
      content: '',
    };
  }

  edit(n: ClinicalNote) {
    this.editing.set(n);
    this.noteForm = {
      type: n.type,
      appointmentId: n.appointmentId ?? '',
      title: n.title,
      content: n.content,
    };
  }

  async saveNote() {
    this.busy.set(true);
    const f = this.noteForm;
    try {
      const ed = this.editing();
      if (ed)
        await this.api.patch(`/doctors/me/notes/${ed.id}`, {
          title: f.title.trim(),
          content: f.content,
        });
      else
        await this.api.post(`${this.base}/notes`, {
          type: f.type,
          title: f.title.trim(),
          content: f.content,
          appointmentId: f.appointmentId || undefined,
        });
      this.toast.success('Draft saved.');
      this.resetNote();
      await this.loadNotes();
    } catch (err) {
      this.toast.error(ApiError.from(err).message);
    } finally {
      this.busy.set(false);
    }
  }

  async finalize(n: ClinicalNote) {
    const ok = await this.confirm.ask({
      title: 'Finalise this note?',
      message: 'A finalised note can no longer be edited or deleted. You can still add addenda.',
      confirmLabel: 'Finalise',
    });
    if (!ok) return;
    try {
      await this.api.post(`/doctors/me/notes/${n.id}/finalize`);
      await this.loadNotes();
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async deleteNote(n: ClinicalNote) {
    if (
      !(await this.confirm.ask({
        title: 'Delete this draft?',
        message: n.title,
        confirmLabel: 'Delete',
        danger: true,
      }))
    )
      return;
    try {
      await this.api.delete(`/doctors/me/notes/${n.id}`);
      await this.loadNotes();
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async addAddendum(n: ClinicalNote) {
    try {
      await this.api.post(`/doctors/me/notes/${n.id}/addenda`, {
        content: this.addendumText.trim(),
      });
      this.addendumText = '';
      this.addendumFor.set(null);
      await this.loadNotes();
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }
}
