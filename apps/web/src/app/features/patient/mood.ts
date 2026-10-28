import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { PageMeta } from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { errorMessage } from '../../core/api/api-error';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../shared/ui/confirm';
import { MOOD_LABELS, MoodScaleComponent } from '../../shared/ui/mood-scale';
import { PaginationComponent } from '../../shared/ui/pagination';
import { EmptyStateComponent, LoadingComponent } from '../../shared/ui/states';

export interface MoodEntryView {
  id: string;
  score: number;
  emotions: string[];
  note?: string;
  entryDate: string;
  createdAt: string;
}

interface Trend {
  from: string;
  to: string;
  days: { date: string; average: number; entries: number }[];
  topEmotions: { tag: string; count: number }[];
}

export const EMOTIONS = [
  'calm',
  'content',
  'hopeful',
  'grateful',
  'tired',
  'lonely',
  'sad',
  'anxious',
  'stressed',
  'frustrated',
  'angry',
  'overwhelmed',
  'numb',
  'restless',
];

@Component({
  selector: 'mb-mood',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    MoodScaleComponent,
    LoadingComponent,
    EmptyStateComponent,
    PaginationComponent,
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Mood</h1>
        <p>
          A quick daily check-in. Patterns are just for you to notice; they are not a diagnosis.
        </p>
      </header>
      <div class="grid-2">
        <section class="card">
          <h2>Check in</h2>
          <form [formGroup]="form" (ngSubmit)="save()">
            <mb-mood-scale formControlName="score" />
            <fieldset>
              <legend>Anything you're feeling? <span class="muted">(optional)</span></legend>
              <div class="chips">
                @for (e of emotions; track e) {
                  <button
                    type="button"
                    class="chip"
                    [class.on]="selected().includes(e)"
                    [attr.aria-pressed]="selected().includes(e)"
                    (click)="toggle(e)"
                  >
                    {{ e }}
                  </button>
                }
              </div>
            </fieldset>
            <div class="field">
              <label for="note">Note <span class="muted">(optional, private)</span></label>
              <textarea
                id="note"
                class="textarea"
                formControlName="note"
                maxlength="1000"
              ></textarea>
            </div>
            <button class="btn" type="submit" [disabled]="busy() || form.invalid">
              Save check-in
            </button>
          </form>
        </section>

        <section class="card">
          <div class="row-between">
            <h2>Your last {{ range() }} days</h2>
            <select
              class="input range"
              aria-label="Range"
              [value]="range()"
              (change)="setRange($any($event.target).value)"
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </div>
          @if (!trend()) {
            <mb-loading />
          } @else if (!trend()!.days.length) {
            <p class="muted">Your chart will appear after your first check-in.</p>
          } @else {
            <svg
              class="chart"
              [attr.viewBox]="'0 0 ' + W + ' ' + H"
              role="img"
              [attr.aria-label]="chartLabel()"
            >
              @for (y of [1, 2, 3, 4, 5]; track y) {
                <line
                  [attr.x1]="P"
                  [attr.x2]="W - 8"
                  [attr.y1]="yPos(y)"
                  [attr.y2]="yPos(y)"
                  class="grid-line"
                />
                <text [attr.x]="P - 8" [attr.y]="yPos(y) + 4" class="axis" text-anchor="end">
                  {{ y }}
                </text>
              }
              <polyline [attr.points]="points()" class="line" />
              @for (p of plotted(); track p.date) {
                <circle [attr.cx]="p.x" [attr.cy]="p.y" r="4" class="dot">
                  <title>{{ p.date }}: {{ p.average }}</title>
                </circle>
              }
            </svg>
            <p class="small muted">1 = very low, 5 = very good. Average per day.</p>
            @if (trend()!.topEmotions.length) {
              <p class="small">
                Most noted:
                @for (t of trend()!.topEmotions; track t.tag) {
                  <span class="badge">{{ t.tag }} ({{ t.count }})</span>
                }
              </p>
            }
          }
        </section>
      </div>

      <section class="history">
        <h2>History</h2>
        @if (!entries()) {
          <mb-loading />
        } @else if (!entries()!.length) {
          <mb-empty title="No check-ins yet" />
        } @else {
          <ul class="list card-flat">
            @for (e of entries(); track e.id) {
              <li class="row-between">
                <div>
                  <strong>{{ label(e.score) }}</strong>
                  <span class="small muted">· {{ e.createdAt | date: 'medium' }}</span>
                  @if (e.emotions.length) {
                    <div class="small">{{ e.emotions.join(', ') }}</div>
                  }
                  @if (e.note) {
                    <div class="small muted note">{{ e.note }}</div>
                  }
                </div>
                <button
                  class="btn btn-ghost btn-sm"
                  type="button"
                  (click)="remove(e)"
                  [attr.aria-label]="'Delete check-in from ' + (e.createdAt | date: 'medium')"
                >
                  Delete
                </button>
              </li>
            }
          </ul>
          <mb-pagination [meta]="meta()" (page)="loadEntries($event)" />
        }
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .chip {
      border: 1px solid var(--mb-border);
      background: var(--mb-surface);
      border-radius: 999px;
      padding: 6px 12px;
      font: inherit;
      cursor: pointer;
      color: var(--mb-text);
    }
    .chip.on {
      background: var(--mb-primary-soft);
      border-color: var(--mb-primary);
      color: var(--mb-primary-strong);
      font-weight: 600;
    }
    .range {
      width: auto;
      min-height: 36px;
      padding: 4px 10px;
    }
    .chart {
      width: 100%;
      height: auto;
      margin-top: var(--mb-space-3);
    }
    .grid-line {
      stroke: var(--mb-border);
      stroke-width: 1;
    }
    .axis {
      fill: var(--mb-text-muted);
      font-size: 11px;
    }
    .line {
      fill: none;
      stroke: var(--mb-primary);
      stroke-width: 2.5;
      stroke-linejoin: round;
    }
    .dot {
      fill: var(--mb-primary);
    }
    .history {
      margin-top: var(--mb-space-6);
    }
    .note {
      white-space: pre-wrap;
    }
  `,
})
export class MoodPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly emotions = EMOTIONS;
  protected readonly W = 560;
  protected readonly H = 200;
  protected readonly P = 28;
  protected readonly busy = signal(false);
  protected readonly selected = signal<string[]>([]);
  protected readonly range = signal(30);
  protected readonly trend = signal<Trend | null>(null);
  protected readonly entries = signal<MoodEntryView[] | null>(null);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly form = inject(FormBuilder).group({
    score: [null as number | null, Validators.required],
    note: [''],
  });

  protected readonly plotted = computed(() => {
    const t = this.trend();
    if (!t?.days.length) return [];
    const start = new Date(t.from).getTime();
    const span = Math.max(1, new Date(t.to).getTime() - start);
    return t.days.map((d) => ({
      ...d,
      x: this.P + ((new Date(d.date).getTime() - start) / span) * (this.W - this.P - 16),
      y: this.yPos(d.average),
    }));
  });
  protected readonly points = computed(() =>
    this.plotted()
      .map((p) => `${p.x},${p.y}`)
      .join(' '),
  );
  protected readonly chartLabel = computed(() => {
    const d = this.trend()?.days ?? [];
    const avg = d.length ? (d.reduce((a, x) => a + x.average, 0) / d.length).toFixed(1) : '0';
    return `Mood over the last ${this.range()} days: ${d.length} days with check-ins, average ${avg} out of 5.`;
  });

  protected yPos(v: number) {
    return 12 + ((5 - v) / 4) * (this.H - 30);
  }
  protected label(score: number) {
    return MOOD_LABELS[score - 1] ?? String(score);
  }

  ngOnInit() {
    void this.loadTrend();
    void this.loadEntries();
  }

  toggle(e: string) {
    this.selected.update((s) => (s.includes(e) ? s.filter((x) => x !== e) : [...s, e]));
  }

  setRange(v: string) {
    this.range.set(Number(v));
    void this.loadTrend();
  }

  async loadTrend() {
    this.trend.set(null);
    try {
      this.trend.set(
        await this.api.get<Trend>('/patients/mood-entries/trend', { days: this.range() }),
      );
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async loadEntries(page = 1) {
    try {
      const res = await this.api.page<MoodEntryView>('/patients/mood-entries', {
        page,
        pageSize: 10,
      });
      this.entries.set(res.items);
      this.meta.set(res.meta);
    } catch (err) {
      this.entries.set([]);
      this.toast.error(errorMessage(err));
    }
  }

  async save() {
    const v = this.form.getRawValue();
    if (!v.score) return;
    this.busy.set(true);
    try {
      await this.api.post('/patients/mood-entries', {
        score: v.score,
        emotions: this.selected(),
        note: v.note?.trim() || undefined,
      });
      this.toast.success('Check-in saved. Thank you for taking a moment for yourself.');
      this.form.reset({ score: null, note: '' });
      this.selected.set([]);
      void this.loadTrend();
      void this.loadEntries();
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async remove(e: MoodEntryView) {
    if (
      !(await this.confirm.ask({
        title: 'Delete this check-in?',
        message: 'This cannot be undone.',
        confirmLabel: 'Delete',
        danger: true,
      }))
    )
      return;
    try {
      await this.api.delete(`/patients/mood-entries/${e.id}`);
      void this.loadEntries();
      void this.loadTrend();
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }
}
