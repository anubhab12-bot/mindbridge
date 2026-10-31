import { Component, inject, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { ThemeService } from '../core/services/theme.service';

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
          <a routerLink="/apply-admin" routerLinkActive="active" class="nav-council-link">
            <span>🏛️ Apply for Admin</span>
          </a>
          <a href="/admin-portal" target="_blank" class="nav-admin-link">
            <span class="admin-pill">👑 Admin Portal 🔒</span>
          </a>
        </nav>
        <div class="row header-cta-group">
          <button
            type="button"
            class="theme-toggle-btn"
            (click)="themeService.toggleTheme()"
            [attr.aria-label]="themeService.isDark() ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
            [title]="themeService.isDark() ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          >
            <span class="theme-icon">{{ themeService.isDark() ? '☀️' : '🌙' }}</span>
            <span class="theme-text">{{ themeService.isDark() ? 'Light' : 'Dark' }}</span>
          </button>
          <a routerLink="/crisis" class="btn btn-crisis btn-sm">Get help now</a>
          @if (auth.isAuthenticated()) {
            <a [routerLink]="auth.homeFor()" class="btn btn-sm">My dashboard</a>
          } @else {
            <a routerLink="/login" class="btn btn-ghost btn-sm btn-auth-hide">Sign in</a>
            <a routerLink="/register" class="btn btn-sm btn-primary-elevated">Get started</a>
          }
          <button class="mobile-nav-toggle" (click)="toggleMobileNav()" aria-label="Toggle navigation">
            {{ mobileNavOpen() ? '✕' : '☰' }}
          </button>
        </div>
      </div>

      <!-- Mobile Navigation Drawer -->
      @if (mobileNavOpen()) {
        <nav class="mobile-nav-drawer" aria-label="Mobile Navigation">
          <a routerLink="/self-help" routerLinkActive="active" (click)="closeMobileNav()">Self-help</a>
          <a routerLink="/professionals" routerLinkActive="active" (click)="closeMobileNav()">Find a professional</a>
          <a routerLink="/how-it-works" routerLinkActive="active" (click)="closeMobileNav()">How it works</a>
          <a routerLink="/impact" routerLinkActive="active" (click)="closeMobileNav()">📊 Impact Telemetry</a>
          <a routerLink="/apply-admin" routerLinkActive="active" (click)="closeMobileNav()" class="nav-council-link">
            🏛️ Apply for Admin Seat
          </a>
          <a href="/admin-portal" target="_blank" (click)="closeMobileNav()" class="mobile-admin-link">
            👑 Open Admin Portal 🔒
          </a>
          <button
            type="button"
            class="mobile-theme-btn"
            (click)="themeService.toggleTheme()"
          >
            <span>Theme Preference</span>
            <span>{{ themeService.isDark() ? '☀️ Light Mode' : '🌙 Dark Mode' }}</span>
          </button>
        </nav>
      }
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
          <div class="footer-links row">
            <button
              type="button"
              class="footer-theme-btn"
              (click)="themeService.toggleTheme()"
              [title]="themeService.isDark() ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
            >
              <span>{{ themeService.isDark() ? '☀️ Switch to Light' : '🌙 Switch to Dark' }}</span>
            </button>
            <a href="/admin-portal" target="_blank" class="footer-council-btn">
              🏛️ Open MindBridge Admin Portal ↗
            </a>
          </div>
        </div>
        <nav class="row small footer-nav" aria-label="Footer">
          <a routerLink="/legal/privacy">Privacy notice</a>
          <a routerLink="/legal/terms">Terms</a>
          <a routerLink="/legal/ai">How we use AI</a>
          <a routerLink="/crisis">Crisis support (14416)</a>
          <a routerLink="/impact">Public Impact Telemetry</a>
        </nav>
      </div>
    </footer>

    <!-- DYNAMIC SUPER ADMIN FLOATING PILL (SIDE_STICKY) -->
    @if (floatingPill(); as pill) {
      <div class="dynamic-floating-pill" [class]="'pill-theme-' + pill.themeColor">
        <a [href]="pill.ctaLink" class="floating-pill-content">
          <span class="pill-icon">{{ pill.iconEmoji }}</span>
          <div class="pill-text-col">
            <span class="pill-badge-tag">{{ pill.badgeLabel || 'Instant Tool' }}</span>
            <strong class="pill-title">{{ pill.title }}</strong>
          </div>
          <span class="pill-arrow">→</span>
        </a>
        <button class="pill-close-btn" (click)="dismissFloatingPill()" title="Dismiss">×</button>
      </div>
    }
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

    .announcement-close {
      flex-shrink: 0;
    }

    .mobile-nav-toggle {
      display: none;
      background: transparent;
      border: 1px solid var(--mb-border);
      color: var(--mb-text);
      font-size: 1.25rem;
      padding: 4px 10px;
      border-radius: var(--mb-radius-sm);
      cursor: pointer;
      line-height: 1;
    }
    .mobile-nav-drawer {
      display: flex;
      flex-direction: column;
      background: var(--mb-surface);
      border-bottom: 1px solid var(--mb-border);
      padding: 14px 20px;
      gap: 12px;
      box-shadow: var(--mb-shadow-lg);
      animation: mobileSlide 0.2s ease-out;
      a {
        text-decoration: none;
        color: var(--mb-text);
        font-weight: 600;
        font-size: 0.95rem;
        padding: 6px 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.04);
        &:hover { color: var(--mb-primary); }
      }
    }
    .mobile-admin-link {
      color: #6b4fa3 !important;
      font-weight: 700 !important;
    }
    @keyframes mobileSlide {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 860px) {
      .nav {
        display: none;
      }
      .mobile-nav-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .btn-auth-hide {
        display: none;
      }
    }

    /* Dynamic Floating Pill */
    .dynamic-floating-pill {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999;
      display: flex;
      align-items: center;
      background: #0f172a;
      color: #f8fafc;
      padding: 6px 14px 6px 10px;
      border-radius: 999px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(12px);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      animation: pillFloat 4s ease-in-out infinite alternate;
    }
    @media (max-width: 640px) {
      .dynamic-floating-pill {
        bottom: 12px;
        right: 12px;
        left: 12px;
        max-width: calc(100vw - 24px);
        padding: 6px 12px;
        box-sizing: border-box;
      }
      .pill-title {
        max-width: 170px;
      }
    }
    @keyframes pillFloat {
      0% { transform: translateY(0); }
      100% { transform: translateY(-4px); }
    }
    .dynamic-floating-pill:hover {
      transform: translateY(-3px) scale(1.02);
      box-shadow: 0 14px 30px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.25);
    }
    .pill-theme-teal { border-left: 4px solid #14b8a6; }
    .pill-theme-indigo { border-left: 4px solid #6366f1; }
    .pill-theme-rose { border-left: 4px solid #f43f5e; }
    .pill-theme-emerald { border-left: 4px solid #10b981; }
    .pill-theme-amber { border-left: 4px solid #f59e0b; }
    .pill-theme-purple { border-left: 4px solid #a855f7; }

    .floating-pill-content {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: inherit;
    }
    .pill-icon {
      font-size: 1.3rem;
    }
    .pill-text-col {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }
    .pill-badge-tag {
      font-size: 0.65rem;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #94a3b8;
    }
    .pill-title {
      font-size: 0.82rem;
      font-weight: 650;
      color: #f8fafc;
      max-width: 220px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pill-arrow {
      color: #38bdf8;
      font-weight: 700;
      margin-left: 4px;
    }
    .pill-close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 1.1rem;
      margin-left: 8px;
      cursor: pointer;
      line-height: 1;
      padding: 2px 4px;
      border-radius: 4px;
      &:hover { color: #f8fafc; }
    }

    /* Theme Toggle Buttons */
    .theme-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 36px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid var(--mb-border);
      background: var(--mb-surface-2);
      color: var(--mb-text);
      font-size: 0.82rem;
      font-weight: 650;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      &:hover {
        background: var(--mb-primary-soft);
        color: var(--mb-primary-strong);
        border-color: var(--mb-primary);
        transform: translateY(-1px);
      }
    }
    .theme-icon {
      font-size: 0.95rem;
      line-height: 1;
    }
    .theme-text {
      font-weight: 650;
    }
    .mobile-theme-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 10px 14px;
      border-radius: var(--mb-radius);
      border: 1px solid var(--mb-border);
      background: var(--mb-surface-2);
      color: var(--mb-text);
      font-size: 0.9rem;
      font-weight: 650;
      cursor: pointer;
      margin-top: 6px;
      transition: all 0.2s ease;
      &:hover {
        background: var(--mb-primary-soft);
        color: var(--mb-primary-strong);
        border-color: var(--mb-primary);
      }
    }
    .footer-theme-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 999px;
      background: var(--mb-surface-2);
      color: var(--mb-text);
      font-weight: 650;
      font-size: 0.82rem;
      text-decoration: none;
      border: 1px solid var(--mb-border);
      cursor: pointer;
      transition: all 0.2s ease;
      &:hover {
        background: var(--mb-primary-soft);
        color: var(--mb-primary);
        border-color: var(--mb-primary);
      }
    }
  `,
})
export class PublicLayoutComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly themeService = inject(ThemeService);

  protected readonly bannerVisible = signal(true);
  protected readonly bannerTitle = signal('🌟 24/7 National Mental Health Helplines Active');
  protected readonly bannerMsg = signal('Free, confidential support via Tele-MANAS (14416) & Kiran (1800-599-0019) is available across all Indian states.');
  protected readonly floatingPill = signal<any | null>(null);
  protected readonly mobileNavOpen = signal(false);

  toggleMobileNav() {
    this.mobileNavOpen.set(!this.mobileNavOpen());
  }

  closeMobileNav() {
    this.mobileNavOpen.set(false);
  }

  async ngOnInit() {
    try {
      let res = await fetch('/api/v1/governance/settings');
      if (!res.ok) {
        res = await fetch('https://mindbridge-api-x99i.onrender.com/api/v1/governance/settings');
      }
      if (res.ok) {
        const raw = await res.json();
        const data = raw?.data?.data || raw?.data || raw;
        if (data?.announcementBanner) {
          const b = data.announcementBanner;
          this.bannerVisible.set(b.enabled !== false);
          if (b.title) this.bannerTitle.set(b.title);
          if (b.message) this.bannerMsg.set(b.message);
        }

        // Check for active dynamic features
        if (Array.isArray(data?.dynamicFeatures)) {
          const activeFeatures = data.dynamicFeatures.filter((f: any) => f.enabled !== false);

          // Top Header priority
          const topHeaderFeature = activeFeatures.find(
            (f: any) => f.placement === 'TOP_HEADER' || f.type === 'ANNOUNCEMENT_BANNER',
          );
          if (topHeaderFeature) {
            this.bannerVisible.set(true);
            this.bannerTitle.set(topHeaderFeature.title);
            this.bannerMsg.set(topHeaderFeature.description);
          }

          // Floating Pill priority
          const pillFeature = activeFeatures.find(
            (f: any) => f.placement === 'SIDE_STICKY' || f.type === 'FLOATING_CRISIS_PILL',
          );
          if (pillFeature) {
            this.floatingPill.set(pillFeature);
          }
        }
      }
    } catch {
      // Fallback to default
    }
  }

  dismissBanner() {
    this.bannerVisible.set(false);
  }

  dismissFloatingPill() {
    this.floatingPill.set(null);
  }
}
