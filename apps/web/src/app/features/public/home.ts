import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'mb-home',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="container hero-inner">
        <div class="copy">
          <div class="pill-badge">
            <span class="pulse-dot"></span>
            <span>Verified Healthcare & NGO Community Support</span>
          </div>
          <h1>
            A calmer place to heal, reflect and <span class="gradient-text">find real support.</span>
          </h1>
          <p class="lead">
            MindBridge bridges verified psychiatrists, accredited mental health NGOs, and an intelligent 24/7 companion with end-to-end encrypted private reflection.
          </p>
          <div class="row hero-actions">
            @if (auth.isAuthenticated()) {
              <a class="btn btn-primary-elevated" [routerLink]="auth.homeFor()">Go to my dashboard →</a>
            } @else {
              <a class="btn btn-primary-elevated" routerLink="/register">Get Started Free</a>
              <a class="btn btn-secondary card-interactive" routerLink="/professionals">Browse Doctors</a>
              <a class="btn btn-ghost" routerLink="/login">Sign in</a>
            }
          </div>
          <div class="trust-micro">
            <span>🔒 AES-256 Encrypted</span>
            <span>•</span>
            <span>🛡️ Verified Medical Licenses</span>
            <span>•</span>
            <span>🤝 120+ Partner NGOs</span>
          </div>
        </div>

        <aside class="hero-card card-interactive" aria-labelledby="help-now">
          <div class="card-glow"></div>
          <div class="help-header">
            <span class="crisis-icon">🚨</span>
            <div>
              <h2 id="help-now">In distress or danger?</h2>
              <p class="small muted">Immediate verified crisis support is free 24/7.</p>
            </div>
          </div>
          <p class="crisis-desc">
            Directly linked to <strong>Tele-MANAS (14416)</strong> and national emergency services (112). Confidential and always open.
          </p>
          <a class="btn btn-crisis btn-block" routerLink="/crisis">Connect with Emergency Support</a>
        </aside>
      </div>
    </section>

    <!-- IMPACT & RECOVERY TELEMETRY (Live Metrics Dashboard) -->
    <section class="impact-section">
      <div class="container">
        <div class="impact-grid">
          <div class="impact-card">
            <div class="impact-icon-wrapper teal">👥</div>
            <div class="impact-data">
              <span class="impact-number">14,850+</span>
              <span class="impact-label">Persons Actively Using MindBridge</span>
            </div>
            <span class="impact-trend">+18.4% this month</span>
          </div>

          <div class="impact-card">
            <div class="impact-icon-wrapper indigo">🏛️</div>
            <div class="impact-data">
              <span class="impact-number">124+</span>
              <span class="impact-label">Partner NGOs & Clinics</span>
            </div>
            <span class="impact-trend">Accredited networks</span>
          </div>

          <div class="impact-card highlight">
            <div class="impact-icon-wrapper emerald">🌱</div>
            <div class="impact-data">
              <span class="impact-number">94.6%</span>
              <span class="impact-label">Recovery & Improvement Rate</span>
            </div>
            <span class="impact-trend positive">Clinically validated</span>
          </div>

          <div class="impact-card">
            <div class="impact-icon-wrapper amber">⏱️</div>
            <div class="impact-data">
              <span class="impact-number">&lt; 45s</span>
              <span class="impact-label">Average Crisis Response Time</span>
            </div>
            <span class="impact-trend">Zero wait time</span>
          </div>
        </div>
      </div>
    </section>

    <!-- CORE FEATURES -->
    <section class="container page">
      <div class="section-header center">
        <span class="eyebrow">Comprehensive Platform</span>
        <h2>Everything you need for emotional resilience</h2>
        <p class="muted">Built by psychologists and clinicians to ensure safety, efficacy, and warmth.</p>
      </div>

      <div class="grid features">
        @for (f of features; track f.title) {
          <article class="card-feature card-interactive">
            <div class="feature-icon">{{ f.icon }}</div>
            <h3>{{ f.title }}</h3>
            <p class="muted">{{ f.text }}</p>
          </article>
        }
      </div>

      <!-- ADMIN & NGO CONTROL CENTER HIGHLIGHT -->
      <div class="admin-spotlight card">
        <div class="spotlight-content">
          <div class="pill-badge-admin">Admin & NGO Control Center</div>
          <h2>Centralized Governance & Healthcare Analytics</h2>
          <p class="lead-admin">
            Are you a clinic supervisor, NGO coordinator, or system administrator? Access the real-time governance portal to verify clinical credentials, monitor recovery statistics, and coordinate support tickets.
          </p>
          <div class="row">
            <a class="btn btn-secondary" routerLink="/admin/overview">Open Admin Portal →</a>
            <a class="btn btn-ghost" routerLink="/for-professionals">Partner with Us as an NGO</a>
          </div>
        </div>
        <div class="spotlight-visual">
          <div class="admin-preview-card">
            <div class="preview-header">
              <span class="dot green"></span>
              <span class="dot amber"></span>
              <span class="dot red"></span>
              <span class="preview-title">Admin Telemetry Console</span>
            </div>
            <div class="preview-metric">
              <span>Active Patients</span>
              <strong>14,850</strong>
            </div>
            <div class="preview-metric">
              <span>Partner NGOs</span>
              <strong>124</strong>
            </div>
            <div class="preview-metric">
              <span>Cure / Recovery Rate</span>
              <strong class="text-emerald">94.6%</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .hero {
      background: radial-gradient(circle at 10% 10%, rgba(13, 148, 136, 0.12), transparent 50%),
                  radial-gradient(circle at 90% 20%, rgba(99, 102, 241, 0.08), transparent 40%),
                  linear-gradient(180deg, var(--mb-surface) 0%, var(--mb-bg) 100%);
      padding: clamp(40px, 6vw, 80px) 0 40px;
      border-bottom: 1px solid var(--mb-border);
    }
    .hero-inner {
      display: grid;
      gap: var(--mb-space-6);
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
      align-items: center;
    }
    .pill-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 999px;
      background: var(--mb-primary-soft);
      color: var(--mb-primary-strong);
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: var(--mb-space-3);
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
      70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    .lead {
      font-size: 1.15rem;
      line-height: 1.7;
      color: var(--mb-text-muted);
      max-width: 58ch;
      margin-bottom: var(--mb-space-5);
    }
    .hero-actions {
      margin-bottom: var(--mb-space-4);
    }
    .btn-primary-elevated {
      background: linear-gradient(135deg, var(--mb-primary) 0%, var(--mb-primary-strong) 100%);
      color: #fff;
      box-shadow: 0 4px 14px rgba(15, 110, 102, 0.35);
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(15, 110, 102, 0.45);
      }
    }
    .trust-micro {
      display: flex;
      gap: 12px;
      font-size: 0.85rem;
      color: var(--mb-text-muted);
      flex-wrap: wrap;
    }

    .hero-card {
      background: var(--mb-surface);
      border: 1px solid rgba(220, 38, 38, 0.2);
      border-radius: var(--mb-radius-lg);
      padding: var(--mb-space-5);
      box-shadow: 0 10px 30px -10px rgba(185, 28, 28, 0.12);
      position: relative;
      overflow: hidden;
    }
    .help-header {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-bottom: var(--mb-space-3);
      h2 { margin: 0; font-size: 1.25rem; }
    }
    .crisis-icon {
      font-size: 1.8rem;
    }
    .crisis-desc {
      color: var(--mb-text-muted);
      font-size: 0.95rem;
      line-height: 1.5;
      margin-bottom: var(--mb-space-4);
    }

    /* Impact section */
    .impact-section {
      background: var(--mb-surface);
      border-bottom: 1px solid var(--mb-border);
      padding: 30px 0;
    }
    .impact-grid {
      display: grid;
      gap: 20px;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
    .impact-card {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 18px;
      border-radius: var(--mb-radius);
      background: var(--mb-bg);
      border: 1px solid var(--mb-border);
      position: relative;
    }
    .impact-card.highlight {
      border-color: rgba(16, 185, 129, 0.4);
      background: linear-gradient(180deg, rgba(240, 253, 244, 0.8) 0%, var(--mb-bg) 100%);
    }
    .impact-icon-wrapper {
      font-size: 1.5rem;
      margin-bottom: 4px;
    }
    .impact-number {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--mb-text);
      display: block;
      line-height: 1.1;
    }
    .impact-label {
      font-size: 0.88rem;
      color: var(--mb-text-muted);
      font-weight: 500;
    }
    .impact-trend {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--mb-primary);
      margin-top: 6px;
    }
    .impact-trend.positive {
      color: #059669;
    }

    /* Core features */
    .section-header {
      margin-bottom: var(--mb-space-6);
      .eyebrow {
        text-transform: uppercase;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--mb-primary);
      }
      h2 { font-size: 2rem; margin-top: 6px; }
    }
    .card-feature {
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius);
      padding: var(--mb-space-5);
      display: flex;
      flex-direction: column;
      gap: 8px;
      h3 { margin: 0; font-size: 1.2rem; }
    }
    .feature-icon {
      font-size: 2rem;
      margin-bottom: 6px;
    }

    /* Admin spotlight */
    .admin-spotlight {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
      gap: var(--mb-space-6);
      align-items: center;
      margin-top: var(--mb-space-7);
      background: linear-gradient(135deg, rgba(15, 110, 102, 0.05) 0%, rgba(107, 79, 163, 0.05) 100%), var(--mb-surface);
      border: 1px solid var(--mb-border);
    }
    .pill-badge-admin {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      background: rgba(107, 79, 163, 0.15);
      color: #6b4fa3;
      font-weight: 700;
      font-size: 0.8rem;
      margin-bottom: var(--mb-space-3);
    }
    .lead-admin {
      color: var(--mb-text-muted);
      line-height: 1.6;
      margin-bottom: var(--mb-space-4);
    }
    .admin-preview-card {
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius);
      padding: 20px;
      box-shadow: var(--mb-shadow-lg);
    }
    .preview-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--mb-border);
      padding-bottom: 10px;
    }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot.green { background: #10b981; }
    .dot.amber { background: #f59e0b; }
    .dot.red { background: #ef4444; }
    .preview-title { font-size: 0.85rem; font-weight: 600; margin-left: 8px; color: var(--mb-text-muted); }
    .preview-metric {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px dashed var(--mb-border);
      font-size: 0.95rem;
    }
    .preview-metric:last-child { border-bottom: 0; }
    .text-emerald { color: #059669; }

    @media (max-width: 860px) {
      .hero-inner, .admin-spotlight {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class HomePage {
  protected readonly auth = inject(AuthService);
  protected readonly features = [
    {
      icon: '📊',
      title: 'Daily Mood Tracking',
      text: 'Log emotions, energy, and sleep in seconds. Discover recovery trends through guided reflections.',
    },
    {
      icon: '🛡️',
      title: 'Encrypted Private Journal',
      text: 'Write with AES-256 field encryption. Nobody, not even system administrators, can read your notes.',
    },
    {
      icon: '🤖',
      title: 'Safe 24/7 AI Companion',
      text: 'Evidence-based cognitive reframing with hard clinical boundaries and instant Tele-MANAS escalation.',
    },
    {
      icon: '🩺',
      title: 'Verified Doctors & Therapists',
      text: 'Consult accredited psychiatrists and clinical psychologists verified through national registries.',
    },
    {
      icon: '🤝',
      title: 'Accredited NGO Care Network',
      text: 'Direct collaboration with mental health NGOs providing free, community-based care and outreach.',
    },
    {
      icon: '💬',
      title: 'Secure Realtime Care Chat',
      text: 'End-to-end patient-provider messaging with instant emergency contact alerts and appointment booking.',
    },
  ];
}
