import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { PageMeta } from '@mindbridge/shared-types';
import { errorMessage } from '../../core/api/api-error';
import { type AppNotification, NotificationsService } from '../../core/services/notifications.service';
import { PaginationComponent } from '../../shared/ui/pagination';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../shared/ui/states';

@Component({
  selector: 'mb-notifications',
  imports: [DatePipe, LoadingComponent, ErrorStateComponent, EmptyStateComponent, PaginationComponent],
  template: `
    <div class="page narrow">
      <header class="page-header row-between">
        <h1>Notifications</h1>
        @if (svc.unread() > 0) { <button class="btn btn-secondary btn-sm" type="button" (click)="markAll()">Mark all as read</button> }
      </header>
      @if (loading()) {
        <mb-loading [lines]="4" />
      } @else if (error()) {
        <mb-error [message]="error()!" (retry)="load()" />
      } @else if (!items().length) {
        <mb-empty title="You're all caught up" />
      } @else {
        <ul class="list card-flat">
          @for (n of items(); track n.id) {
            <li class="item" [class.unread]="!n.readAt">
              <button type="button" class="open" (click)="open(n)">
                <span class="title">{{ n.title }}</span>
                @if (n.body) { <span class="small muted">{{ n.body }}</span> }
                <span class="small muted">{{ n.createdAt | date: 'medium' }}</span>
              </button>
            </li>
          }
        </ul>
        <mb-pagination [meta]="meta()" (page)="load($event)" />
      }
    </div>
  `,
  styles: `.narrow { max-width: 760px; } .open { all: unset; cursor: pointer; display: flex; flex-direction: column; gap: 2px; width: 100%; }
    .open:focus-visible { outline: 3px solid var(--mb-focus); } .unread .title { font-weight: 700; } .unread { border-left: 3px solid var(--mb-primary); padding-left: 12px !important; }`,
})
export class NotificationsPage {
  protected readonly svc = inject(NotificationsService);
  private readonly router = inject(Router);
  protected readonly items = signal<AppNotification[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  async load(page = 1) {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.svc.list(page);
      this.items.set(res.items);
      this.meta.set(res.meta);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async open(n: AppNotification) {
    if (!n.readAt) {
      await this.svc.markRead(n.id).catch(() => undefined);
      this.items.update((list) => list.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    }
    // Only in-app relative links are followed.
    if (n.link && n.link.startsWith('/') && !n.link.startsWith('//')) await this.router.navigateByUrl(n.link);
  }

  async markAll() {
    await this.svc.markAllRead();
    this.items.update((list) => list.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
  }
}
