import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DoctorVerificationStatus } from '@mindbridge/shared-types';
import { ApiService } from '../../core/api/api.service';
import { errorMessage } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../shared/ui/confirm';
import { LoadingComponent } from '../../shared/ui/states';
import { humanize, saveBlob } from '../../shared/util/format';

export interface VerificationDoc {
  id: string;
  type: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  download: { url: string; expiresAt: string };
}

export interface VerificationView {
  id: string;
  status: DoctorVerificationStatus;
  requestedInfo?: string;
  submittedAt: string;
  decidedAt?: string;
  documents: VerificationDoc[];
  history: { status: string; reason?: string; at: string; actorId?: string }[];
}

const DOC_TYPES = [
  { value: 'REGISTRATION_CERTIFICATE', label: 'Registration certificate' },
  { value: 'DEGREE_CERTIFICATE', label: 'Degree certificate' },
  { value: 'GOVERNMENT_ID', label: 'Government ID' },
  { value: 'OTHER', label: 'Other supporting document' },
];

const MESSAGES: Record<string, { title: string; text: string; kind: string }> = {
  PENDING_VERIFICATION: {
    title: 'Your application is being reviewed',
    text: 'Upload your documents below. Our team checks registrations with the issuing council, which usually takes a few working days. You will be emailed when there is a decision.',
    kind: 'alert-info',
  },
  INFO_REQUESTED: {
    title: 'We need a little more information',
    text: 'Please read the note from our team and upload what is requested.',
    kind: 'alert-warning',
  },
  APPROVED: {
    title: 'You are verified',
    text: 'Your profile is visible to patients.',
    kind: 'alert-success',
  },
  REJECTED: {
    title: 'Your application was not approved',
    text: 'See the reason below. Contact support if you think this is a mistake.',
    kind: 'alert-danger',
  },
  SUSPENDED: {
    title: 'Your account is suspended',
    text: 'Please contact support.',
    kind: 'alert-danger',
  },
};

@Component({
  selector: 'mb-verification',
  imports: [DatePipe, FormsModule, RouterLink, LoadingComponent],
  template: `
    <div class="page narrow">
      <header class="page-header"><h1>Professional verification</h1></header>
      @if (loading()) {
        <mb-loading [lines]="5" />
      } @else if (app(); as a) {
        <div class="alert" [class]="'alert ' + msg().kind" role="status">
          <strong>{{ msg().title }}</strong>
          <p>{{ msg().text }}</p>
          @if (a.requestedInfo && a.status === 'INFO_REQUESTED') {
            <p class="note"><strong>Note from our team:</strong> {{ a.requestedInfo }}</p>
          }
          @if (a.status === 'APPROVED') {
            <a routerLink="/doctor/dashboard">Go to your dashboard</a>
          }
        </div>

        @if (canUpload()) {
          <section class="card">
            <h2>Upload a document</h2>
            <p class="small muted">
              PDF, PNG or JPEG up to 5 MB. Files are stored privately and only our verification team
              can open them.
            </p>
            <div class="grid-2">
              <div class="field">
                <label for="type">Document type</label>
                <select id="type" class="input" [(ngModel)]="docType">
                  @for (t of docTypes; track t.value) {
                    <option [value]="t.value">{{ t.label }}</option>
                  }
                </select>
              </div>
              <div class="field">
                <label for="file">File</label>
                <input
                  id="file"
                  class="input"
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  (change)="pick($event)"
                />
              </div>
            </div>
            <button class="btn" type="button" (click)="upload()" [disabled]="!file || busy()">
              {{ busy() ? 'Uploading…' : 'Upload' }}
            </button>
          </section>
        }

        <section class="card">
          <h2>Your documents</h2>
          @if (!a.documents.length) {
            <p class="muted">
              No documents uploaded yet. Please add your registration certificate and a government
              ID.
            </p>
          } @else {
            <ul class="list">
              @for (d of a.documents; track d.id) {
                <li class="row-between">
                  <div>
                    <strong>{{ typeLabel(d.type) }}</strong>
                    <div class="small muted">
                      {{ d.originalName }} · {{ (d.size / 1024).toFixed(0) }} KB ·
                      {{ d.uploadedAt | date: 'medium' }}
                    </div>
                  </div>
                  <div class="row">
                    <button class="btn btn-ghost btn-sm" type="button" (click)="download(d)">
                      Download
                    </button>
                    @if (canUpload()) {
                      <button class="btn btn-ghost btn-sm" type="button" (click)="remove(d)">
                        Remove
                      </button>
                    }
                  </div>
                </li>
              }
            </ul>
          }
        </section>

        <section class="card-flat">
          <h2 class="h3">History</h2>
          <ul class="list small">
            @for (h of a.history; track $index) {
              <li>
                {{ h.at | date: 'medium' }} · {{ human(h.status) }}
                @if (h.reason) {
                  · {{ h.reason }}
                }
              </li>
            }
          </ul>
        </section>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .narrow {
      max-width: 820px;
    }
    .card {
      margin-bottom: var(--mb-space-4);
    }
    .note {
      margin: 8px 0 0;
    }
    .h3 {
      font-size: 1.05rem;
    }
    .alert p {
      margin: 6px 0 0;
    }
  `,
})
export class VerificationPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly docTypes = DOC_TYPES;
  protected readonly human = humanize;
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly app = signal<VerificationView | null>(null);
  protected readonly msg = computed(
    () =>
      MESSAGES[this.app()?.status ?? 'PENDING_VERIFICATION'] ?? MESSAGES['PENDING_VERIFICATION'],
  );
  protected readonly canUpload = computed(() => {
    const s = this.app()?.status;
    return (
      s === DoctorVerificationStatus.PENDING_VERIFICATION ||
      s === DoctorVerificationStatus.INFO_REQUESTED
    );
  });
  protected docType = 'REGISTRATION_CERTIFICATE';
  protected file: File | null = null;

  async ngOnInit() {
    await this.load();
    // Pick up a decision made while this tab was open.
    if (this.app()?.status !== this.auth.user()?.doctorVerificationStatus)
      await this.auth.reloadUser();
  }

  async load() {
    try {
      this.app.set(await this.api.get<VerificationView>('/doctors/me/verification'));
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected typeLabel(t: string) {
    return DOC_TYPES.find((d) => d.value === t)?.label ?? humanize(t);
  }

  pick(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0] ?? null;
    if (f && f.size > 5 * 1024 * 1024) {
      this.toast.error('That file is larger than 5 MB.');
      (ev.target as HTMLInputElement).value = '';
      this.file = null;
      return;
    }
    this.file = f;
  }

  async upload() {
    if (!this.file) return;
    const form = new FormData();
    form.append('type', this.docType);
    form.append('file', this.file);
    this.busy.set(true);
    try {
      this.app.set(
        await this.api.upload<VerificationView>('/doctors/verification-documents', form),
      );
      this.file = null;
      this.toast.success('Document uploaded.');
      await this.auth.reloadUser();
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async download(d: VerificationDoc) {
    try {
      saveBlob(await this.api.download(d.download.url), d.originalName);
    } catch (err) {
      this.toast.error(errorMessage(err));
      void this.load();
    }
  }

  async remove(d: VerificationDoc) {
    if (
      !(await this.confirm.ask({
        title: 'Remove this document?',
        message: d.originalName,
        confirmLabel: 'Remove',
        danger: true,
      }))
    )
      return;
    try {
      await this.api.delete(`/doctors/verification-documents/${d.id}`);
      await this.load();
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }
}
