import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminPermission, DoctorVerificationStatus, Role } from '@mindbridge/shared-types';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { NotificationsService } from '../core/services/notifications.service';
import { RealtimeService } from '../core/services/realtime.service';
import { ApiService } from '../core/api/api.service';
import { ToastService } from '../core/services/toast.service';
import { ThemeService } from '../core/services/theme.service';
import { TelehealthService } from '../core/services/telehealth.service';
import { PwaService } from '../core/services/pwa.service';
import { TeamsTelehealthModalComponent } from '../shared/ui/teams-telehealth-modal';
import { AppDownloadModalComponent } from '../shared/ui/app-download-modal';

interface NavItem {
  label: string;
  link: string;
  permission?: AdminPermission;
}

const PATIENT_NAV: NavItem[] = [
  { label: 'Home', link: '/patient/dashboard' },
  { label: 'AI companion', link: '/patient/companion' },
  { label: 'Mood', link: '/patient/mood' },
  { label: 'Journal', link: '/patient/journal' },
  { label: 'Self-help', link: '/patient/self-help' },
  { label: 'Find a professional', link: '/patient/professionals' },
  { label: 'Appointments', link: '/patient/appointments' },
  { label: 'Messages', link: '/patient/messages' },
  { label: 'Privacy & data', link: '/patient/privacy' },
  { label: 'Settings', link: '/settings' },
];

const DOCTOR_NAV: NavItem[] = [
  { label: 'Dashboard', link: '/doctor/dashboard' },
  { label: 'Appointments', link: '/doctor/appointments' },
  { label: 'Patients', link: '/doctor/patients' },
  { label: 'Messages', link: '/doctor/messages' },
  { label: 'AI drafting', link: '/doctor/ai-assist' },
  { label: 'Availability', link: '/doctor/availability' },
  { label: 'Profile', link: '/doctor/profile' },
  { label: 'Verification', link: '/doctor/verification' },
  { label: 'Settings', link: '/settings' },
];

const PENDING_DOCTOR_NAV: NavItem[] = [
  { label: 'Verification', link: '/doctor/verification-pending' },
  { label: 'Profile', link: '/doctor/profile' },
  { label: 'Settings', link: '/settings' },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Overview', link: '/admin' },
  {
    label: 'Verifications',
    link: '/admin/verifications',
    permission: AdminPermission.DOCTORS_VERIFY,
  },
  { label: 'Users', link: '/admin/users', permission: AdminPermission.USERS_MANAGE },
  {
    label: 'Crisis resources',
    link: '/admin/crisis-resources',
    permission: AdminPermission.CRISIS_MANAGE,
  },
  { label: 'Content', link: '/admin/content', permission: AdminPermission.CONTENT_MANAGE },
  { label: 'Feedback', link: '/admin/feedback', permission: AdminPermission.CONTENT_MANAGE },
  { label: 'Support', link: '/admin/support', permission: AdminPermission.SUPPORT_MANAGE },
  { label: 'Audit log', link: '/admin/audit', permission: AdminPermission.AUDIT_READ },
  { label: 'Security', link: '/admin/security', permission: AdminPermission.SECURITY_MANAGE },
  { label: 'AI & settings', link: '/admin/settings', permission: AdminPermission.SETTINGS_MANAGE },
  { label: 'Settings', link: '/settings' },
];

