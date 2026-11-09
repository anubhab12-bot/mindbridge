import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

interface MoodReaction {
  label: string;
  emoji: string;
  response: string;
  suggestion: string;
  route: string;
}

const MOOD_OPTIONS: MoodReaction[] = [
  {
    label: 'Peaceful',
    emoji: '🌿',
    response: 'Wonderful to hear. Taking note of peaceful moments helps anchor your well-being.',
    suggestion: 'Reflect in your journal',
    route: '/patient/journal',
  },
  {
    label: 'Low / Sad',
    emoji: '😔',
    response: "I'm here with you. It's completely okay to feel down; you don't have to carry it alone.",
    suggestion: 'Talk with AI Companion',
    route: '/patient/companion',
  },
  {
    label: 'Stressed',
    emoji: '⚡',
    response: 'Stress can be overwhelming. Let’s slow down your heart rate with a 1-minute calm breath.',
    suggestion: 'Try Box Breathing',
    route: '/patient/self-help',
  },
  {
    label: 'Anxious',
    emoji: '😰',
    response: 'You are safe right now. Connecting with a doctor or grounding exercise can really help.',
    suggestion: 'Consult a Doctor',
    route: '/patient/professionals',
  },
];

@Component({
  selector: 'mb-companion-character',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="companion-widget-wrap"
      [class.on-companion-page]="isCompanionPage()"
      [class.widget-open]="isOpen()"
    >
      <!-- 1. POPUP DRAWER / CARD -->
      @if (isOpen()) {
        <div class="companion-card" role="dialog" aria-label="Mindi AI Companion Quick Menu">
          <!-- Card Header -->
          <div class="card-header">
            <div class="header-left">
              <div class="mini-avatar-wrap">
                <span class="live-status-dot"></span>
                <span class="mini-avatar">🌱</span>
              </div>
              <div class="header-text">
                <div class="header-title-row">
                  <strong>Mindi</strong>
                  <span class="badge-role">AI Companion</span>
                </div>
                <span class="header-sub">Clinical AI · Safe & Confidential</span>
              </div>
            </div>
            <button
              type="button"
              class="btn-icon close-btn"
              (click)="toggleOpen()"
              aria-label="Close companion menu"
            >
              ✕
            </button>
          </div>

          <!-- Card Body -->
          <div class="card-body">
            <!-- Greeting -->
            <div class="greeting-box">
              <p class="greeting-text">
                Hello {{ displayName() }}! 💙 How are you feeling right now?
              </p>
            </div>

            <!-- Mood Check-in Chips -->
            <div class="mood-check-row">
              @for (m of moods; track m.label) {
                <button
                  type="button"
                  class="mood-chip"
                  [class.active]="selectedMood()?.label === m.label"
                  (click)="selectMood(m)"
                >
                  <span class="mood-emoji">{{ m.emoji }}</span>
                  <span class="mood-name">{{ m.label }}</span>
                </button>
              }
            </div>

            @if (selectedMood(); as sm) {
              <div class="mood-reaction-box">
                <p class="reaction-msg">{{ sm.response }}</p>
                <button type="button" class="btn-action-pill" (click)="navigateAndClose(sm.route)">
                  {{ sm.suggestion }} →
                </button>
              </div>
            }

            <!-- Guided Box Breathing Interactive Tool -->
            <div class="breathing-card" [class.active-session]="isBreathingActive()">
              <div class="breathing-header">
                <div class="breathing-title-group">
                  <span class="breathe-icon">🫁</span>
                  <div>
                    <strong>1-Minute Calm Breath</strong>
                    <span class="breathe-desc">Clinical 4-4-4-4 Box Breathing</span>
                  </div>
                </div>
                <button
                  type="button"
                  class="btn-breathe-toggle"
                  (click)="toggleBreathing()"
                >
                  {{ isBreathingActive() ? 'Stop' : 'Start' }}
                </button>
              </div>

              @if (isBreathingActive()) {
                <div class="breathing-visual-area">
                  <div
                    class="breath-circle"
                    [class.phase-inhale]="breathingPhase() === 'inhale'"
                    [class.phase-hold1]="breathingPhase() === 'hold1'"
                    [class.phase-exhale]="breathingPhase() === 'exhale'"
                    [class.phase-hold2]="breathingPhase() === 'hold2'"
                  >
                    <span class="breath-counter">{{ breathingCountdown() }}</span>
                    <span class="breath-instruction">{{ breathingInstruction() }}</span>
                  </div>
                  <p class="breath-cycle-count">
                    Cycle {{ breathingCycles() + 1 }} · Follow the expanding circle
                  </p>
                </div>
              }
            </div>

            <!-- Quick Action Shortcuts -->
            <div class="shortcuts-section">
              <span class="section-label">Quick Support</span>
              <div class="shortcuts-grid">
                <button
                  type="button"
                  class="shortcut-btn"
                  (click)="navigateAndClose('/patient/companion')"
                >
                  <span class="shortcut-icon">💬</span>
                  <div class="shortcut-text">
                    <strong>Full Chat</strong>
                    <small>Talk with companion</small>
                  </div>
                </button>

                <button
                  type="button"
                  class="shortcut-btn"
                  (click)="navigateAndClose('/patient/professionals')"
                >
                  <span class="shortcut-icon">👨‍⚕️</span>
                  <div class="shortcut-text">
                    <strong>Find Doctor</strong>
                    <small>Verified therapists</small>
                  </div>
                </button>

                <button
                  type="button"
                  class="shortcut-btn"
                  (click)="navigateAndClose('/patient/self-help')"
                >
                  <span class="shortcut-icon">🧘</span>
                  <div class="shortcut-text">
                    <strong>Self-Help</strong>
                    <small>Exercises & tools</small>
                  </div>
                </button>

                <button
                  type="button"
                  class="shortcut-btn"
                  (click)="navigateAndClose('/crisis')"
                >
                  <span class="shortcut-icon">🆘</span>
                  <div class="shortcut-text">
                    <strong>Crisis Help</strong>
                    <small>24/7 helplines</small>
                  </div>
                </button>
              </div>
            </div>

            <!-- Mini Prompt Bar -->
            <form class="mini-composer" (ngSubmit)="sendQuickPrompt()">
              <input
                type="text"
                class="mini-input"
                name="quickPrompt"
                [(ngModel)]="promptInput"
                placeholder="Ask Mindi anything (e.g. stress relief, doctor)..."
              />
              <button
                type="submit"
                class="mini-send-btn"
                [disabled]="!promptInput.trim()"
                aria-label="Send to companion"
              >
                ➔
              </button>
            </form>
          </div>
        </div>
      }

      <!-- 2. SPEECH BUBBLE (IDLE PROMPT) -->
      @if (speechVisible() && !isOpen() && !isCompanionPage()) {
        <div
          class="speech-bubble"
          (click)="toggleOpen()"
          role="tooltip"
          aria-live="polite"
        >
          <button
            type="button"
            class="speech-dismiss"
            (click)="dismissSpeech($event)"
            aria-label="Dismiss message"
          >
            ✕
          </button>
          <div class="speech-content">
            <span class="speech-sparkle">✨</span>
            <span class="speech-text">{{ activeGreeting() }}</span>
          </div>
          <div class="speech-arrow"></div>
        </div>
      }

      <!-- 3. ANIMATED CHARACTER BUTTON -->
      <button
        type="button"
        class="character-btn"
        [class.is-open]="isOpen()"
        [class.is-hovered]="isHovered()"
        (click)="toggleOpen()"
        (mouseenter)="onHover(true)"
        (mouseleave)="onHover(false)"
        [attr.aria-expanded]="isOpen()"
        aria-label="Mindi AI Companion - Click to open support menu"
      >
        <!-- SVG ANIMATED CHARACTER -->
        <svg
          class="mindi-svg"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <!-- Glowing aura gradient -->
            <radialGradient id="mindiAuraGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.5" />
              <stop offset="60%" stop-color="#3b82f6" stop-opacity="0.25" />
              <stop offset="100%" stop-color="#6366f1" stop-opacity="0" />
            </radialGradient>

            <!-- Main Body Gradient -->
            <linearGradient id="mindiBodyGrad" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stop-color="#38bdf8" />
              <stop offset="45%" stop-color="#06b6d4" />
              <stop offset="100%" stop-color="#2563eb" />
            </linearGradient>

            <!-- Face Visor Gradient -->
            <linearGradient id="mindiVisorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#0f172a" />
              <stop offset="100%" stop-color="#1e293b" />
            </linearGradient>

            <!-- Sprout Leaf Gradient -->
            <linearGradient id="mindiLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#4ade80" />
              <stop offset="100%" stop-color="#10b981" />
            </linearGradient>

            <!-- Belly Light Gradient -->
            <linearGradient id="mindiBellyGrad" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stop-color="#f0fdf4" stop-opacity="0.95" />
              <stop offset="100%" stop-color="#bae6fd" stop-opacity="0.5" />
            </linearGradient>

            <!-- Drop Shadow Filter -->
            <filter id="mindiGlowShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#0284c7" flood-opacity="0.4" />
            </filter>
          </defs>

          <!-- 1. Glowing Breathing Halo Ring -->
          <circle class="mindi-halo" cx="50" cy="54" r="42" fill="url(#mindiAuraGrad)" />

          <!-- 2. Floating Body Group -->
          <g class="mindi-float-group">
            <!-- Left Hand -->
            <ellipse class="mindi-hand mindi-hand-left" cx="20" cy="56" rx="6" ry="8" fill="url(#mindiBodyGrad)" />

            <!-- Right Hand (Waving) -->
            <g class="mindi-hand-right-wrap">
              <ellipse class="mindi-hand mindi-hand-right" cx="80" cy="56" rx="6" ry="8" fill="url(#mindiBodyGrad)" />
            </g>

            <!-- Antenna Sprout Stem & Leaf -->
            <g class="mindi-sprout">
              <path d="M50 24 Q47 13 53 8" stroke="#10b981" stroke-width="3" stroke-linecap="round" fill="none" />
              <path d="M53 8 C57 5 63 9 60 14 C56 16 51 11 53 8 Z" fill="url(#mindiLeafGrad)" />
              <circle class="mindi-orb" cx="58" cy="9" r="2.5" fill="#a7f3d0" />
            </g>

            <!-- Main Rounded Body Capsule -->
            <g filter="url(#mindiGlowShadow)">
              <rect x="24" y="22" width="52" height="58" rx="26" fill="url(#mindiBodyGrad)" />
              <!-- Top Light Reflection -->
              <path d="M32 26 Q50 23 68 26" stroke="#bae6fd" stroke-width="2.5" stroke-linecap="round" opacity="0.65" />
            </g>

            <!-- Visor Screen -->
            <rect class="mindi-visor" x="30" y="32" width="40" height="28" rx="14" fill="url(#mindiVisorGrad)" />

            <!-- Blushing Cheeks -->
            <ellipse class="mindi-blush" cx="35" cy="49" rx="3.5" ry="2" fill="#f43f5e" opacity="0.65" />
            <ellipse class="mindi-blush" cx="65" cy="49" rx="3.5" ry="2" fill="#f43f5e" opacity="0.65" />

            <!-- Animated Eyes -->
            <g class="mindi-eyes">
              <!-- Left Eye -->
              <g class="mindi-eye mindi-eye-left">
                <ellipse cx="40" cy="42" rx="3.5" ry="5" fill="#38bdf8" />
                <circle cx="39" cy="40" r="1.5" fill="#ffffff" />
                <circle cx="41.5" cy="43.5" r="0.7" fill="#ffffff" />
              </g>

              <!-- Right Eye -->
              <g class="mindi-eye mindi-eye-right">
                <ellipse cx="60" cy="42" rx="3.5" ry="5" fill="#38bdf8" />
                <circle cx="59" cy="40" r="1.5" fill="#ffffff" />
                <circle cx="61.5" cy="43.5" r="0.7" fill="#ffffff" />
              </g>
            </g>

            <!-- Smile Mouth -->
            <path
              class="mindi-mouth"
              [attr.d]="isHovered() ? 'M45 47 Q50 55 55 47' : 'M46 48 Q50 53 54 48'"
              stroke="#38bdf8"
              stroke-width="2.2"
              stroke-linecap="round"
              fill="none"
            />

            <!-- Heart / Sensor Belly -->
            <g class="mindi-belly">
              <ellipse cx="50" cy="67" rx="10" ry="6" fill="url(#mindiBellyGrad)" />
              <path
                d="M44 67 H47 L48.5 64 L50 70 L51.5 65 L53 67 H56"
                stroke="#0284c7"
                stroke-width="1.3"
                stroke-linecap="round"
                stroke-linejoin="round"
                opacity="0.8"
              />
            </g>

            <!-- Bottom Floating Shadow -->
            <ellipse class="mindi-ground-shadow" cx="50" cy="94" rx="20" ry="4" fill="#000000" opacity="0.16" />
          </g>
        </svg>

        <!-- Online Pulse Badge -->
        <span class="companion-online-dot"></span>
      </button>
    </div>
  `,
  styles: `
    .companion-widget-wrap {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 950;
      font-family: inherit;
    }

    .companion-widget-wrap.on-companion-page {
      opacity: 0.9;
    }

    /* 1. BUTTON & CHARACTER */
    .character-btn {
      all: unset;
      position: relative;
      width: 72px;
      height: 72px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    .character-btn:hover {
      transform: scale(1.08);
    }

    .character-btn:active {
      transform: scale(0.96);
    }

    .character-btn:focus-visible {
      outline: 3px solid var(--mb-focus, #38bdf8);
      outline-offset: 4px;
      border-radius: 50%;
    }

    .mindi-svg {
      width: 100%;
      height: 100%;
      overflow: visible;
      filter: drop-shadow(0 8px 18px rgba(6, 182, 212, 0.35));
    }

    /* 2. SVG ANIMATIONS */
    .mindi-float-group {
      animation: mindiFloat 3.8s ease-in-out infinite;
      transform-origin: 50px 70px;
    }

    @keyframes mindiFloat {
      0%, 100% {
        transform: translateY(0px) rotate(0deg);
      }
      50% {
        transform: translateY(-8px) rotate(1.2deg);
      }
    }

    .mindi-ground-shadow {
      animation: mindiShadow 3.8s ease-in-out infinite;
      transform-origin: 50px 94px;
    }

    @keyframes mindiShadow {
      0%, 100% {
        transform: scale(1);
        opacity: 0.16;
      }
      50% {
        transform: scale(0.75);
        opacity: 0.08;
      }
    }

    .mindi-halo {
      animation: mindiAuraPulse 4s ease-in-out infinite;
      transform-origin: 50px 54px;
    }

    @keyframes mindiAuraPulse {
      0%, 100% {
        transform: scale(0.92);
        opacity: 0.6;
      }
      50% {
        transform: scale(1.18);
        opacity: 0.95;
      }
    }

    .mindi-eye {
      animation: mindiBlink 4.2s infinite;
      transform-origin: center;
    }

    @keyframes mindiBlink {
      0%, 91%, 100% {
        transform: scaleY(1);
      }
      95% {
        transform: scaleY(0.08);
      }
    }

    .mindi-sprout {
      animation: mindiSproutSway 3.2s ease-in-out infinite;
      transform-origin: 50px 24px;
    }

    @keyframes mindiSproutSway {
      0%, 100% {
        transform: rotate(-3deg);
      }
      50% {
        transform: rotate(6deg);
      }
    }

    .mindi-hand-right-wrap {
      animation: mindiWave 4s ease-in-out infinite;
      transform-origin: 80px 56px;
    }

    @keyframes mindiWave {
      0%, 65%, 100% {
        transform: rotate(0deg);
      }
      72% {
        transform: rotate(26deg) translateY(-4px);
      }
      78% {
        transform: rotate(-12deg) translateY(-6px);
      }
      84% {
        transform: rotate(22deg) translateY(-4px);
      }
      90% {
        transform: rotate(0deg);
      }
    }

    .companion-online-dot {
      position: absolute;
      bottom: 6px;
      right: 6px;
      width: 12px;
      height: 12px;
      background: #10b981;
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);
      animation: pulseGreen 2s infinite;
    }

    @keyframes pulseGreen {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      }
      50% {
        box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
      }
    }

    /* 3. SPEECH BUBBLE */
    .speech-bubble {
      position: absolute;
      bottom: 84px;
      right: 0;
      background: var(--mb-surface, #ffffff);
      color: var(--mb-text, #0f172a);
      border: 1px solid var(--mb-border, #e2e8f0);
      border-radius: 18px 18px 4px 18px;
      padding: 10px 14px;
      font-size: 0.82rem;
      font-weight: 500;
      line-height: 1.35;
      box-shadow: 0 10px 25px -4px rgba(0, 0, 0, 0.12);
      max-width: 230px;
      min-width: 180px;
      cursor: pointer;
      display: flex;
      align-items: flex-start;
      gap: 6px;
      animation: speechBounce 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      backdrop-filter: blur(8px);
    }

    .speech-bubble:hover {
      border-color: var(--mb-primary, #06b6d4);
      transform: translateY(-2px);
    }

    @keyframes speechBounce {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .speech-content {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .speech-sparkle {
      font-size: 0.95rem;
    }

    .speech-dismiss {
      all: unset;
      position: absolute;
      top: 4px;
      right: 6px;
      font-size: 0.7rem;
      color: var(--mb-text-muted, #64748b);
      cursor: pointer;
      padding: 2px;
      line-height: 1;
    }

    .speech-dismiss:hover {
      color: var(--mb-text, #0f172a);
    }

    .speech-arrow {
      position: absolute;
      bottom: -6px;
      right: 28px;
      width: 12px;
      height: 12px;
      background: var(--mb-surface, #ffffff);
      border-right: 1px solid var(--mb-border, #e2e8f0);
      border-bottom: 1px solid var(--mb-border, #e2e8f0);
      transform: rotate(45deg);
    }

    /* 4. COMPANION POPUP CARD */
    .companion-card {
      position: absolute;
      bottom: 86px;
      right: 0;
      width: 360px;
      max-width: calc(100vw - 32px);
      max-height: min(580px, 80vh);
      background: var(--mb-surface, #ffffff);
      border: 1px solid var(--mb-border, #e2e8f0);
      border-radius: 20px;
      box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.22);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      animation: cardPopIn 0.26s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 999;
    }

    @keyframes cardPopIn {
      from {
        opacity: 0;
        transform: translateY(12px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      border-bottom: 1px solid var(--mb-border, #e2e8f0);
      background: var(--mb-surface-2, #f8fafc);
      border-radius: 20px 20px 0 0;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .mini-avatar-wrap {
      position: relative;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(6, 182, 212, 0.3);
    }

    .mini-avatar {
      font-size: 1.1rem;
    }

    .live-status-dot {
      position: absolute;
      bottom: -1px;
      right: -1px;
      width: 9px;
      height: 9px;
      background: #10b981;
      border: 1.5px solid #ffffff;
      border-radius: 50%;
    }

    .header-text {
      display: flex;
      flex-direction: column;
    }

    .header-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .header-title-row strong {
      font-size: 0.95rem;
      color: var(--mb-text, #0f172a);
    }

    .badge-role {
      font-size: 0.68rem;
      padding: 2px 6px;
      background: rgba(6, 182, 212, 0.12);
      color: var(--mb-primary, #0284c7);
      border-radius: 10px;
      font-weight: 600;
    }

    .header-sub {
      font-size: 0.72rem;
      color: var(--mb-text-muted, #64748b);
    }

    .close-btn {
      all: unset;
      font-size: 1.1rem;
      color: var(--mb-text-muted, #64748b);
      cursor: pointer;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.15s ease;
    }

    .close-btn:hover {
      background: rgba(0, 0, 0, 0.06);
      color: var(--mb-text, #0f172a);
    }

    .card-body {
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .greeting-box {
      margin-bottom: 2px;
    }

    .greeting-text {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--mb-text, #0f172a);
      margin: 0;
      line-height: 1.35;
    }

    /* Mood row */
    .mood-check-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }

    .mood-chip {
      all: unset;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 8px 4px;
      background: var(--mb-surface-2, #f8fafc);
      border: 1px solid var(--mb-border, #e2e8f0);
      border-radius: 12px;
      font-size: 0.74rem;
      cursor: pointer;
      transition: all 0.15s ease;
      color: var(--mb-text, #0f172a);
    }

    .mood-chip:hover {
      background: rgba(6, 182, 212, 0.08);
      border-color: var(--mb-primary, #06b6d4);
      transform: translateY(-1px);
    }

    .mood-chip.active {
      background: rgba(6, 182, 212, 0.14);
      border-color: var(--mb-primary, #06b6d4);
      font-weight: 600;
      color: var(--mb-primary, #0284c7);
    }

    .mood-emoji {
      font-size: 1.15rem;
    }

    .mood-name {
      font-size: 0.72rem;
    }

    .mood-reaction-box {
      background: rgba(6, 182, 212, 0.08);
      border: 1px solid rgba(6, 182, 212, 0.25);
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .reaction-msg {
      font-size: 0.8rem;
      color: var(--mb-text, #0f172a);
      margin: 0;
      line-height: 1.35;
    }

    .btn-action-pill {
      all: unset;
      align-self: flex-start;
      font-size: 0.76rem;
      font-weight: 600;
      color: var(--mb-primary, #0284c7);
      cursor: pointer;
      text-decoration: underline;
    }

    .btn-action-pill:hover {
      opacity: 0.85;
    }

    /* Guided Breathing Box */
    .breathing-card {
      background: var(--mb-surface-2, #f8fafc);
      border: 1px solid var(--mb-border, #e2e8f0);
      border-radius: 14px;
      padding: 10px 12px;
      transition: all 0.2s ease;
    }

    .breathing-card.active-session {
      background: linear-gradient(180deg, rgba(6, 182, 212, 0.07) 0%, rgba(59, 130, 246, 0.07) 100%);
      border-color: rgba(6, 182, 212, 0.3);
    }

    .breathing-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .breathing-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .breathe-icon {
      font-size: 1.2rem;
    }

    .breathing-title-group strong {
      display: block;
      font-size: 0.82rem;
      color: var(--mb-text, #0f172a);
    }

    .breathe-desc {
      display: block;
      font-size: 0.7rem;
      color: var(--mb-text-muted, #64748b);
    }

    .btn-breathe-toggle {
      all: unset;
      padding: 5px 12px;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 20px;
      background: var(--mb-primary, #06b6d4);
      color: #ffffff;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-breathe-toggle:hover {
      filter: brightness(1.08);
    }

    .breathing-visual-area {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .breath-circle {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background: radial-gradient(circle, #38bdf8 0%, #06b6d4 50%, #2563eb 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      box-shadow: 0 0 20px rgba(6, 182, 212, 0.4);
      transition: transform 4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 4s ease;
    }

    .breath-circle.phase-inhale {
      transform: scale(1.3);
      box-shadow: 0 0 32px rgba(6, 182, 212, 0.8);
    }

    .breath-circle.phase-hold1 {
      transform: scale(1.3);
      box-shadow: 0 0 36px rgba(16, 185, 129, 0.85);
    }

    .breath-circle.phase-exhale {
      transform: scale(0.85);
      box-shadow: 0 0 14px rgba(37, 99, 235, 0.35);
    }

    .breath-circle.phase-hold2 {
      transform: scale(0.85);
      box-shadow: 0 0 16px rgba(100, 116, 139, 0.4);
    }

    .breath-counter {
      font-size: 1.4rem;
      font-weight: 700;
      line-height: 1;
    }

    .breath-instruction {
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      opacity: 0.95;
      margin-top: 2px;
    }

    .breath-cycle-count {
      font-size: 0.72rem;
      color: var(--mb-text-muted, #64748b);
      margin: 0;
    }

    /* Shortcuts Section */
    .shortcuts-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .section-label {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--mb-text-muted, #64748b);
    }

    .shortcuts-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }

    .shortcut-btn {
      all: unset;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: var(--mb-surface-2, #f8fafc);
      border: 1px solid var(--mb-border, #e2e8f0);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .shortcut-btn:hover {
      background: var(--mb-surface, #ffffff);
      border-color: var(--mb-primary, #06b6d4);
      transform: translateY(-1px);
    }

    .shortcut-icon {
      font-size: 1.1rem;
    }

    .shortcut-text strong {
      display: block;
      font-size: 0.78rem;
      color: var(--mb-text, #0f172a);
    }

    .shortcut-text small {
      display: block;
      font-size: 0.68rem;
      color: var(--mb-text-muted, #64748b);
    }

    /* Mini Composer */
    .mini-composer {
      display: flex;
      gap: 6px;
      margin-top: 2px;
    }

    .mini-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--mb-border, #e2e8f0);
      border-radius: 20px;
      font-size: 0.8rem;
      background: var(--mb-surface, #ffffff);
      color: var(--mb-text, #0f172a);
      outline: none;
    }

    .mini-input:focus {
      border-color: var(--mb-primary, #06b6d4);
      box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.2);
    }

    .mini-send-btn {
      all: unset;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--mb-primary, #06b6d4);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.15s ease;
    }

    .mini-send-btn:hover:not(:disabled) {
      filter: brightness(1.1);
      transform: scale(1.05);
    }

    .mini-send-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    @media (max-width: 640px) {
      .companion-widget-wrap {
        bottom: 16px;
        right: 16px;
      }
      .character-btn {
        width: 62px;
        height: 62px;
      }
      .companion-card {
        bottom: 74px;
        right: 0;
        width: calc(100vw - 32px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .mindi-float-group,
      .mindi-ground-shadow,
      .mindi-halo,
      .mindi-eye,
      .mindi-sprout,
      .mindi-hand-right-wrap {
        animation: none !important;
      }
    }
  `,
})
export class CompanionCharacterComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly isOpen = signal(false);
  readonly speechVisible = signal(false);
  readonly speechDismissed = signal(false);
  readonly isHovered = signal(false);
  readonly currentUrl = signal(this.router.url);

  readonly moods = MOOD_OPTIONS;
  readonly selectedMood = signal<MoodReaction | null>(null);

  // Guided Breathing States
  readonly isBreathingActive = signal(false);
  readonly breathingPhase = signal<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale');
  readonly breathingCountdown = signal(4);
  readonly breathingCycles = signal(0);
  private breathingTimer: any = null;

  // Greetings rotation
  private greetingTimer: any = null;
  readonly greetingIndex = signal(0);
  promptInput = '';

  readonly isCompanionPage = computed(() => this.currentUrl().includes('/patient/companion'));

  readonly displayName = computed(() => {
    const user = this.auth.user();
    if (user?.displayName) return user.displayName;
    return 'Friend';
  });

  private readonly greetingsList = [
    'Hi! I’m Mindi, your AI companion 🌿',
    'Feeling stressed? I’m always here to help 💙',
    'Take a slow deep breath with me 🫁',
    'Need to talk or find a doctor? Click me! 👨‍⚕️',
  ];

  readonly activeGreeting = computed(() => {
    return this.greetingsList[this.greetingIndex() % this.greetingsList.length];
  });

  readonly breathingInstruction = computed(() => {
    switch (this.breathingPhase()) {
      case 'inhale':
        return 'Inhale (4s)';
      case 'hold1':
        return 'Hold (4s)';
      case 'exhale':
        return 'Exhale (4s)';
      case 'hold2':
        return 'Pause (4s)';
    }
  });

  ngOnInit() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((e) => {
        this.currentUrl.set(e.urlAfterRedirects);
        if (this.currentUrl().includes('/patient/companion')) {
          this.speechVisible.set(false);
        }
      });

    // Show speech bubble after 1.5s delay if not on companion page
    setTimeout(() => {
      if (!this.speechDismissed() && !this.isCompanionPage()) {
        this.speechVisible.set(true);
      }
    }, 1500);

    // Rotate greeting every 10s
    this.greetingTimer = setInterval(() => {
      this.greetingIndex.update((i) => i + 1);
    }, 10000);
  }

  ngOnDestroy() {
    if (this.greetingTimer) clearInterval(this.greetingTimer);
    this.stopBreathing();
  }

  toggleOpen() {
    this.isOpen.update((v) => !v);
    if (this.isOpen()) {
      this.speechVisible.set(false);
    }
  }

  onHover(hovered: boolean) {
    this.isHovered.set(hovered);
    if (hovered && !this.isOpen() && !this.isCompanionPage()) {
      this.speechVisible.set(true);
    }
  }

  dismissSpeech(e: Event) {
    e.stopPropagation();
    this.speechVisible.set(false);
    this.speechDismissed.set(true);
  }

  selectMood(m: MoodReaction) {
    this.selectedMood.set(m);
  }

  toggleBreathing() {
    if (this.isBreathingActive()) {
      this.stopBreathing();
    } else {
      this.startBreathing();
    }
  }

  private startBreathing() {
    this.isBreathingActive.set(true);
    this.breathingPhase.set('inhale');
    this.breathingCountdown.set(4);
    this.breathingCycles.set(0);

    if (this.breathingTimer) clearInterval(this.breathingTimer);
    this.breathingTimer = setInterval(() => {
      const current = this.breathingCountdown();
      if (current > 1) {
        this.breathingCountdown.set(current - 1);
      } else {
        // Transition phases: inhale -> hold1 -> exhale -> hold2 -> inhale
        this.breathingCountdown.set(4);
        switch (this.breathingPhase()) {
          case 'inhale':
            this.breathingPhase.set('hold1');
            break;
          case 'hold1':
            this.breathingPhase.set('exhale');
            break;
          case 'exhale':
            this.breathingPhase.set('hold2');
            break;
          case 'hold2':
            this.breathingPhase.set('inhale');
            this.breathingCycles.update((c) => c + 1);
            break;
        }
      }
    }, 1000);
  }

  private stopBreathing() {
    this.isBreathingActive.set(false);
    if (this.breathingTimer) {
      clearInterval(this.breathingTimer);
      this.breathingTimer = null;
    }
    this.breathingCountdown.set(4);
    this.breathingPhase.set('inhale');
  }

  navigateAndClose(route: string) {
    this.isOpen.set(false);
    void this.router.navigateByUrl(route);
  }

  sendQuickPrompt() {
    const text = this.promptInput.trim();
    if (!text) return;
    this.promptInput = '';
    this.isOpen.set(false);
    void this.router.navigate(['/patient/companion'], {
      queryParams: { prompt: text },
    });
  }
}
