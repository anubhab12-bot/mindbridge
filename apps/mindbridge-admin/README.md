# MindBridge Admin Portal · Executive Council & RBAC System

The dedicated **MindBridge Admin Portal** implements a 4-tier Role-Based Access Control (RBAC) governance model, a distributed **12-Member Admin Council**, an **AI Content Safety & Vulgarity Scanner** for Creator applications, and real-time **Dynamic Main Site Controls**.

---

## 🏛️ RBAC Governance Hierarchy

| Role | Access Scope | Key Responsibilities |
| :--- | :--- | :--- |
| **👑 Super Admin** | **Global Omnipotent** | Full platform control, live population telemetry, manages the 12 Council seats, modifies dynamic site banners/stats, verifies influencer proofs, generates AI tasks. |
| **🩺 Specialist Admin** | **Clinical Governance** | Audits doctor registrations, medical council certificates, tele-psychiatry compliance, and clinical notes quality. |
| **🏛️ NGO Admin** | **Community & Crisis** | Coordinates regional mental health camps, maintains verified crisis hotline registries (Tele-MANAS, Kiran), and liaises with ground partners. |
| **🌟 Influencer Admin** | **Advocacy & Outreach** | Executes assigned awareness campaigns/reels, promotes 24/7 helplines, and submits live campaign proofs (links, reach metrics) to Super Admin. |

---

## 🛡️ AI Content Safety & Brand Suitability Scanner

Candidates applying for the **Influencer Admin** category are automatically audited by the built-in AI Content Screener:
- **Nudity & Adult Content Detection**: Detects adult themes, semi-nudity, lingerie modeling, OnlyFans/Fansly links, and NSFW tags.
- **Vulgarity & Profanity Density**: Flags explicit profanity, vulgar slang, and obscenities.
- **Brand Suitability Scoring**: Evaluates positive mental health alignment (destigmatization, crisis line promotion, empathy).
- **Automated Actions**:
  - `🟢 95-100% Brand Safe`: Recommended for Council membership.
  - `🔴 < 30% Vulgar/Adult`: Automatically flagged or rejected from patient-facing mental health advocacy.

---

## 🌐 Dynamic Main Site Controls

The Super Admin can adjust the following attributes from the Admin Portal, which **dynamically reflect across the public MindBridge platform**:
1. **Live Announcement & Emergency Banner**: Toggle on/off, change headline and message, select badge style (`info`, `urgent`, `success`).
2. **Live Population Stats**: Adjust or verify public counters (Users, Partner NGOs, Recovery Rate %, Emergency Latency).
3. **Featured NGO Spotlight**: Highlight certified regional mental health clinics.

---

## 🚀 Running the Admin Portal

To launch the portal locally:
```bash
# Option 1: Open index.html directly in any browser
double-click index.html

# Option 2: Run local web server
npx serve . -l 8081
```
Or access it online via the MindBridge public web app navigation bar.