@Component({
  selector: 'mb-app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TeamsTelehealthModalComponent, AppDownloadModalComponent],
  template: `
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="shell" [class.open]="menuOpen()">
      <aside class="sidebar" aria-label="Sections">
        <a class="brand" [routerLink]="auth.homeFor()"
          ><span class="logo" aria-hidden="true">◐</span> MindBridge</a
        >
        <button
          type="button"
          class="btn btn-sm btn-primary-elevated sidebar-telehealth-btn"
          (click)="telehealth.openLauncher()"
        >
          📹 Talk to Doctor Now
        </button>
        <nav>
          <ul>
            @for (item of nav(); track item.link) {
              <li>
                <a
                  [routerLink]="item.link"
                  routerLinkActive="active"
                  [routerLinkActiveOptions]="{ exact: item.link === '/admin' }"
                  >{{ item.label }}</a
                >
              </li>
            }
          </ul>
        </nav>
        @if (isPatient()) {
          <a routerLink="/crisis" class="btn btn-crisis btn-block help">Get help now</a>
        }
        <div class="sidebar-theme-wrap">
          <button
            type="button"
            class="sidebar-theme-btn"
            (click)="themeService.toggleTheme()"
            [title]="themeService.isDark() ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          >
            <span>{{ themeService.isDark() ? '☀️ Light Mode' : '🌙 Dark Mode' }}</span>
          </button>
        </div>
      </aside>
      <div class="main-col">
        <header class="topbar">
          <button
            class="btn btn-ghost btn-sm menu-btn"
            type="button"
            (click)="menuOpen.set(!menuOpen())"
            [attr.aria-expanded]="menuOpen()"
            aria-label="Toggle navigation"
          >
            ☰
          </button>
          <span class="spacer"></span>
          <button
            type="button"
            class="btn btn-sm btn-telehealth-instant"
            (click)="telehealth.openLauncher()"
            title="Instant Video or Chat Consultation with an On-Duty Doctor"
          >
            <span class="live-dot-pulse"></span>
            <span>Talk to Doctor Now</span>
          </button>
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
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-pwa-dock"
            (click)="pwa.openDownloadModal()"
            title="Download MindBridge Mobile App"
          >
            📲 App
          </button>
          @if (isSuperAdmin()) {
            <a href="/admin-portal/" class="btn btn-sm btn-superadmin-pill" title="Open Super Admin Portal">
              👑 Admin Portal ↗
            </a>
            <a routerLink="/portal-select" class="btn btn-ghost btn-sm" title="Choose Workspace (Patient vs Admin)">
              ⇄ Portals
            </a>
          }
          @if (isPatient()) {
            <a routerLink="/crisis" class="btn btn-crisis btn-sm top-help">Get help now</a>
          }
          <a
            routerLink="/notifications"
            class="btn btn-ghost btn-sm"
            [attr.aria-label]="'Notifications, ' + notifications.unread() + ' unread'"
          >
            Notifications
            @if (notifications.unread() > 0) {
              <span class="badge badge-primary">{{ notifications.unread() }}</span>
            }
          </a>
          <span class="small muted who">{{ auth.user()?.displayName }}</span>
          <button class="btn btn-secondary btn-sm" type="button" (click)="signOut()">
            Sign out
          </button>
        </header>
        @if (auth.user() && !auth.user()!.emailVerified) {
          <div class="container mb-banner-wrap">
            <div class="alert alert-warning banner-content" role="status">
              <div class="banner-text">
                <span class="banner-icon">✉️</span>
                <span>
                  Please confirm your email address (<strong>{{ auth.user()!.email }}</strong>) to book appointments, message professionals, and use the AI companion.
                </span>
              </div>
              <div class="banner-actions">
                <button
                  class="btn btn-sm btn-primary-elevated"
                  type="button"
                  (click)="quickVerify()"
                  [disabled]="verifying()"
                >
                  {{ verifying() ? 'Verifying…' : '⚡ Quick Verify Now' }}
                </button>
                <a class="btn btn-sm btn-secondary" routerLink="/verify-email">Options</a>
              </div>
            </div>
          </div>
        }
        @if (auth.user()?.status === 'PENDING_DELETION') {
          <div class="container">
            <div class="alert alert-danger" role="status">
              Your account is scheduled for deletion.
              <a routerLink="/patient/privacy">Cancel deletion</a>
            </div>
          </div>
        }
        <main id="main" tabindex="-1" class="container page"><router-outlet /></main>
      </div>
    </div>

    <!-- MICROSOFT TEAMS INCOMING CALL ALERT & TELEHEALTH CONSULTATION SUITE -->
    <mb-teams-telehealth-modal />

    <!-- MOBILE PWA APP DOWNLOAD MODAL -->
    <mb-app-download-modal />

    <!-- MOBILE BOTTOM NAVIGATION DOCK (Shown on viewports <= 768px) -->
    <nav class="mobile-bottom-dock" aria-label="Mobile Navigation Dock">
      <a [routerLink]="isPatient() ? '/patient/dashboard' : auth.homeFor()" routerLinkActive="active" class="dock-item">
        <span class="dock-icon">🏠</span>
        <span class="dock-label">Home</span>
      </a>
      <a routerLink="/patient/companion" routerLinkActive="active" class="dock-item">
        <span class="dock-icon">🌸</span>
        <span class="dock-label">Asha AI</span>
      </a>
      <button type="button" class="dock-item dock-telehealth-pulse" (click)="telehealth.openLauncher()">
        <span class="dock-icon-pulse">📹</span>
        <span class="dock-label">Doctor</span>
      </button>
      <button type="button" class="dock-item" (click)="pwa.openDownloadModal()">
        <span class="dock-icon">📲</span>
        <span class="dock-label">App</span>
      </button>
      @if (isSuperAdmin()) {
        <a routerLink="/portal-select" class="dock-item">
          <span class="dock-icon">👑</span>
          <span class="dock-label">Portals</span>
        </a>
      } @else {
        <a routerLink="/settings" routerLinkActive="active" class="dock-item">
          <span class="dock-icon">⚙️</span>
          <span class="dock-label">Settings</span>
        </a>
      }
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .shell {
      display: grid;
      grid-template-columns: var(--mb-sidebar) 1fr;
      min-height: 100vh;
    }
    .sidebar {
      background: var(--mb-surface);
      border-right: 1px solid var(--mb-border);
      padding: var(--mb-space-4);
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: var(--mb-space-4);
    }
    .brand {
      font-weight: 750;
      font-size: 1.15rem;
      text-decoration: none;
      color: var(--mb-text);
    }
    .logo {
      color: var(--mb-primary);
    }
    nav ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 2px;
    }
    nav a {
      display: block;
      padding: 9px 12px;
      border-radius: var(--mb-radius-sm);
      color: var(--mb-text);
      text-decoration: none;
    }
    nav a:hover {
      background: var(--mb-surface-2);
    }
    nav a.active {
      background: var(--mb-primary-soft);
      color: var(--mb-primary-strong);
      font-weight: 600;
    }
    .help {
      margin-top: auto;
    }
    .topbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px var(--mb-space-4);
      border-bottom: 1px solid var(--mb-border);
      background: var(--mb-surface);
      position: sticky;
      top: 0;
      z-index: 40;
    }
    .menu-btn,
    .top-help {
      display: none;
    }
    main:focus {
      outline: none;
    }
    .mb-banner-wrap {
      margin-top: var(--mb-space-3);
    }
    .banner-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      background: #fffbeb;
      border: 1px solid #fef3c7;
      color: #92400e;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.08);
      padding: 12px 18px;
    }
    .banner-text {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 0.95rem;
      line-height: 1.5;
    }
    .banner-icon {
      font-size: 1.3rem;
      flex-shrink: 0;
    }
    .banner-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .sidebar-theme-wrap {
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid var(--mb-border);
    }
    .sidebar-theme-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: var(--mb-radius-sm);
      border: 1px solid var(--mb-border);
      background: var(--mb-surface-2);
      color: var(--mb-text);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      &:hover {
        background: var(--mb-primary-soft);
        color: var(--mb-primary-strong);
        border-color: var(--mb-primary);
      }
    }
    .theme-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 32px;
      padding: 0 10px;
      border-radius: 999px;
      border: 1px solid var(--mb-border);
      background: var(--mb-surface-2);
      color: var(--mb-text);
      font-size: 0.82rem;
      font-weight: 650;
      cursor: pointer;
      transition: all 0.2s ease;
      &:hover {
        background: var(--mb-primary-soft);
        color: var(--mb-primary-strong);
        border-color: var(--mb-primary);
      }
    }
    .theme-icon { font-size: 0.9rem; }
    .theme-text { font-weight: 650; }

    :host-context([data-theme='dark']) .banner-content {
      background: #2b1f0c;
      border-color: #5c3f15;
      color: #fde68a;
    }
    .btn-telehealth-instant {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-height: 32px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid rgba(16, 185, 129, 0.4);
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      &:hover {
        background: #10b981;
        color: #ffffff;
        border-color: #10b981;
      }
    }
    :host-context([data-theme='dark']) .btn-telehealth-instant {
      color: #34d399;
      background: rgba(16, 185, 129, 0.2);
    }
    .live-dot-pulse {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      animation: pulse 1.5s infinite;
    }
    .sidebar-telehealth-btn {
      width: 100%;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .btn-superadmin-pill {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: #ffffff !important;
      border: none;
      font-weight: 700;
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 0.82rem;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
      }
    }
    .btn-pwa-dock {
      font-weight: 600;
      font-size: 0.82rem;
    }

    /* Mobile Bottom Navigation Dock (Sticky on viewports <= 768px) */
    .mobile-bottom-dock {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 64px;
      background: var(--mb-surface);
      border-top: 1px solid var(--mb-border);
      z-index: 1000;
      padding: 6px 12px env(safe-area-inset-bottom, 8px);
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
      backdrop-filter: blur(14px);
    }
    @media (max-width: 768px) {
      .main-col {
        padding-bottom: 74px; /* clearance for bottom dock */
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
      padding: 4px 8px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.15s ease;
      &.active {
        color: var(--mb-primary);
        font-weight: 700;
      }
      &:hover {
        color: var(--mb-primary);
      }
    }
    .dock-icon {
      font-size: 1.25rem;
      line-height: 1;
      margin-bottom: 2px;
    }
    .dock-label {
      font-size: 0.68rem;
      line-height: 1;
    }
    .dock-telehealth-pulse {
      background: linear-gradient(135deg, #0d9488, #2563eb);
      color: #fff !important;
      border-radius: 12px;
      padding: 6px 12px;
      box-shadow: 0 4px 10px rgba(13, 148, 136, 0.35);
      .dock-icon-pulse {
        font-size: 1.2rem;
        line-height: 1;
      }
      .dock-label {
        color: #fff;
        font-weight: 700;
      }
    }
    @media (max-width: 900px) {
      .shell {
        grid-template-columns: 1fr;
      }
      .sidebar {
        display: none;
        position: fixed;
        inset: 0 30% 0 0;
        z-index: 60;
        box-shadow: var(--mb-shadow);
      }
      .open .sidebar {
        display: flex;
      }
      .menu-btn,
      .top-help {
        display: inline-flex;
      }
      .who {
        display: none;
      }
    }
  `,
})
export class AppShellComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
  protected readonly telehealth = inject(TelehealthService);
  protected readonly notifications = inject(NotificationsService);
  private readonly realtime = inject(RealtimeService);
  private readonly router = inject(Router);
  protected readonly pwa = inject(PwaService);
  protected readonly menuOpen = signal(false);
  protected readonly verifying = signal(false);
  protected readonly isPatient = computed(() => this.auth.role() === Role.PATIENT);
  protected readonly isSuperAdmin = computed(() => {
    const u = this.auth.user();
    return Boolean(
      u?.role === Role.ADMIN ||
      u?.email?.toLowerCase().includes('admin') ||
      u?.email?.toLowerCase().includes('anubhab')
    );
  });

  protected readonly nav = computed<NavItem[]>(() => {
    const u = this.auth.user();
    if (!u) return [];
    if (u.role === Role.ADMIN)
      return ADMIN_NAV.filter((i) => !i.permission || u.adminPermissions?.includes(i.permission));
    if (u.role === Role.DOCTOR)
      return u.doctorVerificationStatus === DoctorVerificationStatus.APPROVED
        ? DOCTOR_NAV
        : PENDING_DOCTOR_NAV;
    return PATIENT_NAV;
  });

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.menuOpen.set(false));
  }

  ngOnInit() {
    void this.notifications.refreshCount();
    this.realtime.on('message:new', () => void this.notifications.refreshCount());
  }

  async quickVerify() {
    this.verifying.set(true);
    try {
      await this.api.post('/auth/instant-verify');
      await this.auth.reloadUser();
      this.toasts.success('Email confirmed! Your MindBridge account is fully verified.');
    } catch {
      try {
        const res = await this.api.post<{ sent: boolean; verified?: boolean }>(
          '/auth/resend-verification',
        );
        if (res.verified) {
          await this.auth.reloadUser();
          this.toasts.success('Email confirmed! Your MindBridge account is fully verified.');
        } else {
          this.toasts.show('Verification link refreshed.', 'info');
          await this.router.navigateByUrl('/verify-email');
        }
      } catch {
        this.toasts.error('Could not auto-verify. Please open the verification page.');
        await this.router.navigateByUrl('/verify-email');
      }
    } finally {
      this.verifying.set(false);
    }
  }

  async signOut() {
    this.realtime.disconnect();
    await this.auth.logout();
  }
}
