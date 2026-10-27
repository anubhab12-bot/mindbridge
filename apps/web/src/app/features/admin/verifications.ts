import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DoctorVerificationStatus, type PageMeta } from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { errorMessage } from '../../core/api/api-error';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../shared/ui/confirm';
import { PaginationComponent } from '../../shared/ui/pagination';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../shared/ui/states';
import { categoryLabel, humanize, saveBlob } from '../../shared/util/format';
import type { VerificationDoc, VerificationView } from '../doctor/verification';

interface QueueRow {
  id: string;
  status: DoctorVerificationStatus;
  submittedAt: string;
  documentCount: number;
  doctor?: { displayName: string; professionalCategory: string; registrationCouncil: string; registrationNumber: string; yearsExperience: number };
}

@Component({
  selector: 'mb-admin-verifications',
  imports: [DatePipe, RouterLink, LoadingComponent, ErrorStateComponent, EmptyStateComponent, PaginationComponent],
  template: `
    <div class="page">
      <header class="page-header"><h1>Professional verification</h1><p>Check each registration with the issuing council before approving.</p></header>
      <div class="tabs" role="tablist">
        @for (s of statuses; track s.key) {
          <button type="button" role="tab" [attr.aria-selected]="status() === s.key" (click)="setStatus(s.key)">{{ s.label }}</button>
        }
      </div>
      @if (loading()) { <mb-loading [lines]="4" /> } @else if (error()) { <mb-error [message]="error()!" (retry)="load()" /> } @else if (!rows().length) {
        <mb-empty title="Nothing in this queue" />
      } @else {
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Name</th><th>Category</th><th>Registration</th><th>Documents</th><th>Submitted</th><th>Status</th></tr></thead>
            <tbody>
              @for (r of rows(); track r.id) {
                <tr>
                  <td><a [routerLink]="['/admin/verifications', r.id]">{{ r.doctor?.displayName ?? 'Unknown' }}</a></td>
                  <td>{{ label(r.doctor?.professionalCategory) }}</td>
                  <td>{{ r.doctor?.registrationNumber }}<div class="small muted">{{ r.doctor?.registrationCouncil }}</div></td>
                  <td>{{ r.documentCount }}</td>
                  <td>{{ r.submittedAt | date: 'mediumDate' }}</td>
                  <td><span class="badge">{{ h(r.status) }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <mb-pagination [meta]="meta()" (page)="load($event)" />
      }
    </div>
  `,
})
export class VerificationsPage {
  private readonly api = inject(ApiService);
  protected readonly statuses = [
    { key: '', label: 'Awaiting review' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'REJECTED', label: 'Rejected' },
    { key: 'SUSPENDED', label: 'Suspended' },
  ];
  protected readonly status = signal('');
  protected readonly rows = signal<QueueRow[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly label = categoryLabel;
  protected readonly h = humanize;

  constructor() {
    void this.load();
  }

  setStatus(s: string) {
    this.status.set(s);
    void this.load();
  }

  async load(page = 1) {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.api.page<QueueRow>('/admin/doctors/pending-verification', { status: this.status(), page, pageSize: 20 });
      this.rows.set(res.items);
      this.meta.set(res.meta);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}

interface AdminVerification extends VerificationView {
  doctor: Record<string, unknown> & { displayName: string; professionalCategory: string; registrationNumber: string; registrationCouncil: string; qualifications: string[]; specialties: string[]; yearsExperience: number };
  account: { email: string; emailVerifiedAt?: string; status: string; createdAt: string } | null;
}

@Component({
  selector: 'mb-admin-verification-review',
  imports: [DatePipe, FormsModule, RouterLink, LoadingComponent, ErrorStateComponent],
  template: `
    <div class="page narrow">
      <a routerLink="/admin/verifications" class="small">← Queue</a>
      @if (loading()) { <mb-loading [lines]="6" /> } @else if (error()) { <mb-error [message]="error()!" (retry)="load()" /> } @else if (app(); as a) {
        <header class="page-header row-between">
          <h1>{{ a.doctor.displayName }}</h1>
          <span class="badge">{{ h(a.status) }}</span>
        </header>
        <section class="card">
          <dl class="facts">
            <dt>Category</dt><dd>{{ label(a.doctor.professionalCategory) }}</dd>
            <dt>Registration</dt><dd>{{ a.doctor.registrationNumber }} · {{ a.doctor.registrationCouncil }}</dd>
            <dt>Qualifications</dt><dd>{{ a.doctor.qualifications.join(', ') }}</dd>
            <dt>Areas</dt><dd>{{ a.doctor.specialties.join(', ') }}</dd>
            <dt>Experience</dt><dd>{{ a.doctor.yearsExperience }} years</dd>
            @if (a.account) {
              <dt>Account</dt><dd>{{ a.account.email }} · {{ a.account.emailVerifiedAt ? 'email verified' : 'email not verified' }} · joined {{ a.account.createdAt | date: 'mediumDate' }}</dd>
            }
          </dl>
        </section>
        <section class="card">
          <h2>Documents</h2>
          <ul class="list">
            @for (d of a.documents; track d.id) {
              <li class="row-between">
                <span>{{ h(d.type) }} <span class="small muted">· {{ d.originalName }} · {{ d.uploadedAt | date: 'medium' }}</span></span>
                <button class="btn btn-ghost btn-sm" type="button" (click)="download(d)">Download</button>
              </li>
            } @empty { <li class="muted">No documents uploaded.</li> }
          </ul>
          <p class="small muted">Documents may contain personal data. Download only to review, and don't keep local copies.</p>
        </section>
        <section class="card">
          <h2>Decision</h2>
          <div class="field">
            <label for="reason">Reason or message to the applicant</label>
            <textarea id="reason" class="textarea" [(ngModel)]="reason" maxlength="1000"></textarea>
            <span class="hint">Required when rejecting, requesting information or suspending. Shown to the applicant.</span>
          </div>
          <div class="row">
            @if (a.status === 'PENDING_VERIFICATION' || a.status === 'INFO_REQUESTED') {
              <button class="btn" type="button" (click)="decide('approve')">Approve</button>
              <button class="btn btn-secondary" type="button" (click)="decide('request-info')" [disabled]="!reason.trim()">Request information</button>
              <button class="btn btn-danger" type="button" (click)="decide('reject')" [disabled]="!reason.trim()">Reject</button>
            }
            @if (a.status === 'APPROVED') { <button class="btn btn-danger" type="button" (click)="decide('suspend')" [disabled]="!reason.trim()">Suspend</button> }
            @if (a.status === 'SUSPENDED' || a.status === 'REJECTED') { <button class="btn btn-secondary" type="button" (click)="decide('reactivate')">Reactivate review</button> }
          </div>
        </section>
        <section class="card-flat">
          <h2 class="h3">History</h2>
          <ul class="list small">@for (x of a.history; track $index) { <li>{{ x.at | date: 'medium' }} · {{ h(x.status) }}@if (x.reason) { · {{ x.reason }} }</li> }</ul>
        </section>
      }
    </div>
  `,
  styles: `.narrow { max-width: 900px; } .card { margin-bottom: var(--mb-space-4); } .facts { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; margin: 0; }
    dt { font-weight: 600; } dd { margin: 0; } .h3 { font-size: 1.05rem; }`,
})
export class VerificationReviewPage {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  readonly id = input.required<string>();
  protected readonly app = signal<AdminVerification | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly label = categoryLabel;
  protected readonly h = humanize;
  protected reason = '';

  constructor() {
    effect(() => {
      this.id();
      void this.load();
    });
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.app.set(await this.api.get<AdminVerification>(`/admin/verifications/${this.id()}`));
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async download(d: VerificationDoc) {
    try {
      saveBlob(await this.api.download(d.download.url), d.originalName);
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }

  async decide(action: 'approve' | 'reject' | 'request-info' | 'suspend' | 'reactivate') {
    const ok = await this.confirm.ask({
      title: `${humanize(action.replace('-', '_'))}?`,
      message: action === 'approve' ? 'Confirm you have checked the registration with the issuing council.' : 'The applicant will be notified by email.',
      confirmLabel: humanize(action.replace('-', '_')),
      danger: action === 'reject' || action === 'suspend',
    });
    if (!ok) return;
    try {
      await this.api.post(`/admin/verifications/${this.id()}/${action}`, { reason: this.reason.trim() || undefined });
      this.reason = '';
      this.toast.success('Decision recorded.');
      await this.load();
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }
}
