import { Component, inject, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'mb-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <a class="skip-link" href="#main">Skip to content</a>

    <!-- DYNAMIC SUPER ADMIN ANNOUNCEMENT BANNER -->
    @if (bannerVisible()) {
      <aside class="announcement-bar" role="region" aria-label="Announcement">
        <div class="container announcement-inner">
          <div class="announcement-left">
            <span class="announcement-badge">LIVE NOTICE</span>
            <strong class="announcement-title">{{ bannerTitle() }}</strong>
            <span class="announcement-text">{{ bannerMsg() }}</span>
          </div>
          <div class="announcement-actions">
            <a routerLink="/crisis" class="announcement-btn">Crisis Helplines (14416) →</a>
            <button class="announcement-close" (click)="dismissBanner()" aria-label="Dismiss banner">×</button>
          </div>
        </div>
      </aside>
    }

    <header class="site-header">
      <div class="container row-between">
        <a routerLink="/" class="brand" aria-label="MindBridge home">
          <span class="logo" aria-hidden="true">◐</span> MindBridge
        </a>
        <nav class="nav" aria-label="Main">
          <a routerLink="/self-help" routerLinkActive="active">Self-help</a>
          <a routerLink="/professionals" routerLinkActive="active">Find a professional</a>
          <a routerLink="/how-it-works" routerLinkActive="active">How it works</a>
          <a routerLink="/admin/overview" routerLinkActive="active" class="nav-admin-link">
            <span class="admin-pill">👑 Admin Portal</span>
          </a>
          <a href="/admin-portal/index.html" target="_blank" class="nav-council-link">
            <span>🏛️ 12-Member Council</span>
          </a>
        </nav>
        <div class="row header-cta-group">
          <a routerLink="/crisis" class="btn btn-crisis btn-sm">Get help now</a>
          @if (auth.isAuthenticated()) {
            <a [routerLink]="auth.homeFor()" class="btn btn-sm">My dashboard</a>
          } @else {
            <a routerLink="/login" class="btn btn-ghost btn-sm">Sign in</a>
            <a routerLink="/register" class="btn btn-sm btn-primary-elevated">Get started</a>
          }
        </div>
      </div>
    </header>
    <main id="main" tabindex="-1"><router-outlet /></main>
    <footer class="site-footer">
      <div class="container">
        <div class="footer-top row-between">
          <div>
            <div class="brand footer-brand"><span class="logo">◐</span> MindBridge Healthcare</div>
            <p class="disclaimer">
              MindBridge offers clinical recovery programs, peer support, and direct routing to verified crisis helplines.
              Governed by the MindBridge Healthcare Council.
            </p>
          </div>
          <div class="footer-links">
            <a href="/admin-portal/index.html" target="_blank" class="footer-council-btn">
              🏛️ Open MindBridge Admin Portal ↗
            </a>
          </div>
        </div>
        <nav class="row small footer-nav" aria-label="Footer">
          <a routerLink="/legal/privacy">Privacy notice</a>
          <a routerLink="/legal/terms">Terms</a>
          <a routerLink="/legal/ai">How we use AI</a>
          <a routerLink="/crisis">Crisis support (14416)</a>
          <a routerLink="/admin/overview">Public Impact Telemetry</a>
        </nav>
      </div>
    </footer>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    /* Announcement Banner */
    .announcement-bar {
      background: linear-gradient(90deg, #064e3b 0%, #065f46 50%, #047857 100%);
      color: #ecfdf5;
      font-size: 0.85rem;
      padding: 8px 0;
      border-bottom: 1px solid rgba(16, 185, 129, 0.4);
      box-shadow: 0 2px 10px rgba(6, 78, 59, 0.3);
    }
    .announcement-inner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .announcement-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .announcement-badge {
      background: #10b981;
      color: #022c22;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 999px;
      letter-spacing: 0.05em;
    }
    .announcement-title {
      color: #fff;
    }
    .announcement-text {
      color: #d1fae5;
    }
    .announcement-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .announcement-btn {
      color: #fff;
      font-weight: 700;
      text-decoration: underline;
      font-size: 0.82rem;
      &:hover { color: #a7f3d0; }
    }
    .announcement-close {
      background: transparent;
      border: none;
      color: #a7f3d0;
      font-size: 1.25rem;
      cursor: pointer;
      line-height: 1;
      padding: 0 4px;
      &:hover { color: #fff; }
    }

    /* Site Header */
    .site-header {
      background: var(--mb-surface);
      border-bottom: 1px solid var(--mb-border);
      padding: 12px 0;
      position: sticky;
      top: 0;
      z-index: 50;
      backdrop-filter: blur(12px);
    }
    .brand {
      font-weight: 750;
      font-size: 1.25rem;
      text-decoration: none;
      color: var(--mb-text);
      display: inline-flex;
      gap: 8px;
      align-items: center;
      letter-spacing: -0.02em;
    }
    .logo {
      color: var(--mb-primary);
      font-size: 1.4rem;
    }
    .nav {
      display: flex;
      gap: 18px;
      align-items: center;
      flex-wrap: wrap;
    }
    .nav a {
      color: var(--mb-text-muted);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.92rem;
      transition: color 0.15s ease;
    }
    .nav a.active,
    .nav a:hover {
      color: var(--mb-primary);
    }

    .admin-pill {
      background: rgba(107, 79, 163, 0.12);
      color: #6b4fa3;
      padding: 4px 10px;
      border-radius: 999px;
      font-weight: 700;
      border: 1px solid rgba(107, 79, 163, 0.25);
    }
    .nav-council-link {
      color: #059669 !important;
      font-weight: 600;
    }

    .site-footer {
      border-top: 1px solid var(--mb-border);
      padding: var(--mb-space-6) 0;
      background: var(--mb-surface);
      margin-top: var(--mb-space-7);
    }
    .footer-top {
      margin-bottom: var(--mb-space-4);
      flex-wrap: wrap;
      gap: 20px;
    }
    .footer-brand {
      margin-bottom: 8px;
      font-size: 1.1rem;
    }
    .disclaimer {
      color: var(--mb-text-muted);
      max-width: 65ch;
      font-size: 0.88rem;
    }
    .footer-council-btn {
      display: inline-flex;
      align-items: center;
      padding: 10px 18px;
      border-radius: var(--mb-radius);
      background: var(--mb-primary-soft);
      color: var(--mb-primary-strong);
      font-weight: 700;
      font-size: 0.88rem;
      text-decoration: none;
      border: 1px solid var(--mb-border);
      &:hover {
        background: var(--mb-primary);
        color: #fff;
      }
    }
    .footer-nav {
      padding-top: var(--mb-space-4);
      border-top: 1px solid var(--mb-border);
      gap: 20px;
    }

    @media (max-width: 860px) {
      .nav {
        display: none;
      }
    }
  `,
})
export class PublicLayoutComponent implements OnInit {
  protected readonly auth = inject(AuthService);

  protected readonly bannerVisible = signal(true);
  protected readonly bannerTitle = signal('🌟 24/7 National Mental Health Helplines Active');
  protected readonly bannerMsg = signal('Free, confidential support via Tele-MANAS (14416) & Kiran (1800-599-0019) is available across all Indian states.');

  async ngOnInit() {
    try {
      const res = await fetch('https://mindbridge-api-x99i.onrender.com/api/v1/governance/settings');
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.announcementBanner) {
          const b = json.data.announcementBanner;
          this.bannerVisible.set(b.enabled);
          if (b.title) this.bannerTitle.set(b.title);
          if (b.message) this.bannerMsg.set(b.message);
        }
      }
    } catch {
      // Fallback to default
    }
  }

  dismissBanner() {
    this.bannerVisible.set(false);
  }
}
