import { Component, inject, ChangeDetectionStrategy, signal, computed, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Role } from '@mindbridge/shared-types';
import { AuthService } from '../core/auth/auth.service';
import { ThemeService } from '../core/services/theme.service';
import { TelehealthService } from '../core/services/telehealth.service';
import { PwaService } from '../core/services/pwa.service';
import { apiUrl } from '../core/api/api.service';
import { TeamsTelehealthModalComponent } from '../shared/ui/teams-telehealth-modal';
import { AppDownloadModalComponent } from '../shared/ui/app-download-modal';
import { ContactModalComponent } from '../shared/ui/contact-modal';

@Component({
  selector: 'mb-public-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TeamsTelehealthModalComponent, AppDownloadModalComponent, ContactModalComponent],
  template: `
    <a class="skip-link" href="#main">Skip to content</a>

    <!-- DYNAMIC SUPER ADMIN ANNOUNCEMENT BANNER -->
    @if (bannerVisible()) {
      <aside class="announcement-bar" role="region" aria-label="Announcement">
        <div class="container announcement-inner">
          <div class="announcement-left">
            <span class="announcement-badge">LIVE NOTICE</span>
            <strong class="announcement-title">{{ cleanText(bannerTitle()) }}</strong>
            <span class="announcement-text">{{ cleanText(bannerMsg()) }}</span>
          </div>
          <div class="announcement-actions">
            <a routerLink="/crisis" class="announcement-btn">Crisis Helplines (14416) →</a>
            <button class="announcement-close" (click)="dismissBanner()" aria-label="Dismiss banner">×</button>
          </div>
        </div>
      </aside>
    }

    <!-- CLINICAL EMERGENCY HELPLINE TOP RIBBON -->
    <div class="clinical-top-ribbon">
      <div class="container clinical-top-inner">
        <div class="top-ribbon-left">
          <span class="ribbon-tag">24/7 CRISIS HELPLINE</span>
          <span class="ribbon-text">
            Tele-MANAS: <a href="tel:14416" class="top-tel-link"><strong>14416</strong></a> ·
            Kiran: <a href="tel:18005990019" class="top-tel-link"><strong>1800-599-0019</strong></a> ·
            Free & Confidential Support
          </span>
        </div>
        <div class="top-ribbon-right">
          <a routerLink="/crisis" class="top-crisis-link">Emergency Support Directory →</a>
        </div>
      </div>
    </div>

    <header class="site-header">
      <div class="container row-between">
        <a routerLink="/" class="brand" aria-label="MindBridge Healthcare">
          <span class="brand-medical-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </span>
          <div class="brand-headings">
            <span class="brand-name">MindBridge<span class="brand-dot">.health</span></span>
            <span class="brand-tagline">Clinical Mental Healthcare</span>
          </div>
        </a>
        <nav class="nav" aria-label="Main Navigation">
          <a routerLink="/professionals" routerLinkActive="active">Specialists & Doctors</a>
          <a routerLink="/how-it-works" routerLinkActive="active">Video Consultations</a>
          <a routerLink="/self-help" routerLinkActive="active">Clinical Self-Help</a>
          <button type="button" class="nav-contact-btn" (click)="openContactModal()">
            <span>Contact via Email</span>
          </button>
        </nav>
        <div class="row header-cta-group">
          <!-- Install App Button -->
          <button
            type="button"
            class="header-app-btn"
            (click)="pwa.openDownloadModal()"
            title="Download MindBridge Mobile App"
          >
            <span>Get App</span>
          </button>

          <button
            type="button"
            class="theme-toggle-btn"
            (click)="themeService.toggleTheme()"
            [attr.aria-label]="themeService.isDark() ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
            [title]="themeService.isDark() ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          >
            @if (themeService.isDark()) {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
              </svg>
            } @else {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            }
          </button>

          @if (auth.isAuthenticated()) {
            <a [routerLink]="auth.homeFor()" class="btn btn-sm btn-primary header-dashboard-btn">My Dashboard</a>
          } @else {
            <a routerLink="/login" class="nav-signin-link">Sign In</a>
            <a routerLink="/patient/dashboard" class="btn btn-sm btn-primary-elevated header-consult-btn">
              <span>Book Consultation</span>
            </a>
          }
          <a routerLink="/crisis" class="header-crisis-btn" title="Emergency Crisis Helpline">Crisis: 14416</a>
          <button class="mobile-nav-toggle" (click)="toggleMobileNav()" aria-label="Toggle navigation">
            {{ mobileNavOpen() ? '✕' : '☰' }}
          </button>
        </div>
      </div>

      <!-- Mobile Navigation Drawer -->
      @if (mobileNavOpen()) {
        <nav class="mobile-nav-drawer" aria-label="Mobile Navigation">
          <button
            type="button"
            class="mobile-pwa-btn"
            (click)="pwa.openDownloadModal(); closeMobileNav()"
          >
            <span>Download Mobile App</span>
            <span class="badge badge-primary">PWA</span>
          </button>
          <button
            type="button"
            class="mobile-telehealth-btn"
            (click)="telehealth.openLauncher(); closeMobileNav()"
          >
            <span>Consult On-Duty Specialist</span>
            <span class="badge badge-success">3 Online</span>
          </button>

          <a routerLink="/professionals" routerLinkActive="active" (click)="closeMobileNav()">Specialists & Doctors</a>
          <a routerLink="/how-it-works" routerLinkActive="active" (click)="closeMobileNav()">Video Consultations</a>
          <a routerLink="/self-help" routerLinkActive="active" (click)="closeMobileNav()">Clinical Self-Help</a>
          <button type="button" class="mobile-contact-nav-btn" (click)="openContactModal(); closeMobileNav()">
            Contact via Email (Clinical Support)
          </button>
          <button
            type="button"
            class="mobile-theme-btn"
            (click)="themeService.toggleTheme()"
          >
            <span>Display Theme</span>
            <span>{{ themeService.isDark() ? 'Light Mode' : 'Dark Mode' }}</span>
          </button>
        </nav>
      }
    </header>
    <main id="main" tabindex="-1"><router-outlet /></main>

    <!-- REPOLISHED HIGH-END SAAS FOOTER -->
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <!-- Col 1: Brand & Helplines -->
          <div class="footer-col brand-col">
            <div class="brand footer-brand"><span class="logo">◐</span> MindBridge Healthcare</div>
            <p class="disclaimer">
              Accredited clinical recovery pathways, 24/7 AI companion reflection, and instant video consultations with AIIMS-verified psychiatrists.
            </p>
            <div class="emergency-badge-box">
              <span class="pulse-red-dot"></span>
              <span>24/7 National Mental Health Helpline: <strong>14416</strong> (Tele-MANAS)</span>
            </div>
            <div class="trust-tags">
              <span>AES-256 Encrypted</span> ·
              <span>NMC Verified Doctors</span> ·
              <span>124+ Partner NGOs</span>
            </div>
          </div>

          <!-- Col 2: Clinical Care -->
          <div class="footer-col">
            <h4>Clinical Care</h4>
            <ul class="footer-links-clean">
              <li><a routerLink="/professionals">Find a Specialist</a></li>
              <li><button type="button" class="link-clean-btn" (click)="telehealth.openLauncher()">Doctor Video Consultation</button></li>
              <li><a routerLink="/self-help">Self-Help & CBT Modules</a></li>
              <li><a routerLink="/crisis">Emergency Crisis Helplines</a></li>
            </ul>
          </div>

          <!-- Col 3: Trust & Governance -->
          <div class="footer-col">
            <h4>Governance & Ethics</h4>
            <ul class="footer-links-clean">
              <li><a routerLink="/legal/privacy">Privacy Notice</a></li>
              <li><a routerLink="/legal/terms">Terms of Service</a></li>
              <li><a routerLink="/legal/ai">How We Use AI</a></li>
              <li><a routerLink="/impact">Public Impact Telemetry</a></li>
              <li><button type="button" class="link-clean-btn" (click)="openContactModal()">Contact Clinical Support</button></li>
            </ul>
          </div>

          <!-- Col 4: Apps & Contact -->
          <div class="footer-col">
            <h4>Apps & Support</h4>
            <ul class="footer-links-clean">
              <li>
                <button type="button" class="footer-app-install-btn" (click)="pwa.openDownloadModal()">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>
                  </svg>
                  <span>Download Mobile App</span>
                </button>
              </li>
              <li><button type="button" class="link-clean-btn" (click)="openContactModal()">Clinical Helpdesk via Email</button></li>
              <li><a href="mailto:support@mindbridge.health" class="link-clean-btn">support&#64;mindbridge.health</a></li>
              <li><a routerLink="/how-it-works">How Platform Works</a></li>
              <li>
                <button type="button" class="footer-theme-toggle" (click)="themeService.toggleTheme()">
                  {{ themeService.isDark() ? 'Switch to Light Mode' : 'Switch to Dark Mode' }}
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom-row">
          <p class="copyright">© 2026 MindBridge Healthcare Foundation. Accredited Mental Healthcare. All rights reserved.</p>
          <div class="bottom-legal-row">
            <a routerLink="/legal/privacy">Privacy</a>
            <span>•</span>
            <a routerLink="/legal/terms">Terms</a>
            <span>•</span>
            <a routerLink="/legal/ai">AI Ethics</a>
            <span>•</span>
            <a routerLink="/crisis">Crisis Support (14416)</a>
          </div>
        </div>
      </div>
    </footer>

    <!-- DYNAMIC SUPER ADMIN FLOATING PILL (SIDE_STICKY) -->
    @if (floatingPill(); as pill) {
      <div class="dynamic-floating-pill" [class]="'pill-theme-' + pill.themeColor">
        <a [href]="pill.ctaLink" class="floating-pill-content">
          <span class="pill-medical-bullet">●</span>
          <div class="pill-text-col">
            <span class="pill-badge-tag">{{ cleanText(pill.badgeLabel || 'CLINICAL TOOL') }}</span>
            <strong class="pill-title">{{ cleanText(pill.title) }}</strong>
          </div>
          <span class="pill-arrow">→</span>
        </a>
        <button class="pill-close-btn" (click)="dismissFloatingPill()" title="Dismiss">×</button>
      </div>
    }

    <!-- MICROSOFT TEAMS INCOMING CALL ALERT & TELEHEALTH CONSULTATION SUITE -->
    <mb-teams-telehealth-modal />

    <!-- MOBILE PWA APP DOWNLOAD MODAL -->
    <mb-app-download-modal />

    <!-- CLINICAL CONTACT VIA EMAIL MODAL -->
    <mb-contact-modal [open]="contactModalOpen()" (close)="contactModalOpen.set(false)" />

    <!-- MOBILE BOTTOM NAVIGATION DOCK (Shown on viewports <= 768px) -->
    <nav class="mobile-bottom-dock" aria-label="Mobile Navigation Dock">
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="dock-item">
        <svg class="dock-svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span class="dock-label">Home</span>
      </a>
      <a routerLink="/professionals" routerLinkActive="active" class="dock-item">
        <svg class="dock-svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>
        </svg>
        <span class="dock-label">Specialists</span>
      </a>
      <button type="button" class="dock-item dock-telehealth-pulse" (click)="telehealth.openLauncher()">
        <svg class="dock-svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11"/><rect width="14" height="12" x="2" y="6" rx="2"/>
        </svg>
        <span class="dock-label">Consult</span>
      </button>
      <button type="button" class="dock-item" (click)="pwa.openDownloadModal()">
        <svg class="dock-svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>
        </svg>
        <span class="dock-label">App</span>
      </button>
      @if (auth.isAuthenticated()) {
        <a [routerLink]="auth.homeFor()" routerLinkActive="active" class="dock-item">
          <svg class="dock-svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/>
          </svg>
          <span class="dock-label">Account</span>
        </a>
      } @else {
        <a routerLink="/login" routerLinkActive="active" class="dock-item">
          <svg class="dock-svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/>
          </svg>
          <span class="dock-label">Sign In</span>
        </a>
      }
    </nav>
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

    /* Top Clinical Helpline Ribbon */
    .clinical-top-ribbon {
      background: var(--mb-primary-soft);
      border-bottom: 1px solid rgba(2, 132, 199, 0.2);
      padding: 6px 0;
      font-size: 0.82rem;
    }
    .clinical-top-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }
    .top-ribbon-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .ribbon-tag {
      font-weight: 800;
      font-size: 0.72rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--mb-crisis);
      background: var(--mb-crisis-soft);
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid rgba(220, 38, 38, 0.2);
    }
    .ribbon-text {
      color: var(--mb-text);
      font-weight: 500;
    }
    .top-tel-link {
      color: var(--mb-primary-strong);
      text-decoration: none;
      font-weight: 700;
      &:hover { text-decoration: underline; }
    }
    .top-crisis-link {
      color: var(--mb-primary-strong);
      font-weight: 650;
      font-size: 0.8rem;
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }

    /* Site Header */
    .site-header {
      background: var(--mb-surface);
      border-bottom: 1px solid var(--mb-border);
      padding: max(8px, env(safe-area-inset-top, 8px)) 0 8px;
      position: sticky;
      top: 0;
      z-index: 50;
      backdrop-filter: blur(12px);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }
    .site-header .container.row-between {
      flex-wrap: nowrap;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      text-decoration: none;
      color: var(--mb-text);
      display: inline-flex;
      gap: 10px;
      align-items: center;
      flex-shrink: 0;
      min-width: 0;
    }
    .brand-medical-mark {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, var(--mb-primary), var(--mb-primary-strong));
      color: #fff;
      border-radius: 7px;
      box-shadow: 0 2px 6px rgba(2, 132, 199, 0.3);
      flex-shrink: 0;
    }
    .brand-headings {
      display: flex;
      flex-direction: column;
      line-height: 1.15;
    }
    .brand-name {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--mb-text);
    }
    .brand-dot {
      color: var(--mb-primary);
    }
    .brand-tagline {
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--mb-text-muted);
    }
    .nav {
      display: flex;
      gap: 22px;
      align-items: center;
      flex-wrap: wrap;
    }
    .nav a {
      color: var(--mb-text-muted);
      text-decoration: none;
      font-weight: 600;
      font-size: 0.92rem;
      transition: all 0.15s ease;
    }
    .nav a.active,
    .nav a:hover {
      color: var(--mb-primary);
    }
    .header-cta-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header-app-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 12px;
      border-radius: var(--mb-radius-sm);
      border: 1px solid var(--mb-border);
      background: var(--mb-surface-2);
      color: var(--mb-text);
      font-weight: 650;
      font-size: 0.82rem;
      cursor: pointer;
      transition: all 0.15s ease;
      &:hover {
        background: var(--mb-primary-soft);
        color: var(--mb-primary-strong);
        border-color: var(--mb-primary);
      }
    }
    .nav-signin-link {
      font-size: 0.9rem;
      font-weight: 650;
      color: var(--mb-text);
      padding: 6px 10px;
      text-decoration: none;
      &:hover { color: var(--mb-primary); }
    }
    .header-crisis-btn {
      display: inline-flex;
      align-items: center;
      padding: 6px 12px;
      border-radius: var(--mb-radius-sm);
      background: var(--mb-crisis-soft);
      color: var(--mb-crisis);
      border: 1px solid rgba(220, 38, 38, 0.35);
      font-weight: 750;
      font-size: 0.82rem;
      text-decoration: none;
      transition: all 0.15s ease;
      &:hover {
        background: var(--mb-crisis);
        color: #fff;
      }
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

    /* Header app install button */
    .btn-app-install-header {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 999px;
      background: linear-gradient(135deg, rgba(13, 148, 136, 0.12), rgba(37, 99, 235, 0.12));
      border: 1px solid rgba(13, 148, 136, 0.35);
      color: var(--mb-primary);
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s ease;
      &:hover {
        background: linear-gradient(135deg, #0d9488, #2563eb);
        color: #ffffff;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
      }
    }

    .btn-portal-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.4);
      color: #6366f1;
      font-weight: 700;
      font-size: 0.85rem;
      text-decoration: none;
      transition: all 0.2s ease;
      &:hover {
        background: #6366f1;
        color: #ffffff;
        transform: translateY(-1px);
      }
    }

    /* Mobile drawer PWA button */
    .mobile-pwa-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 10px 14px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0d9488 0%, #2563eb 100%);
      color: #fff;
      border: none;
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
    }

    .mobile-admin-choice-link {
      background: rgba(99, 102, 241, 0.12);
      color: #6366f1 !important;
      padding: 8px 12px !important;
      border-radius: 8px;
      border: 1px solid rgba(99, 102, 241, 0.3) !important;
      font-weight: 700 !important;
    }

    /* Multi-column SaaS Footer */
    .site-footer {
      border-top: 1px solid var(--mb-border);
      padding: var(--mb-space-7) 0 var(--mb-space-5);
      background: var(--mb-surface);
      margin-top: var(--mb-space-7);
    }
    .footer-grid {
      display: grid;
      grid-template-columns: 1.8fr 1fr 1fr 1.2fr;
      gap: 36px;
      margin-bottom: 36px;
    }
    .footer-col {
      h4 {
        font-size: 0.95rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 16px;
        color: var(--mb-text);
      }
    }
    .brand-col {
      .footer-brand {
        font-size: 1.35rem;
        font-weight: 800;
        margin-bottom: 10px;
      }
      .disclaimer {
        color: var(--mb-text-muted);
        font-size: 0.88rem;
        line-height: 1.5;
        margin-bottom: 14px;
      }
    }
    .emergency-badge-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 10px;
      background: var(--mb-crisis-soft);
      border: 1px solid var(--mb-crisis);
      color: var(--mb-text);
      font-size: 0.82rem;
      margin-bottom: 12px;
      strong { color: var(--mb-crisis); }
    }
    .pulse-red-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25);
      flex-shrink: 0;
    }
    .trust-tags {
      font-size: 0.78rem;
      color: var(--mb-text-muted);
    }
    .footer-links-clean {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
      li a, .link-clean-btn {
        color: var(--mb-text-muted);
        text-decoration: none;
        font-size: 0.9rem;
        transition: all 0.15s ease;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        text-align: left;
        &:hover {
          color: var(--mb-primary);
          transform: translateX(2px);
        }
      }
    }
    .footer-app-install-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 10px;
      background: var(--mb-primary-soft);
      color: var(--mb-primary-strong);
      font-weight: 700;
      font-size: 0.85rem;
      border: 1px solid var(--mb-border);
      cursor: pointer;
      transition: all 0.2s ease;
      &:hover {
        background: var(--mb-primary);
        color: #fff;
      }
    }
    .footer-portal-link {
      color: #6366f1 !important;
      font-weight: 700 !important;
      font-size: 0.88rem !important;
    }
    .footer-admin-pill {
      color: #7c3aed !important;
      font-weight: 600;
      font-size: 0.88rem;
    }
    .footer-theme-toggle {
      background: var(--mb-surface-2);
      border: 1px solid var(--mb-border);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.82rem;
      cursor: pointer;
      color: var(--mb-text);
      &:hover {
        background: var(--mb-primary-soft);
        color: var(--mb-primary-strong);
      }
    }
    .footer-bottom-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--mb-border);
      padding-top: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .copyright {
      margin: 0;
      font-size: 0.82rem;
      color: var(--mb-text-muted);
    }
    .bottom-legal-row {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.82rem;
      color: var(--mb-text-muted);
      a {
        color: var(--mb-text-muted);
        text-decoration: none;
        &:hover { color: var(--mb-primary); }
      }
    }

    /* Mobile Bottom Navigation Dock */
    .mobile-bottom-dock {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      min-height: 56px;
      height: auto;
      background: var(--mb-surface);
      border-top: 1px solid var(--mb-border);
      z-index: 1000;
      padding: 5px 8px calc(env(safe-area-inset-bottom, 0px) + 5px);
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.12);
      backdrop-filter: blur(14px);
      box-sizing: border-box;
    }
    @media (max-width: 768px) {
      .footer-grid {
        grid-template-columns: 1fr;
        gap: 24px;
      }
      .site-footer {
        padding-bottom: 80px;
      }
      .mobile-bottom-dock {
        display: flex;
        align-items: center;
        justify-content: space-around;
      }
    }
    .dock-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      color: var(--mb-text-muted);
      text-decoration: none;
      padding: 2px 6px;
      cursor: pointer;
      font-family: inherit;
      line-height: 1;
      gap: 3px;
      transition: all 0.15s ease;
      &.active {
        color: var(--mb-primary);
        font-weight: 700;
      }
      &:hover {
        color: var(--mb-primary);
      }
    }
    .dock-svg {
      color: var(--mb-text-muted);
      transition: color 0.15s ease, transform 0.15s ease;
    }
    .dock-item.active .dock-svg {
      color: var(--mb-primary);
    }
    .dock-label {
      font-size: 0.68rem;
      line-height: 1;
      font-weight: 600;
      white-space: nowrap;
    }
    .dock-telehealth-pulse {
      background: var(--mb-primary);
      color: #fff !important;
      border-radius: 8px;
      padding: 5px 10px;
      .dock-svg {
        color: #fff;
      }
      .dock-label {
        color: #fff;
        font-weight: 700;
      }
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

    @media (max-width: 768px) {
      .announcement-bar {
        font-size: 0.78rem;
        padding: 6px 0;
        overflow-x: hidden;
      }
      .announcement-inner {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
      }
      .announcement-actions {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .clinical-top-ribbon {
        display: none !important;
      }
      .brand {
        gap: 6px;
        min-width: 0;
        flex-shrink: 1;
        overflow: hidden;
      }
      .brand-medical-mark {
        width: 28px;
        height: 28px;
        flex-shrink: 0;
      }
      .brand-headings {
        line-height: 1.1;
        min-width: 0;
        overflow: hidden;
      }
      .brand-tagline {
        display: none !important;
      }
      .brand-name {
        font-size: 1.05rem !important;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .header-cta-group {
        gap: 6px;
        flex-shrink: 0;
        flex-wrap: nowrap;
      }
      .header-app-btn,
      .theme-toggle-btn,
      .nav-signin-link,
      .header-consult-btn,
      .header-dashboard-btn,
      .btn-app-install-header,
      .btn-telehealth-instant,
      .btn-portal-pill {
        display: none !important;
      }
      .header-crisis-btn {
        display: inline-flex !important;
        align-items: center;
        padding: 4px 8px;
        font-size: 0.72rem;
        border-radius: 999px;
        white-space: nowrap;
      }
      .mobile-nav-toggle {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        padding: 0;
        font-size: 1.1rem;
        border-radius: 8px;
        border: 1px solid var(--mb-border);
        background: var(--mb-surface-2);
        color: var(--mb-text);
        flex-shrink: 0;
      }
      #main {
        padding-bottom: calc(88px + env(safe-area-inset-bottom, 16px)) !important;
        overflow-x: hidden;
        width: 100%;
        max-width: 100%;
      }
      .site-footer {
        padding-bottom: calc(100px + env(safe-area-inset-bottom, 16px)) !important;
        overflow-x: hidden;
      }
    }

    @media (max-width: 480px) {
      .brand-name {
        font-size: 1.05rem !important;
      }
      .header-cta-group {
        gap: 6px;
      }
      .header-crisis-btn {
        padding: 4px 8px;
        font-size: 0.72rem;
      }
    }

    /* Dynamic Floating Pill */
    .dynamic-floating-pill {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99;
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
    @media (max-width: 992px) {
      .dynamic-floating-pill {
        display: none !important;
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
    .pill-medical-bullet {
      color: #14b8a6;
      font-size: 10px;
      line-height: 1;
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
    .btn-telehealth-instant {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-height: 36px;
      padding: 0 14px;
      border-radius: 999px;
      border: 1px solid rgba(16, 185, 129, 0.4);
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      &:hover {
        background: #10b981;
        color: #ffffff;
        border-color: #10b981;
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
      }
    }
    :host-context([data-theme='dark']) .btn-telehealth-instant {
      color: #34d399;
      background: rgba(16, 185, 129, 0.2);
      border-color: rgba(52, 211, 153, 0.4);
      &:hover {
        background: #10b981;
        color: #0c1513;
      }
    }
    .live-dot-pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      animation: pulse 1.5s infinite;
    }
    .mobile-telehealth-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 12px 14px;
      border-radius: var(--mb-radius);
      border: 1px solid rgba(16, 185, 129, 0.4);
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(13, 148, 136, 0.1) 100%);
      color: var(--mb-text);
      font-size: 0.92rem;
      font-weight: 750;
      cursor: pointer;
      margin-bottom: 6px;
      &:hover {
        border-color: var(--mb-primary);
        background: var(--mb-primary-soft);
      }
    }

    .nav-contact-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(13, 148, 136, 0.08);
      border: 1px solid rgba(13, 148, 136, 0.3);
      color: #0d9488;
      font-size: 0.88rem;
      font-weight: 650;
      padding: 6px 14px;
      border-radius: 999px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s ease;
      &:hover {
        background: #0d9488;
        color: #ffffff;
        border-color: #0d9488;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
      }
    }
    :host-context([data-theme='dark']) .nav-contact-btn {
      background: rgba(13, 148, 136, 0.16);
      border-color: rgba(20, 184, 166, 0.35);
      color: #2dd4bf;
      &:hover {
        background: #14b8a6;
        color: #042f2e;
        border-color: #14b8a6;
      }
    }
    .mobile-contact-nav-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      text-align: left;
      background: rgba(13, 148, 136, 0.1);
      border: 1px solid rgba(13, 148, 136, 0.25);
      color: var(--mb-primary);
      font-size: 0.92rem;
      font-weight: 700;
      padding: 12px 14px;
      border-radius: var(--mb-radius);
      cursor: pointer;
      font-family: inherit;
      margin-top: 4px;
      &:hover {
        background: var(--mb-primary);
        color: #ffffff;
      }
    }
  `,
})
export class PublicLayoutComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
  protected readonly telehealth = inject(TelehealthService);
  protected readonly pwa = inject(PwaService);

  protected readonly contactModalOpen = signal(false);

  openContactModal() {
    this.contactModalOpen.set(true);
  }

  protected readonly isSuperAdmin = computed(() => false);

  protected readonly bannerVisible = signal(true);
  protected readonly bannerTitle = signal('24/7 National Mental Health Helplines Active');
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
      let res = await fetch(apiUrl('/governance/settings'));
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

  cleanText(str?: string | null): string {
    if (!str) return '';
    return str.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
  }
}
