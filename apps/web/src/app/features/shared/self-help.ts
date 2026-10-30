import { Component, effect, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { type PageMeta, WellnessContentType } from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { errorMessage } from '../../core/api/api-error';
import { PaginationComponent } from '../../shared/ui/pagination';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../shared/ui/states';
import { humanize } from '../../shared/util/format';

export interface WellnessItem {
  id: string;
  slug: string;
  type: WellnessContentType;
  title: string;
  summary: string;
  body: string;
  steps: string[];
  durationMinutes: number | null;
  tags: string[];
  publisher: string | null;
  sourceUrl: string | null;
  reviewedAt: string | null;
}

/** Self-help pages render both on the public site and inside the patient portal. */
function basePath(router: Router) {
  return router.url.startsWith('/patient') ? '/patient/self-help' : '/self-help';
}

@Component({
  selector: 'mb-self-help-list',
  imports: [
    RouterLink,
    LoadingComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    PaginationComponent,
  ],
  template: `
    <div class="container page">
      <header class="page-header">
        <h1>Self-help library</h1>
        <p>
          Short exercises and articles you can use any time. These are not a replacement for
          professional care.
        </p>
      </header>
      <div class="tabs" role="tablist" aria-label="Filter by type">
        <button type="button" role="tab" [attr.aria-selected]="!type()" (click)="setType(null)">
          All
        </button>
        @for (t of types; track t) {
          <button type="button" role="tab" [attr.aria-selected]="type() === t" (click)="setType(t)">
            {{ label(t) }}
          </button>
        }
      </div>
      @if (loading()) {
        <mb-loading [lines]="4" />
      } @else if (error()) {
        <mb-error [message]="error()!" (retry)="load()" />
      } @else if (!items().length) {
        <mb-empty title="Nothing here yet" text="New exercises are added regularly." />
      } @else {
        <div class="grid">
          @for (i of items(); track i.id) {
            <a class="card-flat item" [routerLink]="[base, i.slug]">
              <span class="badge badge-accent">{{ label(i.type) }}</span>
              <h2 class="h3">{{ i.title }}</h2>
              <p class="muted small">{{ i.summary }}</p>
              @if (i.durationMinutes) {
                <span class="small muted">{{ i.durationMinutes }} min</span>
              }
            </a>
          }
        </div>
        <mb-pagination [meta]="meta()" (page)="load($event)" />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .item {
      display: flex;
      flex-direction: column;
      gap: 8px;
      text-decoration: none;
      color: inherit;
    }
    .item:hover {
      border-color: var(--mb-primary);
    }
    .h3 {
      font-size: 1.1rem;
      margin: 0;
    }
    .item p {
      margin: 0;
    }
  `,
})
export class SelfHelpListPage {
  private readonly api = inject(ApiService);
  protected readonly base = basePath(inject(Router));
  protected readonly types = Object.values(WellnessContentType);
  protected readonly type = signal<WellnessContentType | null>(null);
  protected readonly items = signal<WellnessItem[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly label = humanize;

  constructor() {
    void this.load();
  }

  setType(t: WellnessContentType | null) {
    this.type.set(t);
    void this.load();
  }

  async load(page = 1) {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.api.page<WellnessItem>('/wellness', {
        type: this.type(),
        page,
        pageSize: 12,
      });
      this.items.set(res.items);
      this.meta.set(res.meta);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}

@Component({
  selector: 'mb-self-help-detail',
  imports: [RouterLink, DatePipe, LoadingComponent, ErrorStateComponent],
  template: `
    <div class="container page narrow">
      <a [routerLink]="base" class="small">← All exercises</a>
      @if (loading()) {
        <mb-loading [lines]="6" />
      } @else if (error()) {
        <mb-error [message]="error()!" (retry)="load()" />
      } @else if (item(); as i) {
        <article>
          <p class="badge badge-accent">
            {{ label(i.type) }}
            @if (i.durationMinutes) {
              · {{ i.durationMinutes }} min
            }
          </p>
          <h1>{{ i.title }}</h1>
          <p class="lead muted">{{ i.summary }}</p>
          @if (i.steps.length) {
            <ol class="steps">
              @for (s of i.steps; track $index) {
                <li>{{ s }}</li>
              }
            </ol>
          }
          <div class="body">{{ i.body }}</div>
          <p class="small muted source">
            @if (i.publisher) {
              {{ i.publisher }}.
            }
            @if (i.reviewedAt) {
              Reviewed {{ i.reviewedAt | date: 'mediumDate' }}.
            }
            @if (i.sourceUrl) {
              <a [href]="i.sourceUrl" target="_blank" rel="noopener noreferrer">Source</a>
            }
          </p>
          <div class="alert alert-info small">
            If an exercise makes you feel worse, stop and take a break. If you are in distress,
            <a routerLink="/crisis">get help now</a>.
          </div>
        </article>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .narrow {
      max-width: 760px;
    }
    .lead {
      font-size: 1.1rem;
    }
    .steps {
      display: grid;
      gap: 8px;
      padding-left: 1.4rem;
      margin-bottom: var(--mb-space-4);
    }
    .body {
      white-space: pre-wrap;
      margin-bottom: var(--mb-space-4);
    }
    .source {
      margin-bottom: var(--mb-space-4);
    }
  `,
})
export class SelfHelpDetailPage {
  private readonly api = inject(ApiService);
  readonly slug = input.required<string>();
  protected readonly base = basePath(inject(Router));
  protected readonly item = signal<WellnessItem | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly label = humanize;

  constructor() {
    effect(() => {
      this.slug();
      void this.load();
    });
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.item.set(
        await this.api.get<WellnessItem>(`/wellness/${encodeURIComponent(this.slug())}`),
      );
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}
