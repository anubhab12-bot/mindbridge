import { Component, effect, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/api/api.service';
import { errorMessage } from '../../core/api/api-error';
import { ErrorStateComponent, LoadingComponent } from '../../shared/ui/states';

interface Policy {
  type: string;
  version: string;
  title: string;
  body: string;
  effectiveAt: string;
}

const SLUGS: Record<string, string> = {
  privacy: 'PRIVACY_POLICY',
  terms: 'TERMS',
  ai: 'AI_PROCESSING',
};

@Component({
  selector: 'mb-legal',
  imports: [DatePipe, LoadingComponent, ErrorStateComponent],
  template: `
    <div class="container page narrow">
      @if (loading()) {
        <mb-loading />
      } @else if (error()) {
        <mb-error [message]="error()!" (retry)="load()" />
      } @else if (policy(); as p) {
        <h1>{{ p.title }}</h1>
        <p class="muted small">
          Version {{ p.version }} · effective {{ p.effectiveAt | date: 'mediumDate' }}
        </p>
        <article class="policy">{{ p.body }}</article>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .narrow {
      max-width: 760px;
    }
    .policy {
      white-space: pre-wrap;
    }
  `,
})
export class LegalPage {
  private readonly api = inject(ApiService);
  readonly type = input.required<string>();
  protected readonly policy = signal<Policy | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.type();
      void this.load();
    });
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.policy.set(await this.api.get<Policy>(`/policies/${SLUGS[this.type()] ?? 'UNKNOWN'}`));
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}
