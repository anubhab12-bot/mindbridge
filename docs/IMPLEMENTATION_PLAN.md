# MindBridge — Implementation Plan

_Last updated: 2026-10-27_

## 1. Repository inspection (2026-10-27)

- No existing MindBridge repository was available. The workspace was empty, so a new monorepo was created.
- Toolchain found in the build environment: Node 22.22, npm 11, Python 3.13, `uv`, Redis 7.0.
- Not available in the build environment: a running Docker daemon and a MongoDB binary (the MongoDB download host is blocked by the sandbox network policy). Consequences are tracked in `docs/IMPLEMENTATION_STATUS.md`.

## 2. Stack decisions (see `docs/adr/`)

| Concern | Choice | Notes |
|---|---|---|
| Web | Angular 22 (standalone, zoneless, signals, strict) | Started on Angular 21 (ADR-0002), upgraded in ADR-0008 |
| UI system | Hand-built SCSS design system with CSS custom properties | No Material dependency; see ADR-0003 |
| API | NestJS 12 (ESM), Mongoose, class-validator, Swagger | Modular monolith, `/api/v1` |
| Tests (API) | Vitest (Jest-compatible API), Supertest | Nest 12 default; see ADR-0004 |
| Auth | Argon2id (`@node-rs/argon2`), 15-min JWT access token, rotating opaque refresh token in HttpOnly cookie, TOTP MFA | ADR-0005 |
| Queues | BullMQ on Redis (email, reminders, deletion jobs) | Inline fallback when `QUEUES_ENABLED=false` |
| Realtime | Socket.IO with JWT handshake | Secure messaging only |
| AI | Python 3.13 FastAPI + Pydantic, provider adapters (mock, OpenAI-compatible, Anthropic, Ollama) | Safety layer is independent of the LLM; ADR-0006 |
| Data | MongoDB 8, field-level AES-256-GCM for journals, notes, chats, messages | ADR-0007 |
| Infra | Docker Compose (mongo, redis, mailpit, api, worker, ai-service, web), GitHub Actions | |

## 3. Folder structure

```
mindbridge/
├── apps/
│   ├── web/                 Angular app (public site + patient, doctor, admin portals)
│   ├── api/                 NestJS API (+ BullMQ worker entrypoint, CLI seed commands)
│   └── ai-service/          FastAPI AI service (providers, safety, RAG, prompts, evals)
├── packages/
│   └── shared-types/        Enums and API contracts shared by web and api
├── infrastructure/
│   └── nginx/               nginx config for the web container (Dockerfiles live in each app)
├── docker-compose.yml
├── docs/                    Architecture, API, security, AI safety, setup, ADRs, status
└── .github/workflows/       CI
```

API modules: `auth, users, patients, doctors, verification, availability, appointments, care, consent, mood, journal, intake, clinical-notes, messaging, ai, wellness, crisis-resources, notifications, admin, audit, support, feedback, feature-flags, files, health`.

## 4. Phases

1. **Foundation** — monorepo, scaffolds, config validation, Compose, lint/format, CI, docs.
2. **Auth & RBAC** — registration with role choice, email verification, login/refresh/logout, reset, lockout + throttling, MFA, admin seed CLI, guards, audit, tests.
3. **Portals & appointments** — patient/doctor dashboards, profiles, doctor search, availability, booking with conflict prevention, care relationships, mood + journal, privacy dashboard, tests.
4. **AI companion & crisis safety** — FastAPI service, provider abstraction + mock, rule + classifier screening, safety decision layer, crisis resource lookup, conversation management, chat UI, safety tests.
5. **Doctor tools & admin** — verification workflow + documents, clinical notes, AI drafts with approval, admin dashboard with k-anonymity, content/crisis/flags/audit management, tests.
6. **Notifications & integrations** — email (Mailpit in dev), reminders, secure messaging (Socket.IO), video provider abstraction (disabled by default), payments deferred.
7. **Hardening** — full test/lint/build run, health checks, backup + deployment docs, readiness checklist.

Each phase updates `docs/IMPLEMENTATION_STATUS.md` with what was built, tests actually executed, and what is pending.
