# MindBridge

MindBridge is a mental wellness platform. It connects patients with verified mental health
professionals, and includes an AI wellbeing companion that has a crisis-safety layer.

> **Status: development build, not for real patients.**
> Legal texts, clinical review of the safety flows, a security review and a production deployment
> are all still outstanding. [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md)
> lists what has actually been run and what has not.

## What's inside

| Path | What it is |
| --- | --- |
| `apps/web` | Angular 21 web app: public site, plus patient, doctor and admin portals |
| `apps/api` | NestJS API (`/api/v1`), BullMQ worker and CLI seed commands |
| `apps/ai-service` | FastAPI AI service: provider adapters (mock, OpenAI-compatible, Anthropic, Ollama), safety layer and RAG |
| `packages/shared-types` | Enums and API contracts shared by the web app and the API |
| `infrastructure/nginx` | nginx config for the web container (Dockerfiles live in each app) |
| `docker-compose.yml` | Local full stack: MongoDB, Redis, Mailpit, API, worker, AI service and web |
| `docs` | Setup, architecture, security, AI safety, API reference, deployment, ADRs and status |

## Roles

- **Patient**: self-registers. Gets mood tracking, an encrypted journal, the AI companion, self-help content, booking, secure messaging with their care team, and privacy controls.
- **Doctor**: self-registers. Stays at `/doctor/verification-pending` until an admin approves their documents. After approval: schedule, patients (consent-gated), clinical notes, and AI drafting help that a person must review.
- **Admin**: created **only** through the CLI seed (`seed-admin`). Never through registration. Has fine-grained permissions such as `doctors:verify`, `crisis:manage` and `audit:read`.

## Quick start (Docker)

```bash
node scripts/init-env.mjs          # creates .env with random secrets (never commit it)
docker compose up -d --build
docker compose exec api node dist/cli/seed-crisis-resources.js
docker compose exec api node dist/cli/seed-dev.js --yes      # synthetic demo accounts
docker compose exec -it api node dist/cli/seed-admin.js --email you@example.com --name "Your Name"
```

Then open http://localhost:8080. Emails are delivered to Mailpit at http://localhost:8025.
The full guide, including a non-Docker setup, is in [`docs/LOCAL_SETUP.md`](docs/LOCAL_SETUP.md).

## The AI companion

The repo ships with `AI_PROVIDER=mock`. Mock replies are labelled **"Simulated reply (mock)"** in the
UI and are never shown as real AI output. To use a real model, set `AI_PROVIDER`, `AI_MODEL`,
`AI_API_KEY` and (where needed) `AI_BASE_URL` in `.env`. Read [`docs/AI_SAFETY.md`](docs/AI_SAFETY.md)
first.

## Documentation

- [Local setup](docs/LOCAL_SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Security](docs/SECURITY.md)
- [AI safety](docs/AI_SAFETY.md)
- [API reference](docs/API.md) (Swagger UI is at `/api/docs` outside production)
- [Deployment and production readiness](docs/DEPLOYMENT.md)
- [Architecture decision records](docs/adr/)
- [Implementation status](docs/IMPLEMENTATION_STATUS.md)

## If you are in crisis

MindBridge is not an emergency service. If you or someone else is in immediate danger, contact your
local emergency number. The app shows crisis contacts that admins have verified for each country.
