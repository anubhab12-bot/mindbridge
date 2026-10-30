# Deployment and production readiness

_Last updated: 2026-10-28._ A free **demo** deployment on Render is configured in `render.yaml` (see
below). There is no production deployment. This file describes what a deployment needs, and the
checklist that must be finished before real patients use it.

## What gets deployed

| Container | Image built from | Needs |
| --- | --- | --- |
| `web` | `apps/web/Dockerfile` (Angular build served by nginx on port 8080) | Proxies `/api/` and `/socket.io/` to `API_UPSTREAM` (default `http://api:3000`; see `infrastructure/nginx/default.conf.template`) |
| `api` | `apps/api/Dockerfile` (`node dist/main.js`, port 3000) | MongoDB, Redis, AI service, SMTP, persistent volume for `UPLOAD_DIR` |
| `worker` | Same image as `api`, command `node dist/worker.js` | MongoDB, Redis, SMTP |
| `ai-service` | `apps/ai-service/Dockerfile` (port 8000) | Outbound access to the AI provider, if one is configured. Must **not** be publicly reachable. |
| MongoDB | Managed service recommended (for example MongoDB Atlas) | TLS, authentication, backups, encryption at rest |
| Redis | Managed service or container | Password, persistence (`appendonly`), not publicly reachable |
| SMTP | Any transactional email provider | SPF, DKIM and DMARC for the sender domain |

Health checks: `GET /api/v1/health` (liveness) and `GET /api/v1/health/ready` (MongoDB and Redis
reachable) on the API, and `GET /health` on the AI service.

## Options

1. **One VM with Docker Compose.** This is the simplest option and closest to the local setup. Put a TLS-terminating proxy (Caddy, Traefik or a cloud load balancer) in front of `web`, and use managed MongoDB.
2. **A container platform** (Render, Railway, Fly.io, Cloud Run, ECS and similar). Deploy `web`, `api`, `worker` and `ai-service` as four services from the same repo. The AI service should be private-network only. Add managed MongoDB and Redis.

