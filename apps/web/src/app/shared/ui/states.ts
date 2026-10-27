import { Component, input, output } from '@angular/core';

@Component({
  selector: 'mb-loading',
  template: `
    <div class="loading" role="status" aria-live="polite">
      @for (_ of rows(); track $index) {
        <div class="skeleton" [style.width.%]="90 - $index * 12"></div>
      }
      <span class="visually-hidden">{{ label() }}</span>
    </div>
  `,
  styles: `.loading { display: grid; gap: 10px; padding: var(--mb-space-3) 0; } .skeleton { height: 18px; }`,
})
export class LoadingComponent {
  readonly label = input('Loading');
  readonly lines = input(3);
  protected rows() {
    return Array.from({ length: this.lines() });
  }
}

@Component({
  selector: 'mb-empty',
  template: `
    <div class="empty">
      <h3>{{ title() }}</h3>
      @if (text()) { <p class="muted">{{ text() }}</p> }
      <ng-content />
    </div>
  `,
  styles: `.empty { text-align: center; padding: var(--mb-space-6) var(--mb-space-4); border: 1px dashed var(--mb-border); border-radius: var(--mb-radius); }`,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly text = input<string>();
}

@Component({
  selector: 'mb-error',
  template: `
    <div class="alert alert-danger" role="alert">
      <p>{{ message() }}</p>
      @if (retryable()) { <button class="btn btn-secondary btn-sm" type="button" (click)="retry.emit()">Try again</button> }
    </div>
  `,
})
export class ErrorStateComponent {
  readonly message = input('Something went wrong.');
  readonly retryable = input(true);
  readonly retry = output<void>();
}
