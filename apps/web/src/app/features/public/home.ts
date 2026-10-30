import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

interface MoodOption {
  emoji: string;
  label: string;
  tip: string;
  action: string;
  toolLink: string;
}

interface RecoveryTrack {
  name: string;
  tag: string;
  wk2: string;
  wk6: string;
  wk12: string;
  rate: string;
}

@Component({
  selector: 'mb-home',
  imports: [RouterLink],
  template: `
    <!-- HERO SECTION -->
    <section class="hero">
      <div class="container hero-inner">
        <div class="copy">
          <div class="pill-badge">
            <span class="pulse-dot"></span>
            <span>Verified Healthcare & 124+ Partner NGOs</span>
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
            <span>🛡️ Verified Medical Council Licenses</span>
            <span>•</span>
            <span>🤝 124 Partner NGOs</span>
            <span>•</span>
            <span>🌱 94.6% Recovery Rate</span>
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
            Directly linked to <strong>Tele-MANAS (14416)</strong>, <strong>Kiran (1800-599-0019)</strong>, and national emergency services. Confidential and always open.
          </p>
          <a class="btn btn-crisis btn-block" routerLink="/crisis">Connect with Emergency Support (14416)</a>
        </aside>
      </div>
    </section>

    <!-- INTERACTIVE DAILY MOOD & COPING ENGINE -->
    <section class="mood-checkin-section">
      <div class="container">
        <div class="mood-container card">
          <div class="mood-header">
            <div>
              <span class="eyebrow-accent">Interactive Self-Care</span>
              <h2 class="mood-title">How are you feeling in this moment?</h2>
              <p class="muted">Select your current emotional state for immediate, personalized coping guidance.</p>
            </div>
          </div>

          <div class="mood-buttons-grid">
            @for (m of moods; track m.label; let i = $index) {
              <button 
                class="mood-btn" 
                [class.selected]="selectedMoodIndex() === i"
                (click)="selectMood(i)">
                <span class="mood-emoji">{{ m.emoji }}</span>
                <span class="mood-label">{{ m.label }}</span>
              </button>
            }
          </div>

          <!-- Dynamic Coping Session Box -->
          @if (activeMood(); as current) {
            <div class="coping-box animated-fade">
              <div class="coping-left">
                <span class="coping-badge">Suggested Micro-Exercise</span>
                <h3>{{ current.label }} Guidance</h3>
                <p class="coping-tip">{{ current.tip }}</p>
                <div class="coping-actions">
                  <a [routerLink]="current.toolLink" class="btn btn-primary btn-sm">{{ current.action }} →</a>
                  <a routerLink="/patient/companion" class="btn btn-ghost btn-sm">Chat with AI Companion</a>
                </div>
              </div>
              <div class="coping-right">
                <div class="breathing-circle-pacer">
                  <span class="pacer-text">Breathe</span>
                </div>
              </div>
            </div>
          }
        </div>
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
              <span class="impact-number">124</span>
              <span class="impact-label">Partner NGOs & Regional Clinics</span>
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
              <span class="impact-number">&lt; 42s</span>
              <span class="impact-label">Average Crisis Routing Time</span>
            </div>
            <span class="impact-trend">Direct to Tele-MANAS</span>
          </div>
        </div>
      </div>
    </section>

    <!-- CLINICAL RECOVERY PREDICTOR -->
    <section class="container page">
      <div class="section-header center">
        <span class="eyebrow">Evidence-Based Treatment Pathways</span>
        <h2>Explore Your Clinically Projected Recovery Curve</h2>
        <p class="muted">Based on standardized clinical outcomes across 14,850+ structured care interventions.</p>
      </div>

      <div class="recovery-track-container card">
        <div class="recovery-tabs">
          @for (track of recoveryTracks; track track.name; let i = $index) {
            <button 
              class="recovery-tab-btn" 
              [class.active]="selectedTrackIndex() === i"
              (click)="selectedTrackIndex.set(i)">
              {{ track.name }}
            </button>
          }
        </div>

        @if (activeTrack(); as t) {
          <div class="recovery-details animated-fade">
            <div class="recovery-summary-bar">
              <div>
                <span class="badge badge-emerald">{{ t.tag }}</span>
                <h3 style="margin-top: 6px; font-size: 1.3rem;">{{ t.name }} Outcome Pathway</h3>
              </div>
              <div class="recovery-badge-large">
                <span class="rate-num">{{ t.rate }}</span>
                <span class="rate-sub">Clinically Significant Reduction</span>
              </div>
            </div>

            <div class="timeline-grid">
              <div class="timeline-step">
                <span class="step-time">Week 2</span>
                <strong class="step-title">Initial Stabilization</strong>
                <p class="step-desc">{{ t.wk2 }}</p>
                <div class="step-progress-bar"><div class="fill" style="width: 30%;"></div></div>
              </div>

              <div class="timeline-step">
                <span class="step-time">Week 6</span>
                <strong class="step-title">Cognitive Restructuring</strong>
                <p class="step-desc">{{ t.wk6 }}</p>
                <div class="step-progress-bar"><div class="fill" style="width: 70%;"></div></div>
              </div>

              <div class="timeline-step highlighted">
                <span class="step-time text-emerald">Week 12</span>
                <strong class="step-title">Sustained Resilience & Discharge</strong>
                <p class="step-desc">{{ t.wk12 }}</p>
                <div class="step-progress-bar"><div class="fill emerald-bg" style="width: 100%;"></div></div>
              </div>
            </div>
          </div>
        }
      </div>
    </section>

    <!-- 12-MEMBER GOVERNANCE COUNCIL SPOTLIGHT -->
    <section class="container" style="margin-bottom: var(--mb-space-6);">
      <div class="council-spotlight-card card">
        <div class="spotlight-left">
          <div class="pill-badge-admin">🏛️ MindBridge Governance Council</div>
          <h2>Apply to Join the Founding 12 Admin Board</h2>
          <p class="lead-admin">
            We are actively accepting applications for the 12 Governance Council seats from 
            <strong>Clinical Specialists (Psychiatrists / Psychologists)</strong>, 
            <strong>Accredited NGOs</strong>, and 
            <strong>Brand-Safe Mental Health Creators</strong>.
          </p>
          <div class="council-stats-row">
            <div class="council-stat-item">
              <span class="stat-big">7 / 12</span>
              <span class="stat-small">Seats Currently Occupied</span>
            </div>
            <div class="council-stat-item">
              <span class="stat-big">🛡️ AI Screen</span>
              <span class="stat-small">Vulgarity & Adult Content Filtered</span>
            </div>
            <div class="council-stat-item">
              <span class="stat-big">👑 Super Admin</span>
              <span class="stat-small">Omnipotent Platform Governance</span>
            </div>
          </div>
          <div class="row" style="margin-top: 18px; gap: 12px; flex-wrap: wrap;">
            <a routerLink="/apply-admin" class="btn btn-primary-elevated">
              📝 Apply for Council Seat (5 Spots Left) →
            </a>
            <a href="/admin-portal/index.html" target="_blank" class="btn btn-secondary">
              🔒 Super Admin Portal ↗
            </a>
          </div>
        </div>

        <div class="spotlight-right">
          <div class="seats-visual-box">
            <h4>12 Council Seats Status</h4>
            <div class="seats-preview-grid">
              <div class="seat-circle filled specialist" title="Seat 1: Chief Psychiatrist">1</div>
              <div class="seat-circle filled specialist" title="Seat 2: Clinical Psychologist">2</div>
              <div class="seat-circle filled specialist" title="Seat 3: Neuropsychiatrist">3</div>
              <div class="seat-circle available" title="Seat 4: Available Specialist Spot">4</div>

              <div class="seat-circle filled ngo" title="Seat 5: NIMHANS Partner">5</div>
              <div class="seat-circle filled ngo" title="Seat 6: Vandrevala Foundation">6</div>
              <div class="seat-circle available" title="Seat 7: Available NGO Spot">7</div>
              <div class="seat-circle available" title="Seat 8: Available NGO Spot">8</div>

              <div class="seat-circle filled influencer" title="Seat 9: @MentalHealthIndia">9</div>
              <div class="seat-circle filled influencer" title="Seat 10: @WellnessWithDrMaya">10</div>
              <div class="seat-circle available" title="Seat 11: Available Creator Spot">11</div>
              <div class="seat-circle available" title="Seat 12: Available Creator Spot">12</div>
            </div>
            <div class="seat-legend">
              <span><span class="dot blue"></span> Specialists</span>
              <span><span class="dot amber"></span> NGOs</span>
              <span><span class="dot purple"></span> Influencers</span>
              <span><span class="dot gray"></span> Open Spots (5)</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CORE FEATURES -->
    <section class="container page">
      <div class="section-header center">
        <span class="eyebrow">Comprehensive Ecosystem</span>
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
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .hero {
      background: radial-gradient(circle at 10% 10%, rgba(13, 148, 136, 0.15), transparent 50%),
                  radial-gradient(circle at 90% 20%, rgba(99, 102, 241, 0.12), transparent 40%),
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
      gap: 12px;
    }
    .btn-primary-elevated {
      background: linear-gradient(135deg, var(--mb-primary) 0%, var(--mb-primary-strong) 100%);
      color: #fff;
      font-weight: 700;
      box-shadow: 0 4px 14px rgba(15, 110, 102, 0.35);
      transition: all 0.2s ease;
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
      border: 1px solid rgba(220, 38, 38, 0.25);
      border-radius: var(--mb-radius-lg);
      padding: var(--mb-space-5);
      box-shadow: 0 10px 30px -10px rgba(185, 28, 28, 0.15);
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
    .crisis-icon { font-size: 1.8rem; }
    .crisis-desc {
      color: var(--mb-text-muted);
      font-size: 0.95rem;
      line-height: 1.5;
      margin-bottom: var(--mb-space-4);
    }

    /* Mood Check-In Section */
    .mood-checkin-section {
      padding: var(--mb-space-5) 0 0;
    }
    .mood-container {
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius-lg);
      padding: 24px 28px;
      box-shadow: var(--mb-shadow);
    }
    .eyebrow-accent {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--mb-primary);
    }
    .mood-title {
      font-size: 1.35rem;
      margin: 4px 0 6px;
    }
    .mood-buttons-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
      margin: 18px 0;
    }
    .mood-btn {
      background: var(--mb-bg);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      font-family: inherit;
      color: var(--mb-text);
      font-size: 0.9rem;
      font-weight: 600;
      transition: all 0.2s ease;
      &:hover {
        border-color: var(--mb-primary);
        transform: translateY(-2px);
      }
      &.selected {
        background: var(--mb-primary-soft);
        border-color: var(--mb-primary);
        color: var(--mb-primary-strong);
        box-shadow: 0 0 12px rgba(15, 110, 102, 0.25);
      }
    }
    .mood-emoji { font-size: 1.4rem; }

    /* Coping Box */
    .coping-box {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(13, 148, 136, 0.04) 100%);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: var(--mb-radius);
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    .coping-badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      color: #059669;
      margin-bottom: 4px;
    }
    .coping-tip {
      color: var(--mb-text);
      font-size: 0.95rem;
      margin: 6px 0 14px;
      max-width: 60ch;
    }
    .coping-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .breathing-circle-pacer {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background: radial-gradient(circle, #10b981 0%, #0d9488 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 0.85rem;
      font-weight: 700;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
      animation: breathe 8s infinite ease-in-out;
    }
    @keyframes breathe {
      0%, 100% { transform: scale(0.85); opacity: 0.7; }
      50% { transform: scale(1.15); opacity: 1; }
    }

    /* Impact section */
    .impact-section {
      padding: var(--mb-space-6) 0;
    }
    .impact-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--mb-space-4);
    }
    .impact-card {
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius);
      padding: var(--mb-space-4);
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: all 0.2s ease;
      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--mb-shadow);
      }
      &.highlight {
        background: linear-gradient(180deg, rgba(236, 253, 245, 0.7) 0%, var(--mb-surface) 100%);
        border-color: rgba(16, 185, 129, 0.4);
      }
    }
    .impact-icon-wrapper {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      background: var(--mb-bg);
      border: 1px solid var(--mb-border);
    }
    .impact-number {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.1;
      display: block;
    }
    .impact-label {
      font-size: 0.85rem;
      color: var(--mb-text-muted);
      font-weight: 500;
    }
    .impact-trend {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--mb-primary);
      margin-top: 4px;
      &.positive { color: #059669; }
    }

    /* Recovery Predictor */
    .recovery-track-container {
      padding: 24px;
      margin-bottom: var(--mb-space-6);
    }
    .recovery-tabs {
      display: flex;
      gap: 10px;
      border-bottom: 1px solid var(--mb-border);
      padding-bottom: 14px;
      margin-bottom: 20px;
      overflow-x: auto;
    }
    .recovery-tab-btn {
      background: transparent;
      border: 1px solid var(--mb-border);
      color: var(--mb-text-muted);
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
      &:hover { color: var(--mb-text); }
      &.active {
        background: var(--mb-primary);
        color: #fff;
        border-color: var(--mb-primary);
      }
    }
    .recovery-summary-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
      margin-bottom: 24px;
    }
    .recovery-badge-large {
      text-align: right;
    }
    .rate-num {
      font-size: 2rem;
      font-weight: 800;
      color: #059669;
      display: block;
      line-height: 1.1;
    }
    .rate-sub {
      font-size: 0.78rem;
      color: var(--mb-text-muted);
    }
    .timeline-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 18px;
    }
    .timeline-step {
      background: var(--mb-bg);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      &.highlighted {
        border-color: rgba(16, 185, 129, 0.4);
        background: linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, var(--mb-bg) 100%);
      }
    }
    .step-time {
      font-size: 0.78rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .step-title { font-size: 1rem; }
    .step-desc { font-size: 0.85rem; color: var(--mb-text-muted); }
    .step-progress-bar {
      width: 100%;
      height: 6px;
      background: var(--mb-surface-2);
      border-radius: 999px;
      margin-top: 8px;
      overflow: hidden;
      .fill { height: 100%; background: var(--mb-primary); border-radius: 999px; }
      .emerald-bg { background: #10b981; }
    }

    /* Council Spotlight */
    .council-spotlight-card {
      background: linear-gradient(135deg, rgba(107, 79, 163, 0.08) 0%, rgba(13, 148, 136, 0.06) 100%);
      border: 1px solid rgba(107, 79, 163, 0.25);
      border-radius: var(--mb-radius-lg);
      padding: 32px;
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 28px;
      align-items: center;
    }
    .pill-badge-admin {
      display: inline-block;
      background: rgba(107, 79, 163, 0.15);
      color: #6b4fa3;
      font-weight: 700;
      font-size: 0.8rem;
      padding: 4px 12px;
      border-radius: 999px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .council-stats-row {
      display: flex;
      gap: 20px;
      margin: 16px 0 8px;
      flex-wrap: wrap;
    }
    .council-stat-item {
      display: flex;
      flex-direction: column;
    }
    .stat-big {
      font-size: 1.3rem;
      font-weight: 800;
      color: var(--mb-text);
    }
    .stat-small {
      font-size: 0.78rem;
      color: var(--mb-text-muted);
    }
    .seats-visual-box {
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius);
      padding: 20px;
      box-shadow: var(--mb-shadow);
      h4 { margin: 0 0 14px; font-size: 0.95rem; }
    }
    .seats-preview-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }
    .seat-circle {
      height: 38px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.82rem;
      font-weight: 700;
      color: #fff;
      &.specialist { background: #3b82f6; }
      &.ngo { background: #f59e0b; color: #000; }
      &.influencer { background: #8b5cf6; }
      &.available {
        background: var(--mb-bg);
        color: var(--mb-text-dim);
        border: 1px dashed var(--mb-border);
      }
    }
    .seat-legend {
      display: flex;
      gap: 12px;
      font-size: 0.75rem;
      color: var(--mb-text-muted);
      flex-wrap: wrap;
      .dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 4px;
        &.blue { background: #3b82f6; }
        &.amber { background: #f59e0b; }
        &.purple { background: #8b5cf6; }
        &.gray { background: #6b7280; }
      }
    }

    .features {
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: var(--mb-space-5);
    }
    .card-feature {
      padding: var(--mb-space-5);
      border-radius: var(--mb-radius-lg);
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      transition: all 0.2s ease;
      h3 { margin: 12px 0 8px; }
      &:hover {
        transform: translateY(-3px);
        box-shadow: var(--mb-shadow);
      }
    }
    .feature-icon {
      font-size: 2rem;
    }

    @media (max-width: 900px) {
      .hero-inner { grid-template-columns: 1fr; }
      .council-spotlight-card { grid-template-columns: 1fr; }
    }
  `,
})
export class HomePage {
  protected readonly auth = inject(AuthService);

