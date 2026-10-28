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
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="shell" [class.open]="menuOpen()">
      <aside class="sidebar" aria-label="Sections">
        <a class="brand" [routerLink]="auth.homeFor()"
          ><span class="logo" aria-hidden="true">◐</span> MindBridge</a
        >
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
          <div class="container">
            <div class="alert alert-warning" role="status">
              Please confirm your email address to book appointments, message professionals and use
              the AI companion.
              <a routerLink="/verify-email">Resend or enter the link</a>
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
  protected readonly auth = inject(AuthService);
  protected readonly notifications = inject(NotificationsService);
  private readonly realtime = inject(RealtimeService);
  private readonly router = inject(Router);
  protected readonly menuOpen = signal(false);
  protected readonly isPatient = computed(() => this.auth.role() === Role.PATIENT);

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

  async signOut() {
    this.realtime.disconnect();
    await this.auth.logout();
  }
}
