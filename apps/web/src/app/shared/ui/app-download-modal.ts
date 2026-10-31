import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { PwaService } from '../../core/services/pwa.service';

@Component({
  selector: 'mb-app-download-modal',
  template: `
    @if (pwa.modalOpen()) {
      <div class="modal-backdrop" (click)="pwa.closeDownloadModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <button class="modal-close" (click)="pwa.closeDownloadModal()" aria-label="Close modal">×</button>

          <!-- Top Brand Showcase -->
          <div class="modal-brand-header">
            <div class="app-icon-squircle">
              <span class="icon-glyph">◐</span>
            </div>
            <div class="app-title-col">
              <div class="app-pill">OFFICIAL MOBILE APP</div>
              <h2>MindBridge Healthcare</h2>
              <p class="app-sub">Instant Clinical Care · 24/7 AI Companion · Offline Ready</p>
            </div>
          </div>

          <!-- Quick Action -->
          <div class="quick-install-box">
            @if (pwa.canInstall()) {
              <button class="btn btn-primary-elevated btn-lg btn-install-now" (click)="pwa.installApp()">
                <span>📲 Install MindBridge App Now</span>
                <span class="btn-subtext">(1-Tap Native Install)</span>
              </button>
            } @else {
              <div class="install-ready-banner">
                <span class="banner-pulse"></span>
                <span>Optimized for Android, iOS & Windows. No app store login needed.</span>
              </div>
            }
          </div>

          <!-- Platform Selector Tabs -->
          <div class="platform-tabs">
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'android'"
              (click)="activeTab.set('android')"
            >
              <span class="tab-icon">🤖</span> Android
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'ios'"
              (click)="activeTab.set('ios')"
            >
              <span class="tab-icon">🍎</span> iOS (iPhone/iPad)
            </button>
            <button
              type="button"
              class="tab-btn"
              [class.active]="activeTab() === 'desktop'"
              (click)="activeTab.set('desktop')"
            >
              <span class="tab-icon">💻</span> Desktop / PC
            </button>
          </div>

          <!-- Tab Content -->
          <div class="tab-content">
            @if (activeTab() === 'android') {
              <div class="steps-list">
                <div class="step-item">
                  <span class="step-num">1</span>
                  <div class="step-text">
                    <strong>Open in Chrome or Edge</strong>
                    <p>Visit <code>mindbridge-web.onrender.com</code> on your Android phone.</p>
                  </div>
                </div>
                <div class="step-item">
                  <span class="step-num">2</span>
                  <div class="step-text">
                    <strong>Tap Browser Menu (⋮)</strong>
                    <p>Tap the 3 dots in the top-right corner of Chrome.</p>
                  </div>
                </div>
                <div class="step-item">
                  <span class="step-num">3</span>
                  <div class="step-text">
                    <strong>Select "Install app" or "Add to Home screen"</strong>
                    <p>MindBridge installs directly as a standalone app with full screen view and offline access.</p>
                  </div>
                </div>
              </div>
            } @else if (activeTab() === 'ios') {
              <div class="steps-list">
                <div class="step-item">
                  <span class="step-num">1</span>
                  <div class="step-text">
                    <strong>Open Safari on iPhone or iPad</strong>
                    <p>Navigate to <code>mindbridge-web.onrender.com</code>.</p>
                  </div>
                </div>
                <div class="step-item">
                  <span class="step-num">2</span>
                  <div class="step-text">
                    <strong>Tap the Share Button</strong>
                    <p>Tap the share icon <span class="share-icon">⎙ / 📤</span> at the bottom of Safari.</p>
                  </div>
                </div>
                <div class="step-item">
                  <span class="step-num">3</span>
                  <div class="step-text">
                    <strong>Tap "Add to Home Screen"</strong>
                    <p>Scroll down in the share sheet, tap <strong>Add to Home Screen</strong>, and tap <strong>Add</strong>.</p>
                  </div>
                </div>
              </div>
            } @else {
              <div class="steps-list">
                <div class="step-item">
                  <span class="step-num">1</span>
                  <div class="step-text">
                    <strong>Chrome / Edge Address Bar</strong>
                    <p>Look for the <strong>Install Icon (⊕ / 💻)</strong> on the right side of the URL bar.</p>
                  </div>
                </div>
                <div class="step-item">
                  <span class="step-num">2</span>
                  <div class="step-text">
                    <strong>Click "Install MindBridge"</strong>
                    <p>Opens in its own standalone distraction-free window on your desktop taskbar.</p>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Direct Download & Features Row -->
          <div class="modal-footer-info">
            <div class="pwa-features-row">
              <span>⚡ Zero App Store Download Size</span> ·
              <span>🔒 Encrypted Local Storage</span> ·
              <span>🔔 Teams Video Calling</span>
            </div>
            <button class="btn btn-secondary btn-sm" (click)="pwa.closeDownloadModal()">Got It, Close</button>
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(8px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.2s ease-out;
    }

    .modal-card {
      position: relative;
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-radius: 24px;
      width: 100%;
      max-width: 520px;
      padding: 28px 24px;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.35);
      animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .modal-close {
      position: absolute;
      top: 18px;
      right: 18px;
      background: var(--mb-surface-2);
      border: 1px solid var(--mb-border);
      color: var(--mb-text);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      font-size: 1.2rem;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;

      &:hover {
        background: var(--mb-danger-soft);
        color: var(--mb-danger);
      }
    }

    .modal-brand-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .app-icon-squircle {
      width: 64px;
      height: 64px;
      border-radius: 18px;
      background: linear-gradient(135deg, #0d9488 0%, #0f766e 50%, #1e1b4b 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 20px rgba(13, 148, 136, 0.35);
      flex-shrink: 0;
    }

    .icon-glyph {
      font-size: 2rem;
      color: #ffffff;
      line-height: 1;
    }

    .app-title-col {
      h2 {
        font-size: 1.35rem;
        margin: 0 0 4px;
        font-weight: 700;
      }
    }

    .app-pill {
      display: inline-block;
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--mb-primary-soft);
      color: var(--mb-primary-strong);
      margin-bottom: 4px;
    }

    .app-sub {
      margin: 0;
      font-size: 0.82rem;
      color: var(--mb-text-muted);
    }

    .quick-install-box {
      margin-bottom: 20px;
    }

    .btn-install-now {
      width: 100%;
      min-height: 52px;
      font-size: 1.05rem;
      display: flex;
      flex-direction: column;
      gap: 2px;
      border-radius: 14px;
    }

    .btn-subtext {
      font-size: 0.75rem;
      opacity: 0.85;
      font-weight: 400;
    }

    .install-ready-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 12px;
      background: var(--mb-surface-2);
      border: 1px solid var(--mb-border);
      font-size: 0.85rem;
      color: var(--mb-text);
    }

    .banner-pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.25);
      flex-shrink: 0;
    }

    .platform-tabs {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      background: var(--mb-surface-2);
      padding: 4px;
      border-radius: 12px;
      margin-bottom: 18px;
    }

    .tab-btn {
      padding: 8px 10px;
      font: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      border: none;
      background: transparent;
      color: var(--mb-text-muted);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s ease;

      &.active {
        background: var(--mb-surface);
        color: var(--mb-text);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      }
    }

    .steps-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }

    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: var(--mb-surface-2);
      border: 1px solid var(--mb-border);
      padding: 10px 14px;
      border-radius: 12px;
    }

    .step-num {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--mb-primary);
      color: var(--mb-on-primary);
      font-size: 0.8rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .step-text {
      strong {
        display: block;
        font-size: 0.9rem;
        margin-bottom: 2px;
        color: var(--mb-text);
      }
      p {
        margin: 0;
        font-size: 0.82rem;
        color: var(--mb-text-muted);
        line-height: 1.4;
      }
      code {
        background: var(--mb-surface);
        padding: 1px 5px;
        border-radius: 4px;
        font-size: 0.78rem;
        color: var(--mb-primary);
      }
    }

    .share-icon {
      font-size: 0.95rem;
      font-weight: bold;
    }

    .modal-footer-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      border-top: 1px solid var(--mb-border);
      padding-top: 16px;
    }

    .pwa-features-row {
      font-size: 0.78rem;
      color: var(--mb-text-muted);
      text-align: center;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.95) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
  `,
})
export class AppDownloadModalComponent {
  protected readonly pwa = inject(PwaService);
  protected readonly activeTab = signal<'android' | 'ios' | 'desktop'>('android');
}
