import { Component, forwardRef, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export const MOOD_LABELS = ['Very low', 'Low', 'Okay', 'Good', 'Very good'];
export const MOOD_EMOJIS = ['🌧️', '☁️', '⛅', '🌤️', '☀️'];

/** Accessible 1-5 mood picker (a radio group), usable with reactive forms. */
@Component({
  selector: 'mb-mood-scale',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MoodScaleComponent), multi: true },
  ],
  template: `
    <fieldset class="scale">
      <legend class="scale-legend">{{ legend() }}</legend>
      <div class="options">
        @for (label of labels; track $index) {
          <label class="opt" [class.selected]="value() === $index + 1" [class]="'mood-opt-' + ($index + 1)">
            <input
              type="radio"
              [name]="name()"
              [value]="$index + 1"
              [checked]="value() === $index + 1"
              [disabled]="disabled()"
              (change)="select($index + 1)"
            />
            <span class="emoji" aria-hidden="true">{{ emojis[$index] }}</span>
            <span class="dot" aria-hidden="true">{{ $index + 1 }}</span>
            <span class="text">{{ label }}</span>
          </label>
        }
      </div>
    </fieldset>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .scale {
      border: 0;
      padding: 0;
      margin: 0 0 var(--mb-space-4);
    }
    .scale-legend {
      font-size: 0.95rem;
      font-weight: 650;
      margin-bottom: var(--mb-space-2);
      color: var(--mb-text);
    }
    .options {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
    }
    @media (max-width: 540px) {
      .options {
        gap: 6px;
      }
    }
    .opt {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 12px 6px;
      border: 1.5px solid var(--mb-border);
      border-radius: var(--mb-radius);
      cursor: pointer;
      text-align: center;
      background: var(--mb-surface);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }
    .opt input {
      position: absolute;
      opacity: 0;
      width: 1px;
      height: 1px;
    }
    .opt:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
      border-color: var(--mb-primary);
    }
    .opt:focus-within {
      outline: 3px solid var(--mb-focus);
      outline-offset: 2px;
    }
    .emoji {
      font-size: 1.35rem;
      line-height: 1;
      margin-bottom: 2px;
      transition: transform 0.2s ease;
    }
    .dot {
      font-weight: 800;
      font-size: 0.95rem;
      color: var(--mb-text-muted);
    }
    .text {
      font-size: 0.76rem;
      font-weight: 600;
      color: var(--mb-text);
      line-height: 1.2;
    }
    .selected {
      border-color: var(--mb-primary);
      background: var(--mb-primary-soft);
      box-shadow: 0 0 0 2px var(--mb-primary), 0 4px 12px rgba(16, 185, 129, 0.15);
      transform: translateY(-2px);
    }
    .selected .dot {
      color: var(--mb-primary-strong);
    }
    .selected .emoji {
      transform: scale(1.18);
    }
  `,
})
export class MoodScaleComponent implements ControlValueAccessor {
  readonly legend = input('How are you feeling right now?');
  readonly name = input('mood');
  protected readonly labels = MOOD_LABELS;
  protected readonly emojis = MOOD_EMOJIS;
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
