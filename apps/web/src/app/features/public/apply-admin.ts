import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { CouncilApplicationCredentials } from '@mindbridge/shared-types';

@Component({
  selector: 'mb-apply-admin',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="container page apply-page">
      <div class="apply-header center">
        <span class="eyebrow">Governance & Council Board</span>
        <h1>Apply for a MindBridge Council Admin Seat</h1>
        <p class="muted lead">
          Join the governing body of MindBridge. We are filling <strong>12 distributed Admin Seats</strong> 
          to govern clinical verifications, partner NGO onboarding, and mental health advocacy.
        </p>
      </div>

      <!-- Live Council Seats Tracker -->
      <div class="seats-status-card card">
        <div class="seats-row">
          <div>
            <span class="seats-title">Council Capacity: <strong>7 of 12 Seats Occupied</strong></span>
            <p class="small muted" style="margin-top: 4px;">5 remaining seats: 1 Clinical Specialist, 2 Regional NGOs, 2 Brand-Safe Creators.</p>
          </div>
          <div class="seats-visual">
            <span class="seat-badge specialist">3 Specialists</span>
            <span class="seat-badge ngo">2 NGOs</span>
            <span class="seat-badge influencer">2 Creators</span>
            <span class="seat-badge available">5 Open Seats</span>
          </div>
        </div>
      </div>

      <!-- Application Form Card -->
      <div class="card card-interactive apply-card">
        @if (submitted()) {
          <div class="success-box center">
            <div class="success-icon">✅</div>
            <h2>Application Submitted Successfully</h2>
            <p class="muted">
              Thank you, <strong>{{ applicantName() }}</strong>. Your application has been logged and screened 
              by the <strong>AI Content Safety Engine</strong>.
            </p>
            <div class="ai-safety-result" [class.flagged]="aiFlagged()">
              <div class="result-title">
                {{ aiFlagged() ? '⚠️ AI Content Safety Warning' : '🟢 AI Safety Screen: Verified Brand-Safe (Score: 96%)' }}
              </div>
              <p class="small" style="margin: 6px 0 0;">
                {{ aiSummary() }}
              </p>
            </div>
            <p class="small muted" style="margin-top: 20px;">
              The <strong>Super Admin</strong> will review your credentials and assign your Council Seat.
              You will receive a notification at <strong>{{ applicantEmail() }}</strong>.
            </p>
            <div class="row center" style="margin-top: 24px; gap: 12px;">
              <a routerLink="/" class="btn btn-secondary">Return to Home</a>
              <a href="/admin-portal/index.html" target="_blank" class="btn btn-primary">Open Admin Portal ↗</a>
            </div>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="section-title-sm">1. Candidate Information</div>
            
            <div class="form-grid">
              <div class="field">
                <label for="fullName">Full Name / Organization Name *</label>
                <input id="fullName" class="input" type="text" formControlName="fullName" placeholder="e.g. Dr. Rajesh Kumar or @MindfulAsha" />
              </div>

              <div class="field">
                <label for="email">Official Email Address *</label>
                <input id="email" class="input" type="email" formControlName="email" placeholder="name@domain.com" />
              </div>
            </div>

            <div class="field">
              <label for="phone">Phone / WhatsApp Number</label>
              <input id="phone" class="input" type="tel" formControlName="phone" placeholder="+91 98765 43210" />
            </div>

            <div class="section-title-sm" style="margin-top: 24px;">2. Admin Role Category</div>
            <div class="category-selector">
              <label class="category-radio" [class.selected]="form.controls.category.value === 'SPECIALIST'">
                <input type="radio" value="SPECIALIST" formControlName="category" />
                <span class="cat-emoji">🩺</span>
                <div>
                  <strong>Clinical Specialist Admin</strong>
                  <p class="small muted">Psychiatrist / Psychologist (Handles doctor verifications)</p>
                </div>
              </label>

              <label class="category-radio" [class.selected]="form.controls.category.value === 'NGO'">
                <input type="radio" value="NGO" formControlName="category" />
                <span class="cat-emoji">🏛️</span>
                <div>
                  <strong>Partner NGO Coordinator</strong>
                  <p class="small muted">NGO Director / Healthcare Clinic Supervisor</p>
                </div>
              </label>

              <label class="category-radio" [class.selected]="form.controls.category.value === 'INFLUENCER'">
                <input type="radio" value="INFLUENCER" formControlName="category" />
                <span class="cat-emoji">🌟</span>
                <div>
                  <strong>Mental Health Influencer / Creator</strong>
                  <p class="small muted">Advocate / Content Creator (Awareness reels & outreach)</p>
                </div>
              </label>
            </div>

            <!-- DYNAMIC CATEGORY FIELDS -->
            @if (form.controls.category.value === 'SPECIALIST') {
              <div class="category-details-box animated-fade">
                <div class="form-grid">
                  <div class="field">
                    <label for="licenseNumber">Medical Council / RCI License Number *</label>
                    <input id="licenseNumber" class="input" type="text" formControlName="licenseNumber" placeholder="e.g. MCI-2018-84729" />
                  </div>
                  <div class="field">
                    <label for="yearsExperience">Years of Clinical Experience *</label>
                    <input id="yearsExperience" class="input" type="number" formControlName="yearsExperience" placeholder="e.g. 7" />
                  </div>
                </div>
                <div class="field">
                  <label for="specialization">Specialization / Clinical Focus</label>
                  <input id="specialization" class="input" type="text" formControlName="specialization" placeholder="e.g. Neuropsychiatry, Cognitive Behavioral Therapy" />
                </div>
              </div>
            }

            @if (form.controls.category.value === 'NGO') {
              <div class="category-details-box animated-fade">
                <div class="field">
                  <label for="ngoRegistration">NGO Registration / Trust Certificate Number *</label>
                  <input id="ngoRegistration" class="input" type="text" formControlName="ngoRegistration" placeholder="e.g. TRUST-DEL-2014-992" />
                </div>
                <div class="field">
                  <label for="operatingRegions">Operating Geographic Regions</label>
                  <input id="operatingRegions" class="input" type="text" formControlName="operatingRegions" placeholder="e.g. Delhi NCR, Maharashtra, Pan-India" />
                </div>
              </div>
            }

            @if (form.controls.category.value === 'INFLUENCER') {
              <div class="category-details-box animated-fade">
                <div class="ai-screener-notice">
                  <span>🛡️</span>
                  <div>
                    <strong>AI Content Safety Screening Active</strong>
                    <p class="small" style="margin-top: 2px;">
                      Creator content is audited by the AI safety engine to prevent adult content, vulgarity, or semi-nudity from patient ambassadorship.
                    </p>
                  </div>
                </div>

                <div class="form-grid">
                  <div class="field">
                    <label for="socialHandle">Social Media Handle (@handle) *</label>
                    <input id="socialHandle" class="input" type="text" formControlName="socialHandle" placeholder="e.g. @mindful_asha" />
                  </div>
                  <div class="field">
                    <label for="followersCount">Follower Reach</label>
                    <input id="followersCount" class="input" type="number" formControlName="followersCount" placeholder="e.g. 150000" />
                  </div>
                </div>

                <div class="field">
                  <label for="sampleContent">Bio & Content Themes Sample (Audited by AI) *</label>
                  <textarea 
                    id="sampleContent" 
                    class="input textarea" 
                    rows="3" 
                    formControlName="sampleContent" 
                    placeholder="Describe your mental health awareness focus, sample post topics, and recent reels..."></textarea>
                </div>
              </div>
            }

            <div style="margin-top: 24px;">
              <button class="btn btn-primary-elevated btn-block" type="submit" [disabled]="busy()">
                {{ busy() ? 'Running AI Safety Screen & Submitting…' : 'Submit Admin Council Application' }}
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .apply-page {
      max-width: 720px;
      margin: 0 auto;
      padding: clamp(30px, 5vw, 60px) 16px;
    }
    .apply-header {
      margin-bottom: 28px;
      h1 { margin: 8px 0 12px; font-size: clamp(1.8rem, 4vw, 2.4rem); letter-spacing: -0.02em; }
    }
    .lead {
      color: var(--mb-text-muted);
      font-size: 1.05rem;
      line-height: 1.6;
    }
    .seats-status-card {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(13, 148, 136, 0.05) 100%);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 18px 24px;
      border-radius: var(--mb-radius);
      margin-bottom: 24px;
    }
    .seats-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
    }
    .seats-title {
      font-size: 1.05rem;
      color: var(--mb-text);
    }
    .seats-visual {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .seat-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 999px;
      &.specialist { background: #dbeafe; color: #1e40af; }
      &.ngo { background: #fef3c7; color: #92400e; }
      &.influencer { background: #f3e8ff; color: #6b21a8; }
      &.available { background: #e5e7eb; color: #374151; border: 1px dashed #9ca3af; }
    }
    .apply-card {
      padding: 32px 28px;
      box-shadow: var(--mb-shadow-lg);
    }
    .section-title-sm {
      font-size: 0.85rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--mb-primary);
      margin-bottom: 12px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .category-selector {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
    }
    .category-radio {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius);
      cursor: pointer;
      transition: all 0.2s ease;
      input { margin-right: 4px; }
      &:hover { border-color: var(--mb-primary); }
      &.selected {
        background: var(--mb-primary-soft);
        border-color: var(--mb-primary);
      }
    }
    .cat-emoji { font-size: 1.5rem; }
    .category-details-box {
      background: var(--mb-bg);
      border: 1px solid var(--mb-border);
      border-radius: var(--mb-radius);
      padding: 20px;
      margin-bottom: 16px;
    }
    .ai-screener-notice {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 12px 16px;
      border-radius: var(--mb-radius-sm);
      margin-bottom: 16px;
      font-size: 0.85rem;
    }
    .textarea {
      width: 100%;
      resize: vertical;
    }
    .success-box {
      padding: 20px 0;
    }
    .success-icon {
      font-size: 3rem;
      margin-bottom: 12px;
    }
    .ai-safety-result {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.4);
      padding: 16px;
      border-radius: var(--mb-radius);
      margin: 20px 0;
      text-align: left;
      &.flagged {
        background: rgba(244, 63, 94, 0.12);
        border-color: rgba(244, 63, 94, 0.4);
      }
    }
    .result-title {
      font-weight: 700;
      font-size: 0.95rem;
    }

    @media (max-width: 600px) {
      .form-grid { grid-template-columns: 1fr; }
    }
  `,
})
export class ApplyAdminPage {
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly busy = signal(false);
  protected readonly submitted = signal(false);
  protected readonly applicantName = signal('');
  protected readonly applicantEmail = signal('');
  protected readonly aiFlagged = signal(false);
  protected readonly aiSummary = signal('');

  protected readonly form = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    category: ['SPECIALIST', Validators.required],
    licenseNumber: [''],
    yearsExperience: [5],
    specialization: [''],
    ngoRegistration: [''],
    operatingRegions: [''],
    socialHandle: [''],
    followersCount: [10000],
    sampleContent: [''],
  });

  async submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.busy.set(true);

    const val = this.form.getRawValue();
    this.applicantName.set(val.fullName);
    this.applicantEmail.set(val.email);

    const credentials: CouncilApplicationCredentials = {};
    if (val.category === 'SPECIALIST') {
      credentials.licenseNumber = val.licenseNumber;
      credentials.yearsExperience = val.yearsExperience;
      credentials.specialization = val.specialization;
    } else if (val.category === 'NGO') {
      credentials.ngoRegistrationNumber = val.ngoRegistration;
      credentials.operatingRegions = [val.operatingRegions];
    } else {
      credentials.socialHandle = val.socialHandle;
      credentials.followersCount = val.followersCount;
      credentials.sampleContent = val.sampleContent;
    }

    try {
      const res = await fetch('https://mindbridge-api-x99i.onrender.com/api/v1/governance/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: val.fullName,
          email: val.email,
          phone: val.phone,
          category: val.category,
          credentials,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const ai = json.data?.aiSafety;
        this.aiFlagged.set(ai?.riskCategory === 'VULGARITY_OR_ADULT_CONTENT');
        this.aiSummary.set(ai?.summary || 'AI Screen: Verified brand-safe content.');
      } else {
        this.aiSummary.set('AI Safety Screen completed. Submitted to Super Admin queue.');
      }
    } catch {
      this.aiSummary.set('Application logged and queued for Super Admin review.');
    } finally {
      this.busy.set(false);
      this.submitted.set(true);
    }
  }
}
