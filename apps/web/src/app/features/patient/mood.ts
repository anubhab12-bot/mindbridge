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
        <h1>Daily Mood & Reflection</h1>
        <p>
          A gentle daily check-in. Patterns are just for you to notice and reflect upon; they are not a clinical diagnosis.
        </p>
      </header>

      <div class="grid-2">
        <!-- CHECK-IN CARD -->
        <section class="card checkin-card">
          <div class="card-title-row">
            <h2>Record Today's Check-in</h2>
            <span class="badge badge-primary">Private</span>
          </div>

          <form [formGroup]="form" (ngSubmit)="save()">
            <mb-mood-scale formControlName="score" />

            <fieldset class="emotions-fieldset">
              <legend class="emotions-legend">
                <span>Anything you're feeling?</span>
                <span class="muted-note">(optional)</span>
              </legend>
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
              <label for="note" class="field-label">
                <span>Personal reflection / note</span>
                <span class="muted-note">(optional, strictly private)</span>
              </label>
              <textarea
                id="note"
                class="textarea mood-textarea"
                formControlName="note"
                maxlength="1000"
                placeholder="What contributed to how you feel today? Any triggers or helpful moments?"
              ></textarea>
            </div>

            <button class="btn btn-save-checkin" type="submit" [disabled]="busy() || form.invalid">
              @if (busy()) {
                <span>⏳ Saving check-in...</span>
              } @else {
                <span>✨ Save check-in</span>
              }
            </button>
          </form>
        </section>

        <!-- TRENDS & RECENT CHART CARD -->
        <section class="card trends-card">
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
            <p class="muted empty-trend-msg">Your chart will appear after your first check-in.</p>
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
                <circle [attr.cx]="p.x" [attr.cy]="p.y" r="5" class="dot">
                  <title>{{ p.date }}: {{ p.average }}</title>
                </circle>
              }
            </svg>
            <p class="small muted scale-sub">1 = very low, 5 = very good. Average per day.</p>
            @if (trend()!.topEmotions.length) {
              <div class="top-emotions-row">
                <span class="small muted">Most noted:</span>
                <div class="top-emotions-list">
                  @for (t of trend()!.topEmotions; track t.tag) {
                    <span class="badge badge-accent">{{ t.tag }} ({{ t.count }})</span>
                  }
                </div>
              </div>
            }
          }
        </section>
      </div>

      <!-- HISTORY SECTION -->
      <section class="history-section">
        <div class="history-header">
          <div>
            <h2>Check-in History</h2>
            <p class="history-sub">Your private reflection record over time.</p>
          </div>
          @if (entries()?.length) {
            <span class="badge badge-primary history-total-badge">{{ meta()?.total ?? entries()!.length }} Entries</span>
          }
        </div>

        @if (!entries()) {
          <mb-loading />
        } @else if (!entries()!.length) {
          <mb-empty title="No check-ins yet" text="When you record your daily mood, your private entries and reflections will appear here." />
        } @else {
          <div class="history-stack">
            @for (e of entries(); track e.id) {
              <article class="history-card" [class]="moodClass(e.score)">
                <div class="history-card-body">
                  <!-- Header row: Mood badge + Timestamp -->
                  <div class="history-top-row">
                    <div class="mood-pill" [class]="moodClass(e.score)">
                      <span class="mood-pill-emoji">{{ moodEmoji(e.score) }}</span>
                      <strong class="mood-pill-name">{{ label(e.score) }}</strong>
                      <span class="mood-pill-score">{{ e.score }}/5</span>
                    </div>
                    <time class="history-time">{{ e.createdAt | date: 'MMM d, y · h:mm a' }}</time>
                  </div>

                  <!-- Emotions tags -->
                  @if (e.emotions.length) {
                    <div class="history-emotions-row">
                      @for (emo of e.emotions; track emo) {
                        <span class="history-emotion-tag">{{ emo }}</span>
                      }
                    </div>
                  }

                  <!-- Note block -->
                  @if (e.note) {
                    <div class="history-note-quote">
                      <span class="note-quote-mark">“</span>
                      <p class="note-quote-content">{{ e.note }}</p>
                    </div>
                  }
                </div>

                <!-- Delete Action -->
                <div class="history-card-actions">
                  <button
                    class="btn-delete-checkin"
                    type="button"
                    (click)="remove(e)"
                    [attr.aria-label]="'Delete check-in from ' + (e.createdAt | date: 'medium')"
                    title="Delete check-in"
                  >
                    <span class="del-icon">🗑️</span>
                    <span>Delete</span>
                  </button>
                </div>
              </article>
            }
          </div>
          <mb-pagination [meta]="meta()" (page)="loadEntries($event)" />
        }
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .card-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--mb-space-3);
    }
    .checkin-card h2,
    .trends-card h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
    }
    .emotions-fieldset {
      border: 0;
      padding: 0;
      margin: var(--mb-space-4) 0;
    }
    .emotions-legend {
      font-size: 0.95rem;
      font-weight: 650;
      margin-bottom: var(--mb-space-2);
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .muted-note {
      font-size: 0.82rem;
      font-weight: 400;
      color: var(--mb-text-muted);
    }
    .field-label {
      font-size: 0.95rem;
      font-weight: 650;
      display: flex;
      gap: 6px;
      align-items: center;
      margin-bottom: 6px;
    }
    .mood-textarea {
      min-height: 100px;
      border-radius: var(--mb-radius-sm);
      padding: 12px 14px;
      line-height: 1.5;
      font-family: inherit;
      resize: vertical;
    }
    .btn-save-checkin {
      margin-top: var(--mb-space-3);
      min-height: 44px;
      padding: 0 24px;
      font-weight: 700;
      border-radius: 999px;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25);
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }
    .chip {
      border: 1px solid var(--mb-border);
      background: var(--mb-surface);
      border-radius: 999px;
      padding: 6px 14px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      color: var(--mb-text);
      transition: all 0.18s ease;
    }
    .chip:hover {
      background: var(--mb-surface-2);
      border-color: var(--mb-primary);
      transform: translateY(-1px);
    }
    .chip.on {
      background: var(--mb-primary-soft);
      border-color: var(--mb-primary);
      color: var(--mb-primary-strong);
      font-weight: 700;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2);
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
      stroke: var(--mb-surface);
      stroke-width: 2;
    }
    .empty-trend-msg {
      margin-top: var(--mb-space-4);
    }
    .scale-sub {
      margin-top: var(--mb-space-2);
    }
    .top-emotions-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: var(--mb-space-3);
      flex-wrap: wrap;
    }
    .top-emotions-list {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    /* History Section Styles */
    .history-section {
      margin-top: var(--mb-space-6);
    }
    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--mb-space-4);
      flex-wrap: wrap;
      gap: 12px;
    }
    .history-header h2 {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 700;
    }
    .history-sub {
      margin: 2px 0 0;
      font-size: 0.88rem;
      color: var(--mb-text-muted);
    }
    .history-total-badge {
      font-size: 0.85rem;
      padding: 4px 12px;
    }
    .history-stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .history-card {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      padding: 18px 20px;
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }
    .history-card:hover {
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
      border-color: rgba(16, 185, 129, 0.3);
    }
    .history-card.mood-1 {
      border-left: 4px solid #f43f5e;
    }
    .history-card.mood-2 {
      border-left: 4px solid #f59e0b;
    }
    .history-card.mood-3 {
      border-left: 4px solid #6366f1;
    }
    .history-card.mood-4 {
      border-left: 4px solid #10b981;
    }
    .history-card.mood-5 {
      border-left: 4px solid #059669;
    }
    .history-card-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .history-top-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .mood-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 0.85rem;
      border: 1px solid transparent;
    }
    .mood-pill.mood-1 {
      background: rgba(244, 63, 94, 0.12);
      color: #f43f5e;
      border-color: rgba(244, 63, 94, 0.25);
    }
    .mood-pill.mood-2 {
      background: rgba(245, 158, 11, 0.12);
      color: #d97706;
      border-color: rgba(245, 158, 11, 0.25);
    }
    .mood-pill.mood-3 {
      background: rgba(99, 102, 241, 0.12);
      color: #6366f1;
      border-color: rgba(99, 102, 241, 0.25);
    }
    .mood-pill.mood-4 {
      background: rgba(16, 185, 129, 0.14);
      color: #059669;
      border-color: rgba(16, 185, 129, 0.3);
    }
    .mood-pill.mood-5 {
      background: rgba(16, 185, 129, 0.2);
      color: #047857;
      border-color: rgba(16, 185, 129, 0.4);
    }
    .mood-pill-emoji {
      font-size: 1rem;
      line-height: 1;
    }
    .mood-pill-name {
      font-weight: 700;
    }
    .mood-pill-score {
      font-size: 0.72rem;
      font-weight: 800;
      opacity: 0.8;
      padding-left: 2px;
    }
    .history-time {
      font-size: 0.82rem;
      color: var(--mb-text-muted);
      font-weight: 500;
    }
    .history-emotions-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .history-emotion-tag {
      font-size: 0.78rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 999px;
      background: var(--mb-surface-2);
      color: var(--mb-text);
      border: 1px solid var(--mb-border);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .history-emotion-tag::before {
      content: '•';
      color: var(--mb-primary);
      font-size: 1rem;
      line-height: 0;
    }
    .history-note-quote {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 14px;
      background: var(--mb-surface-2);
      border-radius: var(--mb-radius-sm);
      border: 1px solid rgba(0, 0, 0, 0.04);
      margin-top: 2px;
    }
    .note-quote-mark {
      font-size: 1.2rem;
      color: var(--mb-primary);
      line-height: 1;
      font-family: serif;
    }
    .note-quote-content {
      margin: 0;
      font-size: 0.88rem;
      color: var(--mb-text);
      line-height: 1.45;
      white-space: pre-wrap;
    }
    .history-card-actions {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .btn-delete-checkin {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: var(--mb-radius-sm);
      font-size: 0.82rem;
      font-weight: 600;
      background: transparent;
      border: 1px solid transparent;
      color: var(--mb-text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-delete-checkin:hover {
      background: rgba(244, 63, 94, 0.1);
      border-color: rgba(244, 63, 94, 0.25);
      color: #f43f5e;
    }
    .del-icon {
      font-size: 0.85rem;
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
  protected moodEmoji(score: number): string {
    const emojis = ['🌧️', '☁️', '⛅', '🌤️', '☀️'];
    return emojis[score - 1] ?? '✨';
  }
  protected moodClass(score: number): string {
    const classes = ['mood-1', 'mood-2', 'mood-3', 'mood-4', 'mood-5'];
    return classes[score - 1] ?? 'mood-3';
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
