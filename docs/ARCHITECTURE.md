# Architecture

_Last updated: 2026-10-28_

## System overview

```
                 Browser (Angular 21 SPA)
                        │  HTTPS
                        ▼
              ┌────────────────────┐
              │  web (nginx)       │  static SPA, security headers
              │  /api/*  /socket.io│──────────────┐
              └────────────────────┘              │ reverse proxy
                                                  ▼
┌──────────────┐   BullMQ   ┌──────────────────────────────┐  bearer token  ┌──────────────────┐
│ worker       │◀──────────▶│ api (NestJS, /api/v1)        │───────────────▶│ ai-service       │
│ (same image) │   Redis    │ REST + Socket.IO + Swagger   │   HTTP/JSON    │ (FastAPI)        │
└──────┬───────┘            └──────────┬───────────────────┘                │ safety → provider│
       │                               │                                    └────────┬─────────┘
       │          ┌────────────────────┼───────────────┐                             │
       ▼          ▼                    ▼               ▼                             ▼
    SMTP     MongoDB              Redis           private file          mock / OpenAI-compatible /
  (Mailpit   (all app data,   (throttling,        storage (verif.       Anthropic / Ollama
   in dev)   encrypted fields) queues)           docs, signed URLs)
```

| Service | Tech | Responsibility |
| --- | --- | --- |
| `web` | Angular 21, served by nginx | Public pages, patient, doctor and admin portals. Proxies `/api` and `/socket.io` to the API. |
| `api` | NestJS 12 (ESM), Mongoose | The only service that reads or writes MongoDB. Handles auth, RBAC, consent, business rules and audit. |
| `worker` | Same image as `api`, `dist/worker.js` | Runs BullMQ jobs: email, appointment reminders, knowledge-base sync, account-deletion sweeps. |
| `ai-service` | Python 3.13, FastAPI, Pydantic | Risk screening, the safety decision, prompt building, provider calls, output guard and RAG. It is stateless and has no database access. |
| `mongo` | MongoDB 7 | Users, profiles, appointments, notes, conversations, audit log and so on. |
| `redis` | Redis 7 | Rate-limit counters and the BullMQ queue (`mindbridge-jobs`). |
| `mailpit` | Dev only | Catches outgoing email at http://localhost:8025. |

## Design principles

1. **The API is the trust boundary.** Every role, ownership and consent check happens in the API. Guards in the web app only shape the UX and are never relied on for security.
2. **The safety layer does not depend on the LLM.** The AI service screens risk with deterministic rules before any model is called. The API keeps its own last-resort screen for when the AI service is down. See [AI_SAFETY.md](AI_SAFETY.md).
3. **Minimum necessary access.** A doctor sees a patient only while an active care relationship exists. Each data category (mood summary, intake, AI summary, AI assist) needs its own consent from the patient.
4. **Configuration, not code.** Secrets, model names, provider URLs and crisis contacts come from environment variables or the database. Nothing is hardcoded. Crisis numbers are entered and verified by admins, and the seed only contains entries checked against official sources.
5. **Honest AI labelling.** Every AI message carries `isMock`. The UI labels mock replies, and doctor-facing AI text is always marked as a draft until a doctor finalises it.

## API module map (`apps/api/src/modules`)

| Area | Modules |
| --- | --- |
| Identity | `auth` (login, refresh rotation, MFA, sessions), `users`, `audit` |
| Professionals | `doctors`, `verification`, `availability`, `files` |
| Care | `appointments`, `care` (care relationships), `consent`, `intake`, `clinical-notes`, `messaging` |
| Self-care | `mood`, `journal`, `wellness`, `ai`, `crisis-resources` |
| Platform | `notifications`, `mail`, `queues`, `support`, `feedback`, `feature-flags`, `privacy`, `admin`, `health` |

Cross-cutting pieces live in `apps/api/src/common`:

- AES-256-GCM field encryption (`crypto`)
- Response envelope interceptor and exception filter
- Redis-backed throttler storage
- Structured JSON logging with redaction
- Validated configuration (`config/env.validation.ts`). The app refuses to start when a required secret is missing or too short.

