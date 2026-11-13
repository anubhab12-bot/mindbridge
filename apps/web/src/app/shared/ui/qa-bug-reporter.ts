import { Component, ChangeDetectionStrategy, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { apiUrl } from '../../core/api/api.service';

@Component({
  selector: 'mb-qa-bug-reporter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Floating QA Pill Button (always visible or toggleable) -->
    <div class="mb-qa-floating-trigger" [class.hidden-widget]="!isWidgetVisible()">
      <button 
        type="button" 
        class="qa-trigger-btn" 
        (click)="openModal()"
        title="Open QA Bug Reporter (Shortcut: Ctrl+Shift+B)"
      >
        <span class="qa-badge-icon">🐞</span>
        <span class="qa-btn-text">Raise Bug / QA Desk</span>
        @if (activeRecording()) {
          <span class="qa-rec-pulse" title="Recording screen">REC</span>
        }
      </button>
    </div>

    <!-- Modal Backdrop & Drawer -->
    @if (isOpen()) {
      <div class="qa-modal-backdrop" (click)="closeOnBackdrop($event)">
        <div class="qa-modal-container animated-scale-up" (click)="$event.stopPropagation()">
          
          <!-- Header -->
          <div class="qa-modal-header">
            <div class="qa-title-group">
              <span class="qa-header-icon">🐞</span>
              <div>
                <h2 class="qa-modal-title">MindBridge QA Bug Reporter</h2>
                <p class="qa-modal-subtitle">Directly registers issues into Admin QA Bug Desk & Task Bar</p>
              </div>
            </div>
            <button type="button" class="qa-close-btn" (click)="closeModal()" aria-label="Close modal">✕</button>
          </div>

          <!-- Body Form View -->
          @if (activeTab() === 'form') {
            <form (ngSubmit)="submitTicket()" class="qa-form">
              
              <!-- Quick Capture Tools Row: Video Recording & Screenshot -->
              <div class="qa-capture-section">
                <div class="qa-capture-card">
                  <div class="qa-capture-header">
                    <span class="qa-capture-label">🎥 Screen Video Recording</span>
                    @if (isRecording()) {
                      <span class="qa-rec-indicator">
                        <span class="rec-dot"></span> {{ recordTimer() }}
                      </span>
                    }
                  </div>
                  
                  @if (!isRecording() && !recordedVideoUrl()) {
                    <button 
                      type="button" 
                      class="qa-tool-btn qa-btn-video" 
                      (click)="startScreenRecording()"
                    >
                      <span class="btn-icon">🔴</span>
                      <span>Record Screen Clip</span>
                    </button>
                  } @else if (isRecording()) {
                    <button 
                      type="button" 
                      class="qa-tool-btn qa-btn-stop" 
                      (click)="stopScreenRecording()"
                    >
                      <span class="btn-icon">⏹</span>
                      <span>Stop & Attach Recording</span>
                    </button>
                  } @else if (recordedVideoUrl()) {
                    <div class="qa-media-preview-box">
                      <video [src]="recordedVideoUrl()" controls class="qa-video-player"></video>
                      <div class="qa-media-actions">
                        <span class="qa-media-tag">Video attached ({{ recordTimer() }})</span>
                        <button type="button" class="qa-remove-media-btn" (click)="removeVideo()">Remove</button>
                      </div>
                    </div>
                  }
                </div>

                <div class="qa-capture-card">
                  <div class="qa-capture-header">
                    <span class="qa-capture-label">📸 Bug Screenshot</span>
                    @if (screenshotUrl()) {
                      <span class="qa-badge-ready">Ready</span>
                    }
                  </div>

                  @if (!screenshotUrl()) {
                    <div class="qa-screenshot-actions">
                      <button 
                        type="button" 
                        class="qa-tool-btn qa-btn-screenshot" 
                        (click)="captureScreenshot()"
                      >
                        <span class="btn-icon">📷</span>
                        <span>Capture Viewport</span>
                      </button>
                      
                      <label class="qa-upload-label">
                        <span>Upload File</span>
                        <input type="file" accept="image/*" (change)="onFileSelected($event)" style="display: none;" />
                      </label>
                    </div>
                  } @else {
                    <div class="qa-media-preview-box">
                      <img [src]="screenshotUrl()" alt="Bug Screenshot Preview" class="qa-img-preview" />
                      <div class="qa-media-actions">
                        <span class="qa-media-tag">Screenshot attached</span>
                        <button type="button" class="qa-remove-media-btn" (click)="removeScreenshot()">Remove</button>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Bug Fields -->
              <div class="qa-fields-grid">
                <!-- Title -->
                <div class="qa-field full-width">
                  <label for="bug-title" class="qa-label">Bug Summary / Title <span class="required">*</span></label>
                  <input 
                    id="bug-title" 
                    type="text" 
                    [(ngModel)]="title" 
                    name="title" 
                    required 
                    placeholder="e.g. Video telehealth call disconnects when switching camera on Chrome" 
                    class="qa-input"
                  />
                </div>

                <!-- Component & Severity -->
                <div class="qa-field">
                  <label for="bug-component" class="qa-label">Feature Component</label>
                  <select id="bug-component" [(ngModel)]="component" name="component" class="qa-input">
                    <option value="Video Telehealth & Consultations">Video Telehealth & Consultations</option>
                    <option value="AI Companion & Voice Dialogue">AI Companion & Voice Dialogue</option>
                    <option value="Doctor Verification & Directory">Doctor Verification & Directory</option>
                    <option value="Patient Journal & Mood Tracker">Patient Journal & Mood Tracker</option>
                    <option value="Authentication & Login / Register">Authentication & Login / Register</option>
                    <option value="Admin Governance & App Controls">Admin Governance & App Controls</option>
                    <option value="Crisis Helplines & SOS Triage">Crisis Helplines & SOS Triage</option>
                    <option value="UI, Navigation & Styling">UI, Navigation & Styling</option>
                    <option value="Other / General">Other / General</option>
                  </select>
                </div>

                <div class="qa-field">
                  <label for="bug-severity" class="qa-label">Severity Level</label>
                  <select id="bug-severity" [(ngModel)]="severity" name="severity" class="qa-input">
                    <option value="critical">🔴 Critical / Blocker (Crash, Security, Data Loss)</option>
                    <option value="high">🟠 High (Core Feature Broken)</option>
                    <option value="medium">🟡 Medium (Functional Glitch / Inconvenience)</option>
                    <option value="low">🟢 Low (Cosmetic, Copy, Minor UI)</option>
                  </select>
                </div>

                <!-- Steps to Reproduce -->
                <div class="qa-field full-width">
                  <label for="bug-steps" class="qa-label">Steps to Reproduce</label>
                  <textarea 
                    id="bug-steps" 
                    rows="3" 
                    [(ngModel)]="stepsToReproduce" 
                    name="stepsToReproduce"
                    placeholder="1. Open page /patient/dashboard&#10;2. Click on 'Schedule Consultation'&#10;3. Select specialist and trigger call" 
                    class="qa-input qa-textarea"
                  ></textarea>
                </div>

                <!-- Expected & Actual Behavior -->
                <div class="qa-field">
                  <label for="bug-expected" class="qa-label">Expected Behavior</label>
                  <input 
                    id="bug-expected" 
                    type="text" 
                    [(ngModel)]="expectedBehavior" 
                    name="expectedBehavior" 
                    placeholder="Should connect video room smoothly" 
                    class="qa-input"
                  />
                </div>

                <div class="qa-field">
                  <label for="bug-actual" class="qa-label">Actual Behavior</label>
                  <input 
                    id="bug-actual" 
                    type="text" 
                    [(ngModel)]="actualBehavior" 
                    name="actualBehavior" 
                    placeholder="Shows reconnecting spinner and halts" 
                    class="qa-input"
                  />
                </div>

                <!-- Reporter Info -->
                <div class="qa-field">
                  <label for="bug-reporter" class="qa-label">Tester Name</label>
                  <input 
                    id="bug-reporter" 
                    type="text" 
                    [(ngModel)]="testerName" 
                    name="testerName" 
                    placeholder="e.g. Anubhab Nandi (QA)" 
                    class="qa-input"
                  />
                </div>

                <div class="qa-field">
                  <label for="bug-email" class="qa-label">Notification Email (For fix alerts)</label>
                  <input 
                    id="bug-email" 
                    type="email" 
                    [(ngModel)]="testerEmail" 
                    name="testerEmail" 
                    placeholder="anubhabnandi12@gmail.com" 
                    class="qa-input"
                  />
                </div>
              </div>

              <!-- Footer Actions -->
              <div class="qa-modal-footer">
                <div class="qa-meta-note">
                  <span>Target: <strong>Live Admin QA Bug Desk & Task Bar</strong></span>
                </div>
                
                <div class="qa-btn-group">
                  <button type="button" class="qa-btn-secondary" (click)="closeModal()">Cancel</button>
                  <button 
                    type="submit" 
                    class="qa-btn-primary" 
                    [disabled]="!title.trim() || isSubmitting()"
                  >
                    @if (isSubmitting()) {
                      <span>Registering Ticket...</span>
                    } @else {
                      <span>Submit Bug to QA Desk 🚀</span>
                    }
                  </button>
                </div>
              </div>
            </form>
          } @else {
            <!-- Success Screen -->
            <div class="qa-success-card">
              <div class="qa-success-icon-wrap">
                <span class="qa-success-icon">✅</span>
              </div>
              <h3 class="qa-success-title">Bug Ticket Successfully Registered!</h3>
              <p class="qa-success-sub">
                Your ticket has been assigned a unique ID and placed on the <strong>Admin QA Task Bar</strong>.
              </p>
              
              <div class="qa-ticket-pill-box">
                <span class="qa-ticket-id-badge">{{ successTicketId() }}</span>
                <span class="qa-status-tag">Status: Open / Backlog</span>
              </div>

              <p class="qa-success-hint">
                When an engineer updates this ticket to <strong>Fixed</strong> or <strong>Can't Fix</strong>, an automated retest notification will be dispatched to <strong>{{ testerEmail }}</strong> from <em>anubhabnandi12@gmail.com</em>.
              </p>

              <div class="qa-success-actions">
                <button type="button" class="qa-btn-secondary" (click)="resetAndReportNew()">
                  + Raise Another Ticket
                </button>
                <a 
                  href="https://anubhab12-bot.github.io/mindbridge/admin/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="qa-btn-primary qa-admin-link"
                >
                  Open Admin QA Bug Desk ↗
                </a>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .mb-qa-floating-trigger {
      position: fixed;
      bottom: 24px;
      left: 24px;
      right: auto;
      z-index: 999999;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }

    .qa-trigger-btn {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 11px 20px;
      border-radius: 9999px;
      background: linear-gradient(135deg, #0d9488 0%, #0f172a 60%, #4338ca 100%);
      color: #5eead4;
      border: 1.5px solid rgba(45, 212, 191, 0.6);
      box-shadow: 0 12px 30px -5px rgba(0, 0, 0, 0.6), 0 0 20px rgba(45, 212, 191, 0.35);
      font-family: inherit;
      font-size: 0.88rem;
      font-weight: 800;
      letter-spacing: -0.2px;
      cursor: pointer;
      backdrop-filter: blur(12px);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .qa-trigger-btn:hover {
      transform: translateY(-3px) scale(1.04);
      background: linear-gradient(135deg, #14b8a6 0%, #1e1b4b 60%, #4f46e5 100%);
      border-color: #2dd4bf;
      box-shadow: 0 18px 36px -5px rgba(0, 0, 0, 0.7), 0 0 26px rgba(45, 212, 191, 0.5);
      color: #ffffff;
    }

    .qa-badge-icon {
      font-size: 1.1rem;
    }

    .qa-rec-pulse {
      background: #ef4444;
      color: white;
      font-size: 0.65rem;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      animation: pulseRec 1s infinite alternate;
    }

    @keyframes pulseRec {
      0% { opacity: 0.6; transform: scale(0.95); }
      100% { opacity: 1; transform: scale(1.05); }
    }

    /* Modal Styles */
    .qa-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.8);
      backdrop-filter: blur(10px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      overflow-y: auto;
    }

    .qa-modal-container {
      background: #090d16;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      width: 100%;
      max-width: 680px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.15);
      color: #f8fafc;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
    }

    .qa-modal-header {
      padding: 18px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(15, 23, 42, 0.6);
    }

    .qa-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .qa-header-icon {
      font-size: 1.7rem;
    }

    .qa-modal-title {
      font-size: 1.15rem;
      font-weight: 800;
      margin: 0;
      color: #ffffff;
      letter-spacing: -0.3px;
    }

    .qa-modal-subtitle {
      font-size: 0.76rem;
      color: #94a3b8;
      margin: 2px 0 0;
    }

    .qa-close-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      font-size: 1.1rem;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }

    .qa-close-btn:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.4);
    }

    .qa-form {
      padding: 20px 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Capture Tools Grid */
    .qa-capture-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: rgba(15, 23, 42, 0.4);
      padding: 14px;
      border-radius: 14px;
      border: 1px dashed rgba(255, 255, 255, 0.12);
    }

    @media (max-width: 600px) {
      .qa-capture-section {
        grid-template-columns: 1fr;
      }
    }

    .qa-capture-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .qa-capture-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .qa-capture-label {
      font-size: 0.78rem;
      font-weight: 700;
      color: #cbd5e1;
    }

    .qa-rec-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-family: monospace;
      font-weight: 700;
      color: #ef4444;
    }

    .rec-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      animation: pulseRec 0.8s infinite alternate;
    }

    .qa-badge-ready {
      font-size: 0.65rem;
      font-weight: 800;
      color: #10b981;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 1px 6px;
      border-radius: 4px;
    }

    .qa-tool-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: #1e293b;
      color: #f1f5f9;
      transition: all 0.15s;
    }

    .qa-btn-video:hover {
      background: #dc2626;
      border-color: #ef4444;
      color: white;
    }

    .qa-btn-stop {
      background: #b91c1c;
      color: white;
      border-color: #ef4444;
      animation: pulseRec 1s infinite alternate;
    }

    .qa-screenshot-actions {
      display: flex;
      gap: 6px;
    }

    .qa-btn-screenshot {
      flex: 1;
    }

    .qa-btn-screenshot:hover {
      background: #0284c7;
      border-color: #38bdf8;
      color: white;
    }

    .qa-upload-label {
      padding: 8px 12px;
      border-radius: 10px;
      font-size: 0.78rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }

    .qa-upload-label:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #f8fafc;
    }

    .qa-media-preview-box {
      border-radius: 10px;
      overflow: hidden;
      background: #020617;
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
    }

    .qa-video-player {
      width: 100%;
      max-height: 140px;
      background: #000;
    }

    .qa-img-preview {
      width: 100%;
      max-height: 130px;
      object-fit: cover;
    }

    .qa-media-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      background: rgba(15, 23, 42, 0.8);
    }

    .qa-media-tag {
      font-size: 0.7rem;
      color: #10b981;
      font-weight: 600;
    }

    .qa-remove-media-btn {
      background: none;
      border: none;
      color: #f43f5e;
      font-size: 0.7rem;
      font-weight: 700;
      cursor: pointer;
      padding: 0;
    }

    .qa-remove-media-btn:hover {
      text-decoration: underline;
    }

    /* Form Fields Grid */
    .qa-fields-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    @media (max-width: 600px) {
      .qa-fields-grid {
        grid-template-columns: 1fr;
      }
    }

    .qa-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .qa-field.full-width {
      grid-column: 1 / -1;
    }

    .qa-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #94a3b8;
    }

    .qa-label .required {
      color: #f43f5e;
    }

    .qa-input {
      background: #020617;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 8px 12px;
      font-size: 0.82rem;
      color: #f8fafc;
      font-family: inherit;
      outline: none;
      transition: border-color 0.15s;
    }

    .qa-input:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    }

    .qa-textarea {
      resize: vertical;
      min-height: 60px;
      line-height: 1.4;
    }

    /* Footer */
    .qa-modal-footer {
      padding-top: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .qa-meta-note {
      font-size: 0.72rem;
      color: #64748b;
    }

    .qa-meta-note strong {
      color: #38bdf8;
    }

    .qa-btn-group {
      display: flex;
      gap: 8px;
    }

    .qa-btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #cbd5e1;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .qa-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
      color: white;
    }

    .qa-btn-primary {
      background: linear-gradient(135deg, #0284c7 0%, #0d9488 100%);
      border: none;
      color: white;
      padding: 8px 20px;
      border-radius: 10px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
      transition: all 0.15s;
    }

    .qa-btn-primary:hover:not(:disabled) {
      filter: brightness(1.1);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(2, 132, 199, 0.4);
    }

    .qa-btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Success Screen */
    .qa-success-card {
      padding: 36px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .qa-success-icon-wrap {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.8rem;
    }

    .qa-success-title {
      font-size: 1.3rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
    }

    .qa-success-sub {
      font-size: 0.85rem;
      color: #94a3b8;
      max-width: 440px;
      margin: 0;
    }

    .qa-ticket-pill-box {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      margin: 8px 0;
    }

    .qa-ticket-id-badge {
      font-family: monospace;
      font-size: 1.1rem;
      font-weight: 800;
      color: #38bdf8;
    }

    .qa-status-tag {
      font-size: 0.72rem;
      font-weight: 700;
      color: #fbbf24;
      background: rgba(251, 191, 36, 0.15);
      border: 1px solid rgba(251, 191, 36, 0.3);
      padding: 2px 8px;
      border-radius: 6px;
    }

    .qa-success-hint {
      font-size: 0.76rem;
      color: #64748b;
      max-width: 460px;
      line-height: 1.5;
    }

    .qa-success-actions {
      display: flex;
      gap: 10px;
      margin-top: 12px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .qa-admin-link {
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .animated-scale-up {
      animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QaBugReporterComponent implements OnInit, OnDestroy {
  // Modal & Widget Visibility
  protected readonly isOpen = signal<boolean>(false);
  protected readonly isWidgetVisible = signal<boolean>(true);
  protected readonly activeTab = signal<'form' | 'success'>('form');

  // Media Capture Signals
  protected readonly isRecording = signal<boolean>(false);
  protected readonly activeRecording = signal<boolean>(false);
  protected readonly recordTimer = signal<string>('00:00');
  protected readonly recordedVideoUrl = signal<string | null>(null);
  protected readonly screenshotUrl = signal<string | null>(null);

  // Form Submission Signals
  protected readonly isSubmitting = signal<boolean>(false);
  protected readonly successTicketId = signal<string | null>(null);

  // Form Fields
  title = '';
  component = 'Video Telehealth & Consultations';
  severity = 'high';
  stepsToReproduce = '1. Open app\n2. Perform test workflow\n3. Observe error';
  expectedBehavior = 'Feature should work smoothly with zero errors';
  actualBehavior = 'Encountered unexpected behavior during QA review';
  testerName = 'Anubhab Nandi (QA)';
  testerEmail = 'anubhabnandi12@gmail.com';

  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private timerInterval: any = null;
  private recordSeconds = 0;
  private keydownListener: any = null;
  private customOpenListener: any = null;

  ngOnInit() {
    // Open immediately if ?qa=true is in the query params
    if (typeof window !== 'undefined') {
      const qp = new URLSearchParams(window.location.search);
      if (qp.get('qa') === 'true') {
        this.openModal();
      }

      this.customOpenListener = () => this.openModal();
      window.addEventListener('open_mb_qa_bug_reporter', this.customOpenListener);

      // Keyboard Shortcut: Ctrl + Shift + B (or Cmd + Shift + B)
      this.keydownListener = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'B' || e.key === 'b')) {
          e.preventDefault();
          this.isOpen() ? this.closeModal() : this.openModal();
        }
      };
      window.addEventListener('keydown', this.keydownListener);
    }
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined') {
      if (this.keydownListener) window.removeEventListener('keydown', this.keydownListener);
      if (this.customOpenListener) window.removeEventListener('open_mb_qa_bug_reporter', this.customOpenListener);
    }
    this.stopTimer();
  }

  openModal() {
    this.isOpen.set(true);
    this.activeTab.set('form');
  }

  closeModal() {
    if (this.isRecording()) {
      this.stopScreenRecording();
    }
    this.isOpen.set(false);
  }

  closeOnBackdrop(e: MouseEvent) {
    this.closeModal();
  }

  // --- Video Recording Methods ---
  async startScreenRecording() {
    if (typeof window === 'undefined') return;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('Screen video recording is not supported in this browser. Please attach a screenshot instead.');
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: false,
      });

      this.recordedChunks = [];
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
      } catch {
        recorder = new MediaRecorder(stream);
      }
      this.mediaRecorder = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          this.recordedVideoUrl.set(reader.result as string);
        };
        reader.readAsDataURL(blob);
        this.stopTimer();
      };

      recorder.start(1000);
      this.isRecording.set(true);
      this.activeRecording.set(true);
      this.startTimer();

      // If user stops sharing via browser chrome bar
      stream.getVideoTracks()[0].onended = () => {
        if (this.isRecording()) {
          this.stopScreenRecording();
        }
      };
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.error('Failed to start screen recording:', err);
      }
    }
  }

  stopScreenRecording() {
    if (this.mediaRecorder && this.isRecording()) {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
      this.activeRecording.set(false);
    }
  }

  removeVideo() {
    this.recordedVideoUrl.set(null);
    this.recordTimer.set('00:00');
  }

  private startTimer() {
    this.recordSeconds = 0;
    this.recordTimer.set('00:00');
    this.timerInterval = setInterval(() => {
      this.recordSeconds++;
      const mins = Math.floor(this.recordSeconds / 60).toString().padStart(2, '0');
      const secs = (this.recordSeconds % 60).toString().padStart(2, '0');
      this.recordTimer.set(`${mins}:${secs}`);
      if (this.recordSeconds >= 60) {
        this.stopScreenRecording();
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // --- Screenshot Methods ---
  async captureScreenshot() {
    if (typeof window === 'undefined') return;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('Screen capture not supported in this browser. Please upload an image file.');
        return;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
      });
      const track = stream.getVideoTracks()[0];
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || window.innerWidth;
      canvas.height = video.videoHeight || window.innerHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      this.screenshotUrl.set(canvas.toDataURL('image/png'));
      track.stop();
    } catch {
      // User cancelled
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        this.screenshotUrl.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeScreenshot() {
    this.screenshotUrl.set(null);
  }

  // --- Submission to Admin QA Bug Desk ---
  async submitTicket() {
    if (!this.title.trim()) return;
    this.isSubmitting.set(true);

    const newId = 'MB-BUG-' + Math.floor(100 + Math.random() * 900);
    const ticketPayload = {
      id: newId,
      title: this.title.trim(),
      component: this.component,
      severity: this.severity,
      status: 'open',
      device: `${navigator.userAgent.includes('Windows') ? 'Windows 11' : 'Mobile/Web'} · ${window.innerWidth}x${window.innerHeight}`,
      stepsToReproduce: this.stepsToReproduce,
      expectedBehavior: this.expectedBehavior,
      actualBehavior: this.actualBehavior,
      reportedBy: this.testerName,
      testerEmail: this.testerEmail,
      screenshotData: this.screenshotUrl(),
      videoData: this.recordedVideoUrl(),
      videoDuration: this.recordTimer() !== '00:00' ? this.recordTimer() : null,
      createdAt: new Date().toISOString(),
    };

    // 1. Post directly to live backend MongoDB
    try {
      await fetch(apiUrl('/governance/bugs'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketPayload),
      });
    } catch (err) {
      console.warn('API bug submission fallback:', err);
    }

    // 2. Sync to localStorage for instant cross-tab update in Admin QA Desk
    try {
      const storageKey = 'mindbridge_live_admin_v3_bugTickets';
      const existingStr = localStorage.getItem(storageKey);
      const existing = existingStr ? JSON.parse(existingStr) : [];
      localStorage.setItem(storageKey, JSON.stringify([ticketPayload, ...existing]));
      window.dispatchEvent(new CustomEvent('mindbridge_bug_created', { detail: ticketPayload }));
    } catch {}

    this.successTicketId.set(newId);
    this.activeTab.set('success');
    this.isSubmitting.set(false);
  }

  resetAndReportNew() {
    this.title = '';
    this.removeVideo();
    this.removeScreenshot();
    this.activeTab.set('form');
  }
}
