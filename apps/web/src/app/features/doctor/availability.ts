import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { ApiError, errorMessage } from '../../core/api/api-error';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../shared/ui/confirm';
import { LoadingComponent } from '../../shared/ui/states';
import type { OwnDoctorProfile } from './profile';

interface Block {
  dayOfWeek: number;
  start: string;
  end: string;
}

interface Exception {
  id: string;
  kind: 'UNAVAILABLE' | 'EXTRA_AVAILABLE';
  startAt: string;
  endAt: string;
  note?: string;
  conflictingAppointments?: number;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

@Component({
  selector: 'mb-availability',
  imports: [FormsModule, DatePipe, LoadingComponent],
  template: `
    <div class="page narrow">
      <header class="page-header">
        <h1>Availability</h1>
        <p>
          Set your regular weekly hours. Patients can book sessions inside them. Times are in
          {{ timezone() || 'your timezone' }}.
        </p>
      </header>
      @if (loading()) {
        <mb-loading [lines]="6" />
      } @else {
        <section class="card">
          <h2>Weekly hours</h2>
          @for (d of [1, 2, 3, 4, 5, 6, 0]; track d) {
            <div class="day">
              <div class="day-name">{{ days[d] }}</div>
              <div class="blocks">
                @for (b of blocksFor(d); track $index) {
                  <div class="row block">
                    <input
                      class="input time"
                      type="time"
                      [(ngModel)]="b.start"
                      [attr.aria-label]="days[d] + ' start'"
                    />
                    <span>to</span>
                    <input
                      class="input time"
                      type="time"
                      [(ngModel)]="b.end"
                      [attr.aria-label]="days[d] + ' end'"
                    />
                    <button
                      class="btn btn-ghost btn-sm"
                      type="button"
                      (click)="removeBlock(b)"
                      [attr.aria-label]="'Remove ' + days[d] + ' block'"
                    >
                      Remove
                    </button>
                  </div>
                } @empty {
                  <span class="small muted">Not available</span>
                }
                <button class="btn btn-secondary btn-sm add" type="button" (click)="addBlock(d)">
                  Add hours
                </button>
              </div>
            </div>
          }
          <button class="btn" type="button" (click)="saveHours()" [disabled]="busy()">
            Save weekly hours
          </button>
        </section>

        <section class="card">
          <h2>Leave and extra availability</h2>
          <div class="grid-2">
            <div class="field">
              <label for="kind">Type</label>
              <select id="kind" class="input" [(ngModel)]="ex.kind">
                <option value="UNAVAILABLE">Unavailable (leave, holiday)</option>
                <option value="EXTRA_AVAILABLE">Extra availability</option>
              </select>
            </div>
            <div class="field">
              <label for="note">Note <span class="muted">(private)</span></label
              ><input id="note" class="input" [(ngModel)]="ex.note" maxlength="200" />
            </div>
            <div class="field">
              <label for="from">From</label
              ><input id="from" class="input" type="datetime-local" [(ngModel)]="ex.startAt" />
            </div>
            <div class="field">
              <label for="to">To</label
              ><input id="to" class="input" type="datetime-local" [(ngModel)]="ex.endAt" />
            </div>
          </div>
          <button
            class="btn btn-secondary"
            type="button"
            (click)="addException()"
            [disabled]="!ex.startAt || !ex.endAt"
          >
            Add
          </button>

          <ul class="list exceptions">
            @for (e of exceptions(); track e.id) {
              <li class="row-between">
                <div>
                  <span
                    class="badge"
                    [class.badge-warning]="e.kind === 'UNAVAILABLE'"
                    [class.badge-success]="e.kind !== 'UNAVAILABLE'"
                    >{{ e.kind === 'UNAVAILABLE' ? 'Unavailable' : 'Extra' }}</span
                  >
                  {{ e.startAt | date: 'medium' }} to {{ e.endAt | date: 'medium' }}
                  @if (e.note) {
                    <span class="small muted">· {{ e.note }}</span>
                  }
                </div>
                <button class="btn btn-ghost btn-sm" type="button" (click)="removeException(e)">
                  Remove
                </button>
              </li>
            } @empty {
              <li class="small muted">Nothing scheduled.</li>
            }
          </ul>
        </section>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .narrow {
      max-width: 860px;
    }
    .card {
      margin-bottom: var(--mb-space-4);
    }
    .day {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--mb-border);
    }
    .day-name {
      font-weight: 600;
      padding-top: 8px;
    }
    .blocks {
      display: grid;
      gap: 6px;
      justify-items: start;
    }
    .time {
      width: 130px;
    }
    .day:last-of-type {
      margin-bottom: var(--mb-space-4);
    }
    .exceptions {
      margin-top: var(--mb-space-4);
    }
    @media (max-width: 600px) {
      .day {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AvailabilityPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly days = DAYS;
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly timezone = signal('');
  protected readonly blocks = signal<Block[]>([]);
  protected readonly exceptions = signal<Exception[]>([]);
  protected ex = { kind: 'UNAVAILABLE' as Exception['kind'], startAt: '', endAt: '', note: '' };

  async ngOnInit() {
    try {
      const [p, ex] = await Promise.all([
        this.api.get<OwnDoctorProfile>('/doctors/me'),
        this.api.get<Exception[]>('/doctors/me/availability/exceptions'),
      ]);
      this.timezone.set(p.timezone);
      this.blocks.set(p.workingHours.map((h) => ({ ...h })));
      this.exceptions.set(ex);
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  blocksFor(day: number) {
    return this.blocks().filter((b) => b.dayOfWeek === day);
  }
  addBlock(day: number) {
    this.blocks.update((b) => [...b, { dayOfWeek: day, start: '09:00', end: '17:00' }]);
  }
  removeBlock(block: Block) {
    this.blocks.update((b) => b.filter((x) => x !== block));
  }

  async saveHours() {
    this.busy.set(true);
    try {
      await this.api.put('/doctors/me/availability', { workingHours: this.blocks() });
      this.toast.success('Weekly hours saved.');
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async addException() {
    try {
      const row = await this.api.post<Exception>('/doctors/me/availability/exceptions', {
        kind: this.ex.kind,
        startAt: new Date(this.ex.startAt).toISOString(),
        endAt: new Date(this.ex.endAt).toISOString(),
        note: this.ex.note.trim() || undefined,
      });
      this.exceptions.update((l) => [...l, row].sort((a, b) => a.startAt.localeCompare(b.startAt)));
      this.ex = { kind: 'UNAVAILABLE', startAt: '', endAt: '', note: '' };
      if (row.conflictingAppointments) {
        this.toast.show(
          `${row.conflictingAppointments} existing booking(s) overlap this time. They have not been cancelled; please review them in Appointments.`,
          'info',
          10000,
        );
      } else {
        this.toast.success('Saved.');
      }
    } catch (err) {
      this.toast.error(ApiError.from(err).message);
    }
  }

  async removeException(e: Exception) {
    if (
      !(await this.confirm.ask({
        title: 'Remove this block?',
        message: 'Your regular hours will apply again for this period.',
        confirmLabel: 'Remove',
      }))
    )
      return;
    try {
      await this.api.delete(`/doctors/me/availability/exceptions/${e.id}`);
      this.exceptions.update((l) => l.filter((x) => x.id !== e.id));
    } catch (err) {
      this.toast.error(errorMessage(err));
    }
  }
}