### Request lifecycle

1. nginx adds security headers and forwards `/api/*` to the API.
2. The API assigns a request ID (`x-request-id`) and applies helmet, strict CORS (`CORS_ORIGINS` only) and the body size limit.
3. Guards run in order: throttling, then JWT authentication, then roles (plus email-verified and verified-doctor flags), then admin permissions. Cookie endpoints also check the CSRF header.
4. The global `ValidationPipe` (whitelist plus `forbidNonWhitelisted`) rejects unknown fields.
5. The service layer checks resource ownership, care relationships and consent, then writes audit events for sensitive reads and changes.
6. Successful responses are wrapped as `{ data, meta? }`. Errors become `{ error: { code, message, details? }, requestId }` and never expose stack traces.

### Background jobs

Jobs run through one BullMQ queue, `mindbridge-jobs`, with 5 attempts and exponential backoff:

| Job | Producer |
| --- | --- |
| Send mail | `mail` |
| Appointment reminders (scheduled and cancelled with the appointment) | `appointments` |
| Re-index published wellness content into the AI knowledge base | `wellness` |
| Purge sweep for accounts past their deletion grace period | `privacy` |

When `QUEUES_ENABLED=false`, jobs run inline and delayed jobs are skipped. This mode is only for development.

### Realtime

Socket.IO is push-only. Clients authenticate with their access token in the handshake. The server sends `message:new` and notification events to per-user rooms (`user:<id>`), and messages are always sent over REST.

There is no Socket.IO Redis adapter yet, so realtime pushes only reach clients connected to the same API instance. Running more than one API replica needs `@socket.io/redis-adapter` (or sticky sessions plus the adapter). Until then, clients still see new messages on their next fetch.

## AI service (`apps/ai-service/app`)

| Package | Purpose |
| --- | --- |
| `safety/rules.py` | Deterministic risk rules: normalisation, idiom removal, negation, history and third-party handling |
| `safety/classifier.py` | Combines the rules with an optional provider classifier. It can only raise the level, never lower it. |
| `safety/decision.py` | Maps the risk level to a response plan: reviewed template or policy-constrained LLM reply |
| `safety/injection.py` | Prompt-injection detection and sanitising of role markers |
| `safety/output_guard.py` | Removes diagnosis, medication advice, false identity or promises, dependency and shaming, and any unverified phone numbers or URLs |
| `providers/` | `LLMProvider` protocol, plus `mock`, `remote` (OpenAI-compatible, Anthropic, Ollama) and `factory` |
| `prompts/` | Versioned system policies and the reviewed crisis templates |
| `rag/` | In-memory knowledge store fed only from **published** wellness content |
| `services/` | `support` (companion), `doctor_assist` (drafts for doctors) |

Every endpoint except `/health` requires the shared `AI_SERVICE_TOKEN`.

## Web app (`apps/web/src/app`)

- Standalone, zoneless components with signals, and lazy-loaded route trees per role (`patient.routes`, `doctor.routes`, `admin.routes`).
- `core/auth`: the access token is kept in memory only. The refresh token lives in an HttpOnly cookie, and refreshes send the `x-mindbridge-csrf` header. An interceptor retries once after a refresh.
- `core/api/api.service.ts` is the single HTTP entry point. It unwraps the envelope and returns promises.
- `shared/ui` has the design system: toasts, confirm dialog and crisis panel. Styles are hand-built SCSS with CSS custom properties (ADR-0003).

## Data model highlights

- **User**: role, status, `emailVerifiedAt`, MFA secret (encrypted), `adminPermissions`.
- **DoctorProfile**: verification status (`PENDING_VERIFICATION`, `INFO_REQUESTED`, `APPROVED`, `REJECTED`, `SUSPENDED`) and documents in private storage.
- **CareRelationship**: created when a doctor confirms an appointment, and ended by the patient at any time.
- **Consent**: append-only history per type, optionally scoped to one doctor.
- **Encrypted at rest (application level)**: journal text, AI conversation messages, clinical notes, secure messages and intake answers.
- **AuditLog**: actor, action and target IDs, no health content, kept for 2 years (TTL index).