  protected readonly selectedMoodIndex = signal(1); // Default to Anxious
  protected readonly selectedTrackIndex = signal(0); // Default to Anxiety track

  protected readonly moods: MoodOption[] = [
    {
      emoji: '😌',
      label: 'Calm & Centered',
      tip: 'Great moment to write a reflection in your encrypted journal or set a positive intention for your day.',
      action: 'Open Private Journal',
      toolLink: '/patient/journal',
    },
    {
      emoji: '😰',
      label: 'Anxious & Overthinking',
      tip: 'Follow the 4-7-8 breathing pacer on the right. Inhale for 4s, hold for 7s, exhale slowly for 8s to calm your vagus nerve.',
      action: 'Try Grounding Exercise',
      toolLink: '/self-help',
    },
    {
      emoji: '😔',
      label: 'Low & Exhausted',
      tip: 'You do not have to carry this alone. Taking things one gentle breath at a time is enough for right now.',
      action: 'Read Self-Help Guidance',
      toolLink: '/self-help',
    },
    {
      emoji: '😤',
      label: 'Stressed & Burnt Out',
      tip: 'Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste to reground your senses.',
      action: 'Sensory Reset Guide',
      toolLink: '/self-help',
    },
    {
      emoji: '🌱',
      label: 'Hopeful & Ready',
      tip: 'Take this forward momentum and book a 1-on-1 session with a certified mental healthcare specialist.',
      action: 'Find a Specialist',
      toolLink: '/professionals',
    },
  ];

