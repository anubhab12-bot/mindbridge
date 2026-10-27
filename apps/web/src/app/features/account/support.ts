import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { type PageMeta, SupportTicketCategory } from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { errorMessage } from '../../core/api/api-error';
import { ToastService } from '../../core/services/toast.service';
import { FieldErrorComponent } from '../../shared/ui/field-error';
import { PaginationComponent } from '../../shared/ui/pagination';
import { EmptyStateComponent, LoadingComponent } from '../../shared/ui/states';
import { humanize } from '../../shared/util/format';

export interface Ticket {
  id: string;
  category: SupportTicketCategory;
  subject: string;
  status: string;
  replies: { id: string; from: 'USER' | 'ADMIN'; body: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'mb-support',
  imports: [ReactiveFormsModule, DatePipe, RouterLink, FieldErrorComponent, LoadingComponent, EmptyStateComponent, PaginationComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Help &amp; support</h1>
        <p>Questions about your account, bookings or privacy? Send us a message.</p>
      </header>
      <div class="alert alert-crisis small">
        Support is answered during working hours. If you or someone else is in immediate danger, <a routerLink="/crisis">get help now</a>.
      </div>
      <div class="layout">
        <section>
          <h2>Your requests</h2>
          @if (loading()) {
            <mb-loading />
          } @else if (!tickets().length) {
            <mb-empty title="No requests yet" />
          } @else {
            <ul class="list card-flat">
              @for (t of tickets(); track t.id) {
                <li>
                  <button type="button" class="open" (click)="select(t)" [attr.aria-expanded]="selected()?.id === t.id">
                    <span class="row-between"><strong>{{ t.subject }}</strong><span class="badge">{{ label(t.status) }}</span></span>
                    <span class="small muted">{{ label(t.category) }} · updated {{ t.updatedAt | date: 'medium' }}</span>
                  </button>
                  @if (selected()?.id === t.id) {
                    <div class="thread">
                      @for (r of t.replies; track r.id) {
                        <div class="reply" [class.staff]="r.from !== 'USER'">
                          <div class="small muted">{{ r.from === 'USER' ? 'You' : 'MindBridge support' }} · {{ r.createdAt | date: 'short' }}</div>
                          <div class="body">{{ r.body }}</div>
                        </div>
                      }
                      @if (t.status !== 'CLOSED') {
                        <form [formGroup]="reply" (ngSubmit)="sendReply(t)">
                          <textarea class="textarea" formControlName="message" aria-label="Reply" maxlength="5000"></textarea>
                          <button class="btn btn-sm" type="submit" [disabled]="busy()">Send reply</button>
                        </form>
                      }
                    </div>
                  }
                </li>
              }
            </ul>
            <mb-pagination [meta]="meta()" (page)="load($event)" />
          }
        </section>
        <section class="card">
          <h2>New request</h2>
          <form [formGroup]="form" (ngSubmit)="create()">
            <div class="field">
              <label for="cat">Topic</label>
              <select id="cat" class="input" formControlName="category">
                @for (c of categories; track c) { <option [value]="c">{{ label(c) }}</option> }
              </select>
            </div>
            <div class="field">
              <label for="subj">Subject</label>
              <input id="subj" class="input" formControlName="subject" maxlength="140" />
              <mb-field-error [control]="form.controls.subject" label="Subject" />
            </div>
            <div class="field">
              <label for="msg">Message</label>
              <textarea id="msg" class="textarea" formControlName="message" maxlength="5000"></textarea>
              <span class="hint">Please don't include passwords or detailed health information.</span>
              <mb-field-error [control]="form.controls.message" label="Message" />
            </div>
            <button class="btn" type="submit" [disabled]="busy()">Send</button>
          </form>
        </section>
      </div>
    </div>
  `,
  styles: `.layout { display: grid; gap: var(--mb-space-5); grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); align-items: start; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
    .open { all: unset; cursor: pointer; display: flex; flex-direction: column; gap: 4px; width: 100%; }
    .thread { margin-top: var(--mb-space-3); display: grid; gap: var(--mb-space-2); }
    .reply { background: var(--mb-surface-2); border-radius: var(--mb-radius-sm); padding: 10px 12px; } .staff { background: var(--mb-primary-soft); }
    .body { white-space: pre-wrap; } form .btn-sm { margin-top: 8px; }`,
})
export class SupportPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly categories = Object.values(SupportTicketCategory);
  protected readonly tickets = signal<Ticket[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly selected = signal<Ticket | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly label = humanize;
  protected readonly form = this.fb.group({
    category: [SupportTicketCategory.ACCOUNT as SupportTicketCategory],
    subject: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(140)]],
    message: ['', [Validators.required, Validators.maxLength(5000)]],
  });
  protected readonly reply = this.fb.group({ message: ['', Validators.required] });

  constructor() {
    void this.load();
  }

  async load(page = 1) {
    this.loading.set(true);
    try {
      const res = await this.api.page<Ticket>('/support/tickets', { page, pageSize: 10 });
      this.tickets.set(res.items);
      this.meta.set(res.meta);
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async select(t: Ticket) {
    if (this.selected()?.id === t.id) return this.selected.set(null);
    try {
      this.selected.set(await this.api.get<Ticket>(`/support/tickets/${t.id}`));
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async create() {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.busy.set(true);
    try {
      const res = await this.api.post<{ ticket: Ticket; notice: string }>('/support/tickets', this.form.getRawValue());
      this.toast.success('Thanks. We have your request.');
      this.form.reset({ category: SupportTicketCategory.ACCOUNT, subject: '', message: '' });
      this.tickets.update((list) => [res.ticket, ...list]);
      this.selected.set(res.ticket);
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async sendReply(t: Ticket) {
    if (this.reply.invalid) return;
    this.busy.set(true);
    try {
      const updated = await this.api.post<Ticket>(`/support/tickets/${t.id}/replies`, this.reply.getRawValue());
      this.reply.reset();
      this.selected.set(updated);
      this.tickets.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
