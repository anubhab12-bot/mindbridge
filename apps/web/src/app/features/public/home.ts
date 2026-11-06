import { Component, inject, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { TelehealthService } from '../../core/services/telehealth.service';
import { PwaService } from '../../core/services/pwa.service';
import { apiUrl } from '../../core/api/api.service';

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
          <div class="medical-authority-pill">
            <span class="authority-bullet"></span>
            <span>ACCREDITED CLINICAL MENTAL HEALTHCARE · 124+ MEDICAL PARTNERS</span>
          </div>
          <h1 class="medical-hero-title">
            Compassionate, Clinical Mental Healthcare & <span class="medical-gradient-text">Psychiatrist Telehealth</span>
          </h1>
          <p class="lead">
            MindBridge bridges verified AIIMS & NIMHANS psychiatrists, licensed clinical psychologists, and accredited mental health organizations. Schedule confidential 1-on-1 video consultations with end-to-end clinical encryption and meeting links sent directly to your email.
          </p>

          <!-- DYNAMIC HERO PROMO CARD (Live Deployed by Super Admin) -->
          @if (heroPromoFeature(); as promo) {
            <div class="hero-live-promo-card animated-fade" [class]="'promo-theme-' + (promo.themeColor || 'indigo')">
              <div class="promo-header">
                <span class="promo-badge">{{ promo.badgeLabel || 'Featured Program' }}</span>
                <span class="promo-live-tag">Active Service</span>
              </div>
              <h3 class="promo-title">{{ promo.title }}</h3>
              <p class="promo-desc">{{ promo.description }}</p>
              @if (promo.ctaText) {
                <div class="promo-action">
                  <a [href]="promo.ctaLink || '/patient/companion'" class="btn btn-sm btn-primary-elevated">
                    {{ promo.ctaText }} →
                  </a>
                </div>
              }
            </div>
          }

          <div class="row hero-actions">
            <a
              routerLink="/patient/dashboard"
              class="btn btn-primary-elevated btn-hero-cta"
            >
              Schedule Video Consultation
            </a>
            @if (auth.isAuthenticated()) {
              <a class="btn btn-secondary btn-hero-cta" [routerLink]="auth.homeFor()">My Dashboard →</a>
            } @else {
              <a class="btn btn-secondary btn-hero-cta" routerLink="/professionals">Specialists Directory</a>
            }
            <button
              type="button"
              class="btn btn-ghost btn-hero-cta"
              (click)="pwa.openDownloadModal()"
            >
              Download App
            </button>
          </div>
          <div class="clinical-trust-row">
            <span class="trust-badge">NMC Verified Doctors</span>
            <span class="trust-badge">AES-256 Encrypted Telehealth</span>
            <span class="trust-badge">Tele-MANAS & Kiran Partnered</span>
            <span class="trust-badge">Direct Meeting Links Emailed</span>
          </div>
        </div>

        <aside class="hero-card clinical-emergency-card" aria-labelledby="help-now">
          <div class="help-header">
            <div>
              <span class="emergency-tag">24/7 CRISIS HELPLINE</span>
              <h2 id="help-now">In Distress or Danger?</h2>
              <p class="small muted">Immediate verified crisis support is free 24/7 across India.</p>
            </div>
          </div>
          <div class="emergency-helplines-box">
            <div class="helpline-item">
              <span class="helpline-org">Tele-MANAS National Helpline:</span>
              <a href="tel:14416" class="helpline-dial">14416 <span class="helpline-note">(24/7 · Toll-Free · 20+ Languages)</span></a>
            </div>
            <div class="helpline-item">
              <span class="helpline-org">Kiran Mental Health Helpline:</span>
              <a href="tel:18005990019" class="helpline-dial">1800-599-0019 <span class="helpline-note">(Govt. of India)</span></a>
            </div>
          </div>
          <a class="btn btn-crisis btn-block btn-emergency-cta" routerLink="/crisis">
            Connect with Emergency Support (14416) →
          </a>
        </aside>
      </div>
    </section>

    <!-- CLINICAL TELEHEALTH & 1-ON-1 DOCTOR VIDEO CONSULTATION SHOWCASE -->
    <section class="telehealth-showcase-section">
      <div class="container">
        <div class="telehealth-card-banner card">
          <div class="telehealth-banner-left">
            <div class="telehealth-badge-row">
              <span class="pulse-live-badge">AIIMS & NIMHANS SPECIALISTS</span>
              <span class="teams-link-tag">SECURE 1-ON-1 HD VIDEO</span>
            </div>
            <h2>Consult Top Mental Health Specialists</h2>
            <p>
              Connect with India's leading AIIMS & NIMHANS verified psychiatrists and clinical psychologists (ranked by clinical experience).
              When an appointment is scheduled, an email with the direct video meeting link is sent to both the patient and the doctor. In the Patient Portal, your scheduled appointment doctor will appear for instant joining with Camera & Mic On/Off controls.
            </p>
            <div class="telehealth-cta-group">
              <a
                routerLink="/patient/dashboard"
                class="btn btn-primary-elevated btn-telehealth-cta"
              >
                Schedule Video Consultation
              </a>
              <a
                routerLink="/patient/professionals"
                class="btn btn-secondary btn-telehealth-cta"
              >
                Specialists Directory
              </a>
              <span class="confidential-text">Meeting link emailed directly to patient and doctor · Video & audio controls available</span>
            </div>
          </div>

          <div class="telehealth-doctors-grid">
            @for (doc of telehealth.onDutyDoctors(); track doc.id) {
              <div class="on-duty-doc-card" [routerLink]="['/patient/dashboard']">
                <div class="doc-card-top">
                  <span class="doc-avatar-large">{{ doc.avatar }}</span>
                  <div class="doc-card-headings">
                    <strong>{{ doc.name }}</strong>
                    <span class="doc-role-small">{{ doc.role }}</span>
                  </div>
                  <span class="exp-badge-pill">{{ doc.experience }}</span>
                </div>
                <div class="doc-card-stats">
                  <span>Rating: {{ doc.rating }} / 5.0</span> ·
                  <span>{{ doc.experience }}</span> ·
                  <span>{{ doc.languages.join(', ') }}</span>
                </div>
                <div class="doc-card-actions">
                  <a routerLink="/patient/dashboard" class="btn-micro video">
                    Book Consultation
                  </a>
                </div>
              </div>
            }
          </div>
        </div>
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
                <span class="mood-dot" [class]="'tone-' + i">●</span>
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
            <div class="impact-icon-wrapper teal">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div class="impact-data">
              <span class="impact-number">{{ statTotalUsers() }}</span>
              <span class="impact-label">Persons Actively Using MindBridge</span>
            </div>
            <span class="impact-trend">+18.4% this month</span>
          </div>

          <div class="impact-card">
            <div class="impact-icon-wrapper indigo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9h1"/><path d="M9 13h1"/><path d="M9 17h1"/>
              </svg>
            </div>
            <div class="impact-data">
              <span class="impact-number">{{ statTotalNgos() }}</span>
              <span class="impact-label">Partner NGOs & Regional Clinics</span>
            </div>
            <span class="impact-trend">Accredited networks</span>
          </div>

          <div class="impact-card highlight">
            <div class="impact-icon-wrapper emerald">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </div>
            <div class="impact-data">
              <span class="impact-number">{{ statRecoveryRate() }}</span>
              <span class="impact-label">Recovery & Improvement Rate</span>
            </div>
            <span class="impact-trend positive">Clinically validated</span>
          </div>

          <div class="impact-card">
            <div class="impact-icon-wrapper amber">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
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
        <span class="eyebrow-accent">24/7 MULTILINGUAL AI SANCTUARY</span>
        <h2>Meet Your 24/7 AI Companion in Your Own Language</h2>
        <p class="muted lead" style="max-width: 650px; margin: 0 auto 20px;">
          Select your preferred companion and language (Hindi, Bengali, or English) for comforting, non-judgmental guidance and active listening.
        </p>

        <!-- Language Selector Bar -->
        <div class="lang-selector-bar">
          <button 
            type="button"
            class="lang-pill" 
            [class.active]="selectedLang() === 'en'"
            (click)="selectLanguage('en')">
            <span class="lang-code-tag">EN</span> English
          </button>
          <button 
            type="button"
            class="lang-pill" 
            [class.active]="selectedLang() === 'hi'"
            (click)="selectLanguage('hi')">
            <span class="lang-code-tag">HI</span> हिंदी (Hindi)
          </button>
          <button 
            type="button"
            class="lang-pill" 
            [class.active]="selectedLang() === 'bn'"
            (click)="selectLanguage('bn')">
            <span class="lang-code-tag">BN</span> বাংলা (Bengali)
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
            (click)="selectCharacter('asha')">
            <div class="char-avatar-ring rose">
              <span class="char-initials">AS</span>
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
            (click)="selectCharacter('aarav')">
            <div class="char-avatar-ring blue">
              <span class="char-initials">AM</span>
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
            (click)="selectCharacter('ananya')">
            <div class="char-avatar-ring purple">
              <span class="char-initials">AN</span>
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
              <span class="stage-initials">
                {{ selectedCharacter() === 'asha' ? 'AS' : (selectedCharacter() === 'aarav' ? 'AM' : 'AN') }}
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  </svg>
                  <span>{{ isAudioPlaying() ? 'Voice Active (Mute)' : 'Play Voice Narration' }}</span>
                </button>
              </div>

              <blockquote class="dialogue-text">
                "{{ currentDialogue() }}"
              </blockquote>

              <div class="speech-footer">
                <span class="lang-tag">
                  {{ selectedLang() === 'hi' ? 'हिंदी (Hindi) Voice Model' : (selectedLang() === 'bn' ? 'বাংলা (Bengali) Voice Model' : 'English Voice Model') }}
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
            <span class="live-recording-badge">INTERACTIVE PLATFORM TOUR</span>
            <span>MindBridge Clinical Care Journey</span>
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
                    <span class="demo-tag">Morning Walk</span>
                    <span class="demo-tag">Reduced Caffeine</span>
                    <span class="demo-tag">10m Mindfulness</span>
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
                      <span class="bot-name">Asha AI Companion</span>
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
                    <div class="doc-demo-initials">KR</div>
                    <div>
                      <strong>Dr. Kavitha Raman, MD Psychiatry</strong>
                      <span class="doc-sub">10 yrs exp · KMC-2016-9281 Verified · Tele-Consult ₹600</span>
                    </div>
                    <span class="verified-pill">Medical Council Verified</span>
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
                    <div class="alert-icon-wrap">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>
                      </svg>
                    </div>
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
                @if (isVideoPlaying()) {
                  <rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/>
                } @else {
                  <polygon points="5 3 19 12 5 21 5 3"/>
                }
              </svg>
              <span>{{ isVideoPlaying() ? 'Pause' : 'Play Tour' }}</span>
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

    <!-- ACCREDITED CLINICAL SAFETY & QUALITY STANDARDS -->
    <section class="container" style="margin-bottom: var(--mb-space-6);">
      <div class="clinical-ethics-card card">
        <div class="ethics-left">
          <div class="pill-badge-clinical">
            <span class="live-dot-teal"></span>
            <span>CLINICAL ETHICS & ACCREDITATION STANDARDS</span>
          </div>
          <h2>Rigorous Safety, Medical Ethics & Verified Clinicians</h2>
          <p class="lead-clinical">
            Every psychiatrist and clinical psychologist on MindBridge is individually verified against National Medical Commission (NMC) registration or Rehabilitation Council of India (RCI) licensing. Consultations are end-to-end encrypted under India's Digital Personal Data Protection (DPDP) Act.
          </p>
          <div class="clinical-pillars-row">
            <div class="clinical-pillar-item">
              <span class="pillar-title">100% Verified Licenses</span>
              <span class="pillar-sub">NMC / RCI verified clinical credentials</span>
            </div>
            <div class="clinical-pillar-item">
              <span class="pillar-title">AES-256 Confidentiality</span>
              <span class="pillar-sub">DPDP Act compliant zero-leakage data</span>
            </div>
            <div class="clinical-pillar-item">
              <span class="pillar-title">24/7 Crisis Escalation</span>
              <span class="pillar-sub">Direct link to Tele-MANAS (14416)</span>
            </div>
          </div>
          <div class="row" style="margin-top: 18px; gap: 12px; flex-wrap: wrap;">
            <a routerLink="/professionals" class="btn btn-primary-elevated">
              Browse Verified Specialists →
            </a>
            <a routerLink="/how-it-works" class="btn btn-secondary">
              Clinical Telehealth Standards →
            </a>
          </div>
        </div>

        <div class="ethics-right">
          <div class="contact-support-box">
            <span class="contact-pill-tag">CLINICAL HELPDESK</span>
            <h3>Have Questions or Need Guidance?</h3>
            <p>Our care coordination team is available to assist you with specialist matching, video appointments, and confidentiality inquiries.</p>
            <div class="contact-box-actions">
              <a href="mailto:support@mindbridge.health?subject=Clinical%20Inquiry%20-%20MindBridge" class="btn btn-primary btn-block">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
                  <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <span>Contact via Email (support&#64;mindbridge.health)</span>
              </a>
              <span class="emergency-reminder">In immediate crisis? Call toll-free <strong>14416</strong> (Tele-MANAS)</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ACTIVE CLINICAL PROGRAMS & INITIATIVES -->
    @if (dynamicFeatures().length > 0) {
      <section class="container dynamic-features-section">
        <div class="section-header center">
          <span class="eyebrow-accent">Specialized Healthcare Programs</span>
          <h2>Active Clinical Programs & Community Support</h2>
          <p class="muted">Evidence-based programs and care pathways designed by our clinical advisory team.</p>
        </div>

        <div class="dynamic-features-grid">
          @for (item of dynamicFeatures(); track item.id) {
            <article class="dynamic-feature-card" [class]="'df-theme-' + item.themeColor">
              <div class="df-card-top">
                <span class="df-bullet-dot">●</span>
                <span class="df-badge">{{ item.badgeLabel || 'Featured Program' }}</span>
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
        @for (f of features; track f.title; let i = $index) {
          <article class="card-feature card-interactive">
            <div class="feature-icon-badge">
              @switch (i) {
                @case (0) {
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                }
                @case (1) {
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>
                  </svg>
                }
                @case (2) {
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                }
                @case (3) {
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
                  </svg>
                }
                @case (4) {
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9h1"/><path d="M9 13h1"/><path d="M9 17h1"/>
                  </svg>
                }
                @default {
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>
                  </svg>
                }
              }
            </div>
            <h3>{{ f.title }}</h3>
            <p class="muted">{{ f.text }}</p>
          </article>
        }
      </div>
    </section>

    <!-- MOBILE APP DOWNLOAD SHOWCASE -->
    <section class="container mobile-app-showcase-section">
      <div class="mobile-app-banner">
        <div class="mobile-app-left">
          <div class="app-eyebrow-pill">
            <span class="pulse-dot"></span>
            <span>OFFICIAL MOBILE & PWA APP</span>
          </div>
          <h2>Instant mental healthcare & companion right on your phone.</h2>
          <p class="app-lead">
            Install MindBridge on Android or iOS. Enjoy full-screen native performance, offline reflection tools, and direct Microsoft Teams video consultation ringing.
          </p>
          <div class="app-perks-grid">
            <div class="app-perk">
              <span class="perk-check">✓</span>
              <span><strong>1-Tap Home Screen Access</strong> with zero app-store download friction</span>
            </div>
            <div class="app-perk">
              <span class="perk-check">✓</span>
              <span><strong>Teams Audio & Video</strong> consultations with AIIMS-verified doctors</span>
            </div>
            <div class="app-perk">
              <span class="perk-check">✓</span>
              <span><strong>24/7 Multilingual Companion</strong> Asha with spoken Bengali, Hindi & English</span>
            </div>
            <div class="app-perk">
              <span class="perk-check">✓</span>
              <span><strong>100% Encrypted & Private</strong> local journaling & mood trackers</span>
            </div>
          </div>
          <div class="app-download-actions">
            <button type="button" class="btn btn-primary-elevated btn-lg btn-install-app" (click)="pwa.openDownloadModal()">
              <span>Download & Install Mobile App</span>
              <span class="btn-subtext">Free · Instant PWA · Android & iOS</span>
            </button>
            <span class="app-install-note">Client-side encrypted · No credit card required</span>
          </div>
        </div>

        <div class="mobile-app-right">
          <div class="phone-mockup-frame">
            <div class="phone-speaker-notch"></div>
            <div class="phone-screen-content">
              <div class="mockup-header-bar">
                <span class="mockup-logo">MindBridge.health</span>
                <span class="mockup-status">Available 24/7</span>
              </div>
              <div class="mockup-chat-card">
                <div class="bubble-title">Asha AI Companion</div>
                <div class="chat-msg">
                  "नमस्ते! आज आपका दिन कैसा रहा? मैं हमेशा आपके साथ हूँ।"
                </div>
              </div>
              <div class="mockup-specialist-call">
                <div class="spec-avatar-initials">SS</div>
                <div class="spec-info">
                  <strong>Dr. Sunita Sen</strong>
                  <span>11 yrs exp · Video Telehealth</span>
                </div>
                <button type="button" class="btn-mockup-call" (click)="telehealth.openLauncher()">Consult</button>
              </div>
              <div class="mockup-quick-dock">
                <span>Home</span>
                <span>Companion</span>
                <span>Video Call</span>
                <span>Mood</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    /* Mobile App Showcase Section */
    .mobile-app-showcase-section {
      margin: var(--mb-space-7) auto;
    }
    .mobile-app-banner {
      background: linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(37, 99, 235, 0.06) 50%, rgba(99, 102, 241, 0.08) 100%), var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-radius: 28px;
      padding: clamp(32px, 5vw, 56px) clamp(24px, 4vw, 48px);
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 40px;
      align-items: center;
      box-shadow: var(--mb-shadow-lg);
    }
    .app-eyebrow-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(13, 148, 136, 0.12);
      border: 1px solid rgba(13, 148, 136, 0.3);
      color: var(--mb-primary);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      margin-bottom: 14px;
    }
    .mobile-app-left h2 {
      font-size: clamp(1.6rem, 2.8vw, 2.2rem);
      margin-bottom: 12px;
      font-weight: 750;
      letter-spacing: -0.02em;
    }
    .app-lead {
      color: var(--mb-text-muted);
      font-size: 1.05rem;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .app-perks-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 28px;
    }
    .app-perk {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 0.95rem;
      line-height: 1.4;
      color: var(--mb-text);
    }
    .perk-check {
      color: var(--mb-primary);
      font-weight: bold;
      font-size: 1.05rem;
      flex-shrink: 0;
    }
    .app-download-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: flex-start;
    }
    .btn-install-app {
      padding: 14px 28px;
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      cursor: pointer;
      font-size: 1.05rem;
    }
    .btn-subtext {
      font-size: 0.75rem;
      opacity: 0.85;
      font-weight: 400;
    }
    .app-install-note {
      font-size: 0.8rem;
      color: var(--mb-text-muted);
    }
    .mobile-app-right {
      display: flex;
      justify-content: center;
    }
    .phone-mockup-frame {
      width: 280px;
      height: 480px;
      background: #0f172a;
      border: 8px solid #1e293b;
      border-radius: 36px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45);
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .phone-speaker-notch {
      width: 80px;
      height: 14px;
      background: #1e293b;
      border-radius: 0 0 10px 10px;
      margin: 0 auto;
      z-index: 2;
    }
    .phone-screen-content {
      flex: 1;
      background: var(--mb-surface);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow: hidden;
    }
    .mockup-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--mb-border);
      padding-bottom: 8px;
      font-size: 0.82rem;
    }
    .mockup-logo {
      font-weight: 750;
      color: var(--mb-primary);
    }
    .mockup-status {
      font-size: 0.7rem;
      font-weight: 600;
    }
    .mockup-chat-card {
      background: var(--mb-surface-2);
      border: 1px solid var(--mb-border);
      border-radius: 12px;
      padding: 10px;
      font-size: 0.8rem;
    }
    .bubble-title {
      font-weight: 700;
      color: var(--mb-primary);
      margin-bottom: 4px;
      font-size: 0.75rem;
    }
    .chat-msg {
      line-height: 1.4;
      color: var(--mb-text);
    }
    .mockup-specialist-call {
      background: var(--mb-surface-2);
      border: 1px solid var(--mb-border);
      border-radius: 12px;
      padding: 8px 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .spec-avatar {
      font-size: 1.4rem;
    }
    .spec-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      strong { font-size: 0.78rem; line-height: 1.2; }
      span { font-size: 0.68rem; color: var(--mb-text-muted); }
    }
    .btn-mockup-call {
      background: #0d9488;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
    }
    .mockup-quick-dock {
      margin-top: auto;
      background: var(--mb-surface-2);
      border-top: 1px solid var(--mb-border);
      padding: 6px 4px;
      display: flex;
      justify-content: space-around;
      font-size: 0.68rem;
      font-weight: 600;
      color: var(--mb-text-muted);
      border-radius: 8px;
    }
    @media (max-width: 860px) {
      .mobile-app-banner {
        grid-template-columns: 1fr;
      }
      .mobile-app-right {
        order: -1;
      }
    }

    .hero {
      background: linear-gradient(180deg, #f0f9ff 0%, #f8fafc 100%);
      padding: clamp(36px, 5vw, 68px) 0 36px;
      border-bottom: 1px solid var(--mb-border);
    }
    :host-context([data-theme='dark']) .hero {
      background: linear-gradient(180deg, #0f172a 0%, #090e17 100%);
    }
    .hero-inner {
      display: grid;
      gap: var(--mb-space-6);
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
      align-items: center;
    }
    .medical-authority-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 14px;
      border-radius: 999px;
      background: var(--mb-primary-soft);
      color: var(--mb-primary-strong);
      border: 1px solid rgba(2, 132, 199, 0.25);
      font-size: 0.75rem;
      font-weight: 750;
      letter-spacing: 0.04em;
      margin-bottom: var(--mb-space-3);
    }
    .authority-bullet {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--mb-primary);
      flex-shrink: 0;
      display: inline-block;
    }
    .medical-cross-dot {
      color: var(--mb-primary);
      font-weight: 800;
      font-size: 0.85rem;
    }
    .medical-hero-title {
      font-size: clamp(2rem, 3.6vw, 2.9rem);
      font-weight: 800;
      letter-spacing: -0.025em;
      line-height: 1.2;
      margin: 0 0 16px;
      color: var(--mb-text);
    }
    .medical-gradient-text {
      background: linear-gradient(135deg, #0284c7 0%, #0d9488 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .lead {
      font-size: 1.12rem;
      line-height: 1.7;
      color: var(--mb-text-muted);
      max-width: 60ch;
      margin-bottom: var(--mb-space-5);
    }
    .hero-actions {
      margin-bottom: var(--mb-space-4);
      gap: 12px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
    }
    .btn-hero-cta {
      min-height: 44px;
      padding: 0 20px;
      font-weight: 700;
      font-size: 0.92rem;
      border-radius: var(--mb-radius-sm);
    }
    .clinical-trust-row {
      display: flex;
      gap: 10px;
      font-size: 0.82rem;
      color: var(--mb-text-muted);
      flex-wrap: wrap;
      margin-top: 14px;
    }
    .trust-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      padding: 5px 11px;
      border-radius: 6px;
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }

    .hero-live-promo-card {
      margin-top: var(--mb-space-4);
      margin-bottom: var(--mb-space-2);
      padding: 18px 22px;
      border-radius: var(--mb-radius-md);
      background: linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(14, 165, 233, 0.05));
      border: 2px dashed #6366f1;
      position: relative;
      box-shadow: 0 4px 20px -4px rgba(99, 102, 241, 0.2);
    }
    .promo-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .promo-icon {
      font-size: 1.4rem;
    }
    .promo-badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 999px;
      background: #4f46e5;
      color: #fff;
    }
    .promo-live-tag {
      font-size: 0.7rem;
      font-weight: 700;
      color: #10b981;
      margin-left: auto;
    }
    .promo-title {
      margin: 0 0 6px;
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--mb-text);
    }
    .promo-desc {
      margin: 0 0 12px;
      font-size: 0.92rem;
      line-height: 1.5;
      color: var(--mb-text-muted);
    }
    .promo-action {
      display: flex;
      gap: 10px;
    }

    .hero-card {
      background: var(--mb-surface);
      border: 1px solid rgba(220, 38, 38, 0.28);
      border-radius: var(--mb-radius);
      padding: 24px 22px;
      box-shadow: 0 4px 20px -2px rgba(220, 38, 38, 0.08);
      position: relative;
    }
    .clinical-emergency-card {
      border-left: 4px solid var(--mb-crisis);
    }
    .emergency-tag {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--mb-crisis);
      background: var(--mb-crisis-soft);
      padding: 2px 7px;
      border-radius: 4px;
      margin-bottom: 4px;
    }
    .help-header {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: var(--mb-space-3);
      h2 { margin: 2px 0 4px; font-size: 1.25rem; font-weight: 800; }
    }
    .crisis-icon { font-size: 1.8rem; }
    .emergency-helplines-box {
      background: var(--mb-surface-2);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius-sm);
      padding: 12px 14px;
      margin: 14px 0 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .helpline-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .helpline-org {
      font-size: 0.78rem;
      font-weight: 650;
      color: var(--mb-text-muted);
    }
    .helpline-dial {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--mb-crisis);
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }
    .helpline-note {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--mb-text-muted);
    }
    .btn-emergency-cta {
      font-weight: 750;
      letter-spacing: 0.01em;
      padding: 12px;
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

    /* Clinical Ethics & Accreditation Card */
    .clinical-ethics-card {
      background: linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(2, 132, 199, 0.04) 100%), var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-left: 4px solid var(--mb-teal);
      border-radius: var(--mb-radius-lg);
      padding: 32px;
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 32px;
      align-items: center;
      box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);
    }
    @media (max-width: 900px) {
      .clinical-ethics-card {
        grid-template-columns: 1fr;
        padding: 24px 20px;
        gap: 24px;
      }
    }
    .pill-badge-clinical {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(13, 148, 136, 0.1);
      color: var(--mb-teal-strong);
      font-weight: 750;
      font-size: 0.72rem;
      padding: 4px 12px;
      border-radius: 999px;
      margin-bottom: 10px;
      letter-spacing: 0.04em;
    }
    .live-dot-teal {
      width: 6px;
      height: 6px;
      background: #0d9488;
      border-radius: 50%;
    }
    .lead-clinical {
      font-size: 0.94rem;
      line-height: 1.6;
      color: var(--mb-text-muted);
      margin-bottom: 18px;
    }
    .clinical-pillars-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
      margin: 18px 0;
    }
    .clinical-pillar-item {
      background: var(--mb-surface-2);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius-sm);
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .pillar-title {
      font-size: 0.88rem;
      font-weight: 800;
      color: var(--mb-text);
    }
    .pillar-sub {
      font-size: 0.74rem;
      color: var(--mb-text-muted);
    }
    .contact-support-box {
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius);
      padding: 24px 22px;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .contact-pill-tag {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 800;
      color: #0284c7;
      letter-spacing: 0.05em;
    }
    .contact-support-box h3 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--mb-text);
    }
    .contact-support-box p {
      margin: 0;
      font-size: 0.84rem;
      color: var(--mb-text-muted);
      line-height: 1.5;
    }
    .contact-box-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 6px;
    }
    .emergency-reminder {
      font-size: 0.72rem;
      color: var(--mb-crisis);
      font-weight: 600;
    }
    .df-bullet-dot {
      color: var(--mb-teal);
      font-size: 10px;
    }
    .char-initials,
    .stage-initials {
      font-weight: 800;
      color: #ffffff;
      font-size: 0.95rem;
      letter-spacing: 0.05em;
    }
    .stage-initials {
      font-size: 1.8rem;
    }
    .lang-code-tag {
      font-weight: 800;
      font-size: 0.75rem;
      padding: 2px 5px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.06);
      margin-right: 4px;
    }
    .doc-demo-initials,
    .spec-avatar-initials {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--mb-teal), var(--mb-primary));
      color: #ffffff;
      font-size: 0.85rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .mood-dot {
      font-size: 10px;
      margin-right: 4px;
      &.tone-0 { color: #0d9488; }
      &.tone-1 { color: #f59e0b; }
      &.tone-2 { color: #6366f1; }
      &.tone-3 { color: #ef4444; }
      &.tone-4 { color: #10b981; }
    }
    .feature-icon-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: var(--mb-radius-sm);
      background: rgba(13, 148, 136, 0.08);
      border: 1px solid rgba(13, 148, 136, 0.2);
      color: #0f766e;
      margin-bottom: 12px;
    }
    :host-context([data-theme='dark']) .feature-icon-badge {
      background: rgba(45, 212, 191, 0.12);
      border-color: rgba(45, 212, 191, 0.25);
      color: #2dd4bf;
    }

    /* Dynamic Features Section */
    .dynamic-features-section {
      padding: 40px 0 20px;
    }
    .dynamic-features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
      gap: 20px;
      margin-top: 24px;
      @media (max-width: 640px) {
        grid-template-columns: 1fr;
      }
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
    @media (max-width: 640px) {
      .lang-selector-bar {
        max-width: 100%;
        flex-wrap: wrap;
        justify-content: center;
        border-radius: var(--mb-radius);
      }
      .lang-pill {
        padding: 6px 12px;
        font-size: 0.82rem;
      }
      .character-switcher-grid {
        grid-template-columns: 1fr;
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

    /* Telehealth Showcase Section */
    .telehealth-showcase-section {
      margin-bottom: var(--mb-space-6);
    }
    .telehealth-card-banner {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 32px;
      padding: clamp(24px, 4vw, 36px);
      background: linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%);
      border: 1px solid rgba(13, 148, 136, 0.25);
      border-radius: var(--mb-radius-lg);
      align-items: center;
    }
    .telehealth-badge-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }
    .pulse-live-badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: #0d9488;
      background: rgba(13, 148, 136, 0.12);
      padding: 3px 10px;
      border-radius: 999px;
      border: 1px solid rgba(13, 148, 136, 0.3);
    }
    .teams-link-tag {
      font-size: 0.72rem;
      font-weight: 800;
      color: #6366f1;
      background: rgba(99, 102, 241, 0.12);
      padding: 3px 10px;
      border-radius: 999px;
    }
    .telehealth-banner-left h2 {
      font-size: clamp(1.25rem, 3.2vw, 1.75rem);
      line-height: 1.3;
      margin: 0 0 10px;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .telehealth-banner-left p {
      color: var(--mb-text-muted);
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .telehealth-cta-group {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .btn-telehealth-cta {
      min-height: 44px;
      font-weight: 700;
      padding: 0 20px;
    }
    .confidential-text {
      font-size: 0.8rem;
      color: var(--mb-text-muted);
      display: block;
      width: 100%;
      margin-top: 4px;
    }

    .telehealth-doctors-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .on-duty-doc-card {
      background: var(--mb-surface);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius);
      padding: 12px 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: var(--mb-shadow);
      &:hover {
        transform: translateY(-2px);
        border-color: var(--mb-primary);
        box-shadow: var(--mb-shadow-lg);
      }
    }
    .doc-card-top {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .doc-avatar-large {
      font-size: 1.8rem;
      line-height: 1;
    }
    .doc-card-headings {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .doc-card-headings strong {
      font-size: 0.92rem;
      color: var(--mb-text);
    }
    .doc-role-small {
      font-size: 0.78rem;
      color: var(--mb-text-muted);
    }
    .exp-badge-pill {
      font-size: 0.72rem;
      font-weight: 800;
      color: #0d9488;
      background: rgba(13, 148, 136, 0.12);
      padding: 3px 8px;
      border-radius: 999px;
      white-space: nowrap;
    }
    .dot-online {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }
    .doc-card-stats {
      font-size: 0.76rem;
      color: var(--mb-text-muted);
      margin-bottom: 8px;
    }
    .doc-card-actions {
      display: flex;
      gap: 8px;
    }
    .btn-micro {
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid var(--mb-border);
      background: var(--mb-surface-2);
      color: var(--mb-text);
      font-size: 0.76rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
      &:hover {
        background: var(--mb-primary-soft);
        color: var(--mb-primary);
        border-color: var(--mb-primary);
      }
      &.video:hover {
        background: #10b981;
        color: #fff;
        border-color: #10b981;
      }
    }

    .btn-telehealth-hero {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #0d9488 0%, #059669 100%);
      color: #ffffff;
      padding: 0 20px;
      min-height: 44px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 0.92rem;
      border: none;
      box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
      cursor: pointer;
      transition: all 0.2s ease;
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(13, 148, 136, 0.45);
      }
    }
    .live-pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #34d399;
      animation: pulse 1.5s infinite;
    }

    @media (max-width: 768px) {
      .hero {
        padding: 24px 0 44px;
      }
      .hero-inner {
        grid-template-columns: 1fr;
        gap: 20px;
      }
      .medical-authority-pill {
        font-size: 0.7rem;
        padding: 4px 10px;
        border-radius: 6px;
        white-space: normal;
        line-height: 1.35;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 12px;
        max-width: 100%;
        box-sizing: border-box;
      }
      .medical-hero-title {
        font-size: 1.55rem !important;
        line-height: 1.25 !important;
        letter-spacing: -0.02em !important;
        margin: 0 0 14px !important;
        word-break: normal !important;
        overflow-wrap: break-word !important;
      }
      .lead {
        font-size: 0.95rem !important;
        line-height: 1.55 !important;
        margin-bottom: 18px !important;
      }
      .hero-actions {
        flex-direction: column;
        width: 100%;
        gap: 10px;
        margin-bottom: 18px;
      }
      .btn-hero-cta {
        width: 100%;
        min-height: 44px;
        font-size: 0.92rem;
        text-align: center;
        justify-content: center;
      }
      .clinical-trust-row {
        display: grid !important;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 14px;
        margin-bottom: 24px;
        width: 100%;
        box-sizing: border-box;
      }
      .trust-badge {
        font-size: 0.72rem;
        padding: 7px 8px;
        justify-content: center;
        text-align: center;
        white-space: normal;
        line-height: 1.25;
        box-sizing: border-box;
        border-radius: 8px;
      }
      .clinical-emergency-card {
        margin-top: 10px;
        padding: 20px 16px;
      }
      .telehealth-card-banner {
        grid-template-columns: 1fr;
        padding: 20px 16px;
        gap: 20px;
        overflow: hidden;
        box-sizing: border-box;
      }
      .telehealth-banner-left {
        width: 100%;
        max-width: 100%;
        overflow: hidden;
      }
      .telehealth-banner-left h2 {
        font-size: 1.35rem;
        line-height: 1.25;
        word-break: break-word;
        overflow-wrap: break-word;
      }
      .telehealth-cta-group {
        display: flex;
        flex-direction: column;
        width: 100%;
        gap: 10px;
      }
      .btn-telehealth-cta {
        width: 100%;
        min-height: 44px;
        justify-content: center;
        text-align: center;
      }
      .pulse-live-badge, .teams-link-tag {
        font-size: 0.68rem;
        padding: 3px 8px;
        white-space: normal;
      }
    }

    @media (max-width: 420px) {
      .medical-hero-title {
        font-size: 1.42rem !important;
      }
      .clinical-trust-row {
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
    }

    @media (max-width: 350px) {
      .clinical-trust-row {
        grid-template-columns: 1fr;
      }
    }

    :host-context([data-theme='dark']) {
      .telehealth-card-banner {
        background: linear-gradient(135deg, rgba(13, 148, 136, 0.12) 0%, rgba(99, 102, 241, 0.1) 100%);
        border-color: rgba(79, 184, 173, 0.3);
      }
      .on-duty-doc-card {
        background: var(--mb-surface-2);
        border-color: var(--mb-border);
      }
      .ai-stage-card {
        background: linear-gradient(180deg, var(--mb-surface) 0%, rgba(15, 110, 102, 0.12) 100%);
        border-color: rgba(79, 184, 173, 0.25);
      }
      .character-card-btn.active {
        background: var(--mb-surface-2);
        border-color: var(--mb-primary);
      }
      .speech-bubble {
        background: var(--mb-surface-2);
        border-color: var(--mb-border);
      }
      .speech-footer {
        border-top-color: var(--mb-border);
      }
      .impact-card.highlight {
        background: linear-gradient(180deg, rgba(15, 110, 102, 0.2) 0%, var(--mb-surface) 100%);
        border-color: rgba(79, 184, 173, 0.35);
      }
      .lang-selector-bar {
        background: var(--mb-surface-2);
        border-color: var(--mb-border);
      }
      .char-avatar-ring.rose { background: #3b1820; border-color: #9f1239; }
      .char-avatar-ring.blue { background: #0c2838; border-color: #0369a1; }
      .char-avatar-ring.purple { background: #281938; border-color: #7e22ce; }
      .seats-visual-box {
        background: var(--mb-surface);
        border-color: var(--mb-border);
      }
      .seat-circle.available {
        background: var(--mb-surface-2);
        color: var(--mb-text-muted);
      }
      .dialogue-stage-box {
        background: var(--mb-surface);
      }
    }
  `,
})
export class HomePage implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly telehealth = inject(TelehealthService);
  protected readonly pwa = inject(PwaService);

  startInstantCall(mode: 'VIDEO' | 'CHAT') {
    this.telehealth.initiateCall(mode, undefined, 'Patient (You)');
  }

  selectAndCall(doctorId: string, mode: 'VIDEO' | 'CHAT') {
    this.telehealth.initiateCall(mode, doctorId, 'Patient (You)');
  }

  protected readonly dynamicFeatures = signal<any[]>([]);
  protected readonly heroPromoFeature = signal<any | null>(null);
  protected readonly statTotalUsers = signal('14,850+');
  protected readonly statTotalNgos = signal('124');
  protected readonly statRecoveryRate = signal('94.6%');
  protected readonly statAvgResponseTime = signal('< 42s');

  protected readonly selectedMoodIndex = signal(1); // Default to Anxious
  protected readonly selectedTrackIndex = signal(0); // Default to Anxiety track

  protected readonly moods: MoodOption[] = [
    {
      emoji: '',
      label: 'Calm & Centered',
      tip: 'Great moment to write a reflection in your encrypted journal or set a positive intention for your day.',
      action: 'Open Private Journal',
      toolLink: '/patient/journal',
    },
    {
      emoji: '',
      label: 'Anxious & Overthinking',
      tip: 'Follow the 4-7-8 breathing pacer on the right. Inhale for 4s, hold for 7s, exhale slowly for 8s to calm your vagus nerve.',
      action: 'Try Grounding Exercise',
      toolLink: '/self-help',
    },
    {
      emoji: '',
      label: 'Low & Exhausted',
      tip: 'You do not have to carry this alone. Taking things one gentle breath at a time is enough for right now.',
      action: 'Read Self-Help Guidance',
      toolLink: '/self-help',
    },
    {
      emoji: '',
      label: 'Stressed & Burnt Out',
      tip: 'Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste to reground your senses.',
      action: 'Sensory Reset Guide',
      toolLink: '/self-help',
    },
    {
      emoji: '',
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
      icon: '',
      title: 'Empathetic AI Companion',
      text: 'Available 24/7 for calm, non-judgmental active listening, grounding exercises, and safety screening with zero clinical coldness.',
    },
    {
      icon: '',
      title: 'Verified Medical Specialists',
      text: 'Every psychiatrist and clinical psychologist is verified with state medical councils and the Rehabilitation Council of India.',
    },
    {
      icon: '',
      title: 'End-to-End Encryption',
      text: 'Your journal entries, AI companion chats, and clinical reflections are encrypted at rest with AES-256-GCM. Privacy is guaranteed.',
    },
    {
      icon: '',
      title: 'Zero-Delay Crisis Triage',
      text: 'Directly integrated with the Government of India Tele-MANAS (14416) crisis infrastructure for immediate safety escalations.',
    },
    {
      icon: '',
      title: '124+ Partner NGOs',
      text: 'A nationwide grassroots network of mental health non-profits providing free community distress counseling and local camps.',
    },
    {
      icon: '',
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
  protected readonly isAudioPlaying = signal<boolean>(false);

  private audioCtx: any = null;
  private audioPlayer: HTMLAudioElement | null = null;

  selectLanguage(lang: 'en' | 'hi' | 'bn') {
    this.selectedLang.set(lang);
    this.playVoice();
  }

  selectCharacter(char: 'asha' | 'aarav' | 'ananya') {
    this.selectedCharacter.set(char);
    this.playVoice();
  }

  toggleAudio() {
    if (this.isAudioPlaying()) {
      this.stopVoice();
    } else {
      this.playVoice();
    }
  }

  stopVoice() {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0;
      this.audioPlayer = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isAudioPlaying.set(false);
  }

  playVoice() {
    if (typeof window === 'undefined') return;
    this.stopVoice();
    this.isAudioPlaying.set(true);

    // 1. Play soothing crystal wellness chime via Web Audio API
    this.playHarmonicChime();

    const lang = this.selectedLang();
    const char = this.selectedCharacter();
    const text = this.currentDialogue();

    // 2. High-Fidelity Spoken Audio Stream via backend proxy (guarantees clear audio in Bengali, Hindi, and English without CORS)
    try {
      const query = encodeURIComponent(text.slice(0, 180));
      const audioUrl = `/api/v1/ai/voice-stream?lang=${lang}&text=${query}`;
      const audio = new Audio(audioUrl);
      this.audioPlayer = audio;

      if (char === 'asha') audio.playbackRate = 0.95;
      else if (char === 'aarav') audio.playbackRate = 0.90;
      else audio.playbackRate = 1.05;

      audio.onended = () => {
        this.isAudioPlaying.set(false);
        this.audioPlayer = null;
      };
      audio.onerror = () => {
        this.speakWithSynthesis(text, lang, char);
      };

      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(() => {
          this.speakWithSynthesis(text, lang, char);
        });
      }
      return;
    } catch {
      this.speakWithSynthesis(text, lang, char);
    }
  }

  private speakWithSynthesis(text: string, lang: 'en' | 'hi' | 'bn', char: 'asha' | 'aarav' | 'ananya') {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.isAudioPlaying.set(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    if (lang === 'hi') {
      utterance.lang = 'hi-IN';
    } else if (lang === 'bn') {
      utterance.lang = 'bn-IN';
    } else {
      utterance.lang = 'en-US';
    }

    // Voice pitch and cadence per persona
    if (char === 'asha') {
      utterance.pitch = 1.15;
      utterance.rate = 0.92;
    } else if (char === 'aarav') {
      utterance.pitch = 0.85;
      utterance.rate = 0.95;
    } else {
      utterance.pitch = 1.25;
      utterance.rate = 1.05;
    }

    // Pick localized voice if browser provides one
    const voices = window.speechSynthesis.getVoices();
    const prefix = lang === 'hi' ? 'hi' : (lang === 'bn' ? 'bn' : 'en');
    let matched = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(prefix));

    if (!matched && lang === 'bn') {
      matched = voices.find(v => v.lang && (v.lang.toLowerCase().startsWith('hi') || v.lang.toLowerCase().includes('in')));
      if (matched) utterance.lang = matched.lang;
    }

    if (matched) {
      utterance.voice = matched;
    }

    utterance.onend = () => {
      this.isAudioPlaying.set(false);
    };
    utterance.onerror = () => {
      this.isAudioPlaying.set(false);
    };

    window.speechSynthesis.speak(utterance);
  }

  private playHarmonicChime() {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      const baseFreq = this.selectedCharacter() === 'aarav' ? 220 : (this.selectedCharacter() === 'ananya' ? 528 : 432);
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, now);
      osc2.frequency.setValueAtTime(baseFreq * 1.5, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    } catch {
      // AudioContext unavailable
    }
  }

  // Demo Video Walkthrough State
  protected readonly activeVideoChapter = signal<number>(1);
  protected readonly isVideoPlaying = signal<boolean>(true);
  protected readonly videoProgress = signal<number>(38);
  protected readonly videoTime = signal<string>('01:14');

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
      let res = await fetch(apiUrl('/governance/settings'));
      if (!res.ok) {
        res = await fetch('https://mindbridge-api-x99i.onrender.com/api/v1/governance/settings');
      }
      if (res.ok) {
        const raw = await res.json();
        const data = raw?.data?.data || raw?.data || raw;
        if (data?.statsOverride) {
          const so = data.statsOverride;
          if (so.totalUsers) this.statTotalUsers.set(so.totalUsers);
          if (so.totalNgos) this.statTotalNgos.set(so.totalNgos);
          if (so.recoveryRate) this.statRecoveryRate.set(so.recoveryRate);
          if (so.avgResponseTime) this.statAvgResponseTime.set(so.avgResponseTime);
        }
        if (Array.isArray(data?.dynamicFeatures)) {
          const active = data.dynamicFeatures.filter((f: any) => f.enabled !== false);
          const heroPromo = active.find((f: any) => f.placement === 'HERO_SECTION' || f.type === 'HERO_PROMO_CARD');
          if (heroPromo) {
            this.heroPromoFeature.set(heroPromo);
          }
          this.dynamicFeatures.set(active);
        }
      }
    } catch {
      // Fallback
    }
  }
}
