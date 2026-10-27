# Running MindBridge on your computer (localhost)

There are two ways to run it. **Option A (Docker) is the easiest**: one command starts everything.
Option B runs each part directly on your machine, which is handier while you are changing code.

Everything here is for local testing only. The AI companion uses the built-in **mock** provider, so
its replies are simulated and labelled "Simulated reply (mock)" in the app. No API keys are needed.

---

## Option A: Docker Desktop (recommended)

**You need:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) running, and
[Node.js 22 LTS](https://nodejs.org/) (only used once, to generate your `.env`).

Open a terminal (PowerShell on Windows) in the `mindbridge` folder and run:

```powershell
# 1. Create .env with fresh random secrets (git-ignored, never commit it)
node scripts/init-env.mjs

# 2. Build and start everything (the first build takes several minutes)
docker compose up -d --build

# 3. Check that all services are healthy
docker compose ps
```

Then load the starting data (run these once):

```powershell
# Verified crisis contacts (India: Tele-MANAS and 112)
docker compose exec api node dist/cli/seed-crisis-resources.js

# Your first admin account. You will be asked for a password (min 12 characters); it is not shown or logged.
docker compose exec api node dist/cli/seed-admin.js --email you@example.com --name "Your Name"

# Optional: synthetic demo data (fake doctors and a demo patient, emails end in .test).
# It prints the demo password once.
docker compose exec api node dist/cli/seed-dev.js --yes
```

Open these in your browser:

| What | URL |
| --- | --- |
| MindBridge web app | http://localhost:8080 |
| Emails the app sends (verification, reset links) | http://localhost:8025 (Mailpit) |

The API docs (Swagger) are served by the API container. To reach them, add `"127.0.0.1:3000:3000"`
under `ports` for the `api` service in `docker-compose.yml`, then open http://localhost:3000/api/docs.

Useful commands:

```powershell
docker compose logs -f api        # follow API logs
docker compose down               # stop (data is kept in Docker volumes)
docker compose down -v            # stop AND delete all data
```

---

## Option B: run each part directly

**You need:**

- Node.js 22 LTS (Angular 21 needs Node 20.19 or newer)
- Python 3.12 or newer, and [uv](https://docs.astral.sh/uv/getting-started/installation/)
- MongoDB 7 or 8 running on `localhost:27017`
- Redis 7 running on `localhost:6379`. On Windows the simplest way is
  `docker run -d --name mb-redis -p 6379:6379 redis:7-alpine`, or install Memurai.
- Optional: Mailpit for email (`docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit`).
  Without it, sending email fails and the error is logged, but the app keeps working.

### 1. Configure

```powershell
node scripts/init-env.mjs
```

The defaults in `.env` already point at `localhost` for MongoDB, Redis, the AI service and the web app.
If your local MongoDB or Redis needs a password, edit `MONGO_URI` / `REDIS_URL` in `.env`.

### 2. Install and build

```powershell
cd packages/shared-types; npm install; npm run build; cd ../..
cd apps/api; npm install; npm run build; cd ../..
cd apps/web; npm install; cd ../..
cd apps/ai-service; uv sync; cd ../..
```

### 3. Start the four processes (one terminal each)

```powershell
# Terminal 1: AI service (mock provider) on http://localhost:8000
cd apps/ai-service
uv run uvicorn app.asgi:app --port 8000 --reload

# Terminal 2: API on http://localhost:3000  (Swagger: http://localhost:3000/api/docs)
cd apps/api
npm run start:dev

# Terminal 3: background worker (scheduled account purge, knowledge sync)
cd apps/api
npm run start:worker

# Terminal 4: web app on http://localhost:4200
cd apps/web
npm start
```

### 4. Seed data (once, from `apps/api`)

```powershell
npm run seed:crisis
npm run seed:admin -- --email you@example.com --name "Your Name"
npm run seed:dev -- --yes      # optional synthetic demo data
```

Open http://localhost:4200.

---

## Things to try

1. **Patient:** register at `/register`, confirm the email (the link is in Mailpit), check in your mood,
   write a journal entry, then open the AI companion. Try a message like "I feel stressed about exams".
   Then try one that signals risk; you should see the crisis panel with verified contacts.
2. **Professional:** register with "I'm a professional". You land on `/doctor/verification-pending`
   and can upload documents (PDF/PNG/JPEG, up to 5 MB).
3. **Admin:** sign in with the seeded admin, open **Verifications**, review and approve the professional.
   The professional can then set availability, and patients can book them.
4. **Booking flow:** as the patient, book the approved professional; as the professional, confirm it.
   Messaging and the patient record become available once a session is confirmed.

## Running the tests

```powershell
cd apps/api; npm test                 # unit tests
cd apps/api; npm run test:e2e         # end-to-end tests, need MongoDB and Redis running
cd apps/ai-service; uv run pytest
cd apps/web; npx ng test --watch=false
```

## Troubleshooting

- **API exits on start with a config error:** a value in `.env` is missing or too short. Re-run
  `node scripts/init-env.mjs --force` to regenerate it (this replaces your secrets, so existing encrypted data
  can no longer be read).
- **"Could not reach MindBridge" in the web app:** the API isn't running on port 3000, or (Docker)
  `docker compose ps` shows it unhealthy. Check `docker compose logs api`.
- **AI companion says it's temporarily unavailable:** the AI service isn't running, or `AI_SERVICE_TOKEN`
  differs between the API and the AI service. Both read the same root `.env`.
- **Port already in use:** stop the other program, or change `PORT` in `.env` and the target in `apps/web/proxy.conf.json`.
