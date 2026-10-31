import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'mb-toasts',
  template: `
    <div class="toasts" aria-live="polite" aria-atomic="false">
      @for (t of toasts.toasts(); track t.id) {
        <div class="toast" [class]="'toast toast-' + t.kind" role="status">
          <div class="toast-indicator" aria-hidden="true">
            @if (t.kind === 'success') {
              <span>✓</span>
            } @else if (t.kind === 'error') {
              <span>✕</span>
            } @else {
              <span>ℹ</span>
            }
          </div>
          <span class="toast-message">{{ t.text }}</span>
          <button
            type="button"
            class="toast-close"
            (click)="toasts.dismiss(t.id)"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .toasts {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 1000;
      max-width: min(440px, calc(100vw - 32px));
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 12px 14px 12px 16px;
      border-radius: 12px;
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
      backdrop-filter: blur(8px);
      animation: slideInToast 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideInToast {
      from {
        transform: translateY(12px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    .toast-indicator {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
      flex-shrink: 0;
    }
    .toast-success {
      border-left: 4px solid var(--mb-success);
    }
    .toast-success .toast-indicator {
      background: var(--mb-success-soft);
      color: var(--mb-success);
    }
    .toast-error {
      border-left: 4px solid var(--mb-danger);
    }
    .toast-error .toast-indicator {
      background: var(--mb-danger-soft);
      color: var(--mb-danger);
    }
    .toast-info {
      border-left: 4px solid var(--mb-primary);
    }
    .toast-info .toast-indicator {
      background: var(--mb-primary-soft);
      color: var(--mb-primary);
    }
    .toast-message {
      flex: 1;
      font-size: 0.9rem;
      line-height: 1.4;
      color: var(--mb-text);
      font-weight: 500;
    }
    .toast-close {
      width: 28px;
      height: 28px;
      padding: 0;
      min-height: unset;
      background: transparent;
      border: 0;
      border-radius: 6px;
      color: var(--mb-text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }
    .toast-close:hover {
      background: var(--mb-surface-2);
      color: var(--mb-text);
    }
  `,
})
export class ToastOutletComponent {
  protected readonly toasts = inject(ToastService);
}
