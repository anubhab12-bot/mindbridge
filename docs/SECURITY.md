# Security

_Last updated: 2026-10-28._ This file describes the controls that are in the code. It is not a
security audit. No penetration test or external review has been done yet; see
[DEPLOYMENT.md](DEPLOYMENT.md) for what must happen before real use.

## Reporting a vulnerability

Please do not open a public issue. Email the repository owner privately with steps to reproduce.
Do not include real patient data.

## Secrets and configuration

- No secret, API key, model name or production URL is in source code. Everything comes from environment variables, and `config/env.validation.ts` validates them at startup.
- The API refuses to start if a secret is missing, still `CHANGE_ME`, or too short.
- When `NODE_ENV=production`, it also requires `COOKIE_SECURE=true` and a real mail transport, and Swagger is turned off.
- `.env` is git-ignored. `scripts/init-env.mjs` generates random local secrets, and refuses to overwrite an existing `.env` unless you pass `--force`.
- Seed data uses synthetic `.test` addresses only. The admin seed prompts for the password interactively, so it never has to sit in a file.

## Authentication

| Control | Implementation |
| --- | --- |
| Password hashing | Argon2id (`@node-rs/argon2`, 19 MiB memory, 2 iterations) |
| Password policy | 10 to 128 characters |
| Access token | JWT, 15 minutes (`JWT_ACCESS_TTL_SECONDS`). The web app keeps it in memory only, never in `localStorage`. |
| Refresh token | Opaque random token in an `HttpOnly`, `SameSite=Strict`, `Secure` (in production) cookie scoped to `/api/v1/auth`. Only a hash is stored. It rotates on every use. |
| Refresh token reuse | Replaying an already-rotated token revokes the whole session, which signs out an attacker who stole an old token. |
| CSRF | Cookie-authenticated endpoints (`refresh`, `logout`) require the `x-mindbridge-csrf` header, which a cross-site form cannot set. CORS only allows origins listed in `CORS_ORIGINS`. |
| Brute force | Account lockout after `MAX_FAILED_LOGINS` (default 5) for `LOCKOUT_MINUTES` (default 15). Stricter Redis-backed rate limit on auth routes (`AUTH_THROTTLE_LIMIT`). |
| MFA | TOTP for doctors and admins. The secret is encrypted at rest, and turning MFA off requires the password plus a current code. |
| Account enumeration | `forgot-password` always returns 202. |
| Session control | Users can list and revoke sessions. A password change or reset signs out other sessions, and suspending a user ends all of their sessions. |

## Authorization

- **Deny by default.** A route with no `@Roles` or `@Public` decorator is rejected, and the denial is audited.
- **Roles:** `PATIENT`, `DOCTOR` and `ADMIN`. Admin accounts cannot be registered through the API; they are created only by `seed-admin`.
- **Admin permissions** are fine-grained: `users:manage`, `doctors:verify`, `content:manage`, `crisis:manage`, `audit:read`, `security:manage`, `support:manage`, `settings:manage` and `reports:export`.
- **Verified-doctor gate.** Doctors cannot reach clinical features until an admin approves their verification. The API enforces this, not only the `/doctor/verification-pending` page.
- **Resource-level checks** happen in the services, not only on routes:
  - Patients can only reach their own records.
  - A doctor can only see a patient while an active care relationship exists, which starts when the doctor confirms an appointment. The patient can end it at any time.
  - Each shared data category (`SHARE_MOOD_SUMMARY`, `SHARE_INTAKE`, `SHARE_AI_SUMMARY`, `DOCTOR_AI_ASSIST`) also needs its own consent, which can be scoped to one doctor.
  - Clinical notes are visible to their author only. Final notes are immutable and can only be corrected with addenda.
- Guards in the web app are for UX only.

## Data protection

- **Field-level encryption.** Journals, AI conversations, clinical notes, secure messages, intake answers and MFA secrets are encrypted with AES-256-GCM (random 96-bit IV, authenticated) using `FIELD_ENCRYPTION_KEY`, on top of any disk encryption. Key rotation is **not implemented yet**: the `enc:v1:` prefix leaves room for it.
- **Uploads.** Verification documents are validated by magic bytes (PDF, PNG or JPEG only, 5 MB or less), stored outside any web root under random names with `0600` permissions, and served only through short-lived HMAC-signed URLs to the owner or an admin with `doctors:verify`. Every view is audited.
- **Logging.** Logs are structured JSON and pass through `redact()`, which masks tokens, passwords, secrets and message bodies. Audit records hold IDs and actions, never health content, and are kept for 2 years.
- **Admin analytics.** Admin dashboards and CSV exports suppress any group smaller than `ANALYTICS_MIN_GROUP_SIZE` (default 5).
- **Privacy rights.** Users can export their data as JSON, delete a category of data immediately, and request account deletion (purged by the worker after `ACCOUNT_DELETION_GRACE_DAYS`, with cancellation allowed until then). AI conversations expire after `AI_CONVERSATION_RETENTION_DAYS`.

## Transport and HTTP hardening

- The API uses helmet with a restrictive CSP, `frame-ancestors 'none'`, `Referrer-Policy: no-referrer` and HSTS in production. `x-powered-by` is removed.
- Request bodies are limited to 256 KB. `ValidationPipe` uses `whitelist` and `forbidNonWhitelisted`, so unknown fields are rejected rather than silently stored.
- Errors use a fixed envelope with a request ID. Stack traces and internal messages are never sent to clients.
- nginx (`infrastructure/nginx/default.conf`) adds a `Permissions-Policy` that blocks camera, microphone, geolocation and payment, plus the other security headers.
- Communication from the API to the AI service uses a shared bearer token (`AI_SERVICE_TOKEN`). The AI service has no database access.

## Supply chain and CI

- Lockfiles are committed for npm (`package-lock.json`) and Python (`uv.lock`). CI installs with `npm ci` and `uv sync --frozen`.
- CI runs `npm audit --omit=dev --audit-level=high` for the API and the web app, `pip-audit` for the AI service, plus lint, typecheck and tests for all three apps. The workflow token is `contents: read`.

## Known gaps

- No external penetration test or code audit yet.
- No field-encryption key rotation, and no KMS integration. The key comes from an environment variable.
- Local disk file storage only. Production needs object storage with server-side encryption.
- No WAF or bot protection beyond rate limits.
- Socket.IO has no Redis adapter, so realtime works on a single API instance only.
- DPDP Act 2023 (India) and any other applicable obligations still need to be reviewed by counsel.
