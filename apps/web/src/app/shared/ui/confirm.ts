import { Component, ElementRef, inject, Injectable, signal, viewChild, effect } from '@angular/core';

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly request = signal<ConfirmRequest | null>(null);

  ask(opts: { title: string; message: string; confirmLabel?: string; danger?: boolean }): Promise<boolean> {
    return new Promise((resolve) =>
      this.request.set({ confirmLabel: 'Confirm', danger: false, ...opts, resolve } as ConfirmRequest),
    );
  }

  answer(ok: boolean) {
    this.request()?.resolve(ok);
    this.request.set(null);
  }
}

/** Accessible modal confirmation built on the native <dialog> element (focus trap, Esc to cancel). */
@Component({
  selector: 'mb-confirm-dialog',
  template: `
    <dialog #dlg aria-labelledby="confirm-title" (cancel)="confirm.answer(false)">
      @if (confirm.request(); as r) {
        <h2 id="confirm-title">{{ r.title }}</h2>
        <p>{{ r.message }}</p>
        <div class="row" style="justify-content: flex-end">
          <button class="btn btn-secondary" type="button" (click)="confirm.answer(false)">Cancel</button>
          <button class="btn" [class.btn-danger]="r.danger" type="button" (click)="confirm.answer(true)">{{ r.confirmLabel }}</button>
        </div>
      }
    </dialog>
  `,
  styles: `
    dialog { border: 0; border-radius: var(--mb-radius); padding: var(--mb-space-5); max-width: min(480px, calc(100vw - 32px));
      background: var(--mb-surface); color: var(--mb-text); box-shadow: var(--mb-shadow); }
    dialog::backdrop { background: rgb(0 0 0 / 40%); }
  `,
})
export class ConfirmDialogComponent {
  protected readonly confirm = inject(ConfirmService);
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const el = this.dlg().nativeElement;
      if (this.confirm.request() && !el.open) el.showModal();
      if (!this.confirm.request() && el.open) el.close();
    });
  }
}