Either way, run **one API replica** until a Socket.IO Redis adapter is added (see [ARCHITECTURE.md](ARCHITECTURE.md#realtime)),
and replace local-disk file storage with object storage before running more than one replica.

## Free demo on Render (CI/CD)

`render.yaml` is a Render Blueprint that runs the whole stack on free tiers:

| Render resource | What runs there |
| --- | --- |
| `mindbridge-web` (free web service) | Angular app + nginx, proxying `/api` and `/socket.io` to the API's public URL |
| `mindbridge-api` (free web service) | NestJS API. Seeds run before it starts (see below). |
| `mindbridge-ai` (free web service) | FastAPI AI service with the **mock** provider, protected by `AI_SERVICE_TOKEN` |
| `mindbridge-redis` (free Key Value) | Rate-limit counters (private network only) |
| MongoDB Atlas M0 (free, outside Render) | The database |

**CI/CD.** Every push to `main` runs GitHub Actions CI (`.github/workflows/ci.yml`). Render deploys
the changed services only after those checks pass (`autoDeployTrigger: checksPass`). Build filters
skip services whose code did not change.

**Secrets.** JWT, MFA, file-signing and AI-service secrets and the field-encryption key are generated
by Render (`generateValue`) and never leave it. `MONGO_URI`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` are
entered in the Render dashboard when the Blueprint is created. They are never committed.

### One-time setup

1. **MongoDB Atlas.** In the `MindBridge` project there is a free cluster called `mindbridge` (Singapore).
   - Under **Database Access**, add a user with `readWrite` on the `mindbridge` database.
   - Under **Network Access**, allow access from anywhere (`0.0.0.0/0`). Render's free services have no fixed outbound IP addresses, so this is required. The strong password and TLS are what protect the database.
   - Copy the connection string (Connect → Drivers) and add `/mindbridge` as the database name before the `?`.
2. **Render.** Sign in at https://dashboard.render.com with GitHub. Choose **New → Blueprint**, pick this repository, and enter:
   - `MONGO_URI`: the Atlas connection string;
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD`: the first admin account (at least 12 characters).
3. Wait for the four resources to deploy, then open `https://mindbridge-web.onrender.com`.
   - Demo accounts (`*.demo@mindbridge.test`) are created on the first start. Their shared password is printed **once** in the `mindbridge-api` deploy log.
   - After the admin account exists, you can delete `ADMIN_PASSWORD` from the API's environment.
4. If Render gave any service a different URL (it adds a suffix when a name is taken), update `API_UPSTREAM` on the web service, and `AI_SERVICE_URL`, `CORS_ORIGINS` and `WEB_APP_URL` on the API.

### Limits of the free demo

- **Cold starts.** Free services sleep after 15 minutes without traffic. The first request after that can take a minute or more while web, API and AI service wake up in turn.
- **No email.** Render blocks outgoing SMTP on free services, so `MAIL_TRANSPORT=memory`: verification and reset emails are not sent. Use the demo accounts. People who register themselves cannot verify their email, so they cannot book or use the AI companion. To send email, set `MAIL_TRANSPORT=smtp` and the `SMTP_*` variables for a provider that accepts port 2525.
- **No background worker.** `QUEUES_ENABLED=false`, so appointment reminders and the scheduled account-deletion sweep do not run.
- **Uploads are lost** on restart or redeploy, because free services have no persistent disk.
- **Redis is in-memory.** Rate-limit counters reset when it restarts.
- **Shared rate-limit IP.** Because nginx reaches the API through its public URL, the API sees the web service's address for every user, so the per-IP limits are shared by everyone. Fine for a demo with a few testers, not for real traffic.
- **Mock AI** only. `NODE_ENV=staging` is used because the AI service refuses the mock provider in production.
- **750 free instance hours per month** per Render workspace, shared by the three services (sleeping services use none).

## Production environment

Start from `.env.example` and set every value in the platform's secret store. Never put secrets in
the repo or in a Dockerfile.

- `NODE_ENV=production` and `COOKIE_SECURE=true` (the API refuses to start otherwise).
- `CORS_ORIGINS` and `WEB_APP_URL` set to the real HTTPS origin.
- New random values for `JWT_ACCESS_SECRET`, `MFA_TOKEN_SECRET`, `FILE_SIGNING_SECRET` and `AI_SERVICE_TOKEN`, plus a 32-byte base64 `FIELD_ENCRYPTION_KEY`. **Back up the encryption key separately.** Without it, encrypted journals, notes, chats and messages cannot be recovered.
- `SWAGGER_ENABLED=false` (it is already off in production).
- `MONGO_URI` with TLS. `REDIS_URL` with a password (`rediss://` where supported).
- Real SMTP settings and `MAIL_FROM`.
- `AI_PROVIDER` stays `mock` until the model has been evaluated (see [AI_SAFETY.md](AI_SAFETY.md#using-a-real-model)).

After the first deploy, run the seeds once inside the `api` container:

```bash
node dist/cli/seed-crisis-resources.js
node dist/cli/seed-admin.js --email <admin email> --name "<name>"   # prompts for the password
```

Do **not** run `seed-dev.js` in production. It creates demo accounts.

## Readiness checklist

Items are unticked until they are actually done.

### Must be done before any real patient uses it

- [ ] Clinical review of the risk rules, crisis templates, AI policies and patient-facing safety copy
- [ ] Legal review, then publish the Terms, Privacy Policy and AI notice through the admin portal (none are written yet)
- [ ] DPDP Act 2023 (and any other applicable law) review, including where data and the AI provider are hosted
- [ ] Crisis contacts verified for every country you serve
- [ ] Security review or penetration test
- [ ] E2E tests green in CI against real MongoDB and Redis (written, not yet run)
- [ ] HTTPS everywhere, with HSTS on
- [ ] Backups of MongoDB and uploads, plus a tested restore
- [ ] Encryption key stored in a secret manager, with an offline backup

### Should be done soon after

- [ ] Monitoring and alerting on health checks, 5xx rate, queue failures, AI fallback and guard rates
- [ ] Centralised logs (they are JSON and already redacted)
- [ ] Object storage for verification documents
- [ ] Socket.IO Redis adapter, if you run more than one API replica
- [ ] Field-encryption key rotation
- [ ] Incident response and data breach procedure
- [ ] Real AI provider evaluated and red-teamed, if one is turned on
- [ ] Video consultations (only a provider interface exists, and it is off) and SMS or push notifications, if wanted
