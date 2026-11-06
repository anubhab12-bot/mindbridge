import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'mb-contact-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (open()) {
      <div class="contact-backdrop" (click)="close.emit()" (keydown.escape)="close.emit()" tabindex="0" role="dialog" aria-modal="true" aria-labelledby="contactModalTitle">
        <div class="contact-card" (click)="$event.stopPropagation()">
          <div class="contact-header">
            <div class="contact-title-group">
              <span class="medical-badge">Clinical Support & Inquiries</span>
              <h2 id="contactModalTitle">Contact via Email</h2>
              <p class="contact-sub">
                Connect directly with our care coordinators and clinical team. We respond to all inquiries within 2 hours.
              </p>
            </div>
            <button type="button" class="btn-close" (click)="close.emit()" aria-label="Close dialog">×</button>
          </div>

          <div class="contact-body">
            <!-- Crisis Alert Box -->
            <div class="crisis-banner">
              <div class="crisis-text">
                <strong>Experiencing a crisis or emergency?</strong>
                <p>Call national toll-free helpline <strong>14416</strong> (Tele-MANAS) or <strong>1800-599-0019</strong> (Kiran). Available 24/7 across India.</p>
              </div>
            </div>

            <!-- Fast Mailto Quick Cards -->
            <div class="channels-grid">
              <div class="channel-card">
                <div class="channel-info">
                  <strong>Patient Care & Appointments</strong>
                  <span>Doctor appointments, prescriptions & video support</span>
                  <a href="mailto:support@mindbridge.health?subject=Patient%20Care%20Inquiry%20-%20MindBridge" class="channel-link">
                    support&#64;mindbridge.health →
                  </a>
                </div>
              </div>

              <div class="channel-card">
                <div class="channel-info">
                  <strong>Specialists & Hospital Partners</strong>
                  <span>Doctor registration, NMC verification & NGO tie-ups</span>
                  <a href="mailto:care@mindbridge.health?subject=Specialist%20Partnership%20-%20MindBridge" class="channel-link">
                    care&#64;mindbridge.health →
                  </a>
                </div>
              </div>
            </div>

            <!-- Interactive Quick Message Composer -->
            <form class="contact-form" (ngSubmit)="sendEmail($event)">
              <div class="field">
                <label for="contactName">Your Name</label>
                <input
                  id="contactName"
                  class="input"
                  type="text"
                  [(ngModel)]="name"
                  name="name"
                  placeholder="e.g. John Doe"
                  required
                />
              </div>

              <div class="field">
                <label for="contactTopic">Inquiry Category</label>
                <select id="contactTopic" class="input" [(ngModel)]="topic" name="topic">
                  <option value="Appointment Booking Support">Appointment & Video Consultation Support</option>
                  <option value="Find a Specialist Guidance">Guidance Finding the Right Specialist</option>
                  <option value="Doctor Registration & Verification">Doctor Onboarding & Verification</option>
                  <option value="Confidentiality & Medical Data">Privacy, DPDP & Data Confidentiality</option>
                  <option value="General Clinical Inquiry">General Inquiry</option>
                </select>
              </div>

              <div class="field">
                <label for="contactMessage">Your Message</label>
                <textarea
                  id="contactMessage"
                  class="input textarea"
                  rows="3"
                  [(ngModel)]="message"
                  name="message"
                  placeholder="How can our clinical support team assist you today?"
                  required
                ></textarea>
              </div>

              <div class="form-actions">
                <button type="submit" class="btn btn-primary-elevated btn-send">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                  <span>Open in Your Email App to Send</span>
                </button>
                <button type="button" class="btn btn-secondary btn-copy" (click)="copyEmail()">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                  </svg>
                  <span>{{ copied() ? 'Email Address Copied' : 'Copy Email Address' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .contact-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(8px);
      z-index: 1200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      overflow-y: auto;
    }
    .contact-card {
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius-lg);
      width: 100%;
      max-width: 580px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
      animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    @keyframes modalPop {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .contact-header {
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--mb-border);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }
    .medical-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 750;
      color: #0d9488;
      background: rgba(13, 148, 136, 0.12);
      padding: 3px 10px;
      border-radius: 999px;
      margin-bottom: 6px;
      letter-spacing: 0.02em;
    }
    .contact-title-group h2 {
      font-size: 1.45rem;
      margin: 0 0 6px;
      color: var(--mb-text);
      font-weight: 750;
    }
    .contact-sub {
      color: var(--mb-text-muted);
      font-size: 0.88rem;
      line-height: 1.45;
      margin: 0;
    }
    .btn-close {
      background: none;
      border: none;
      font-size: 1.6rem;
      line-height: 1;
      color: var(--mb-text-muted);
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.15s ease;
      &:hover {
        background: var(--mb-surface-2);
        color: var(--mb-text);
      }
    }
    .contact-body {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .crisis-banner {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: rgba(225, 29, 72, 0.08);
      border: 1px solid rgba(225, 29, 72, 0.25);
      border-radius: var(--mb-radius);
      padding: 12px 14px;
      color: var(--mb-text);
    }
    .crisis-icon {
      font-size: 1.25rem;
      line-height: 1;
    }
    .crisis-text strong {
      font-size: 0.88rem;
      color: #e11d48;
      display: block;
      margin-bottom: 2px;
    }
    .crisis-text p {
      font-size: 0.82rem;
      margin: 0;
      color: var(--mb-text-muted);
      line-height: 1.4;
    }
    .channels-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    @media (max-width: 600px) {
      .channels-grid {
        grid-template-columns: 1fr;
      }
    }
    .channel-card {
      background: var(--mb-surface-2);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius);
      padding: 12px 14px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .channel-icon {
      font-size: 1.5rem;
      line-height: 1;
    }
    .channel-info strong {
      font-size: 0.88rem;
      color: var(--mb-text);
      display: block;
      margin-bottom: 2px;
    }
    .channel-info span {
      font-size: 0.78rem;
      color: var(--mb-text-muted);
      display: block;
      margin-bottom: 6px;
      line-height: 1.3;
    }
    .channel-link {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--mb-primary);
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
    }
    .contact-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .contact-form .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .contact-form label {
      font-size: 0.82rem;
      font-weight: 650;
      color: var(--mb-text);
    }
    .textarea {
      resize: vertical;
      min-height: 72px;
      font-family: inherit;
    }
    .form-actions {
      display: flex;
      gap: 10px;
      margin-top: 4px;
      flex-wrap: wrap;
    }
    .btn-send {
      flex: 1.4;
      min-height: 42px;
      font-weight: 700;
    }
    .btn-copy {
      flex: 1;
      min-height: 42px;
    }
    @media (max-width: 480px) {
      .form-actions {
        flex-direction: column;
      }
      .btn-send, .btn-copy {
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactModalComponent {
  readonly open = input<boolean>(false);
  readonly close = output<void>();

  protected name = '';
  protected topic = 'Appointment Booking Support';
  protected message = '';
  protected readonly copied = signal(false);

  sendEmail(e?: Event) {
    if (e) e.preventDefault();
    const recipient = this.topic.includes('Doctor') ? 'care@mindbridge.health' : 'support@mindbridge.health';
    const subject = encodeURIComponent(`[MindBridge Clinical Inquiry] ${this.topic} - ${this.name || 'Patient'}`);
    const bodyText = `Name: ${this.name || 'Anonymous'}\nCategory: ${this.topic}\n\nMessage:\n${this.message || 'I would like to inquire about MindBridge healthcare services.'}`;
    const body = encodeURIComponent(bodyText);
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  }

  copyEmail() {
    try {
      navigator.clipboard.writeText('support@mindbridge.health');
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
    } catch {
      // Fallback
    }
  }
}
