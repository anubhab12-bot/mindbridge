# MindBridge Admin Portal | Dynamic Operations & RBAC

A clinical-grade, modern operations and administrative control center for **MindBridge**—the digital tele-mental health ecosystem.

- **Live Main Patient App:** [https://anubhab12-bot.github.io/mindbridge/](https://anubhab12-bot.github.io/mindbridge/)
- **Admin Branch:** `admin-mindbridge`

---

## 🌟 Key Capabilities

### 1. Dynamic RBAC (Role-Based Access Control)
- **Superadmin Authority:**
  - Create and manage administrator accounts.
  - Define **custom dynamic positions** with granular permission checklists (`system.full_access`, `doctors.verify`, `influencers.manage`, `app_control.manage`, `monitoring.view`, etc.).
  - Simulate and preview the portal through any admin's RBAC persona using the header switcher.
- **Pre-Configured System Roles:**
  - **Super Administrator:** Unrestricted platform control and hiring authority.
  - **Specialist Doctor Verification Lead:** Dedicated clinical board member verifying state council registration IDs, degrees, and issuing approved practitioner badges.
  - **Brand & Growth Influencer Lead:** Growth partner driving patient adoption via referral campaigns, custom promo codes, and commission payouts.
  - **Crisis & Clinical Safety Lead:** 24/7 monitor for biometric & AI-detected suicidal ideation SOS alarms.
  - **Platform Operations Manager:** Real-time feature flags, global banner announcements, and consultation economics.

### 2. Specialist Doctor Credentialing Board
- Comprehensive applicant queue with state medical council numbers, degrees, hospital affiliations, and uploaded document packages.
- Specialist decision actions: **Approve & Issue Badge**, **Request Document Re-upload**, or **Reject**.
- Immutable record of clinical review rationale and reviewer ID.

### 3. Dynamic Hiring & Staffing Requisitions
- Superadmin can post open requisitions:
  - *Specialist Doctor Registration Evaluator*
  - *Campus Wellness Influencer Ambassador*
  - *Clinical AI Telemetry Auditor*
- Candidate application pipeline (Applied → Screening → Interview → Offer → Hired).
- **Auto-Provisioning:** Clicking *Hire & Provision Admin* immediately creates an active Admin account with the linked RBAC role.

### 4. Influencer & Growth Marketing Hub
- Trackable campaign builder: `mindbridge.app/ref/<slug>` with custom promo codes (e.g. `ZENSPRING`, `CALM20`).
- Real-time conversion tracking: referral clicks, signups, consultations booked, and earned commissions.
- Commission payout approval desk.

### 5. Dynamic App Control Center
- **Feature Flags:** Instant toggle switches for AI Clinical Copilot, 4K WebRTC Telehealth Video, 24/7 Crisis SOS Beacon, Peer Support Circles, and E-Prescription Gateway.
- **Global Broadcast Banner:** Target announcements to All Users, Doctors Only, or Patients Only with Info, Warning, or Critical styling.
- **Consultation Economics:** Dynamically set baseline consultation fees, platform commission %, and specialist verification subsidies.
- **Emergency Maintenance Mode:** One-click platform kill-switch with safe emergency SOS pass-through.

### 6. Real-time Telemetry & SOS Triage
- Active user session counters, live video consultation rooms monitor (WebRTC encrypted).
- 24/7 Crisis SOS triage board with geolocation, biometric sensor triggers, encrypted phone relay, and counselor dispatch.
- Full compliance and activity audit trail (ISO-27799 / HIPAA).

---

## 🚀 Local Development & Deployment

### Run Locally
```bash
npm install
npm run dev
```

### Build for Production
```bash
npm run build
```

### GitHub Pages Deployment
This repository is configured with `.github/workflows/deploy.yml` which deploys the `dist` bundle to GitHub Pages whenever code is pushed to `admin-mindbridge` or `main`.
Alternatively, deploy using the `gh-pages` script:
```bash
npm run deploy
```
