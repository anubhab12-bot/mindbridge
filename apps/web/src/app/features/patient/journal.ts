import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { PageMeta } from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { errorMessage } from '../../core/api/api-error';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../shared/ui/confirm';
import { PaginationComponent } from '../../shared/ui/pagination';
import { EmptyStateComponent, LoadingComponent } from '../../shared/ui/states';

interface JournalEntry {
  id: string;
  title: string;
  body?: string;
  preview?: string;
  prompt?: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'mb-journal',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    LoadingComponent,
    EmptyStateComponent,
    PaginationComponent,
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Private Journal</h1>
        <p>
          A private, encrypted space to write and reflect. Entries are never shared with clinicians or the AI companion.
        </p>
      </header>
      <div class="layout">
        <section class="card">
          <h2>{{ editing() ? 'Edit entry' : 'New entry' }}</h2>
          @if (prompts().length && !editing()) {
            <div class="field">
              <label for="prompt">Need a starting prompt?</label>
              <select
                id="prompt"
                class="input"
                [value]="form.controls.prompt.value"
                (change)="form.controls.prompt.setValue($any($event.target).value)"
              >
                <option value="">No prompt (free-form reflection)</option>
                @for (p of prompts(); track p) {
                  <option [value]="p">{{ p }}</option>
                }
              </select>
            </div>
          }
          @if (form.controls.prompt.value) {
            <p class="prompt">{{ form.controls.prompt.value }}</p>
          }
          <form [formGroup]="form" (ngSubmit)="save()">
            <div class="field">
              <label for="title">Title <span class="muted">(optional)</span></label>
              <input id="title" class="input" formControlName="title" maxlength="200" placeholder="e.g. Morning reflections" />
            </div>
            <div class="field">
              <label for="body">Entry</label>
              <textarea
                id="body"
                class="textarea tall"
                formControlName="body"
                maxlength="20000"
                placeholder="Write whatever is on your mind freely..."
              ></textarea>
            </div>
            <div class="row">
              <button class="btn" type="submit" [disabled]="busy() || form.invalid">
                {{ editing() ? 'Save changes' : 'Save entry' }}
              </button>
              @if (editing()) {
                <button class="btn btn-ghost" type="button" (click)="cancelEdit()">Cancel</button>
              }
            </div>
          </form>
        </section>

        <section>
          <h2>Past entries</h2>
          @if (!entries()) {
            <mb-loading [lines]="4" />
          } @else if (!entries()!.length) {
            <mb-empty title="No entries yet" text="Whatever you write stays strictly private to you." />
          } @else {
            <div class="entries-stack">
              @for (e of entries(); track e.id) {
                <article class="journal-card">
                  <div class="row-between">
                    <strong class="journal-title">{{ e.title || 'Untitled reflection' }}</strong>
                    <span class="small muted">{{ e.createdAt | date: 'mediumDate' }}</span>
                  </div>
                  @if (open()?.id === e.id) {
                    <p class="body">{{ open()!.body }}</p>
                  } @else {
                    <p class="small muted preview-text">{{ e.preview }}…</p>
                  }
                  <div class="row journal-actions">
                    <button class="btn btn-secondary btn-sm" type="button" (click)="toggle(e)">
                      {{ open()?.id === e.id ? 'Close' : 'Read' }}
                    </button>
                    <button class="btn btn-secondary btn-sm" type="button" (click)="edit(e)">
                      Edit
                    </button>
                    <button class="btn btn-ghost btn-sm btn-del" type="button" (click)="remove(e)">
                      Delete
                    </button>
                  </div>
                </article>
              }
            </div>
            <mb-pagination [meta]="meta()" (page)="load($event)" />
          }
        </section>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .layout {
      display: grid;
      gap: var(--mb-space-5);
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: start;
    }
    @media (max-width: 900px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }
    .tall {
      min-height: 240px;
    }
    .prompt {
      font-style: italic;
      color: var(--mb-primary-strong);
      background: var(--mb-primary-soft);
      padding: 8px 12px;
      border-radius: var(--mb-radius-sm);
      margin-bottom: var(--mb-space-3);
    }
    .body {
      white-space: pre-wrap;
      line-height: 1.6;
      margin: var(--mb-space-3) 0;
    }
    .entries-stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .journal-card {
      padding: 16px 20px;
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      transition: all 0.2s ease;
    }
    .journal-card:hover {
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
      border-color: rgba(16, 185, 129, 0.3);
    }
    .journal-title {
      font-size: 1.05rem;
      color: var(--mb-text);
    }
    .preview-text {
      margin: 8px 0 12px;
      line-height: 1.5;
    }
    .journal-actions {
      margin-top: 10px;
      gap: 8px;
    }
    .btn-del:hover {
      color: var(--mb-danger);
      background: var(--mb-danger-soft);
    }
  `,
})
export class JournalPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly prompts = signal<string[]>([]);
  protected readonly entries = signal<JournalEntry[] | null>(null);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly open = signal<JournalEntry | null>(null);
  protected readonly editing = signal<JournalEntry | null>(null);
  protected readonly busy = signal(false);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    title: [''],
    body: ['', [Validators.required, Validators.maxLength(20000)]],
    prompt: [''],
  });

  ngOnInit() {
    this.api.get<string[]>('/patients/journal-entries/prompts').then(
      (p) => this.prompts.set(p),
      () => undefined,
    );
    void this.load();
  }

  async load(page = 1) {
    try {
      const res = await this.api.page<JournalEntry>('/patients/journal-entries', {
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

  private async full(e: JournalEntry) {
    return e.body !== undefined
      ? e
      : this.api.get<JournalEntry>(`/patients/journal-entries/${e.id}`);
  }

  async toggle(e: JournalEntry) {
    if (this.open()?.id === e.id) return this.open.set(null);
    try {
      this.open.set(await this.full(e));
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async edit(e: JournalEntry) {
    try {
      const f = await this.full(e);
      this.editing.set(f);
      this.form.setValue({ title: f.title, body: f.body ?? '', prompt: f.prompt ?? '' });
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  cancelEdit() {
    this.editing.set(null);
    this.form.reset();
  }

  async save() {
    if (this.form.invalid) return;
    this.busy.set(true);
    const v = this.form.getRawValue();
    try {
      const ed = this.editing();
      if (ed) {
        await this.api.patch(`/patients/journal-entries/${ed.id}`, {
          title: v.title.trim(),
          body: v.body,
        });
        this.toast.success('Entry updated.');
      } else {
        await this.api.post('/patients/journal-entries', {
          title: v.title.trim() || undefined,
          body: v.body,
          prompt: v.prompt || undefined,
        });
        this.toast.success('Entry saved.');
      }
      this.cancelEdit();
      this.open.set(null);
      void this.load();
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async remove(e: JournalEntry) {
    if (
      !(await this.confirm.ask({
        title: 'Delete this entry?',
        message: 'This cannot be undone.',
        confirmLabel: 'Delete',
        danger: true,
      }))
    )
      return;
    try {
      await this.api.delete(`/patients/journal-entries/${e.id}`);
      if (this.editing()?.id === e.id) this.cancelEdit();
      void this.load();
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }
}
