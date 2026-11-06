import {
  Component,
  inject,
  signal,
  computed,
  ElementRef,
  viewChild,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

export interface RoomMessage {
  id: string;
  senderName: string;
  senderRole: 'PATIENT' | 'DOCTOR';
  text: string;
  time: string;
}

@Component({
  selector: 'mb-video-room',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="video-room-container">
      <!-- Top Clinical Room Bar -->
      <header class="room-topbar">
        <div class="topbar-left">
          <div class="brand-chip">
            <span class="live-dot"></span>
            <strong>MindBridge Telehealth</strong>
          </div>
          <div class="participants-chip">
            <span class="role-badge">Doctor</span>
            <span>{{ doctorName() }}</span>
            <span class="divider">⟷</span>
            <span class="role-badge patient">Patient</span>
            <span>{{ patientName() }}</span>
          </div>
        </div>

        <div class="topbar-right">
          <div class="session-timer">
            <span class="rec-indicator"></span>
            <span>{{ sessionTime() }}</span>
          </div>
          <button
            type="button"
            class="topbar-action-btn"
            [class.active]="chatOpen()"
            (click)="chatOpen.set(!chatOpen())"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Chat</span>
          </button>
        </div>
      </header>

      <!-- Main Stage Area -->
      <div class="room-stage" [class.chat-visible]="chatOpen()">
        <!-- Video Grid -->
        <div class="video-grid">
          <!-- Remote Doctor View -->
          <div class="video-cell doctor-cell">
            <div class="cell-halo">
              <div class="doc-avatar-initials">MD</div>
              <div class="sound-wave-bars">
                <span class="bar b1"></span>
                <span class="bar b2"></span>
                <span class="bar b3"></span>
                <span class="bar b4"></span>
              </div>
            </div>
            <div class="cell-overlay-name">
              <strong>{{ doctorName() }}</strong>
              <span class="sub-label">Live Video & Audio Feed · Clinical Consultation</span>
            </div>
          </div>

          <!-- Local Participant / Webcam View -->
          <div class="video-cell local-cell" [class.camera-disabled]="!videoOn()">
            @if (videoOn()) {
              <video #localVideo autoplay playsinline muted class="camera-feed"></video>
            } @else {
              <div class="camera-off-state">
                <div class="off-avatar">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/>
                  </svg>
                </div>
                <strong>Camera Off</strong>
                <small>Video is disabled</small>
              </div>
            }
            <div class="cell-overlay-name">
              <strong>{{ patientName() }} (You)</strong>
              <span class="mic-status-chip">
                @if (audioOn()) {
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 3px;">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="23"/><line x1="8" x2="16" y1="23" y2="23"/>
                  </svg>
                  <span>Mic Active</span>
                } @else {
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 3px;">
                    <line x1="1" x2="23" y1="1" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" x2="12" y1="19" y2="23"/><line x1="8" x2="16" y1="23" y2="23"/>
                  </svg>
                  <span>Muted</span>
                }
              </span>
            </div>
          </div>
        </div>

        <!-- Chat Sidebar -->
        @if (chatOpen()) {
          <aside class="in-call-chat-sidebar">
            <div class="chat-header">
              <h3>Consultation Notes & Chat</h3>
              <button type="button" class="close-chat" (click)="chatOpen.set(false)">✕</button>
            </div>
            <div class="chat-messages-area">
              <div class="system-bubble">
                End-to-end encrypted medical discussion. Messages in this room are confidential under the DPDP Act.
              </div>
              @for (msg of messages(); track msg.id) {
                <div class="chat-row" [class.mine]="msg.senderRole === myRole()">
                  <div class="chat-meta">
                    <strong>{{ msg.senderName }}</strong>
                    <small>{{ msg.time }}</small>
                  </div>
                  <div class="chat-bubble">{{ msg.text }}</div>
                </div>
              }
            </div>
            <form (submit)="sendMessage($event)" class="chat-input-bar">
              <input
                type="text"
                class="input"
                [(ngModel)]="draftText"
                name="chatText"
                placeholder="Type a clinical note or message…"
              />
              <button type="submit" class="btn btn-primary btn-sm" [disabled]="!draftText.trim()">Send</button>
            </form>
          </aside>
        }
      </div>

      <!-- Bottom Floating Controls Dock -->
      <footer class="room-dock">
        <div class="dock-controls">
          <!-- Video On/Off Option -->
          <button
            type="button"
            class="dock-button"
            [class.danger-btn]="!videoOn()"
            (click)="toggleVideo()"
            [title]="videoOn() ? 'Turn Camera Off' : 'Turn Camera On'"
          >
            <span class="dock-btn-icon">
              @if (videoOn()) {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11"/><rect width="14" height="12" x="2" y="6" rx="2"/>
                </svg>
              } @else {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="2" x2="22" y1="2" y2="22"/><path d="M10.41 10.41a2 2 0 1 0 2.83 2.83"/><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11"/><rect width="14" height="12" x="2" y="6" rx="2"/>
                </svg>
              }
            </span>
            <span class="dock-btn-text">{{ videoOn() ? 'Video On' : 'Video Off' }}</span>
          </button>

          <!-- Microphone On/Off Option -->
          <button
            type="button"
            class="dock-button"
            [class.danger-btn]="!audioOn()"
            (click)="toggleAudio()"
            [title]="audioOn() ? 'Mute Microphone' : 'Unmute Microphone'"
          >
            <span class="dock-btn-icon">
              @if (audioOn()) {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="23"/><line x1="8" x2="16" y1="23" y2="23"/>
                </svg>
              } @else {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="1" x2="23" y1="1" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" x2="12" y1="19" y2="23"/><line x1="8" x2="16" y1="23" y2="23"/>
                </svg>
              }
            </span>
            <span class="dock-btn-text">{{ audioOn() ? 'Mic On' : 'Muted' }}</span>
          </button>

          <!-- Screen Share Option -->
          <button
            type="button"
            class="dock-button"
            [class.highlight-btn]="screenSharing()"
            (click)="toggleScreenShare()"
            title="Share Screen"
          >
            <span class="dock-btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>
              </svg>
            </span>
            <span class="dock-btn-text">{{ screenSharing() ? 'Stop Share' : 'Share Screen' }}</span>
          </button>

          <!-- In-Call Chat Button -->
          <button
            type="button"
            class="dock-button"
            [class.active-btn]="chatOpen()"
            (click)="chatOpen.set(!chatOpen())"
            title="Toggle In-Call Chat"
          >
            <span class="dock-btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </span>
            <span class="dock-btn-text">Chat</span>
          </button>

          <!-- Leave / End Call -->
          <button
            type="button"
            class="dock-button leave-call-btn"
            (click)="leaveCall()"
            title="Leave Video Call"
          >
            <span class="dock-btn-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="2" x2="22" y1="2" y2="22"/>
              </svg>
            </span>
            <span class="dock-btn-text">End Session</span>
          </button>
        </div>
      </footer>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .video-room-container {
      position: fixed;
      inset: 0;
      background: #0f172a;
      color: #f8fafc;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .room-topbar {
      height: 60px;
      padding: 0 20px;
      background: rgba(15, 23, 42, 0.95);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .topbar-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.95rem;
      color: #38bdf8;
    }
    .live-dot {
      width: 10px;
      height: 10px;
      background: #22c55e;
      border-radius: 50%;
      box-shadow: 0 0 10px #22c55e;
      animation: pulse 1.5s infinite;
    }
    .participants-chip {
      background: rgba(255, 255, 255, 0.08);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .role-badge {
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 7px;
      border-radius: 4px;
      background: rgba(14, 165, 233, 0.2);
      color: #38bdf8;
      &.patient {
        background: rgba(16, 185, 129, 0.2);
        color: #34d399;
      }
    }
    .divider {
      color: #64748b;
    }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .session-timer {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .rec-indicator {
      width: 8px;
      height: 8px;
      background: #ef4444;
      border-radius: 50%;
      animation: pulse 1s infinite;
    }
    .topbar-action-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #f8fafc;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      cursor: pointer;
      &.active {
        background: #0284c7;
        border-color: #38bdf8;
      }
    }
    .room-stage {
      flex: 1;
      display: flex;
      position: relative;
      overflow: hidden;
      padding: 16px;
      gap: 16px;
    }
    .video-grid {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      height: 100%;
    }
    @media (max-width: 768px) {
      .video-grid {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr 1fr;
      }
    }
    .video-cell {
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    }
    .cell-halo {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .doc-avatar-initials {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0284c7, #0f766e);
      color: #ffffff;
      font-size: 2rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 25px rgba(2, 132, 199, 0.4);
    }
    .sound-wave-bars {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      height: 24px;
    }
    .bar {
      width: 4px;
      background: #38bdf8;
      border-radius: 4px;
      animation: wave 1.2s infinite ease-in-out;
    }
    .b1 { height: 12px; animation-delay: 0.1s; }
    .b2 { height: 22px; animation-delay: 0.3s; }
    .b3 { height: 16px; animation-delay: 0.2s; }
    .b4 { height: 10px; animation-delay: 0.4s; }
    @keyframes wave {
      0%, 100% { transform: scaleY(0.4); }
      50% { transform: scaleY(1); }
    }
    .camera-feed {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scaleX(-1);
    }
    .camera-off-state {
      text-align: center;
      color: #94a3b8;
    }
    .off-avatar {
      font-size: 64px;
      margin-bottom: 8px;
    }
    .cell-overlay-name {
      position: absolute;
      bottom: 14px;
      left: 14px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      padding: 6px 14px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 0.85rem;
    }
    .sub-label {
      font-size: 0.72rem;
      color: #94a3b8;
    }
    .mic-status-chip {
      font-size: 0.75rem;
      color: #38bdf8;
    }
    .in-call-chat-sidebar {
      width: 320px;
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .chat-header {
      padding: 14px 16px;
      background: rgba(15, 23, 42, 0.6);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      h3 { margin: 0; font-size: 0.95rem; }
    }
    .close-chat {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1.1rem;
    }
    .chat-messages-area {
      flex: 1;
      padding: 14px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .system-bubble {
      font-size: 0.75rem;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.05);
      padding: 8px 12px;
      border-radius: 8px;
      text-align: center;
      line-height: 1.4;
    }
    .chat-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: flex-start;
      &.mine {
        align-items: flex-end;
        .chat-bubble {
          background: #0284c7;
          color: white;
        }
      }
    }
    .chat-meta {
      font-size: 0.72rem;
      color: #94a3b8;
      display: flex;
      gap: 6px;
    }
    .chat-bubble {
      background: #334155;
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 0.85rem;
      max-width: 90%;
      word-break: break-word;
    }
    .chat-input-bar {
      padding: 12px;
      background: rgba(15, 23, 42, 0.6);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      gap: 8px;
      input { flex: 1; }
    }
    .room-dock {
      height: 80px;
      background: rgba(15, 23, 42, 0.95);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 16px;
    }
    .dock-controls {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .dock-button {
      background: #334155;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #f8fafc;
      padding: 10px 16px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      min-width: 76px;
      transition: all 0.2s ease;
      &:hover {
        background: #475569;
        transform: translateY(-2px);
      }
      &.danger-btn {
        background: rgba(239, 68, 68, 0.2);
        border-color: #ef4444;
        color: #fca5a5;
      }
      &.highlight-btn {
        background: #0284c7;
        border-color: #38bdf8;
      }
      &.active-btn {
        background: #0369a1;
      }
      &.leave-call-btn {
        background: #dc2626;
        border-color: #ef4444;
        color: white;
        &:hover {
          background: #b91c1c;
        }
      }
    }
    .dock-btn-icon {
      font-size: 20px;
    }
    .dock-btn-text {
      font-size: 0.72rem;
      font-weight: 600;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `,
})
export class VideoRoomPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly localVideoEl = viewChild<ElementRef<HTMLVideoElement>>('localVideo');

  readonly doctorName = signal('Dr. Aarav Mehta');
  readonly patientName = signal('Patient');
  readonly sessionId = signal('');
  readonly myRole = signal<'PATIENT' | 'DOCTOR'>('PATIENT');

  readonly videoOn = signal(true);
  readonly audioOn = signal(true);
  readonly screenSharing = signal(false);
  readonly chatOpen = signal(false);

  readonly messages = signal<RoomMessage[]>([]);
  draftText = '';

  private mediaStream: MediaStream | null = null;
  private timerInterval: any = null;
  private secondsElapsed = signal(0);

  readonly sessionTime = computed(() => {
    const s = this.secondsElapsed();
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  });

  async ngOnInit() {
    this.route.queryParams.subscribe(async (params) => {
      if (params['doc']) this.doctorName.set(params['doc']);
      if (params['pat']) this.patientName.set(params['pat']);
      if (params['session']) this.sessionId.set(params['session']);
      if (params['role'] === 'doctor') {
        this.myRole.set('DOCTOR');
      } else {
        const u = this.auth.user();
        if (u?.displayName) this.patientName.set(u.displayName);
      }
      await this.initLocalMedia();
    });

    this.timerInterval = setInterval(() => {
      this.secondsElapsed.update((s) => s + 1);
    }, 1000);
  }

  ngOnDestroy() {
    this.stopLocalMedia();
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  private async initLocalMedia() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      const el = this.localVideoEl()?.nativeElement;
      if (el && this.mediaStream) {
        el.srcObject = this.mediaStream;
      }
    } catch {
      // Camera or mic access refused or unavailable
      this.videoOn.set(false);
    }
  }

  private stopLocalMedia() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  toggleVideo() {
    const next = !this.videoOn();
    this.videoOn.set(next);
    if (this.mediaStream) {
      this.mediaStream.getVideoTracks().forEach((track) => {
        track.enabled = next;
      });
    }
    if (next && !this.mediaStream) {
      this.initLocalMedia();
    }
  }

  toggleAudio() {
    const next = !this.audioOn();
    this.audioOn.set(next);
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = next;
      });
    }
  }

  async toggleScreenShare() {
    if (!this.screenSharing()) {
      try {
        if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          this.screenSharing.set(true);
          stream.getVideoTracks()[0].onended = () => {
            this.screenSharing.set(false);
          };
        }
      } catch {
        this.screenSharing.set(false);
      }
    } else {
      this.screenSharing.set(false);
    }
  }

  sendMessage(event: Event) {
    event.preventDefault();
    const text = this.draftText.trim();
    if (!text) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: RoomMessage = {
      id: Date.now().toString(),
      senderName: this.myRole() === 'DOCTOR' ? this.doctorName() : this.patientName(),
      senderRole: this.myRole(),
      text,
      time,
    };
    this.messages.update((msgs) => [...msgs, newMsg]);
    this.draftText = '';
  }

  leaveCall() {
    this.stopLocalMedia();
    const u = this.auth.user();
    if (u?.role === 'PATIENT') {
      this.router.navigateByUrl('/patient/dashboard');
    } else if (u?.role === 'DOCTOR') {
      this.router.navigateByUrl('/doctor/appointments');
    } else {
      this.router.navigateByUrl('/');
    }
  }
}
