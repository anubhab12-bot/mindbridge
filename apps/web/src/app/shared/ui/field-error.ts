import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import type { AbstractControl } from '@angular/forms';

/** Shows the first validation message for a touched control. */
@Component({
  selector: 'mb-field-error',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (control()?.touched && control()?.errors; as e) {
      <span class="error" role="alert">{{ message(e) }}</span>
    }
  `,
})
export class FieldErrorComponent {
  readonly control = input<AbstractControl | null>(null);
  readonly label = input('This field');

  protected message(e: Record<string, unknown>): string {
    if (e['required']) return `${this.label()} is required.`;
    if (e['email']) return 'Enter a valid email address.';
    if (e['minlength'])
      return `${this.label()} must be at least ${(e['minlength'] as { requiredLength: number }).requiredLength} characters.`;
    if (e['maxlength'])
      return `${this.label()} must be at most ${(e['maxlength'] as { requiredLength: number }).requiredLength} characters.`;
    if (e['min'] || e['max']) return `${this.label()} is out of range.`;
    if (e['pattern']) return `${this.label()} is not in the expected format.`;
    if (e['mismatch']) return 'The passwords do not match.';
    if (e['server']) return String(e['server']);
    return `${this.label()} is not valid.`;
  }
}