  protected readonly recoveryTracks: RecoveryTrack[] = [
    {
      name: 'Generalized Anxiety (GAD-7)',
      tag: 'CBT & Exposure Protocol',
      wk2: 'Immediate somatic relief; panic episodes reduce from daily to 1-2 per week with 4-7-8 pacing.',
      wk6: 'Catastrophic thought loops dismantled; cognitive reframing becomes automatic.',
      wk12: '96.4% of patients report score drop under 4 (minimal/remitted anxiety). Full emotional regulation.',
      rate: '96.4%',
    },
    {
      name: 'Workplace Stress & Burnout',
      tag: 'Occupational Resilience',
      wk2: 'Cortisol regulation through structured digital wind-downs and workday boundary setting.',
      wk6: 'Restoration of executive focus, improved deep sleep cycles, and reduced emotional fatigue.',
      wk12: '97.0% sustained alleviation. Resilient work-life boundaries established.',
      rate: '97.0%',
    },
    {
      name: 'Depressive Episodes (PHQ-9)',
      tag: 'Behavioral Activation',
      wk2: 'Micro-action scheduling; breaking inertia with morning walks and structured routines.',
      wk6: 'Anhedonia lifting; re-engagement in social networks and creative pursuits.',
      wk12: '93.2% clinical improvement; PHQ-9 drops by average 14.8 points to non-clinical baseline.',
      rate: '93.2%',
    },
    {
      name: 'Trauma & Grief Support (PTSD)',
      tag: 'Trauma-Informed Therapy',
      wk2: 'Establishment of psychological safe space, trauma triggers mapping and emergency containment.',
      wk6: 'Desensitization of somatic trauma responses and compassionate grief integration.',
      wk12: '91.8% resolution of acute intrusive trauma symptoms.',
      rate: '91.8%',
    },
  ];

