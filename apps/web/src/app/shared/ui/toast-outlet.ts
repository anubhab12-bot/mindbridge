import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'mb-toasts',
  template: `
    <div class="toasts" aria-live="polite" aria-atomic="false">
      @for (t of toasts.toasts(); track t.id) {
        <div class="toast" [class]="'toast toast-' + t.kind" role="status">
          <span>{{ t.text }}</span>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            (click)="toasts.dismiss(t.id)"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .toasts {
      position: fixed;
      bottom: 16px;
      right: 16px;
      display: grid;
      gap: 8px;
      z-index: 900;
      max-width: min(420px, calc(100vw - 32px));
    }
    .toast {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
      padding: 10px 10px 10px 16px;
      border-radius: var(--mb-radius-sm);
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      box-shadow: var(--mb-shadow);
    }
    .toast-success {
      border-left: 4px solid var(--mb-success);
    }
    .toast-error {
      border-left: 4px solid var(--mb-danger);
    }
    .toast-info {
      border-left: 4px solid var(--mb-primary);
    }
  `,
})
export class ToastOutletComponent {
  protected readonly toasts = inject(ToastService);
}
