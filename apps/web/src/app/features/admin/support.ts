import { DatePipe } from '@angular/common';
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  type PageMeta,
  SupportTicketCategory,
  SupportTicketStatus,
} from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { errorMessage } from '../../core/api/api-error';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/ui/pagination';
import { EmptyStateComponent, LoadingComponent } from '../../shared/ui/states';
import { humanize } from '../../shared/util/format';
import type { Ticket } from '../account/support';

interface AdminTicket extends Ticket {
  userId: string;
  userRole: string;
}

@Component({
  selector: 'mb-admin-support',
  imports: [DatePipe, FormsModule, LoadingComponent, EmptyStateComponent, PaginationComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Support tickets</h1>
        <p>Safety concerns are listed first. Never ask users for passwords.</p>
      </header>
      <div class="row filters">
        <select class="input" [(ngModel)]="status" (change)="load()" aria-label="Status">
          <option value="">Any status</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ h(s) }}</option>
          }
        </select>
        <select class="input" [(ngModel)]="category" (change)="load()" aria-label="Category">
          <option value="">Any topic</option>
          @for (c of categories; track c) {
            <option [value]="c">{{ h(c) }}</option>
          }
        </select>
      </div>
      <div class="layout">
        <section>
          @if (loading()) {
            <mb-loading />
          } @else if (!rows().length) {
            <mb-empty title="No tickets" />
          } @else {
            <ul class="list card-flat">
              @for (t of rows(); track t.id) {
                <li>
                  <button type="button" class="open" (click)="open(t)">
                    <span class="row-between"
                      ><strong>{{ t.subject }}</strong>
                      <span class="badge" [class.badge-danger]="t.category === 'SAFETY_CONCERN'">{{
                        h(t.category)
                      }}</span></span
                    >
                    <span class="small muted"
                      >{{ h(t.userRole) }} · {{ h(t.status) }} ·
                      {{ t.updatedAt | date: 'short' }}</span
                    >
                  </button>
                </li>
              }
            </ul>
            <mb-pagination [meta]="meta()" (page)="load($event)" />
          }
        </section>
        @if (active(); as t) {
          <section class="card">
            <h2>{{ t.subject }}</h2>
            <p class="small muted">
              {{ h(t.category) }} · opened {{ t.createdAt | date: 'medium' }}
            </p>
            @for (r of t.replies; track r.id) {
              <div class="reply" [class.staff]="r.from !== 'USER'">
                <div class="small muted">
                  {{ r.from === 'USER' ? 'User' : 'Support' }} · {{ r.createdAt | date: 'short' }}
                </div>
                <div class="pre">{{ r.body }}</div>
              </div>
            }
            <div class="field">
              <label for="rep">Reply</label
              ><textarea id="rep" class="textarea" [(ngModel)]="reply" maxlength="5000"></textarea>
            </div>
            <div class="row">
              <select class="input status" [(ngModel)]="newStatus" aria-label="Set status">
                @for (s of statuses; track s) {
                  <option [value]="s">{{ h(s) }}</option>
                }
              </select>
              <button class="btn" type="button" (click)="send(t)" [disabled]="!reply.trim()">
                Send reply
              </button>
              <button class="btn btn-secondary" type="button" (click)="setStatus(t)">
                Update status only
              </button>
            </div>
          </section>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .filters {
      margin-bottom: var(--mb-space-4);
    }
    .filters .input,
    .status {
      width: auto;
    }
    .layout {
      display: grid;
      gap: var(--mb-space-4);
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
      align-items: start;
    }
    @media (max-width: 900px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }
    .open {
      all: unset;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
    }
    .reply {
      background: var(--mb-surface-2);
      border-radius: var(--mb-radius-sm);
      padding: 10px 12px;
      margin-bottom: 8px;
    }
    .staff {
      background: var(--mb-primary-soft);
    }
    .pre {
      white-space: pre-wrap;
    }
  `,
})
export class SupportAdminPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly statuses = Object.values(SupportTicketStatus);
  protected readonly categories = Object.values(SupportTicketCategory);
  protected readonly h = humanize;
  protected readonly rows = signal<AdminTicket[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly active = signal<AdminTicket | null>(null);
  protected readonly loading = signal(true);
  protected status = '';
  protected category = '';
  protected reply = '';
  protected newStatus: string = SupportTicketStatus.IN_PROGRESS;

  constructor() {
    void this.load();
  }

  async load(page = 1) {
    this.loading.set(true);
    try {
      const res = await this.api.page<AdminTicket>('/admin/support-tickets', {
        status: this.status,
        category: this.category,
        page,
        pageSize: 20,
      });
      this.rows.set(res.items);
      this.meta.set(res.meta);
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async open(t: AdminTicket) {
    try {
      const full = await this.api.get<AdminTicket>(`/admin/support-tickets/${t.id}`);
      this.active.set(full);
      this.newStatus =
        full.status === SupportTicketStatus.OPEN ? SupportTicketStatus.IN_PROGRESS : full.status;
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async send(t: AdminTicket) {
    try {
      await this.api.post(`/admin/support-tickets/${t.id}/replies`, {
        message: this.reply.trim(),
        status: this.newStatus,
      });
      this.reply = '';
      await this.open(t);
      await this.load(this.meta()?.page ?? 1);
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async setStatus(t: AdminTicket) {
    try {
      await this.api.post(`/admin/support-tickets/${t.id}/status`, { status: this.newStatus });
      await this.open(t);
      await this.load(this.meta()?.page ?? 1);
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }
}
