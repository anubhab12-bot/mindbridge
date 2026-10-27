import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { type CrisisResourceView, CrisisServiceType, type PageMeta } from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { ApiError, errorMessage } from '../../core/api/api-error';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../shared/ui/confirm';
import { PaginationComponent } from '../../shared/ui/pagination';
import { EmptyStateComponent, LoadingComponent } from '../../shared/ui/states';
import { humanize, splitList } from '../../shared/util/format';

interface AdminCrisis extends CrisisResourceView {
  altPhones: string[];
  status: 'ACTIVE' | 'INACTIVE';
  priority: number;
  verificationExpired: boolean;
}

const EMPTY = { name: '', country: 'IN', region: '', serviceType: CrisisServiceType.MENTAL_HEALTH_HELPLINE as string, phone: '', sms: '', url: '', languages: '', availability: '', description: '', sourceUrl: '', priority: 100 };

@Component({
  selector: 'mb-admin-crisis',
  imports: [DatePipe, FormsModule, LoadingComponent, EmptyStateComponent, PaginationComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Crisis resources</h1>
        <p>Only add contacts you have verified against an official source today. Changing a phone number, SMS or URL resets verification.</p>
      </header>
      <div class="row filters">
        <label class="checkbox"><input type="checkbox" [(ngModel)]="staleOnly" (change)="load()" /><span>Only show resources needing re-verification</span></label>
        <span class="spacer"></span>
        <button class="btn btn-sm" type="button" (click)="startCreate()">Add resource</button>
      </div>
      @if (loading()) { <mb-loading [lines]="4" /> } @else if (!rows().length) { <mb-empty title="No resources" /> } @else {
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Name</th><th>Contact</th><th>Country</th><th>Verified</th><th>Status</th><th></th></tr></thead>
            <tbody>
              @for (r of rows(); track r.id) {
                <tr [class.stale]="r.verificationExpired">
                  <td>{{ r.name }}<div class="small muted">{{ h(r.serviceType) }}</div></td>
                  <td class="small">{{ r.phone }} @if (r.sms) { · SMS {{ r.sms }} } @if (r.url) { <div>{{ r.url }}</div> }</td>
                  <td>{{ r.country }}@if (r.region) { / {{ r.region }} }</td>
                  <td class="small">{{ r.verifiedAt | date: 'mediumDate' }} @if (r.verificationExpired) { <span class="badge badge-danger">Expired</span> }</td>
                  <td><span class="badge">{{ h(r.status) }}</span></td>
                  <td class="row">
                    <button class="btn btn-ghost btn-sm" type="button" (click)="edit(r)">Edit</button>
                    <button class="btn btn-ghost btn-sm" type="button" (click)="verify(r)">Mark verified</button>
                    <button class="btn btn-ghost btn-sm" type="button" (click)="remove(r)">Delete</button>
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
          <h2>{{ editingId ? 'Edit resource' : 'Add resource' }}</h2>
          <div class="grid-2">
            <div class="field"><label for="n">Name</label><input id="n" class="input" [(ngModel)]="form.name" /></div>
            <div class="field"><label for="t">Type</label><select id="t" class="input" [(ngModel)]="form.serviceType">@for (t of types; track t) { <option [value]="t">{{ h(t) }}</option> }</select></div>
            <div class="field"><label for="c">Country (ISO code)</label><input id="c" class="input" [(ngModel)]="form.country" maxlength="2" /></div>
            <div class="field"><label for="rg">Region <span class="muted">(optional)</span></label><input id="rg" class="input" [(ngModel)]="form.region" /></div>
            <div class="field"><label for="p">Phone</label><input id="p" class="input" [(ngModel)]="form.phone" /></div>
            <div class="field"><label for="s">SMS <span class="muted">(optional)</span></label><input id="s" class="input" [(ngModel)]="form.sms" /></div>
            <div class="field"><label for="u">Website <span class="muted">(https)</span></label><input id="u" class="input" [(ngModel)]="form.url" /></div>
            <div class="field"><label for="a">Availability</label><input id="a" class="input" [(ngModel)]="form.availability" placeholder="e.g. 24x7" /></div>
            <div class="field"><label for="l">Languages</label><input id="l" class="input" [(ngModel)]="form.languages" placeholder="Comma separated" /></div>
            <div class="field"><label for="pr">Priority (lower shows first)</label><input id="pr" class="input" type="number" [(ngModel)]="form.priority" /></div>
          </div>
          <div class="field"><label for="d">Description</label><textarea id="d" class="textarea" [(ngModel)]="form.description"></textarea></div>
          <div class="field">
            <label for="src">Official source URL</label>
            <input id="src" class="input" [(ngModel)]="form.sourceUrl" placeholder="https://… (government or service's own site)" />
            <span class="hint">Saving records that you verified the details against this source today.</span>
          </div>
          @if (formError()) { <div class="alert alert-danger">{{ formError() }}</div> }
          <div class="row"><button class="btn" type="button" (click)="save()">Save</button><button class="btn btn-ghost" type="button" (click)="form = null">Cancel</button></div>
        </section>
      }
    </div>
  `,
  styles: `.filters { margin-bottom: var(--mb-space-3); } .filters .checkbox { margin: 0; } .stale td { background: var(--mb-crisis-soft); } .panel { margin-top: var(--mb-space-4); }`,
})
export class CrisisResourcesAdminPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly types = Object.values(CrisisServiceType);
  protected readonly h = humanize;
  protected readonly rows = signal<AdminCrisis[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly loading = signal(true);
  protected readonly formError = signal<string | null>(null);
  protected staleOnly = false;
  protected form: typeof EMPTY | null = null;
  protected editingId: string | null = null;

  constructor() {
    void this.load();
  }

  async load(page = 1) {
    this.loading.set(true);
    try {
      const res = await this.api.page<AdminCrisis>('/admin/crisis-resources', { stale: this.staleOnly ? 'true' : undefined, page, pageSize: 25 });
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

  edit(r: AdminCrisis) {
    this.editingId = r.id;
    this.formError.set(null);
    this.form = {
      name: r.name, country: r.country, region: r.region ?? '', serviceType: r.serviceType, phone: r.phone ?? '', sms: r.sms ?? '', url: r.url ?? '',
      languages: r.languages.join(', '), availability: r.availability, description: r.description ?? '', sourceUrl: r.sourceUrl, priority: r.priority,
    };
  }

  async save() {
    const f = this.form;
    if (!f) return;
    const body = {
      name: f.name.trim(), country: f.country.trim().toUpperCase(), region: f.region.trim() || undefined, serviceType: f.serviceType,
      phone: f.phone.trim() || undefined, sms: f.sms.trim() || undefined, url: f.url.trim() || undefined, languages: splitList(f.languages),
      availability: f.availability.trim(), description: f.description.trim() || undefined, sourceUrl: f.sourceUrl.trim(), priority: Number(f.priority),
    };
    try {
      if (this.editingId) await this.api.patch(`/admin/crisis-resources/${this.editingId}`, body);
      else await this.api.post('/admin/crisis-resources', body);
      this.form = null;
      this.toast.success('Saved.');
      await this.load();
    } catch (err) {
      const e = ApiError.from(err);
      this.formError.set(Array.isArray(e.details) ? (e.details as unknown[]).join(' ') : e.message);
    }
  }

  async verify(r: AdminCrisis) {
    const ok = await this.confirm.ask({ title: 'Mark as verified today?', message: `Confirm you checked ${r.name}'s details against ${r.sourceUrl} today.`, confirmLabel: 'Mark verified' });
    if (!ok) return;
    try {
      await this.api.post(`/admin/crisis-resources/${r.id}/verify`, { sourceUrl: r.sourceUrl });
      await this.load(this.meta()?.page ?? 1);
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async remove(r: AdminCrisis) {
    if (!(await this.confirm.ask({ title: `Delete ${r.name}?`, message: 'It will no longer be shown to anyone.', confirmLabel: 'Delete', danger: true }))) return;
    try {
      await this.api.delete(`/admin/crisis-resources/${r.id}`);
      await this.load();
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }
}
