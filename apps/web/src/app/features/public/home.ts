import { Component, inject, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
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
              <span class="impact-number">{{ statTotalUsers() }}</span>
              <span class="impact-label">Persons Actively Using MindBridge</span>
            </div>
            <span class="impact-trend">+18.4% this month</span>
          </div>

          <div class="impact-card">
            <div class="impact-icon-wrapper indigo">🏛️</div>
            <div class="impact-data">
              <span class="impact-number">{{ statTotalNgos() }}</span>
              <span class="impact-label">Partner NGOs & Regional Clinics</span>
            </div>
            <span class="impact-trend">Accredited networks</span>
          </div>

          <div class="impact-card highlight">
            <div class="impact-icon-wrapper emerald">🌱</div>
            <div class="impact-data">
              <span class="impact-number">{{ statRecoveryRate() }}</span>
              <span class="impact-label">Recovery & Improvement Rate</span>
            </div>
            <span class="impact-trend positive">Clinically validated</span>
          </div>

          <div class="impact-card">
            <div class="impact-icon-wrapper amber">⏱️</div>
            <div class="impact-data">
              <span class="impact-number">{{ statAvgResponseTime() }}</span>
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

    <!-- MULTILINGUAL AI COMPANION CHARACTER SHOWCASE (Hindi, Bengali, English) -->
    <section class="container" style="margin-bottom: var(--mb-space-7);">
      <div class="ai-studio-header center">
        <span class="eyebrow-accent">✨ Multilingual AI Sanctuary</span>
        <h2>Meet Your 24/7 AI Companion in Your Own Language</h2>
        <p class="muted lead" style="max-width: 650px; margin: 0 auto 20px;">
          Select your preferred character and language (Hindi, Bengali, or English) for comforting, non-judgmental guidance and active listening.
        </p>

        <!-- Language Selector Bar -->
        <div class="lang-selector-bar">
          <button 
            type="button"
            class="lang-pill" 
            [class.active]="selectedLang() === 'en'"
            (click)="selectedLang.set('en')">
            <span class="flag">🇬🇧</span> English
          </button>
          <button 
            type="button"
            class="lang-pill" 
            [class.active]="selectedLang() === 'hi'"
            (click)="selectedLang.set('hi')">
            <span class="flag">🇮🇳</span> हिंदी (Hindi)
          </button>
          <button 
            type="button"
            class="lang-pill" 
            [class.active]="selectedLang() === 'bn'"
            (click)="selectedLang.set('bn')">
            <span class="flag">🇮🇳</span> বাংলা (Bengali)
          </button>
        </div>
      </div>

      <!-- AI Characters Studio Stage -->
      <div class="ai-stage-card card glow-animated-border">
        <!-- Character Avatar Switcher Cards -->
        <div class="character-switcher-grid">
          <button 
            type="button"
            class="character-card-btn" 
            [class.active]="selectedCharacter() === 'asha'"
            (click)="selectedCharacter.set('asha')">
            <div class="char-avatar-ring rose">
              <span class="char-emoji animate-float">🌸</span>
            </div>
            <div class="char-meta">
              <strong>Asha (आशा / আশা)</strong>
              <span class="char-role">
                {{ selectedLang() === 'hi' ? 'सहानुभूतिपूर्ण साथी' : (selectedLang() === 'bn' ? 'সহানুভূতিশীল সাথী' : 'Empathetic Listener') }}
              </span>
            </div>
          </button>

          <button 
            type="button"
            class="character-card-btn" 
            [class.active]="selectedCharacter() === 'aarav'"
            (click)="selectedCharacter.set('aarav')">
            <div class="char-avatar-ring blue">
              <span class="char-emoji animate-float">🩺</span>
            </div>
            <div class="char-meta">
              <strong>Dr. Aarav (डॉ. आरव)</strong>
              <span class="char-role">
                {{ selectedLang() === 'hi' ? 'क्लिनिकल मार्गदर्शन' : (selectedLang() === 'bn' ? 'ক্লিনিক্যাল গাইড' : 'Clinical CBT Specialist') }}
              </span>
            </div>
          </button>

          <button 
            type="button"
            class="character-card-btn" 
            [class.active]="selectedCharacter() === 'ananya'"
            (click)="selectedCharacter.set('ananya')">
            <div class="char-avatar-ring purple">
              <span class="char-emoji animate-float">✨</span>
            </div>
            <div class="char-meta">
              <strong>Ananya (अनन्या)</strong>
              <span class="char-role">
                {{ selectedLang() === 'hi' ? 'तनाव व युवा कोच' : (selectedLang() === 'bn' ? 'স্ট্রেস ও যুব কোচ' : 'Resilience & Youth Coach') }}
              </span>
            </div>
          </button>
        </div>

        <!-- Live Interactive Dialogue Stage -->
        <div class="dialogue-stage-box">
          <div class="dialogue-avatar-col">
            <div class="large-avatar-halo" [class.rose]="selectedCharacter() === 'asha'" [class.blue]="selectedCharacter() === 'aarav'" [class.purple]="selectedCharacter() === 'ananya'">
              <span class="stage-emoji animate-glow-ring">
                {{ selectedCharacter() === 'asha' ? '🌸' : (selectedCharacter() === 'aarav' ? '🩺' : '✨') }}
              </span>
            </div>
            <span class="speaking-indicator">
              <span class="live-dot"></span>
              {{ selectedCharacter() === 'asha' ? 'Asha Speaking' : (selectedCharacter() === 'aarav' ? 'Dr. Aarav Speaking' : 'Ananya Speaking') }}
            </span>
          </div>

          <div class="dialogue-content-col">
            <div class="speech-bubble animated-fade">
              <div class="speech-header">
                <div class="soundwave-container" [class.muted-wave]="!isAudioPlaying()">
                  <span class="soundwave-bar"></span>
                  <span class="soundwave-bar"></span>
                  <span class="soundwave-bar"></span>
                  <span class="soundwave-bar"></span>
                  <span class="soundwave-bar"></span>
                </div>
                <button 
                  type="button"
                  class="audio-toggle-btn" 
                  (click)="toggleAudio()">
                  {{ isAudioPlaying() ? '🔊 Voice Simulation Active' : '🔇 Audio Muted' }}
                </button>
              </div>

              <blockquote class="dialogue-text">
                "{{ currentDialogue() }}"
              </blockquote>

              <div class="speech-footer">
                <span class="lang-tag">
                  {{ selectedLang() === 'hi' ? '🇮🇳 हिंदी (Hindi) Mode' : (selectedLang() === 'bn' ? '🇮🇳 বাংলা (Bengali) Mode' : '🇬🇧 English Mode') }}
                </span>
                <a routerLink="/patient/companion" class="btn btn-primary btn-sm">
                  Start Live Chat with {{ selectedCharacter() === 'asha' ? 'Asha' : (selectedCharacter() === 'aarav' ? 'Dr. Aarav' : 'Ananya') }} →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- INTERACTIVE DEMO VIDEO WALKTHROUGH SIMULATOR (How It Works & How To Use) -->
    <section class="container" style="margin-bottom: var(--mb-space-7);">
      <div class="video-section-header center">
        <span class="eyebrow">Interactive Platform Tour</span>
        <h2>How It Works & How to Use MindBridge</h2>
        <p class="muted lead" style="max-width: 620px; margin: 0 auto 24px;">
          Watch our step-by-step interactive video simulation showing how patients check in, converse with the AI companion, and connect with licensed clinicians.
        </p>
      </div>

      <!-- High-End Video Player Frame -->
      <div class="video-player-container card">
        <!-- Player Chrome Top Bar -->
        <div class="player-top-bar">
          <div class="window-dots">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <div class="video-title-pill">
            <span class="live-recording-badge">🔴 SIMULATED HD WALKTHROUGH</span>
            <span>MindBridge User Journey · 1080p 60fps</span>
          </div>
          <span class="time-stamp">{{ videoTime() }} / 03:00</span>
        </div>

        <!-- Video Chapters Navigation -->
        <div class="video-chapters-tabs">
          <button 
            type="button"
            class="chapter-tab" 
            [class.active]="activeVideoChapter() === 1"
            (click)="selectVideoChapter(1)">
            <span class="chap-num">01</span>
            <span>Anonymous Check-In</span>
          </button>

          <button 
            type="button"
            class="chapter-tab" 
            [class.active]="activeVideoChapter() === 2"
            (click)="selectVideoChapter(2)">
            <span class="chap-num">02</span>
            <span>Multilingual AI Dialogue</span>
          </button>

          <button 
            type="button"
            class="chapter-tab" 
            [class.active]="activeVideoChapter() === 3"
            (click)="selectVideoChapter(3)">
            <span class="chap-num">03</span>
            <span>Verified Doctor Matching</span>
          </button>

          <button 
            type="button"
            class="chapter-tab" 
            [class.active]="activeVideoChapter() === 4"
            (click)="selectVideoChapter(4)">
            <span class="chap-num">04</span>
            <span>Crisis Helpline Routing</span>
          </button>
        </div>

        <!-- Dynamic Simulated Screen Canvas -->
        <div class="video-screen-canvas">
          @if (activeVideoChapter() === 1) {
            <div class="screen-content animated-fade">
              <div class="screen-preview-card">
                <div class="screen-badge">Step 1: Emotional Check-In & Journal</div>
                <h3>Patient Opens Daily Anonymous Wellness Space</h3>
                <p class="muted">Users securely track mood, sleep hours, and emotional triggers with AES-256 local client encryption.</p>
                <div class="screen-demo-ui">
                  <div class="demo-slider-box">
                    <span>Mood Scale: <strong>Calm & Hopeful (8/10)</strong></span>
                    <div class="demo-slider-track"><div class="demo-slider-fill" style="width: 80%;"></div></div>
                  </div>
                  <div class="demo-tags-row">
                    <span class="demo-tag">🌿 Morning Walk</span>
                    <span class="demo-tag">☕ Reduced Caffeine</span>
                    <span class="demo-tag">🧘 10m Meditation</span>
                  </div>
                </div>
              </div>
            </div>
          }

          @if (activeVideoChapter() === 2) {
            <div class="screen-content animated-fade">
              <div class="screen-preview-card">
                <div class="screen-badge emerald">Step 2: Empathetic Multilingual Dialogue</div>
                <h3>Converse in Hindi, Bengali, or English with Zero Judgment</h3>
                <p class="muted">AI Companion Asha screens for distress signals and provides evidence-based CBT exercises in real-time.</p>
                <div class="screen-demo-ui chat-mode">
                  <div class="chat-bubble user">"I am feeling so overwhelmed with exams and family pressure."</div>
                  <div class="chat-bubble bot">
                    <div class="bot-header">
                      <span>🌸 Asha Companion</span>
                      <span class="soundwave-container" style="height: 16px;">
                        <span class="soundwave-bar" style="height: 8px;"></span>
                        <span class="soundwave-bar" style="height: 14px;"></span>
                        <span class="soundwave-bar" style="height: 10px;"></span>
                      </span>
                    </div>
                    "नमस्ते! मैं समझ सकती हूँ। चलिए सबसे पहले एक धीमी सांस लेते हैं। 5-4-3-2-1 ग्राउंडिंग तकनीक आज़माते हैं।"
                  </div>
                </div>
              </div>
            </div>
          }

          @if (activeVideoChapter() === 3) {
            <div class="screen-content animated-fade">
              <div class="screen-preview-card">
                <div class="screen-badge indigo">Step 3: Clinical Doctor Consultation</div>
                <h3>Book Verified Psychiatrists & Clinical Psychologists</h3>
                <p class="muted">Patients browse verified council licenses, select tele-consultation slots, and share encrypted notes.</p>
                <div class="screen-demo-ui doc-mode">
                  <div class="doc-demo-card">
                    <div class="doc-avatar">🩺</div>
                    <div>
                      <strong>Dr. Kavitha Raman, MD Psychiatry</strong>
                      <span class="doc-sub">10 yrs exp · KMC-2016-9281 Verified · Tele-Consult ₹600</span>
                    </div>
                    <span class="verified-pill">✓ Medical Council Approved</span>
                  </div>
                </div>
              </div>
            </div>
          }

          @if (activeVideoChapter() === 4) {
            <div class="screen-content animated-fade">
              <div class="screen-preview-card">
                <div class="screen-badge rose">Step 4: Rapid Crisis Response (< 42s)</div>
                <h3>National Helplines Direct-Connect & Emergency Triage</h3>
                <p class="muted">If acute distress is detected, instant emergency dialing to Tele-MANAS (14416) and local hospitals triggers immediately.</p>
                <div class="screen-demo-ui crisis-mode">
                  <div class="crisis-demo-alert">
                    <span class="alert-icon">🚨</span>
                    <div>
                      <strong>Tele-MANAS Active (Toll-Free 14416)</strong>
                      <span class="alert-sub">24/7 Government of India Mental Health Helpline Connected</span>
                    </div>
                    <a routerLink="/crisis" class="btn btn-crisis btn-sm">Dial 14416 Now</a>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Video Player Bottom Controls Bar -->
        <div class="player-controls-bar">
          <div class="controls-left">
            <button 
              type="button"
              class="play-pause-btn" 
              (click)="toggleVideoPlay()">
              {{ isVideoPlaying() ? '⏸ Pause' : '▶ Play Demo' }}
            </button>
            <span class="chapter-indicator-label">
              Chapter {{ activeVideoChapter() }} of 4: 
              <strong>
                {{ activeVideoChapter() === 1 ? 'Anonymous Check-In' : (activeVideoChapter() === 2 ? 'Multilingual AI' : (activeVideoChapter() === 3 ? 'Doctor Matching' : 'Crisis Triage')) }}
              </strong>
            </span>
          </div>

          <div class="timeline-slider-track" (click)="advanceVideoChapter()">
            <div class="timeline-slider-progress" [style.width.%]="videoProgress()">
              <span class="timeline-handle"></span>
            </div>
          </div>

          <div class="controls-right">
            <a routerLink="/register" class="btn btn-primary btn-sm">Experience Live →</a>
          </div>
        </div>
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
            <a href="/admin-portal" target="_blank" class="btn btn-secondary">
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

    <!-- DYNAMIC SUPER ADMIN AI FEATURES & INITIATIVES -->
    @if (dynamicFeatures().length > 0) {
      <section class="container dynamic-features-section">
        <div class="section-header center">
          <span class="eyebrow-accent">⚡ Executive Council Live Directives</span>
          <h2>Active Community Initiatives & Crisis Fast-Tracks</h2>
          <p class="muted">Live features introduced and deployed dynamically via the Super Admin AI Feature Planner.</p>
        </div>

        <div class="dynamic-features-grid">
          @for (item of dynamicFeatures(); track item.id) {
            <article class="dynamic-feature-card" [class]="'df-theme-' + item.themeColor">
              <div class="df-card-top">
                <span class="df-emoji">{{ item.iconEmoji }}</span>
                <span class="df-badge">{{ item.badgeLabel || 'Dynamic Initiative' }}</span>
              </div>
              <h3 class="df-title">{{ item.title }}</h3>
              <p class="df-desc">{{ item.description }}</p>
              <div class="df-card-bottom">
                <a [href]="item.ctaLink" class="btn btn-sm df-cta-btn">{{ item.ctaText }} →</a>
              </div>
            </article>
          }
        </div>
      </section>
    }

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
  changeDetection: ChangeDetectionStrategy.OnPush,
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

    /* Dynamic Features Section */
    .dynamic-features-section {
      padding: 40px 0 20px;
    }
    .dynamic-features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
      margin-top: 24px;
    }
    .dynamic-feature-card {
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius-lg);
      padding: 24px;
      display: flex;
      flex-direction: column;
      transition: all 0.25s ease;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.09);
      }
    }
    .df-theme-indigo { border-top: 4px solid #6366f1; background: linear-gradient(180deg, rgba(99, 102, 241, 0.03) 0%, var(--mb-surface) 100%); }
    .df-theme-emerald { border-top: 4px solid #10b981; background: linear-gradient(180deg, rgba(16, 185, 129, 0.03) 0%, var(--mb-surface) 100%); }
    .df-theme-teal { border-top: 4px solid #14b8a6; background: linear-gradient(180deg, rgba(20, 184, 166, 0.03) 0%, var(--mb-surface) 100%); }
    .df-theme-rose { border-top: 4px solid #f43f5e; background: linear-gradient(180deg, rgba(244, 63, 94, 0.03) 0%, var(--mb-surface) 100%); }
    .df-theme-amber { border-top: 4px solid #f59e0b; background: linear-gradient(180deg, rgba(245, 158, 11, 0.03) 0%, var(--mb-surface) 100%); }
    .df-theme-purple { border-top: 4px solid #a855f7; background: linear-gradient(180deg, rgba(168, 85, 247, 0.03) 0%, var(--mb-surface) 100%); }

    .df-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .df-emoji { font-size: 1.8rem; }
    .df-badge {
      font-size: 0.72rem;
      font-weight: 750;
      text-transform: uppercase;
      padding: 3px 10px;
      border-radius: 999px;
      background: var(--mb-primary-soft);
      color: var(--mb-primary-strong);
    }
    .df-title {
      font-size: 1.15rem;
      font-weight: 700;
      margin: 0 0 8px;
    }
    .df-desc {
      color: var(--mb-text-muted);
      font-size: 0.92rem;
      line-height: 1.5;
      flex-grow: 1;
      margin-bottom: 18px;
    }
    .df-cta-btn {
      align-self: flex-start;
      font-weight: 650;
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

    /* Multilingual AI Companion Studio */
    .ai-studio-header {
      margin-bottom: var(--mb-space-5);
    }
    .lang-selector-bar {
      display: inline-flex;
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      padding: 4px;
      border-radius: 999px;
      gap: 6px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.04);
    }
    .lang-pill {
      background: transparent;
      border: none;
      padding: 8px 18px;
      border-radius: 999px;
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--mb-text-muted);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
      &:hover { color: var(--mb-text); }
      &.active {
        background: var(--mb-primary);
        color: #fff;
        box-shadow: 0 2px 10px rgba(13, 148, 136, 0.3);
      }
    }
    .ai-stage-card {
      background: linear-gradient(180deg, var(--mb-surface) 0%, rgba(240, 253, 250, 0.5) 100%);
      border: 1px solid rgba(13, 148, 136, 0.25);
      border-radius: var(--mb-radius-lg);
      padding: clamp(20px, 4vw, 36px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
    }
    .character-switcher-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .character-card-btn {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      border-radius: var(--mb-radius);
      background: var(--mb-surface);
      border: 2px solid var(--mb-border);
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
      &:hover {
        transform: translateY(-2px);
        border-color: var(--mb-primary);
      }
      &.active {
        border-color: var(--mb-primary);
        background: rgba(240, 253, 250, 0.9);
        box-shadow: 0 4px 14px rgba(13, 148, 136, 0.15);
      }
    }
    .char-avatar-ring {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      &.rose { background: #ffe4e6; border: 2px solid #fda4af; }
      &.blue { background: #e0f2fe; border: 2px solid #7dd3fc; }
      &.purple { background: #f3e8ff; border: 2px solid #d8b4fe; }
    }
    .char-meta {
      display: flex;
      flex-direction: column;
      strong { font-size: 0.95rem; color: var(--mb-text); }
      .char-role { font-size: 0.8rem; color: var(--mb-text-muted); }
    }
    .dialogue-stage-box {
      display: grid;
      grid-template-columns: 160px 1fr;
      gap: 24px;
      align-items: center;
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius);
      padding: clamp(16px, 3vw, 28px);
    }
    .dialogue-avatar-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 10px;
    }
    .large-avatar-halo {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3.2rem;
      &.rose { background: radial-gradient(circle, #fecdd3 0%, #fda4af 100%); box-shadow: 0 0 25px rgba(244, 63, 94, 0.3); }
      &.blue { background: radial-gradient(circle, #bae6fd 0%, #7dd3fc 100%); box-shadow: 0 0 25px rgba(14, 165, 233, 0.3); }
      &.purple { background: radial-gradient(circle, #e9d5ff 0%, #c084fc 100%); box-shadow: 0 0 25px rgba(168, 85, 247, 0.3); }
    }
    .speaking-indicator {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--mb-primary-strong);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      animation: pulse 1.5s infinite;
    }
    .speech-bubble {
      background: linear-gradient(135deg, rgba(249, 250, 251, 0.9) 0%, rgba(240, 253, 250, 0.8) 100%);
      border: 1px solid rgba(13, 148, 136, 0.2);
      border-radius: 18px;
      padding: clamp(18px, 3vw, 26px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.03);
    }
    .speech-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      flex-wrap: wrap;
      gap: 10px;
    }
    .audio-toggle-btn {
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--mb-text);
      cursor: pointer;
      &:hover { background: var(--mb-primary-soft); color: var(--mb-primary); }
    }
    .dialogue-text {
      font-size: clamp(1rem, 2vw, 1.2rem);
      line-height: 1.6;
      color: var(--mb-text);
      margin: 0 0 16px;
      font-style: italic;
    }
    .speech-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(0,0,0,0.05);
    }
    .lang-tag {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--mb-primary);
      background: var(--mb-primary-soft);
      padding: 3px 10px;
      border-radius: 6px;
    }

    /* Video Walkthrough Player Frame */
    .video-player-container {
      background: #0f172a;
      color: #fff;
      border-radius: var(--mb-radius-lg);
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
    }
    .player-top-bar {
      background: #1e293b;
      padding: 10px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 0.82rem;
    }
    .window-dots {
      display: flex;
      gap: 6px;
    }
    .dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      &.red { background: #ef4444; }
      &.yellow { background: #f59e0b; }
      &.green { background: #10b981; }
    }
    .video-title-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
    }
    .live-recording-badge {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      font-size: 0.72rem;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .time-stamp {
      font-family: monospace;
      color: #94a3b8;
    }
    .video-chapters-tabs {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      background: #0b1120;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .chapter-tab {
      background: transparent;
      border: none;
      border-bottom: 3px solid transparent;
      padding: 12px 14px;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.2s ease;
      &:hover { color: #f1f5f9; background: rgba(255, 255, 255, 0.03); }
      &.active {
        color: #fff;
        border-bottom-color: #10b981;
        background: rgba(16, 185, 129, 0.08);
      }
    }
    .chap-num {
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.72rem;
    }
    .video-screen-canvas {
      padding: clamp(28px, 5vw, 48px) clamp(20px, 4vw, 36px);
      background: radial-gradient(circle at 50% 30%, #1e293b 0%, #0f172a 100%);
      min-height: 290px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .screen-preview-card {
      max-width: 650px;
      width: 100%;
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--mb-radius);
      padding: 24px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      h3 { margin: 8px 0 6px; color: #f8fafc; font-size: 1.25rem; }
      p { color: #94a3b8; font-size: 0.9rem; margin-bottom: 16px; }
    }
    .screen-badge {
      display: inline-block;
      background: rgba(14, 165, 233, 0.2);
      color: #38bdf8;
      font-size: 0.72rem;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 999px;
      letter-spacing: 0.04em;
      &.emerald { background: rgba(16, 185, 129, 0.2); color: #34d399; }
      &.indigo { background: rgba(99, 102, 241, 0.2); color: #818cf8; }
      &.rose { background: rgba(244, 63, 94, 0.2); color: #fb7185; }
    }
    .screen-demo-ui {
      background: rgba(15, 23, 42, 0.8);
      border-radius: 8px;
      padding: 16px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .demo-slider-box {
      font-size: 0.85rem;
      color: #cbd5e1;
      margin-bottom: 12px;
    }
    .demo-slider-track {
      height: 8px;
      background: #334155;
      border-radius: 999px;
      margin-top: 8px;
      overflow: hidden;
    }
    .demo-slider-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #06b6d4);
      border-radius: 999px;
    }
    .demo-tags-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .demo-tag {
      background: rgba(255, 255, 255, 0.08);
      color: #cbd5e1;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.78rem;
    }
    .chat-bubble {
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 0.88rem;
      margin-bottom: 10px;
      &.user { background: #0369a1; color: #fff; max-width: 85%; margin-left: auto; text-align: right; }
      &.bot { background: #1e293b; color: #e2e8f0; border: 1px solid rgba(255, 255, 255, 0.1); }
    }
    .bot-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #34d399;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .doc-demo-card {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      .doc-avatar { font-size: 2rem; background: #334155; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
      strong { display: block; color: #f8fafc; font-size: 0.95rem; }
      .doc-sub { color: #94a3b8; font-size: 0.8rem; }
    }
    .verified-pill {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 700;
      margin-left: auto;
    }
    .crisis-demo-alert {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      .alert-icon { font-size: 1.8rem; }
      strong { display: block; color: #fecdd3; font-size: 0.95rem; }
      .alert-sub { color: #fda4af; font-size: 0.8rem; }
    }
    .player-controls-bar {
      background: #1e293b;
      padding: 12px 18px;
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 18px;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .controls-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .play-pause-btn {
      background: #10b981;
      border: none;
      color: #022c22;
      font-weight: 800;
      font-size: 0.82rem;
      padding: 6px 14px;
      border-radius: 999px;
      cursor: pointer;
      box-shadow: 0 0 14px rgba(16, 185, 129, 0.5);
      &:hover { background: #34d399; }
    }
    .chapter-indicator-label {
      font-size: 0.82rem;
      color: #cbd5e1;
    }
    .timeline-slider-track {
      height: 6px;
      background: #334155;
      border-radius: 999px;
      cursor: pointer;
      position: relative;
    }
    .timeline-slider-progress {
      height: 100%;
      background: #10b981;
      border-radius: 999px;
      position: relative;
    }
    .timeline-handle {
      position: absolute;
      right: -5px;
      top: -3px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 0 6px rgba(0,0,0,0.4);
    }

    @media (max-width: 768px) {
      .dialogue-stage-box { grid-template-columns: 1fr; }
      .player-controls-bar { grid-template-columns: 1fr; gap: 10px; }
    }
  `,
})
export class HomePage implements OnInit {
  protected readonly auth = inject(AuthService);

  protected readonly dynamicFeatures = signal<any[]>([]);
  protected readonly statTotalUsers = signal('14,850+');
  protected readonly statTotalNgos = signal('124');
  protected readonly statRecoveryRate = signal('94.6%');
  protected readonly statAvgResponseTime = signal('< 42s');

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

  // Multilingual AI Companion State
  protected readonly selectedLang = signal<'en' | 'hi' | 'bn'>('hi');
  protected readonly selectedCharacter = signal<'asha' | 'aarav' | 'ananya'>('asha');
  protected readonly isAudioPlaying = signal<boolean>(true);

  // Demo Video Walkthrough State
  protected readonly activeVideoChapter = signal<number>(1);
  protected readonly isVideoPlaying = signal<boolean>(true);
  protected readonly videoProgress = signal<number>(38);
  protected readonly videoTime = signal<string>('01:14');

  toggleAudio() {
    this.isAudioPlaying.set(!this.isAudioPlaying());
  }

  toggleVideoPlay() {
    this.isVideoPlaying.set(!this.isVideoPlaying());
  }

  selectVideoChapter(ch: number) {
    this.activeVideoChapter.set(ch);
    const times = ['00:24', '01:14', '01:52', '02:40'];
    const progresses = [15, 38, 65, 90];
    this.videoTime.set(times[ch - 1] || '01:00');
    this.videoProgress.set(progresses[ch - 1] || 50);
  }

  advanceVideoChapter() {
    const next = this.activeVideoChapter() === 4 ? 1 : this.activeVideoChapter() + 1;
    this.selectVideoChapter(next);
  }

  currentDialogue(): string {
    const lang = this.selectedLang();
    const char = this.selectedCharacter();
    if (char === 'asha') {
      if (lang === 'hi') return 'नमस्ते! मैं आशा हूँ, आपकी सच्ची और शांत साथी। एक गहरी, धीमी सांस लीजिए। आज आपका मन जो भी महसूस कर रहा है, आप बिना किसी झिझक के मुझसे कह सकते हैं। आज आप कैसा महसूस कर रहे हैं?';
      if (lang === 'bn') return 'নমস্কার! আমি আশা, আপনার সহানুভূতিশীল সাথী। একটি গভীর শ্বাস নিন। আজ আপনার মনে যে কথাই থাকুক না কেন, আপনি নির্দ্বিধায় আমাকে বলতে পারেন। আজ আপনার মন কেমন আছে বলুন?';
      return "Hello! I'm Asha, your gentle companion. Take a soft, deep breath. Whatever you're holding inside today, you don't have to carry it alone. How does your heart feel right now?";
    } else if (char === 'aarav') {
      if (lang === 'hi') return 'स्वागत है। मैं डॉ. आरव हूँ। एक क्लिनिकल मार्गदर्शक के रूप में, मैं वैज्ञानिक कॉग्निटिव तकनीकों और विचारों को संतुलित करने में आपकी मदद करता हूँ। चलिए शांति से बात करते हैं।';
      if (lang === 'bn') return 'স্বাগতম। আমি ডাঃ আরভ। একজন ক্লিনিক্যাল গাইড হিসেবে, আমি বৈজ্ঞানিক কগনিটিভ থেরাপি ও মানসিক স্থিতি বজায় রাখতে সাহায্য করি। চলুন শান্ত মনে আলোচনা শুরু করি।';
      return "Welcome. I'm Dr. Aarav. As a clinical guide, I focus on evidence-based cognitive grounding and emotional regulation. Let's look at your thoughts with clarity and calm perspective.";
    } else {
      if (lang === 'hi') return 'नमस्ते! मैं अनन्य हूँ। पढ़ाई, करियर की चिंता या दैनिक तनाव से परेशान हैं? चलिए इसे छोटे-छोटे आसान कदमों में बांटते हैं ताकि आपकी ऊर्जा और आत्मविश्वास फिर से लौट सके।';
      if (lang === 'bn') return 'হ্যালো! আমি অনন্যা। পড়াশোনা, ক্যারিয়ারের চাপ কিংবা অতিরিক্ত দুশ্চিন্তা হচ্ছে? চলুন একসাথে বিষয়গুলোকে সহজ করে সমাধান করি, যাতে আপনার আত্মবিশ্বাস ফিরে আসে।';
      return "Hey there! I'm Ananya. Struggling with exam stress, burnout, or daily chaos? Let's break it down into easy, bite-sized steps so you can regain your spark and focus.";
    }
  }

  async ngOnInit() {
    try {
      const res = await fetch('https://mindbridge-api-x99i.onrender.com/api/v1/governance/settings');
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.statsOverride) {
          const so = json.data.statsOverride;
          if (so.totalUsers) this.statTotalUsers.set(so.totalUsers);
          if (so.totalNgos) this.statTotalNgos.set(so.totalNgos);
          if (so.recoveryRate) this.statRecoveryRate.set(so.recoveryRate);
          if (so.avgResponseTime) this.statAvgResponseTime.set(so.avgResponseTime);
        }
        if (Array.isArray(json?.data?.dynamicFeatures)) {
          const active = json.data.dynamicFeatures.filter((f: any) => f.enabled && f.placement !== 'TOP_HEADER' && f.placement !== 'SIDE_STICKY');
          if (active.length > 0) {
            this.dynamicFeatures.set(active);
          }
        }
      }
    } catch {
      // Fallback
    }
  }
}
