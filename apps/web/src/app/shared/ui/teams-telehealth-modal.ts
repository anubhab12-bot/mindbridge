import {
  Component,
  inject,
  signal,
  computed,
  effect,
  ElementRef,
  viewChild,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TelehealthService, DoctorDutyInfo } from '../../core/services/telehealth.service';

@Component({
  selector: 'mb-teams-telehealth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- 1. LAUNCHER MODAL: "TALK TO A PROFESSIONAL RIGHT NOW" -->
    @if (telehealth.launcherOpen()) {
      <div class="telehealth-backdrop" (click)="telehealth.closeLauncher()">
        <div class="launcher-card" (click)="$event.stopPropagation()">
          <div class="launcher-header">
            <div class="launcher-title-wrap">
              <span class="pulse-live-badge">🟢 3 SPECIALISTS ON DUTY</span>
              <h2>Talk to a Verified Professional Right Now</h2>
              <p>Instant, confidential clinical consultation via Video or Chat. No appointment required.</p>
            </div>
            <button class="btn-close" (click)="telehealth.closeLauncher()" aria-label="Close modal">×</button>
          </div>

          <!-- Doctor Selection List -->
          <div class="doctors-list">
            @for (doc of telehealth.onDutyDoctors(); track doc.id) {
              <div
                class="doctor-option"
                [class.selected]="selectedDoctorId() === doc.id"
                (click)="selectedDoctorId.set(doc.id)"
              >
                <div class="doc-avatar">{{ doc.avatar }}</div>
                <div class="doc-info">
                  <div class="doc-name-row">
                    <strong>{{ doc.name }}</strong>
                    <span class="online-tag">Online Now</span>
                  </div>
                  <div class="doc-role">{{ doc.role }}</div>
                  <div class="doc-meta">
                    <span>🎓 {{ doc.qualification }}</span> ·
                    <span>⭐ {{ doc.rating }}</span> ·
                    <span>🗣️ {{ doc.languages.join(', ') }}</span>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Call Options Form -->
          <div class="call-options-wrap">
            <div class="field">
              <label for="callerName">Your Name (or remain Anonymous)</label>
              <input
                id="callerName"
                type="text"
                class="input"
                [(ngModel)]="callerName"
                placeholder="e.g. Anubhab or Guest Patient"
              />
            </div>

            <div class="action-buttons-row">
              <button
                type="button"
                class="btn-start-call video-call"
                (click)="startCall('VIDEO')"
              >
                <span class="btn-icon">📹</span>
                <span class="btn-text-wrap">
                  <strong>Start Instant Video Call</strong>
                  <small>Face-to-face HD consultation with mic & camera</small>
                </span>
              </button>

              <button
                type="button"
                class="btn-start-call chat-call"
                (click)="startCall('CHAT')"
              >
                <span class="btn-icon">💬</span>
                <span class="btn-text-wrap">
                  <strong>Start Instant Live Chat</strong>
                  <small>Direct encrypted real-time messaging</small>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- 2. MICROSOFT TEAMS INCOMING CALL TOAST (RINGING ALERT) -->
    @if (telehealth.isRinging(); as call) {
      <aside class="teams-call-toast" role="dialog" aria-label="Incoming Consultation Call">
        <div class="teams-toast-banner">
          <span class="teams-logo-pill">
            <span class="teams-icon">📞</span> Microsoft Teams Link
          </span>
          <span class="teams-live-ping">Incoming Call…</span>
        </div>

        <div class="teams-toast-body">
          <div class="teams-avatar-radar">
            <div class="radar-wave wave-1"></div>
            <div class="radar-wave wave-2"></div>
            <div class="teams-avatar">{{ telehealth.currentCall()?.doctor?.avatar || '👨‍⚕️' }}</div>
          </div>

          <div class="teams-call-meta">
            <h3 class="caller-name">{{ telehealth.currentCall()?.doctor?.name }}</h3>
            <span class="call-type">
              {{ telehealth.currentCall()?.mode === 'VIDEO' ? '📹 Incoming Video Call' : '💬 Incoming Live Chat' }}
            </span>
            <span class="call-sub">{{ telehealth.currentCall()?.doctor?.role }}</span>
            <span class="patient-tag">Calling: {{ telehealth.currentCall()?.patientName }}</span>
          </div>
        </div>

        <div class="teams-toast-actions">
          <button
            type="button"
            class="teams-btn accept-btn"
            (click)="telehealth.acceptCall()"
            title="Accept Call"
          >
            <span class="icon">{{ telehealth.currentCall()?.mode === 'VIDEO' ? '📹' : '💬' }}</span>
            <span>Accept Call</span>
          </button>

          <button
            type="button"
            class="teams-btn decline-btn"
            (click)="telehealth.declineCall()"
            title="Decline Call"
          >
            <span class="icon">✕</span>
            <span>Decline</span>
          </button>
        </div>
      </aside>
    }

    <!-- 3. FULL TELEHEALTH CONSULTATION ROOM (CONNECTED CALL) -->
    @if (telehealth.isConnected()) {
      <div class="room-backdrop">
        <div class="room-container">
          <!-- Room Header -->
          <header class="room-header">
            <div class="room-header-left">
              <span class="encrypt-badge">🔒 256-bit Encrypted Telehealth</span>
              <span class="doctor-badge">
                {{ telehealth.currentCall()?.doctor?.avatar }}
                <strong>{{ telehealth.currentCall()?.doctor?.name }}</strong>
                ({{ telehealth.currentCall()?.doctor?.role }})
              </span>
            </div>
            <div class="room-header-right">
              <div class="call-timer-badge">
                <span class="recording-dot"></span>
                <span>Session: {{ formattedTime() }}</span>
              </div>
              <button
                type="button"
                class="btn-toggle-chat"
                (click)="chatSidebarOpen.set(!chatSidebarOpen())"
              >
                💬 Chat {{ chatSidebarOpen() ? '▼' : '▲' }}
              </button>
            </div>
          </header>

          <!-- Stage Layout (Video Grid + Optional Chat Sidebar) -->
          <div class="room-stage-layout" [class.with-chat]="chatSidebarOpen()">
            <!-- Video Stage -->
            <div class="video-main-stage">
              <!-- Remote Doctor Stream View -->
              <div class="remote-doctor-box">
                <div class="doctor-feed-simulation">
                  <div class="doctor-live-halo">
                    <span class="halo-avatar">{{ telehealth.currentCall()?.doctor?.avatar }}</span>
                    <div class="audio-waves-meter">
                      <span class="wave-bar b1"></span>
                      <span class="wave-bar b2"></span>
                      <span class="wave-bar b3"></span>
                      <span class="wave-bar b4"></span>
                    </div>
                  </div>
                  <div class="doctor-feed-label">
                    <strong>{{ telehealth.currentCall()?.doctor?.name }}</strong>
                    <span>Live Video Audio Stream · AIIMS Verified Medical License</span>
                  </div>
                </div>

                <!-- Local Patient Picture-in-Picture (Webcam) -->
                <div class="local-pip-box" [class.camera-off]="!cameraOn()">
                  @if (cameraOn()) {
                    <video #localVideo autoplay playsinline muted class="pip-video-feed"></video>
                  } @else {
                    <div class="camera-off-placeholder">
                      <span>👤</span>
                      <small>Camera Off</small>
                    </div>
                  }
                  <div class="pip-overlay-tag">
                    <span>{{ telehealth.currentCall()?.patientName }} (You)</span>
                    <span class="pip-mic-status">{{ micMuted() ? '🔇' : '🎙️' }}</span>
                  </div>
                </div>
              </div>

              <!-- Bottom Floating Controls Dock -->
              <div class="room-controls-dock">
                <button
                  type="button"
                  class="dock-btn"
                  [class.active-danger]="micMuted()"
                  (click)="toggleMic()"
                  [title]="micMuted() ? 'Unmute Microphone' : 'Mute Microphone'"
                >
                  <span class="dock-icon">{{ micMuted() ? '🔇' : '🎙️' }}</span>
                  <span class="dock-label">{{ micMuted() ? 'Unmute' : 'Mute' }}</span>
                </button>

                <button
                  type="button"
                  class="dock-btn"
                  [class.active-danger]="!cameraOn()"
                  (click)="toggleCamera()"
                  [title]="cameraOn() ? 'Turn Camera Off' : 'Turn Camera On'"
                >
                  <span class="dock-icon">{{ cameraOn() ? '📹' : '🚫' }}</span>
                  <span class="dock-label">{{ cameraOn() ? 'Stop Video' : 'Start Video' }}</span>
                </button>

                <button
                  type="button"
                  class="dock-btn"
                  [class.active-highlight]="screenSharing()"
                  (click)="toggleScreenShare()"
                  title="Share Screen"
                >
                  <span class="dock-icon">🖥️</span>
                  <span class="dock-label">{{ screenSharing() ? 'Sharing' : 'Share Screen' }}</span>
                </button>

                <button
                  type="button"
                  class="dock-btn dock-btn-end"
                  (click)="telehealth.endCall()"
                  title="End Telehealth Call"
                >
                  <span class="dock-icon">🛑</span>
                  <span class="dock-label">End Session</span>
                </button>
              </div>
            </div>

            <!-- In-Call Realtime Chat Sidebar -->
            @if (chatSidebarOpen()) {
              <aside class="in-call-chat-sidebar">
                <div class="chat-sidebar-header">
                  <h4>Encrypted In-Session Chat</h4>
                  <span class="confidential-pill">Confidential</span>
                </div>

                <div class="chat-messages-scroll" #chatScroll>
                  @for (msg of telehealth.inCallMessages(); track msg.id) {
                    <div
                      class="chat-bubble-row"
                      [class.mine]="msg.sender === 'PATIENT'"
                      [class.doctor]="msg.sender === 'DOCTOR'"
                    >
                      <div class="bubble-meta">
                        <span class="bubble-sender">{{ msg.senderName }}</span>
                        <span class="bubble-time">{{ msg.time }}</span>
                      </div>
                      <div class="bubble-content">{{ msg.text }}</div>
                    </div>
                  }
                </div>

                <form class="chat-input-bar" (ngSubmit)="sendChat()">
                  <input
                    type="text"
                    class="input chat-input-field"
                    [(ngModel)]="newChatMessage"
                    name="newMsg"
                    placeholder="Type confidential message to doctor…"
                    autocomplete="off"
                  />
                  <button type="submit" class="btn btn-sm btn-primary">Send</button>
                </form>
              </aside>
            }
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    /* =====================================================================
       1. LAUNCHER MODAL STYLES
       ===================================================================== */
    .telehealth-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(8px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.2s ease-out;
    }
    .launcher-card {
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius-lg);
      box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.4);
      width: 100%;
      max-width: 640px;
      overflow: hidden;
      animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .launcher-header {
      padding: 24px 28px 16px;
      border-bottom: 1px solid var(--mb-border);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .launcher-title-wrap h2 {
      margin: 8px 0 4px;
      font-size: 1.35rem;
      font-weight: 750;
      color: var(--mb-text);
    }
    .launcher-title-wrap p {
      margin: 0;
      font-size: 0.88rem;
      color: var(--mb-text-muted);
    }
    .pulse-live-badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #059669;
      background: rgba(16, 185, 129, 0.12);
      padding: 3px 10px;
      border-radius: 999px;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .btn-close {
      background: transparent;
      border: none;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      color: var(--mb-text-muted);
      border-radius: 6px;
      padding: 4px 8px;
      &:hover { color: var(--mb-text); background: var(--mb-surface-2); }
    }

    .doctors-list {
      padding: 18px 24px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 280px;
      overflow-y: auto;
    }
    .doctor-option {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      border-radius: var(--mb-radius);
      border: 2px solid var(--mb-border);
      background: var(--mb-bg);
      cursor: pointer;
      transition: all 0.2s ease;
      &:hover {
        border-color: var(--mb-primary);
        transform: translateY(-1px);
      }
      &.selected {
        border-color: var(--mb-primary);
        background: var(--mb-primary-soft);
      }
    }
    .doc-avatar {
      font-size: 2.2rem;
      line-height: 1;
    }
    .doc-info {
      flex: 1;
    }
    .doc-name-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .doc-name-row strong {
      font-size: 0.98rem;
      color: var(--mb-text);
    }
    .online-tag {
      font-size: 0.72rem;
      font-weight: 700;
      color: #059669;
      background: rgba(16, 185, 129, 0.15);
      padding: 2px 8px;
      border-radius: 999px;
    }
    .doc-role {
      font-size: 0.84rem;
      color: var(--mb-text-muted);
      margin: 2px 0;
    }
    .doc-meta {
      font-size: 0.76rem;
      color: var(--mb-text-muted);
    }

    .call-options-wrap {
      padding: 18px 24px 24px;
      border-top: 1px solid var(--mb-border);
      background: var(--mb-surface);
    }
    .action-buttons-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-top: 16px;
    }
    .btn-start-call {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-radius: var(--mb-radius);
      border: 1px solid transparent;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
    }
    .btn-start-call.video-call {
      background: linear-gradient(135deg, #0d9488 0%, #059669 100%);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(13, 148, 136, 0.3);
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(13, 148, 136, 0.4);
      }
    }
    .btn-start-call.chat-call {
      background: var(--mb-surface-2);
      border: 1px solid var(--mb-border);
      color: var(--mb-text);
      &:hover {
        background: var(--mb-primary-soft);
        border-color: var(--mb-primary);
        color: var(--mb-primary-strong);
        transform: translateY(-2px);
      }
    }
    .btn-start-call .btn-icon {
      font-size: 1.8rem;
    }
    .btn-text-wrap {
      display: flex;
      flex-direction: column;
    }
    .btn-text-wrap strong {
      font-size: 0.95rem;
    }
    .btn-text-wrap small {
      font-size: 0.75rem;
      opacity: 0.85;
      margin-top: 2px;
    }

    /* =====================================================================
       2. MICROSOFT TEAMS INCOMING CALL ALERT (RINGING TOAST)
       ===================================================================== */
    .teams-call-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 10001;
      width: 340px;
      background: #2b2b40;
      color: #ffffff;
      border-radius: 14px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15);
      overflow: hidden;
      animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .teams-toast-banner {
      background: #464775;
      padding: 8px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .teams-logo-pill {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .teams-live-ping {
      color: #38bdf8;
      animation: blink 1s infinite alternate;
    }
    .teams-toast-body {
      padding: 18px 16px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .teams-avatar-radar {
      position: relative;
      width: 60px;
      height: 60px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .teams-avatar {
      font-size: 2.2rem;
      z-index: 2;
    }
    .radar-wave {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 2px solid #5b5fc7;
      animation: radarPulse 2s cubic-bezier(0.25, 1, 0.5, 1) infinite;
    }
    .wave-2 {
      animation-delay: 1s;
    }
    .teams-call-meta {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .caller-name {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 750;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .call-type {
      font-size: 0.8rem;
      font-weight: 700;
      color: #38bdf8;
      margin: 2px 0;
    }
    .call-sub {
      font-size: 0.75rem;
      color: #cbd5e1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .patient-tag {
      font-size: 0.72rem;
      color: #94a3b8;
      margin-top: 4px;
    }
    .teams-toast-actions {
      padding: 10px 14px 14px;
      display: flex;
      gap: 10px;
      background: #232334;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .teams-btn {
      flex: 1;
      min-height: 40px;
      border: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.15s ease;
    }
    .accept-btn {
      background: #10b981;
      color: #ffffff;
      &:hover { background: #059669; transform: scale(1.02); }
    }
    .decline-btn {
      background: #e11d48;
      color: #ffffff;
      &:hover { background: #be123c; transform: scale(1.02); }
    }

    /* =====================================================================
       3. TELEHEALTH CONSULTATION SUITE (CONNECTED CALL)
       ===================================================================== */
    .room-backdrop {
      position: fixed;
      inset: 0;
      background: #090d16;
      z-index: 10002;
      display: flex;
      flex-direction: column;
      animation: fadeIn 0.2s ease-out;
    }
    .room-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
    }
    .room-header {
      background: #111827;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      color: #ffffff;
    }
    .room-header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .encrypt-badge {
      font-size: 0.75rem;
      font-weight: 750;
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      padding: 3px 10px;
      border-radius: 999px;
      border: 1px solid rgba(16, 185, 129, 0.35);
    }
    .doctor-badge {
      font-size: 0.88rem;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .room-header-right {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .call-timer-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      font-weight: 700;
      color: #f8fafc;
      background: #1f2937;
      padding: 4px 12px;
      border-radius: 999px;
    }
    .recording-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      animation: blink 1s infinite alternate;
    }
    .btn-toggle-chat {
      background: #374151;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #f8fafc;
      font-size: 0.82rem;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 8px;
      cursor: pointer;
      &:hover { background: #4b5563; }
    }

    .room-stage-layout {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr;
      position: relative;
      overflow: hidden;
      &.with-chat {
        grid-template-columns: 1fr 340px;
      }
    }
    .video-main-stage {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #0b0f19;
    }
    .remote-doctor-box {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
    }
    .doctor-feed-simulation {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
      text-align: center;
    }
    .doctor-live-halo {
      position: relative;
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: radial-gradient(circle, #0284c7 0%, #0369a1 100%);
      box-shadow: 0 0 50px rgba(14, 165, 233, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .halo-avatar {
      font-size: 4.5rem;
    }
    .audio-waves-meter {
      position: absolute;
      bottom: -10px;
      display: flex;
      gap: 4px;
      align-items: flex-end;
      height: 24px;
    }
    .wave-bar {
      width: 5px;
      background: #38bdf8;
      border-radius: 999px;
      animation: waveDance 1.2s ease-in-out infinite alternate;
    }
    .b1 { height: 12px; animation-delay: 0.1s; }
    .b2 { height: 22px; animation-delay: 0.3s; }
    .b3 { height: 18px; animation-delay: 0.2s; }
    .b4 { height: 14px; animation-delay: 0.4s; }

    .doctor-feed-label {
      display: flex;
      flex-direction: column;
      color: #f8fafc;
    }
    .doctor-feed-label strong {
      font-size: 1.3rem;
    }
    .doctor-feed-label span {
      font-size: 0.85rem;
      color: #94a3b8;
    }

    /* Picture-In-Picture Webcam */
    .local-pip-box {
      position: absolute;
      bottom: 90px;
      right: 24px;
      width: 220px;
      height: 140px;
      border-radius: 12px;
      overflow: hidden;
      background: #1e293b;
      border: 2px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      z-index: 10;
    }
    .pip-video-feed {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1);
    }
    .camera-off-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 1.5rem;
    }
    .pip-overlay-tag {
      position: absolute;
      bottom: 6px;
      left: 8px;
      right: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.72rem;
      color: #ffffff;
      background: rgba(0, 0, 0, 0.6);
      padding: 2px 8px;
      border-radius: 4px;
    }

    /* Controls Dock (Teams Floating Pill) */
    .room-controls-dock {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 12px;
      background: rgba(30, 41, 59, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 8px 16px;
      border-radius: 999px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      z-index: 20;
    }
    .dock-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      background: transparent;
      border: none;
      color: #f8fafc;
      padding: 6px 14px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      &.active-danger {
        color: #f87171;
      }
      &.active-highlight {
        color: #38bdf8;
      }
    }
    .dock-btn-end {
      background: #dc2626 !important;
      color: #ffffff !important;
      border-radius: 999px;
      padding: 6px 18px;
      &:hover {
        background: #b91c1c !important;
      }
    }
    .dock-icon {
      font-size: 1.25rem;
      line-height: 1;
    }
    .dock-label {
      font-size: 0.7rem;
      font-weight: 700;
      white-space: nowrap;
    }

    /* In-Call Chat Sidebar */
    .in-call-chat-sidebar {
      background: #111827;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .chat-sidebar-header {
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #f8fafc;
      h4 { margin: 0; font-size: 0.95rem; }
    }
    .confidential-pill {
      font-size: 0.68rem;
      font-weight: 800;
      color: #34d399;
      background: rgba(16, 185, 129, 0.15);
      padding: 2px 8px;
      border-radius: 999px;
    }
    .chat-messages-scroll {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .chat-bubble-row {
      display: flex;
      flex-direction: column;
      max-width: 85%;
      &.mine {
        align-self: flex-end;
        .bubble-content {
          background: #0284c7;
          color: #ffffff;
          border-radius: 12px 12px 2px 12px;
        }
      }
      &.doctor {
        align-self: flex-start;
        .bubble-content {
          background: #1f2937;
          color: #f8fafc;
          border-radius: 12px 12px 12px 2px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      }
    }
    .bubble-meta {
      display: flex;
      gap: 8px;
      font-size: 0.7rem;
      color: #94a3b8;
      margin-bottom: 2px;
      padding: 0 4px;
    }
    .bubble-content {
      padding: 8px 14px;
      font-size: 0.88rem;
      line-height: 1.4;
    }
    .chat-input-bar {
      padding: 12px 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      gap: 8px;
      background: #0f172a;
    }
    .chat-input-field {
      flex: 1;
      background: #1f2937;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      min-height: 38px;
      font-size: 0.85rem;
      &:focus { border-color: #38bdf8; }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes slideInRight {
      from { transform: translateX(110%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes radarPulse {
      0% { transform: scale(0.8); opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    @keyframes blink {
      0% { opacity: 0.4; }
      100% { opacity: 1; }
    }
    @keyframes waveDance {
      0% { transform: scaleY(0.3); }
      100% { transform: scaleY(1.3); }
    }
  `,
})
export class TeamsTelehealthModalComponent implements OnDestroy {
  protected readonly telehealth = inject(TelehealthService);

  // View video element for local stream
  readonly localVideoRef = viewChild<ElementRef<HTMLVideoElement>>('localVideo');

  protected callerName = '';
  protected selectedDoctorId = signal('doc-aarav');
  protected chatSidebarOpen = signal(true);
  protected newChatMessage = '';

  // Local media tracks state
  protected cameraOn = signal(true);
  protected micMuted = signal(false);
  protected screenSharing = signal(false);

  private localMediaStream: MediaStream | null = null;
  private callTimerInterval: any = null;
  protected elapsedSeconds = signal(0);

  protected formattedTime = computed(() => {
    const s = this.elapsedSeconds();
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  constructor() {
    // When call connects, initialize media & timer
    effect(() => {
      const isConn = this.telehealth.isConnected();
      if (isConn) {
        this.elapsedSeconds.set(0);
        this.startCallTimer();
        this.setupLocalCamera();
      } else {
        this.stopCallTimer();
        this.cleanupLocalMedia();
      }
    });
  }

  startCall(mode: 'VIDEO' | 'CHAT') {
    this.telehealth.initiateCall(
      mode,
      this.selectedDoctorId(),
      this.callerName || 'Patient (Guest)',
      'Standard',
    );
  }

  private startCallTimer() {
    this.stopCallTimer();
    this.callTimerInterval = setInterval(() => {
      this.elapsedSeconds.update((s) => s + 1);
    }, 1000);
  }

  private stopCallTimer() {
    if (this.callTimerInterval) {
      clearInterval(this.callTimerInterval);
      this.callTimerInterval = null;
    }
  }

  private async setupLocalCamera() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

    try {
      this.localMediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      const videoEl = this.localVideoRef()?.nativeElement;
      if (videoEl && this.localMediaStream) {
        videoEl.srcObject = this.localMediaStream;
      }
    } catch {
      // Permission denied or simulated environment
      this.cameraOn.set(false);
    }
  }

  toggleCamera() {
    this.cameraOn.set(!this.cameraOn());
    if (this.localMediaStream) {
      this.localMediaStream.getVideoTracks().forEach((t) => {
        t.enabled = this.cameraOn();
      });
    }
  }

  toggleMic() {
    this.micMuted.set(!this.micMuted());
    if (this.localMediaStream) {
      this.localMediaStream.getAudioTracks().forEach((t) => {
        t.enabled = !this.micMuted();
      });
    }
  }

  async toggleScreenShare() {
    if (this.screenSharing()) {
      this.screenSharing.set(false);
      this.setupLocalCamera();
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getDisplayMedia) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        this.screenSharing.set(true);
        const videoEl = this.localVideoRef()?.nativeElement;
        if (videoEl) {
          videoEl.srcObject = screenStream;
        }
        screenStream.getVideoTracks()[0].onended = () => {
          this.screenSharing.set(false);
          this.setupLocalCamera();
        };
      } catch {
        this.screenSharing.set(false);
      }
    }
  }

  sendChat() {
    if (!this.newChatMessage.trim()) return;
    this.telehealth.sendChatMessage(this.newChatMessage, this.callerName || 'Patient');
    this.newChatMessage = '';
  }

  private cleanupLocalMedia() {
    if (this.localMediaStream) {
      this.localMediaStream.getTracks().forEach((t) => t.stop());
      this.localMediaStream = null;
    }
  }

  ngOnDestroy() {
    this.stopCallTimer();
    this.cleanupLocalMedia();
  }
}
