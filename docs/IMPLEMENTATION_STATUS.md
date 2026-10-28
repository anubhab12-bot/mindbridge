# Implementation status

Last updated: 2026-10-28. This file states what exists and what has actually been run. Nothing here
claims production readiness.

## What was executed, and the result

| Check | Where | Result |
| --- | --- | --- |
| API unit tests (Vitest) | `apps/api`, `npm test` | 108 passed |
| API typecheck | `apps/api`, `npm run typecheck` | clean |
| AI service tests (pytest), ruff, mypy | `apps/ai-service` | 73 passed, lint and types clean |
| Web production build | `apps/web`, `ng build` | succeeds |
| Web unit tests (Vitest via `ng test`) | `apps/web` | 13 passed |

## Written but NOT executed yet

- **API end-to-end tests** (`apps/api/test/*.e2e-spec.ts`): they need a real MongoDB and Redis. They are
  wired into the GitHub Actions workflow but have not been run, because MongoDB was not available in the
  build environment.
- **Docker Compose stack**: the Dockerfiles and `docker-compose.yml` have not been built or started yet.
- **The web app against a live API**: the screens compile and unit tests pass, but no one has clicked
  through them against a running backend yet. Expect small integration bugs on the first local run.
- **GitHub Actions CI**: not run (no repository yet).

## Feature state

| Area | State |
| --- | --- |
| Auth: register, login, MFA (TOTP) for doctors/admins, refresh rotation, sessions, email verification, password reset | Implemented (API + web) |
| RBAC, resource-level checks, care-relationship anchor, consent gating | Implemented (API); web guards are UX only |
| Doctor onboarding and verification (documents, admin review) | Implemented |
| Directory, availability, booking, reschedule/cancel, confirm/decline/complete, feedback | Implemented |
| Mood, journal (encrypted) | Implemented |
| AI companion with layered safety, crisis panel, mock labelling, human-support handoff | Implemented; real providers are adapters that have only been tested with mocked HTTP |
| Crisis resources registry with freshness checks | Implemented; seeded with Tele-MANAS and 112, verified 2026-10-27 |
| Clinical notes (draft/final/addenda), AI drafts with provenance | Implemented |
| Secure messaging with realtime notifications | Implemented |
| Privacy: export, per-category deletion, account deletion with grace period | Implemented |
| Admin portal: dashboard (small-group suppression), users, verifications, crisis, content, feedback, support, audit, security, flags, policies | Implemented |
| Video consultations | **Not implemented**: provider interface only, off by default |
| SMS / push notifications | Not implemented (email and in-app only) |
| Legal texts (terms, privacy, AI notice) | **Not written**: admins must publish reviewed text before launch |
| Documentation: README, architecture, security, AI safety, API reference, deployment checklist, ADRs 0001 to 0007 | Written (2026-10-28) |
| Deployment | Not started (hosting target not chosen); see `docs/DEPLOYMENT.md` |

## Known gaps before any real use

- Legal and clinical review of all patient-facing copy and safety flows.
- Penetration test and security review; DPDP Act 2023 obligations reviewed by counsel.
- Backups, monitoring and incident response for the chosen host.
- A real AI provider configured and evaluated; the mock is for development only.
