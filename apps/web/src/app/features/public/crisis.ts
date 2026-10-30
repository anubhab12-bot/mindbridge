import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CrisisService } from '../../core/services/crisis.service';
import { CrisisPanelComponent } from '../../shared/ui/crisis-panel';
import { LoadingComponent } from '../../shared/ui/states';

@Component({
  selector: 'mb-crisis-page',
  imports: [CrisisPanelComponent, LoadingComponent, FormsModule],
  template: `
    <div class="container page narrow">
      <header class="page-header">
        <h1>Get help now</h1>
        <p>
          If you are in immediate danger or might act on thoughts of ending your life, please
          contact emergency services or a crisis line now. You deserve support, and talking to
          someone can help.
        </p>
      </header>

      <div class="field country">
        <label for="country">Showing services for</label>
        <select id="country" class="input" [(ngModel)]="country" (ngModelChange)="load()">
          <option value="IN">India</option>
        </select>
        <span class="hint"
          >More countries will be added once their services have been verified.</span
        >
      </div>

      @if (crisis.loading()) {
        <mb-loading label="Loading crisis contacts" />
      } @else {
        <mb-crisis-panel [data]="crisis.current()" title="Crisis contacts" />
      }

      <section class="card-flat steps">
        <h2>While you wait</h2>
        <ul>
          <li>If you can, move away from anything you could use to hurt yourself.</li>
          <li>Stay with someone you trust, or call them and tell them how you are feeling.</li>
          <li>Breathe slowly: in for four counts, hold for four, out for six.</li>
          <li>
            If you are worried about someone else, stay with them and help them contact one of the
            services above.
          </li>
        </ul>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .narrow {
      max-width: 760px;
    }
    .country {
      max-width: 320px;
    }
    .steps {
      margin-top: var(--mb-space-5);
    }
    .steps ul {
      padding-left: 1.2rem;
    }
  `,
})
export class CrisisPage implements OnInit {
  protected readonly crisis = inject(CrisisService);
  protected country = 'IN';

  ngOnInit() {
    void this.load();
  }

  load() {
    return this.crisis.load(this.country);
  }
}
