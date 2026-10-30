import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api/api.service';
import { errorMessage } from '../../core/api/api-error';
import { EmptyStateComponent, ErrorStateComponent, LoadingComponent } from '../../shared/ui/states';

interface PatientRow {
  patientId: string;
  displayName: string;
  careSince: string;
  nextAppointmentAt: string | null;
}

@Component({
  selector: 'mb-patients',
  imports: [DatePipe, RouterLink, LoadingComponent, ErrorStateComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Patients</h1>
        <p>
          People with an active care relationship with you. You only see what each person has chosen
          to share.
        </p>
      </header>
      @if (loading()) {
        <mb-loading [lines]="4" />
      } @else if (error()) {
        <mb-error [message]="error()!" (retry)="load()" />
      } @else if (!rows().length) {
        <mb-empty
          title="No patients yet"
          text="Patients appear here after you confirm their first appointment."
        />
      } @else {
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>In your care since</th>
                <th>Next session</th>
              </tr>
            </thead>
            <tbody>
              @for (r of rows(); track r.patientId) {
                <tr>
                  <td>
                    <a [routerLink]="['/doctor/patients', r.patientId]">{{ r.displayName }}</a>
                  </td>
                  <td>{{ r.careSince | date: 'mediumDate' }}</td>
                  <td>
                    {{
                      r.nextAppointmentAt ? (r.nextAppointmentAt | date: 'EEE d MMM, h:mm a') : '—'
                    }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class PatientsPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly rows = signal<PatientRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit() {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.rows.set(await this.api.get<PatientRow[]>('/doctors/me/patients'));
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}
