import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContentStatus, type PageMeta, WellnessContentType } from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { ApiError, errorMessage } from '../../core/api/api-error';
import { ToastService } from '../../core/services/toast.service';
import { PaginationComponent } from '../../shared/ui/pagination';
import { EmptyStateComponent, LoadingComponent } from '../../shared/ui/states';
import { humanize, splitList } from '../../shared/util/format';
import type { WellnessItem } from '../shared/self-help';

interface AdminWellness extends WellnessItem {
  status: ContentStatus;
  publishedAt: string | null;
  updatedAt: string;
}

const EMPTY = { slug: '', type: WellnessContentType.ARTICLE as string, title: '', summary: '', body: '', steps: '', durationMinutes: null as number | null, tags: '', publisher: '', sourceUrl: '' };

@Component({
  selector: 'mb-admin-content',
  imports: [DatePipe, FormsModule, LoadingComponent, EmptyStateComponent, PaginationComponent],
  template: `
    <div class="page">
      <header class="page-header row-between">
        <div><h1>Self-help content</h1><p>Published items appear in the library and are used by the AI companion as reference material.</p></div>
        <div class="row">
          <button class="btn btn-secondary btn-sm" type="button" (click)="sync()">Sync to AI knowledge base</button>
          <button class="btn btn-sm" type="button" (click)="startCreate()">New item</button>
        </div>
      </header>
      @if (loading()) { <mb-loading [lines]="4" /> } @else if (!rows().length) { <mb-empty title="No content yet" /> } @else {
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Updated</th><th></th></tr></thead>
            <tbody>
              @for (r of rows(); track r.id) {
                <tr>
                  <td>{{ r.title }}<div class="small muted">/{{ r.slug }}</div></td>
                  <td>{{ h(r.type) }}</td>
                  <td><span class="badge" [class.badge-success]="r.status === 'PUBLISHED'">{{ h(r.status) }}</span></td>
                  <td class="small">{{ r.updatedAt | date: 'medium' }}</td>
                  <td class="row">
                    <button class="btn btn-ghost btn-sm" type="button" (click)="edit(r)">Edit</button>
                    @if (r.status !== 'PUBLISHED') { <button class="btn btn-ghost btn-sm" type="button" (click)="setStatus(r, 'PUBLISHED')">Publish</button> }
                    @if (r.status === 'PUBLISHED') { <button class="btn btn-ghost btn-sm" type="button" (click)="setStatus(r, 'ARCHIVED')">Archive</button> }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <mb-pagination [meta]="meta()" (page)="load($event)" />
      }
      @if (form) {
        <section class="card panel">
          <h2>{{ editingId ? 'Edit item' : 'New item' }}</h2>
          <div class="grid-2">
            <div class="field"><label for="t">Title</label><input id="t" class="input" [(ngModel)]="form.title" /></div>
            <div class="field"><label for="s">Slug</label><input id="s" class="input" [(ngModel)]="form.slug" [disabled]="!!editingId" placeholder="box-breathing" /></div>
            <div class="field"><label for="ty">Type</label><select id="ty" class="input" [(ngModel)]="form.type" [disabled]="!!editingId">@for (t of types; track t) { <option [value]="t">{{ h(t) }}</option> }</select></div>
            <div class="field"><label for="d">Duration (minutes)</label><input id="d" class="input" type="number" min="1" max="120" [(ngModel)]="form.durationMinutes" /></div>
          </div>
          <div class="field"><label for="su">Summary</label><textarea id="su" class="textarea" [(ngModel)]="form.summary" maxlength="500"></textarea></div>
          <div class="field"><label for="st">Steps <span class="muted">(one per line, optional)</span></label><textarea id="st" class="textarea" [(ngModel)]="form.steps"></textarea></div>
          <div class="field"><label for="b">Body</label><textarea id="b" class="textarea tall" [(ngModel)]="form.body"></textarea></div>
          <div class="grid-2">
            <div class="field"><label for="tg">Tags</label><input id="tg" class="input" [(ngModel)]="form.tags" placeholder="Comma separated" /></div>
            <div class="field"><label for="pb">Publisher / reviewer</label><input id="pb" class="input" [(ngModel)]="form.publisher" /></div>
            <div class="field"><label for="src">Source URL <span class="muted">(https, optional)</span></label><input id="src" class="input" [(ngModel)]="form.sourceUrl" /></div>
          </div>
          @if (formError()) { <div class="alert alert-danger">{{ formError() }}</div> }
          <div class="row"><button class="btn" type="button" (click)="save()">Save</button><button class="btn btn-ghost" type="button" (click)="form = null">Cancel</button></div>
        </section>
      }
    </div>
  `,
  styles: `.panel { margin-top: var(--mb-space-4); } .tall { min-height: 220px; }`,
})
export class ContentAdminPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly types = Object.values(WellnessContentType);
  protected readonly h = humanize;
  protected readonly rows = signal<AdminWellness[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly loading = signal(true);
  protected readonly formError = signal<string | null>(null);
  protected form: typeof EMPTY | null = null;
  protected editingId: string | null = null;

  constructor() {
    void this.load();
  }

  async load(page = 1) {
    this.loading.set(true);
    try {
      const res = await this.api.page<AdminWellness>('/admin/wellness', { page, pageSize: 25 });
      this.rows.set(res.items);
      this.meta.set(res.meta);
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  startCreate() {
    this.editingId = null;
    this.formError.set(null);
    this.form = { ...EMPTY };
  }

  edit(r: AdminWellness) {
    this.editingId = r.id;
    this.formError.set(null);
    this.form = {
      slug: r.slug, type: r.type, title: r.title, summary: r.summary, body: r.body, steps: r.steps.join('\n'), durationMinutes: r.durationMinutes,
      tags: r.tags.join(', '), publisher: r.publisher ?? '', sourceUrl: r.sourceUrl ?? '',
    };
  }

  async save() {
    const f = this.form;
    if (!f) return;
    const common = {
      title: f.title.trim(), summary: f.summary.trim(), body: f.body, steps: f.steps.split('\n').map((s) => s.trim()).filter(Boolean),
      durationMinutes: f.durationMinutes ? Number(f.durationMinutes) : undefined, tags: splitList(f.tags),
      publisher: f.publisher.trim() || undefined, sourceUrl: f.sourceUrl.trim() || undefined,
    };
    try {
      if (this.editingId) await this.api.patch(`/admin/wellness/${this.editingId}`, common);
      else await this.api.post('/admin/wellness', { ...common, slug: f.slug.trim(), type: f.type });
      this.form = null;
      this.toast.success('Saved as draft. Publish it when it has been reviewed.');
      await this.load();
    } catch (err) {
      const e = ApiError.from(err);
      this.formError.set(Array.isArray(e.details) ? (e.details as unknown[]).join(' ') : e.message);
    }
  }

  async setStatus(r: AdminWellness, status: ContentStatus) {
    try {
      await this.api.post(`/admin/wellness/${r.id}/status`, { status });
      await this.load(this.meta()?.page ?? 1);
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async sync() {
    try {
      const res = await this.api.post<{ chunks: number }>('/admin/wellness/sync-knowledge');
      this.toast.success(`Knowledge base updated (${res.chunks} passages).`);
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }
}

interface PendingFeedback {
  id: string;
  rating: number;
  comment: string | null;
  doctorProfileId: string;
  createdAt: string;
}

@Component({
  selector: 'mb-admin-feedback',
  imports: [DatePipe, LoadingComponent, EmptyStateComponent, PaginationComponent],
  template: `
    <div class="page narrow">
      <header class="page-header"><h1>Review moderation</h1><p>Approve reviews that are respectful and don't contain personal or health details.</p></header>
      @if (loading()) { <mb-loading /> } @else if (!rows().length) { <mb-empty title="Nothing to moderate" /> } @else {
        <ul class="list card-flat">
          @for (f of rows(); track f.id) {
            <li>
              <div class="row-between"><strong>{{ '★'.repeat(f.rating) }}{{ '☆'.repeat(5 - f.rating) }}</strong><span class="small muted">{{ f.createdAt | date: 'medium' }}</span></div>
              <p class="pre">{{ f.comment || '(no comment)' }}</p>
              <div class="row">
                <button class="btn btn-sm" type="button" (click)="moderate(f, 'APPROVED')">Approve</button>
                <button class="btn btn-secondary btn-sm" type="button" (click)="moderate(f, 'REJECTED')">Reject</button>
              </div>
            </li>
          }
        </ul>
        <mb-pagination [meta]="meta()" (page)="load($event)" />
      }
    </div>
  `,
  styles: `.narrow { max-width: 760px; } .pre { white-space: pre-wrap; }`,
})
export class FeedbackAdminPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  protected readonly rows = signal<PendingFeedback[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    void this.load();
  }

  async load(page = 1) {
    this.loading.set(true);
    try {
      const res = await this.api.page<PendingFeedback>('/admin/feedback/pending', { page, pageSize: 20 });
      this.rows.set(res.items);
      this.meta.set(res.meta);
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async moderate(f: PendingFeedback, decision: 'APPROVED' | 'REJECTED') {
    try {
      await this.api.post(`/admin/feedback/${f.id}/moderate`, { decision });
      this.rows.update((l) => l.filter((x) => x.id !== f.id));
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }
}
