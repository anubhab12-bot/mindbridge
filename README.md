# MindBridge 🧠

> An end-to-end, privacy-focused mental healthcare platform connecting patients with verified clinical professionals and AI-guided supportive tools.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/anubhab12-bot/mindbridge)

---

## 🌟 Overview

MindBridge is a modern, modular mental health platform designed with security, patient confidentiality, and clinical safety at its core:
- **Patient Portal**: Mood tracking, encrypted reflective journaling, appointment bookings, and secure real-time messaging with care providers.
- **AI Companion**: Layered crisis safety detection (Tele-MANAS & 112 emergency routing), prompt injection prevention, clinical guardrails, and mock/LLM fallback modes.
- **Doctor Portal**: License verification and document submission, calendar availability management, clinical notes with AI-assisted drafting, and patient record oversight.
- **Admin Dashboard**: System telemetry, audit logs, doctor verification approval workflows, crisis hotline freshness verification, and platform management.

---

## 🏗️ Architecture

```
mindbridge/
├── apps/
│   ├── web/                 Angular 21 (Zoneless, Signals, SCSS design tokens, Standalone)
│   ├── api/                 NestJS 12 ESM (Modular monolith, MongoDB, Redis, WebSockets)
│   └── ai-service/          FastAPI (Python 3.13, safety classifiers, prompt guardrails)
├── packages/
│   └── shared-types/        Shared TypeScript contracts & enums
├── infrastructure/
│   ├── nginx/               Production reverse proxy configuration
│   └── docker-compose.yml   Local full-stack container orchestration
├── docs/                    Implementation status, local setup, and architecture specs
├── render.yaml              Render Blueprint for 1-click cloud multi-service deployment
└── vercel.json              Vercel deployment configuration for frontend
```

---

## 🚀 1-Click Cloud Deployment (Free)

### Deploy to Render
Click the button above or use **[render.yaml](./render.yaml)**:
1. Log in to [Render.com](https://render.com) with GitHub.
2. Go to **Blueprints** → **New Blueprint Instance**.
3. Select your `mindbridge` repository.
4. Render automatically configures the **Frontend**, **API**, and **AI Service**.
5. Connect your free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and [Upstash Redis](https://upstash.com) instances.

### Deploy Frontend to Vercel
1. Import repository into [Vercel](https://vercel.com).
2. Vercel automatically detects `vercel.json` and builds the Angular frontend.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full instructions.

---

## 💻 Local Development

### Option 1: Docker Compose
```bash
docker compose up -d --build
```
- Web Application: http://localhost:8080
- Mailpit (Local email testing): http://localhost:8025

### Option 2: Run Services Directly
```bash
# 1. Build shared packages
cd packages/shared-types && npm install && npm run build

# 2. Start API
cd apps/api && npm install && npm run start:dev

# 3. Start AI Service
cd apps/ai-service && uv run uvicorn app.asgi:app --port 8000 --reload

# 4. Start Web Application
cd apps/web && npm install && npm start
```

---

## 🛡️ Security & Privacy
- **Field-level encryption (AES-256-GCM)** for journal entries, private chats, and clinical records.
- **Strict Role-Based Access Control (RBAC)** enforced at the API layer.
- **Crisis Intervention Pipeline**: Automated rule-based detection for self-harm and crisis escalation with localized emergency resources.
