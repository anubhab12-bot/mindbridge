import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'mb-portal-select',
  imports: [RouterLink],
  template: `
    <div class="portal-select-page">
      <div class="portal-select-container">
        <!-- Header -->
        <header class="portal-header">
          <div class="portal-badge">
            <span class="badge-icon">👑</span>
            <span>SUPER ADMINISTRATOR PRIVILEGES DETECTED</span>
          </div>
          <h1>Welcome back, <span class="highlight">{{ auth.user()?.displayName || 'Anubhab' }}</span></h1>
          <p class="subtitle">
            Your Google account is registered with elevated Super Admin credentials. Please choose your active workspace for this session:
          </p>
        </header>

        <!-- Two Portal Choice Cards -->
        <div class="portals-grid">
          <!-- PATIENT PORTAL CARD -->
          <div class="portal-card patient-card" (click)="enterPatient()">
            <div class="card-glow patient-glow"></div>
            <div class="card-icon-wrap patient-icon-wrap">
              <span class="card-icon">🏥</span>
              <span class="role-pill patient-pill">Patient Experience</span>
            </div>
            <h2>Enter as Patient</h2>
            <p class="portal-desc">
              Access personal mental healthcare, self-help reflection tools, and clinical telehealth services.
            </p>
            <ul class="portal-features">
              <li>
                <span class="check">✓</span>
                <span>Talk with 24/7 AI Companion <strong>Asha</strong> (Hindi, Bengali, English)</span>
              </li>
              <li>
                <span class="check">✓</span>
                <span>Connect with verified AIIMS psychiatrists via <strong>Instant Video / Chat</strong></span>
              </li>
              <li>
                <span class="check">✓</span>
                <span>Daily mood tracking, clinical assessments & encrypted journaling</span>
              </li>
              <li>
                <span class="check">✓</span>
                <span>View scheduled doctor appointments & meeting video links</span>
              </li>
            </ul>
            <button class="btn btn-primary-elevated portal-btn" type="button" (click)="$event.stopPropagation(); enterPatient()">
              <span>Launch Patient Portal</span>
              <span class="arrow">→</span>
            </button>
          </div>

          <!-- SUPER ADMIN PORTAL CARD -->
          <div class="portal-card admin-card" (click)="enterAdmin()">
            <div class="card-glow admin-glow"></div>
            <div class="card-icon-wrap admin-icon-wrap">
              <span class="card-icon">⚡</span>
              <span class="role-pill admin-pill">Super Admin Portal</span>
            </div>
            <h2>Enter as Super Admin</h2>
            <p class="portal-desc">
              Master control center for system governance, clinical verification, AI features, and live management.
            </p>
            <ul class="portal-features">
              <li>
                <span class="check check-admin">✓</span>
                <span><strong>AI Feature Planner & Live Site Maker</strong> (dual-viewport simulation)</span>
              </li>
              <li>
                <span class="check check-admin">✓</span>
                <span>Doctor medical council license verification & approval workflows</span>
              </li>
              <li>
                <span class="check check-admin">✓</span>
                <span>Emergency crisis alert broadcaster & terms/policy management</span>
              </li>
              <li>
                <span class="check check-admin">✓</span>
                <span>Live platform telemetry, security audit logs & user moderation</span>
              </li>
            </ul>
            <button class="btn btn-admin portal-btn" type="button" (click)="$event.stopPropagation(); enterAdmin()">
              <span>Launch Super Admin Portal</span>
              <span class="arrow">→</span>
            </button>
          </div>
        </div>

        <!-- Footer Switcher Info -->
        <div class="portal-footer">
          <p class="switch-hint">
            💡 <strong>Seamless Switching:</strong> You can toggle between <em>Patient View</em> and <em>Super Admin Portal</em> at any time using the quick portal switcher in the top navigation bar.
          </p>
          <div class="portal-footer-links">
            <a routerLink="/" class="link-muted">← Back to MindBridge Home</a>
            <button type="button" class="btn-link-signout" (click)="auth.logout()">Sign out</button>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .portal-select-page {
      min-height: calc(100vh - 120px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: clamp(32px, 5vw, 64px) 16px;
      background: radial-gradient(circle at 50% 20%, rgba(15, 110, 102, 0.08) 0%, transparent 60%);
    }

    .portal-select-container {
      width: 100%;
      max-width: 980px;
      margin: 0 auto;
    }

    .portal-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .portal-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 999px;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #d97706;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      margin-bottom: 16px;
    }

    :host-context([data-theme='dark']) .portal-badge {
      background: rgba(245, 158, 11, 0.18);
      border-color: rgba(245, 158, 11, 0.45);
      color: #fbbf24;
    }

    .portal-header h1 {
      font-size: clamp(1.8rem, 3.2vw, 2.5rem);
      font-weight: 700;
      margin-bottom: 12px;
      letter-spacing: -0.02em;
    }

    .highlight {
      background: linear-gradient(135deg, #0d9488 0%, #2563eb 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .subtitle {
      max-width: 620px;
      margin: 0 auto;
      color: var(--mb-text-muted);
      font-size: 1.05rem;
      line-height: 1.5;
    }

    .portals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 28px;
      margin-bottom: 36px;
    }

    .portal-card {
      position: relative;
      background: var(--mb-surface);
      border: 2px solid var(--mb-border);
      border-radius: 20px;
      padding: 32px 28px;
      cursor: pointer;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: var(--mb-shadow-lg);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        transform: translateY(-6px);
      }
    }

    .patient-card {
      &:hover {
        border-color: var(--mb-primary);
        box-shadow: 0 20px 40px -10px rgba(15, 110, 102, 0.25);
      }
    }

    .admin-card {
      &:hover {
        border-color: #6366f1;
        box-shadow: 0 20px 40px -10px rgba(99, 102, 241, 0.25);
      }
    }

    .card-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .card-icon {
      font-size: 2.2rem;
      line-height: 1;
    }

    .role-pill {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .patient-pill {
      background: var(--mb-primary-soft);
      color: var(--mb-primary-strong);
    }

    .admin-pill {
      background: rgba(99, 102, 241, 0.15);
      color: #6366f1;
    }

    :host-context([data-theme='dark']) .admin-pill {
      background: rgba(99, 102, 241, 0.25);
      color: #818cf8;
    }

    .portal-card h2 {
      font-size: 1.45rem;
      font-weight: 700;
      margin: 0 0 8px;
    }

    .portal-desc {
      color: var(--mb-text-muted);
      font-size: 0.95rem;
      line-height: 1.5;
      margin-bottom: 20px;
      min-height: 44px;
    }

    .portal-features {
      list-style: none;
      padding: 0;
      margin: 0 0 28px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;

      li {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        font-size: 0.9rem;
        line-height: 1.4;
        color: var(--mb-text);
      }
    }

    .check {
      color: var(--mb-primary);
      font-weight: bold;
      flex-shrink: 0;
      font-size: 1rem;
    }

    .check-admin {
      color: #6366f1;
    }

    .portal-btn {
      width: 100%;
      min-height: 48px;
      font-size: 1rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      border-radius: 12px;
      cursor: pointer;
    }

    .btn-admin {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: #ffffff;
      border: none;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);

      &:hover {
        background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
      }
    }

    .arrow {
      font-size: 1.1rem;
      transition: transform 0.2s ease;
    }

    .portal-card:hover .arrow {
      transform: translateX(4px);
    }

    .portal-footer {
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-radius: 16px;
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      text-align: center;
      box-shadow: var(--mb-shadow);
    }

    .switch-hint {
      margin: 0;
      font-size: 0.92rem;
      color: var(--mb-text);
      line-height: 1.5;

      strong {
        color: var(--mb-primary);
      }
    }

    .portal-footer-links {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--mb-border);
      padding-top: 14px;
    }

    .link-muted {
      color: var(--mb-text-muted);
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 500;

      &:hover {
        color: var(--mb-primary);
      }
    }

    .btn-link-signout {
      background: none;
      border: none;
      color: var(--mb-danger);
      font: inherit;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }

    @media (max-width: 640px) {
      .portals-grid {
        grid-template-columns: 1fr;
      }
      .portal-footer-links {
        flex-direction: column;
        gap: 10px;
      }
    }
  `,
})
export class PortalSelectPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  enterPatient() {
    try {
      localStorage.setItem('mb_active_workspace', 'patient');
    } catch {
      // storage quota or private mode
    }
    this.router.navigateByUrl('/patient/dashboard');
  }

  enterAdmin() {
    try {
      localStorage.setItem('mb_active_workspace', 'admin');
    } catch {
      // storage quota or private mode
    }
    window.location.href = '/admin-portal/';
  }
}
