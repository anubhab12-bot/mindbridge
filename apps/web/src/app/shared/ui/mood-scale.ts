import { Component, forwardRef, input, signal } from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export const MOOD_LABELS = ['Very low', 'Low', 'Okay', 'Good', 'Very good'];

/** Accessible 1-5 mood picker (a radio group), usable with reactive forms. */
@Component({
  selector: 'mb-mood-scale',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MoodScaleComponent), multi: true }],
  template: `
    <fieldset class="scale">
      <legend>{{ legend() }}</legend>
      <div class="options">
        @for (label of labels; track $index) {
          <label class="opt" [class.selected]="value() === $index + 1">
            <input type="radio" [name]="name()" [value]="$index + 1" [checked]="value() === $index + 1"
              [disabled]="disabled()" (change)="select($index + 1)" />
            <span class="dot" aria-hidden="true">{{ $index + 1 }}</span>
            <span class="text">{{ label }}</span>
          </label>
        }
      </div>
    </fieldset>
  `,
  styles: `
    .options { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
    .opt { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 4px; border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius-sm); cursor: pointer; text-align: center; background: var(--mb-surface); }
    .opt input { position: absolute; opacity: 0; width: 1px; height: 1px; }
    .opt:focus-within { outline: 3px solid var(--mb-focus); outline-offset: 2px; }
    .selected { border-color: var(--mb-primary); background: var(--mb-primary-soft); }
    .dot { font-weight: 700; font-size: 1.1rem; }
    .text { font-size: 0.8rem; }
  `,
})
export class MoodScaleComponent implements ControlValueAccessor {
  readonly legend = input('How are you feeling right now?');
  readonly name = input('mood');
  protected readonly labels = MOOD_LABELS;
  protected readonly value = signal<number | null>(null);
  protected readonly disabled = signal(false);
  private onChange: (v: number) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  select(v: number) {
    this.value.set(v);
    this.onChange(v);
    this.onTouched();
  }
  writeValue(v: number | null) {
    this.value.set(v);
  }
  registerOnChange(fn: (v: number) => void) {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void) {
    this.onTouched = fn;
  }
  setDisabledState(d: boolean) {
    this.disabled.set(d);
  }
}