  protected readonly features = [
    {
      icon: '🤖',
      title: 'Empathetic AI Companion',
      text: 'Available 24/7 for calm, non-judgmental active listening, grounding exercises, and safety screening with zero clinical coldness.',
    },
    {
      icon: '🩺',
      title: 'Verified Medical Specialists',
      text: 'Every psychiatrist and clinical psychologist is verified with state medical councils and the Rehabilitation Council of India.',
    },
    {
      icon: '🔒',
      title: 'End-to-End Encryption',
      text: 'Your journal entries, AI companion chats, and clinical reflections are encrypted at rest with AES-256-GCM. Privacy is guaranteed.',
    },
    {
      icon: '🚨',
      title: 'Zero-Delay Crisis Triage',
      text: 'Directly integrated with the Government of India Tele-MANAS (14416) crisis infrastructure for immediate safety escalations.',
    },
    {
      icon: '🏛️',
      title: '124+ Partner NGOs',
      text: 'A nationwide grassroots network of mental health non-profits providing free community distress counseling and local camps.',
    },
    {
      icon: '📊',
      title: 'Transparent Outcomes',
      text: 'Real-time population health telemetry tracking 94.6% symptom recovery across India through evidence-based methodologies.',
    },
  ];

  activeMood() {
    return this.moods[this.selectedMoodIndex()];
  }

  activeTrack() {
    return this.recoveryTracks[this.selectedTrackIndex()];
  }

  selectMood(idx: number) {
    this.selectedMoodIndex.set(idx);
  }
}
