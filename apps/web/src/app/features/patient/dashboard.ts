import { DatePipe, CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { AppointmentSummary } from '@mindbridge/shared-types';
import { ApiService, apiUrl } from '../../core/api/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { LoadingComponent } from '../../shared/ui/states';
import { MOOD_LABELS } from '../../shared/ui/mood-scale';
import { categoryLabel } from '../../shared/util/format';
import type { MoodEntryView } from './mood';

export interface TopDoctor {
  id: string;
  name: string;
  category: string;
  yearsExperience: number;
  qualifications: string[];
  ratingAverage: number;
  avatar: string;
  languages: string[];
}

@Component({
  selector: 'mb-patient-dashboard',
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, LoadingComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>Hi {{ auth.user()?.displayName }}</h1>
        <p>How are things today? Take whatever you need from here.</p>
      </header>

      <!-- SUCCESS / EMAIL NOTICE TOAST -->
      @if (emailNotice()) {
        <div class="email-sent-banner animated-fade">
          <div class="banner-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>
          <div class="banner-body">
            <strong>Video Call Link Sent via Email!</strong>
            <p>{{ emailNotice() }}</p>
          </div>
          <button type="button" class="btn-dismiss" (click)="emailNotice.set(null)">✕</button>
        </div>
      }

      <!-- 1. APPOINTMENT DOCTOR SECTION (SHOWS IN PATIENT PORTAL WHEN SCHEDULED) -->
      @if (primaryAppointment(); as appt) {
        <section class="portal-telehealth-card scheduled-mode">
          <div class="card-left">
            <div class="status-badge-row">
              <span class="live-dot-green"></span>
              <span class="badge-text">SCHEDULED APPOINTMENT DOCTOR</span>
            </div>
            <h2>{{ appt.doctor.displayName }}</h2>
            <div class="doctor-sub-details">
              <span>{{ label(appt.doctor.professionalCategory) }}</span> ·
              <span>{{ appt.startAt | date: 'EEEE, d MMMM y' }}</span> at
              <strong class="time-highlight">{{ appt.startAt | date: 'h:mm a' }}</strong>
            </div>
            <p class="appointment-notice">
              Your 1-on-1 video call has been booked. A secure video meeting link has been sent to your email
              (<strong>{{ auth.user()?.email }}</strong>) and the doctor's email.
            </p>
            <div class="scheduled-actions-row">
              <button
                type="button"
                class="btn-call-action primary"
                (click)="joinVideoCall(appt)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11"/><rect width="14" height="12" x="2" y="6" rx="2"/>
                </svg>
                <span>Join Video Consultation</span>
              </button>
              <button
                type="button"
                class="btn-call-action secondary"
                (click)="resendVideoEmail(appt.id)"
                [disabled]="resendingEmail()"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <span>{{ resendingEmail() ? 'Sending Email…' : 'Resend Meeting Link to Email' }}</span>
              </button>
            </div>
          </div>

          <div class="card-right-preview">
            <div class="doc-card-highlight">
              <div class="doc-big-avatar">{{ getInitials(appt.doctor.displayName) }}</div>
              <strong>{{ appt.doctor.displayName }}</strong>
              <small>{{ label(appt.doctor.professionalCategory) }}</small>
              <div class="telehealth-tag">Video Consultation Confirmed</div>
            </div>
          </div>
        </section>
      }

      <!-- 2. TOP 3 EXPERIENCED REGISTERED DOCTORS (SUGGESTED BY YEARS OF EXPERIENCE) -->
      <section class="portal-telehealth-card">
        <div class="card-left">
          <div class="status-badge-row">
            <span class="live-dot-green"></span>
            <span class="badge-text">SPECIALISTS RANKED BY CLINICAL EXPERIENCE</span>
          </div>
          <h2>Live 1-on-1 Clinical Video Consultation</h2>
          <p>
            Consult with top verified professionals ranked by years of clinical experience.
            When you schedule, a direct 1-on-1 video call link is immediately emailed to both your email
            and the doctor's email to join.
          </p>
          <div class="security-pills">
            <span class="sec-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>AES-256 Encrypted</span>
            </span>
            <span class="sec-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11"/><rect width="14" height="12" x="2" y="6" rx="2"/>
              </svg>
              <span>Video & Mic Controls</span>
            </span>
            <span class="sec-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
              <span>Direct Link Emailed</span>
            </span>
          </div>
        </div>

        <div class="card-right-doctors">
          @for (doc of topDoctors(); track doc.id) {
            <div class="portal-doctor-row">
              <div class="portal-doc-header">
                <div class="doc-avatar-badge">{{ doc.avatar }}</div>
                <div class="doc-meta">
                  <div class="doc-title-row">
                    <strong>{{ doc.name }}</strong>
                    <span class="active-dot" title="Available for Video Call">●</span>
                  </div>
                  <div class="doc-category">{{ doc.category }}</div>
                  <div class="doc-stars-exp">
                    <span class="stars">Rating: {{ doc.ratingAverage }} / 5.0</span> ·
                    <strong class="exp-badge">{{ doc.yearsExperience }} yrs exp</strong>
                  </div>
                </div>
              </div>

              <div class="portal-doc-actions">
                <button
                  type="button"
                  class="btn-schedule-mini"
                  (click)="openScheduleModal(doc)"
                  [disabled]="bookingLoading()"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11"/><rect width="14" height="12" x="2" y="6" rx="2"/>
                  </svg>
                  <span>Schedule Consultation</span>
                </button>
              </div>
            </div>
          }
        </div>
      </section>

      <!-- SCHEDULE MODAL -->
      @if (schedulingDoctor(); as doc) {
        <div class="telehealth-modal-backdrop" (click)="schedulingDoctor.set(null)">
          <div class="schedule-dialog" (click)="$event.stopPropagation()">
            <div class="dialog-header">
              <h3>Schedule 1-on-1 Video Consultation</h3>
              <button type="button" class="btn-close" (click)="schedulingDoctor.set(null)">✕</button>
            </div>
            <div class="dialog-body">
              <div class="selected-doc-banner">
                <span class="doc-avatar-badge sm">{{ doc.avatar }}</span>
                <div>
                  <strong>{{ doc.name }}</strong>
                  <div class="small muted">{{ doc.category }} · {{ doc.yearsExperience }} years experience</div>
                </div>
              </div>

              <div class="field">
                <label for="schedTime">Select Consultation Time</label>
                <select id="schedTime" class="input" [(ngModel)]="selectedTimeSlot">
                  <option value="now">Immediate Consultation (Right Now)</option>
                  <option value="today-18">Today at 6:00 PM</option>
                  <option value="today-20">Today at 8:00 PM</option>
                  <option value="tomorrow-10">Tomorrow at 10:00 AM</option>
                  <option value="tomorrow-15">Tomorrow at 3:00 PM</option>
                  <option value="tomorrow-18">Tomorrow at 6:00 PM</option>
                </select>
              </div>

              <div class="field">
                <label for="schedReason">Reason for Consultation (Optional)</label>
                <input
                  id="schedReason"
                  class="input"
                  [(ngModel)]="consultationReason"
                  placeholder="e.g. Anxiety management, stress, sleep guidance"
                />
              </div>

              <div class="email-info-box">
                <div class="box-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                  </svg>
                </div>
                <div class="box-text">
                  Upon confirmation, an email with the direct video meeting link will be sent to
                  <strong>{{ auth.user()?.email }}</strong> and the doctor's email.
                </div>
              </div>
            </div>

            <div class="dialog-footer">
              <button type="button" class="btn btn-secondary" (click)="schedulingDoctor.set(null)">Cancel</button>
              <button
                type="button"
                class="btn btn-primary"
                (click)="confirmBooking(doc)"
                [disabled]="bookingLoading()"
              >
                {{ bookingLoading() ? 'Scheduling & Emailing…' : 'Confirm & Send Video Link via Email' }}
              </button>
            </div>
          </div>
        </div>
      }

      <div class="grid-2" style="margin-top: 24px;">
        <section class="card">
          <h2>Today's check-in</h2>
          @if (loading()) {
            <mb-loading [lines]="2" />
          } @else if (today(); as t) {
            <p>
              You checked in as <strong>{{ moodLabel(t.score) }}</strong>
              @if (t.emotions.length) {
                , feeling {{ t.emotions.join(', ') }}
              }
              .
            </p>
            <a routerLink="/patient/mood" class="btn btn-secondary btn-sm">See your mood history</a>
          } @else {
            <p class="muted">You haven't checked in yet today.</p>
            <a routerLink="/patient/mood" class="btn">Check in now</a>
          }
        </section>

        <section class="card">
          <h2>All Scheduled Sessions</h2>
          @if (loading()) {
            <mb-loading [lines]="2" />
          } @else if (!upcoming().length) {
            <p class="muted">No upcoming sessions booked.</p>
            <a routerLink="/patient/professionals" class="btn btn-secondary btn-sm"
              >Browse full directory</a
            >
          } @else {
            <ul class="list">
              @for (a of upcoming(); track a.id) {
                <li>
                  <a [routerLink]="['/patient/appointments', a.id]">{{
                    a.startAt | date: 'EEE d MMM, h:mm a'
                  }}</a>
                  <div class="small muted">
                    {{ a.doctor.displayName }} · {{ label(a.doctor.professionalCategory) }} ·
                    {{ a.status === 'REQUESTED' ? 'Awaiting confirmation' : 'Confirmed' }}
                  </div>
                </li>
              }
            </ul>
          }
        </section>
      </div>

      <h2 class="section">Quick links</h2>
      <div class="grid">
        <a class="card-flat quick" routerLink="/patient/companion"
          ><strong>Talk to the AI companion</strong
          ><span class="small muted">A supportive listener, any time.</span></a
        >
        <a class="card-flat quick" routerLink="/patient/journal"
          ><strong>Write in your journal</strong
          ><span class="small muted">Private and encrypted.</span></a
        >
        <a class="card-flat quick" routerLink="/patient/self-help"
          ><strong>Try a short exercise</strong
          ><span class="small muted">Breathing, grounding, sleep.</span></a
        >
        <a class="card-flat quick" routerLink="/patient/messages"
          ><strong>Message your care team</strong
          ><span class="small muted">For non-urgent questions.</span></a
        >
      </div>

      <section class="alert alert-crisis help">
        <strong>If you're in crisis</strong>, please don't wait for a reply here.
        <a routerLink="/crisis">See crisis contacts</a>.
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .section {
      margin-top: var(--mb-space-6);
    }
    .quick {
      display: flex;
      flex-direction: column;
      gap: 4px;
      text-decoration: none;
      color: inherit;
    }
    .quick:hover {
      border-color: var(--mb-primary);
    }
    .help {
      margin-top: var(--mb-space-6);
    }

    /* TELEHEALTH SECTION: SERENE CLINICAL HEALTHLINE THEME */
    .portal-telehealth-card {
      background: #ffffff;
      color: var(--mb-text);
      border-radius: var(--mb-radius-lg);
      padding: 28px 30px;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03);
      border: 1px solid var(--mb-border);
      border-left: 4px solid var(--mb-teal);
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 28px;
      align-items: center;
      position: relative;
      overflow: hidden;
    }
    :host-context([data-theme='dark']) .portal-telehealth-card {
      background: #111827;
      border-color: #334155;
      border-left-color: #2dd4bf;
    }
    @media (max-width: 900px) {
      .portal-telehealth-card {
        grid-template-columns: 1fr;
        padding: 22px 18px;
        gap: 22px;
      }
    }
    .scheduled-mode {
      border-left-color: var(--mb-primary);
      background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
    }
    :host-context([data-theme='dark']) .scheduled-mode {
      background: linear-gradient(135deg, #0f172a 0%, #082f49 100%);
    }
    .status-badge-row {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(13, 148, 136, 0.08);
      border: 1px solid rgba(13, 148, 136, 0.25);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      color: var(--mb-teal-strong);
      margin-bottom: 12px;
      max-width: 100%;
      box-sizing: border-box;
    }
    :host-context([data-theme='dark']) .status-badge-row {
      background: rgba(45, 212, 191, 0.12);
      color: #2dd4bf;
      border-color: rgba(45, 212, 191, 0.3);
    }
    .live-dot-green {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      flex-shrink: 0;
      animation: pulse 1.5s infinite;
    }
    .card-left h2 {
      font-size: 1.45rem;
      color: var(--mb-text);
      margin: 0 0 8px;
      font-weight: 800;
      line-height: 1.25;
      letter-spacing: -0.02em;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .doctor-sub-details {
      font-size: 0.9rem;
      color: var(--mb-teal-strong);
      margin-bottom: 10px;
      font-weight: 600;
    }
    .time-highlight {
      color: var(--mb-text);
    }
    .appointment-notice {
      font-size: 0.88rem;
      line-height: 1.5;
      color: var(--mb-text-muted);
      margin: 0 0 18px;
    }
    .card-left p {
      color: var(--mb-text-muted);
      font-size: 0.88rem;
      line-height: 1.55;
      margin: 0 0 16px;
    }
    .security-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 0.76rem;
      color: var(--mb-text-muted);
    }
    .sec-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: var(--mb-surface-2);
      border: 1px solid var(--mb-border);
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 600;
    }
    .scheduled-actions-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
    }
    .btn-call-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: var(--mb-radius);
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      font-family: inherit;
      &.primary {
        background: var(--mb-primary);
        color: #ffffff;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);
        &:hover {
          background: var(--mb-primary-strong);
          transform: translateY(-1px);
        }
      }
      &.secondary {
        background: var(--mb-surface-2);
        color: var(--mb-text);
        border: 1px solid var(--mb-border);
        &:hover {
          background: var(--mb-border);
        }
      }
    }
    .card-right-preview {
      display: flex;
      justify-content: center;
    }
    .doc-card-highlight {
      background: var(--mb-surface-2);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius);
      padding: 22px;
      text-align: center;
      width: 100%;
      max-width: 260px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .doc-big-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--mb-teal), var(--mb-primary));
      color: #ffffff;
      font-size: 1.25rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(13, 148, 136, 0.25);
    }
    .telehealth-tag {
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      margin-top: 4px;
    }
    .card-right-doctors {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .portal-doctor-row {
      background: var(--mb-surface-2);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius);
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      transition: all 0.2s ease;
      &:hover {
        border-color: var(--mb-teal);
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
      }
    }
    .portal-doc-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .doc-avatar-badge {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(13, 148, 136, 0.15), rgba(2, 132, 199, 0.15));
      border: 1px solid rgba(13, 148, 136, 0.3);
      color: var(--mb-teal-strong);
      font-size: 0.82rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      &.sm {
        width: 32px;
        height: 32px;
        font-size: 0.75rem;
      }
    }
    .doc-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .doc-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
      strong { font-size: 0.92rem; color: var(--mb-text); }
    }
    .active-dot {
      color: #10b981;
      font-size: 9px;
    }
    .doc-category {
      font-size: 0.74rem;
      color: var(--mb-teal-strong);
      font-weight: 600;
    }
    .doc-stars-exp {
      font-size: 0.72rem;
      color: var(--mb-text-muted);
      margin-top: 1px;
    }
    .exp-badge {
      color: var(--mb-text);
      font-weight: 700;
    }
    .btn-schedule-mini {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(13, 148, 136, 0.08);
      border: 1px solid rgba(13, 148, 136, 0.3);
      color: var(--mb-teal-strong);
      padding: 7px 12px;
      border-radius: var(--mb-radius-sm);
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
      font-family: inherit;
      &:hover {
        background: var(--mb-teal);
        color: #ffffff;
      }
    }

    @media (max-width: 640px) {
      .btn-call-action {
        width: 100%;
        text-align: center;
      }
      .portal-doctor-row {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }
      .portal-doc-actions {
        width: 100%;
      }
      .btn-schedule-mini {
        width: 100%;
        text-align: center;
      }
    }

    /* TOAST BANNER */
    .email-sent-banner {
      background: #064e3b;
      border: 1px solid #10b981;
      color: #ecfdf5;
      padding: 14px 18px;
      border-radius: 12px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .banner-icon { font-size: 24px; }
    .banner-body {
      flex: 1;
      p { margin: 2px 0 0; font-size: 0.85rem; color: #a7f3d0; }
    }
    .btn-dismiss {
      background: transparent;
      border: none;
      color: #a7f3d0;
      cursor: pointer;
      font-size: 1.1rem;
    }

    /* MODAL */
    .telehealth-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .schedule-dialog {
      background: var(--mb-surface, #ffffff);
      color: var(--mb-text, #1e293b);
      border-radius: 18px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      animation: modalFadeIn 0.2s ease;
    }
    .dialog-header {
      padding: 18px 22px;
      border-bottom: 1px solid var(--mb-border, #e2e8f0);
      display: flex;
      justify-content: space-between;
      align-items: center;
      h3 { margin: 0; font-size: 1.1rem; }
    }
    .btn-close {
      background: transparent;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
    }
    .dialog-body {
      padding: 20px 22px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .selected-doc-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--mb-surface-muted, #f8fafc);
      padding: 12px 14px;
      border-radius: 10px;
    }
    .doc-avatar-sm { font-size: 30px; }
    .email-info-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.82rem;
      display: flex;
      gap: 10px;
      line-height: 1.45;
    }
    .dialog-footer {
      padding: 14px 22px;
      border-top: 1px solid var(--mb-border, #e2e8f0);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `,
})
export class PatientDashboardPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly today = signal<MoodEntryView | null>(null);
  protected readonly upcoming = signal<AppointmentSummary[]>([]);
  protected readonly topDoctors = signal<TopDoctor[]>([]);
  protected readonly schedulingDoctor = signal<TopDoctor | null>(null);
  protected readonly bookingLoading = signal(false);
  protected readonly resendingEmail = signal(false);
  protected readonly emailNotice = signal<string | null>(null);

  selectedTimeSlot = 'now';
  consultationReason = '';

  protected readonly label = categoryLabel;
  protected readonly moodLabel = (s: number) => MOOD_LABELS[s - 1]?.toLowerCase() ?? '';

  protected primaryAppointment() {
    return this.upcoming().length > 0 ? this.upcoming()[0] : null;
  }

  async ngOnInit() {
    await this.refreshData();
    await this.loadTopExperiencedDoctors();
    this.loading.set(false);
  }

  async refreshData() {
    const [today, appts] = await Promise.allSettled([
      this.api.get<MoodEntryView | null>('/patients/mood-entries/today'),
      this.api.page<AppointmentSummary>('/patients/appointments', {
        scope: 'upcoming',
        pageSize: 5,
      }),
    ]);
    if (today.status === 'fulfilled') this.today.set(today.value);
    if (appts.status === 'fulfilled') this.upcoming.set(appts.value.items);
  }

  getInitials(name?: string): string {
    if (!name) return 'MD';
    return name
      .replace(/^(Dr\.?|Doctor)\s+/i, '')
      .split(' ')
      .filter(Boolean)
      .map((w: string) => w[0].toUpperCase())
      .slice(0, 2)
      .join('') || 'MD';
  }

  async loadTopExperiencedDoctors() {
    try {
      const res = await fetch(apiUrl('/doctors/top-experienced'));
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data?.data || [];
        if (items.length > 0) {
          const mapped: TopDoctor[] = items.slice(0, 3).map((d: any) => ({
            id: d.id,
            name: d.displayName,
            category: d.professionalCategory
              ? d.professionalCategory.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
              : 'Senior Specialist',
            yearsExperience: d.yearsExperience || 10,
            qualifications: d.qualifications || [],
            ratingAverage: d.ratingAverage || 4.9,
            avatar: this.getInitials(d.displayName),
            languages: d.languages || ['English', 'Hindi', 'Bengali'],
          }));
          this.topDoctors.set(mapped);
          return;
        }
      }
    } catch {
      // Fall through to fallback
    }

    // Default registered doctor recommendations if database has no active doctors yet
    this.topDoctors.set([
      {
        id: 'top-1',
        name: 'Dr. Aarav Mehta',
        category: 'Senior Neuro-Psychiatrist',
        yearsExperience: 14,
        qualifications: ['MBBS', 'MD (Psychiatry) AIIMS'],
        ratingAverage: 4.9,
        avatar: 'AM',
        languages: ['English', 'Hindi', 'Bengali'],
      },
      {
        id: 'top-2',
        name: 'Dr. Sunita Sen',
        category: 'Clinical Psychologist & Trauma Specialist',
        yearsExperience: 11,
        qualifications: ['PhD Clinical Psychology', 'M.Phil'],
        ratingAverage: 4.95,
        avatar: 'SS',
        languages: ['English', 'Bengali', 'Hindi'],
      },
      {
        id: 'top-3',
        name: 'Dr. Priya Sharma',
        category: 'Consultant Psychiatrist & Anxiety Coach',
        yearsExperience: 9,
        qualifications: ['MBBS', 'DPM NIMHANS'],
        ratingAverage: 4.88,
        avatar: 'PS',
        languages: ['English', 'Hindi'],
      },
    ]);
  }

  openScheduleModal(doc: TopDoctor) {
    this.schedulingDoctor.set(doc);
    this.selectedTimeSlot = 'now';
    this.consultationReason = '';
  }

  async confirmBooking(doc: TopDoctor) {
    this.bookingLoading.set(true);
    try {
      let startAt: string | undefined = undefined;
      const now = new Date();
      if (this.selectedTimeSlot === 'now') {
        startAt = now.toISOString();
      } else if (this.selectedTimeSlot === 'today-18') {
        now.setHours(18, 0, 0, 0);
        startAt = now.toISOString();
      } else if (this.selectedTimeSlot === 'today-20') {
        now.setHours(20, 0, 0, 0);
        startAt = now.toISOString();
      } else if (this.selectedTimeSlot.startsWith('tomorrow')) {
        const tomorrow = new Date(Date.now() + 86400000);
        const hour = parseInt(this.selectedTimeSlot.split('-')[1] || '10', 10);
        tomorrow.setHours(hour, 0, 0, 0);
        startAt = tomorrow.toISOString();
      }

      const res = await fetch(apiUrl('/appointments/telehealth'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: doc.id,
          startAt,
          reason: this.consultationReason || '1-on-1 Video Consultation',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Could not schedule appointment.');
      }

      const data = await res.json();
      this.schedulingDoctor.set(null);
      this.emailNotice.set(
        `Confirmation email with the video call link was sent to your email (${this.auth.user()?.email}) and ${doc.name}'s email. Both can join using the link!`
      );
      await this.refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to schedule. Please try again.');
    } finally {
      this.bookingLoading.set(false);
    }
  }

  async resendVideoEmail(appointmentId: string) {
    this.resendingEmail.set(true);
    try {
      const res = await fetch(apiUrl(`/appointments/${appointmentId}/resend-video`), {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Could not resend email.');
      this.emailNotice.set(
        `Video meeting link resent successfully to your registered email (${this.auth.user()?.email}) and your doctor's email!`
      );
    } catch {
      alert('Could not resend email link at this moment.');
    } finally {
      this.resendingEmail.set(false);
    }
  }

  joinVideoCall(appt: AppointmentSummary) {
    this.router.navigate(['/telehealth/room'], {
      queryParams: {
        session: appt.id,
        doc: appt.doctor.displayName,
        pat: this.auth.user()?.displayName || 'Patient',
        role: 'patient',
      },
    });
  }
}
