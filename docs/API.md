# API reference

_Last updated: 2026-10-28._ This is a summary. The source of truth is the OpenAPI document served
by the API at **`/api/docs`** (Swagger UI) when `SWAGGER_ENABLED=true` and `NODE_ENV` is not
`production`. The table below was generated from the controllers' route decorators and
`@ApiOperation` summaries.

## Conventions

- **Base path:** `/api/v1` (URI versioning). Behind the Docker nginx it is `http://localhost:8080/api/v1`.
- **Authentication:** `Authorization: Bearer <access token>`. Get the token from `POST /auth/login`, or from `POST /auth/mfa/verify` when the account uses MFA.
- **Refresh:** `POST /auth/refresh` uses the HttpOnly refresh cookie and **must** send the header `x-mindbridge-csrf: 1`. `POST /auth/logout` needs the same header.
- **Success envelope:** `{ "data": …, "meta": { … } }`. List endpoints take `page` (from 1) and `pageSize` (up to 100) query parameters and return `meta: { page, pageSize, total, totalPages }`.
- **Error envelope:** `{ "error": { "code": "SNAKE_CASE", "message": "…", "details": … }, "requestId": "…" }`. Quote `requestId` (also sent as the `x-request-id` header) when reporting a problem.
- **Validation:** unknown body fields are rejected with `400 VALIDATION_FAILED`.
- **Status codes in use:** `401` (not authenticated), `403` (wrong role, missing permission, consent or verification, with a specific `code` such as `DOCTOR_NOT_VERIFIED`), `404` (also returned for other people's resources, so their existence is not revealed), `409` (booking conflicts, invalid state changes), `429` (rate limited).
- **Realtime:** Socket.IO at `/socket.io`. Pass `auth: { token }` in the handshake. The server pushes `message:new` and notification events. All writes go through REST.

## AI service (internal)

The AI service is not exposed publicly. The API calls it with `Authorization: Bearer $AI_SERVICE_TOKEN`:
`POST /v1/support/respond`, `POST /v1/support/summarize`, `POST /v1/safety/screen`,
`POST /v1/doctor/assist`, `POST /v1/knowledge/sync`, `GET /v1/metrics`, `GET /v1/health/provider`,
plus an unauthenticated `GET /health`. Its own OpenAPI document is at `/docs` on the service.

## Endpoints

### admin

| Method | Path | Who / what |
| --- | --- | --- |
| GET | `/api/v1/admin/dashboard` | Aggregated, small-group-suppressed platform metrics (ADMIN). |
| GET | `/api/v1/admin/reports/summary.csv` | Aggregate-only CSV report (ADMIN reports:export). |
| GET | `/api/v1/admin/users` | Search accounts; no health data (ADMIN users:manage). |
| POST | `/api/v1/admin/users/:id/suspend` | Suspend an account and end its sessions (ADMIN users:manage). |
| POST | `/api/v1/admin/users/:id/reactivate` | Reactivate a suspended account (ADMIN users:manage). |
| PUT | `/api/v1/admin/users/:id/permissions` | Change another administrator's permissions (ADMIN security:manage). |
| GET | `/api/v1/admin/feedback/pending` | Feedback awaiting moderation (ADMIN content:manage). |
| POST | `/api/v1/admin/feedback/:id/moderate` | Approve or reject feedback (ADMIN content:manage). |
| GET | `/api/v1/admin/policies` | Policy documents (ADMIN settings:manage). |
| POST | `/api/v1/admin/policies` | Create a policy draft (ADMIN settings:manage). Requires legal review before publishing. |
| POST | `/api/v1/admin/policies/:id/publish` | Publish a policy version (ADMIN settings:manage). |
| GET | `/api/v1/admin/audit-logs` | Search audit logs (ADMIN audit:read). Logs contain no health content. |
| GET | `/api/v1/admin/security` | Security signals for the last 24 hours (ADMIN security:manage). |
| GET | `/api/v1/admin/ai` | AI service health, provider metrics and usage (ADMIN settings:manage). |

### ai

| Method | Path | Who / what |
| --- | --- | --- |
| POST | `/api/v1/ai/conversations` | Start a conversation (PATIENT, AI consent required). |
| GET | `/api/v1/ai/conversations` | List my conversations (PATIENT, own data). |
| GET | `/api/v1/ai/conversations/:id/messages` | Messages in one of my conversations (PATIENT, ownership enforced). |
| POST | `/api/v1/ai/conversations/:id/messages` | Send a message and get the companion reply with safety information (PATIENT). |
| PATCH | `/api/v1/ai/conversations/:id` | Rename a conversation (PATIENT, ownership enforced). |
| DELETE | `/api/v1/ai/conversations/:id` | Permanently delete a conversation (PATIENT, ownership enforced). |
| POST | `/api/v1/ai/conversations/:id/summary` | Generate a private summary of this conversation (PATIENT). |
| POST | `/api/v1/ai/messages/:id/feedback` | Rate or report a companion reply (PATIENT, own messages). |
| POST | `/api/v1/ai/human-support` | Ask for human support: shows crisis resources and notifies my care team (PATIENT). |

### appointments

| Method | Path | Who / what |
| --- | --- | --- |
| POST | `/api/v1/appointments` | Request an appointment with a verified professional (PATIENT, verified email). |
| GET | `/api/v1/patients/appointments` | My appointments (PATIENT, own). |
| GET | `/api/v1/doctors/me/appointments` | My schedule and requests (approved DOCTOR, own). |
| GET | `/api/v1/doctors/me/appointment-stats` | My consultation counts by status (approved DOCTOR, own). |
| GET | `/api/v1/appointments/:id` | Appointment detail (participant only: booking patient or the professional). |
| PATCH | `/api/v1/appointments/:id` | Edit my reason for visit (PATIENT, own, while active). |
| POST | `/api/v1/appointments/:id/cancel` | Cancel (participant only). Late patient cancellations are flagged per policy. |
| POST | `/api/v1/appointments/:id/reschedule` | Move to another free slot (participant only, policy window applies). |
| POST | `/api/v1/appointments/:id/confirm` | Accept a request; establishes the care relationship (approved DOCTOR, own). |
| POST | `/api/v1/appointments/:id/decline` | Decline a request (approved DOCTOR, own). |
| POST | `/api/v1/appointments/:id/complete` | Record the outcome and mark completed (approved DOCTOR, own). |
| POST | `/api/v1/appointments/:id/no-show` | Mark a confirmed appointment as no-show (approved DOCTOR, own). |
| GET | `/api/v1/appointments/:id/video-access` | Short-lived video join link (participant only; disabled unless a provider is configured). |
| POST | `/api/v1/appointments/:id/feedback` | Rate a completed consultation; moderated before it counts (PATIENT, own). |

### auth

| Method | Path | Who / what |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | Register as a patient or doctor (public). Admin accounts cannot be registered here. |
| POST | `/api/v1/auth/login` | Sign in (public). Returns an MFA challenge for accounts with two-step sign-in. |
| POST | `/api/v1/auth/mfa/verify` | Complete an MFA sign-in challenge (public, needs mfaToken). |
| POST | `/api/v1/auth/refresh` | Rotate the refresh cookie and get a new access token (cookie + CSRF header). |
| POST | `/api/v1/auth/logout` | End the current session (cookie + CSRF header). |
| POST | `/api/v1/auth/logout-all` | Sign out of every session for the current user. |
| GET | `/api/v1/auth/me` | Current user (any authenticated role). |
| GET | `/api/v1/auth/sessions` | List my active sessions. |
| DELETE | `/api/v1/auth/sessions/:id` | Revoke one of my sessions (ownership enforced). |
| POST | `/api/v1/auth/verify-email` | Confirm an email address with the emailed token (public). |
| POST | `/api/v1/auth/resend-verification` | Re-send my verification email. |
| POST | `/api/v1/auth/forgot-password` | Request a reset link. Always returns 202 to avoid revealing which emails exist. |
| POST | `/api/v1/auth/reset-password` | Set a new password with a reset token (public). Signs out all sessions. |
| POST | `/api/v1/auth/change-password` | Change my password. Other sessions are signed out. |
| POST | `/api/v1/auth/mfa/setup` | Start TOTP setup (doctors and admins). |
| POST | `/api/v1/auth/mfa/enable` | Confirm TOTP setup with a code (doctors and admins). |
| POST | `/api/v1/auth/mfa/disable` | Turn off TOTP (needs password and current code). |

### care

| Method | Path | Who / what |
| --- | --- | --- |
| GET | `/api/v1/patients/care-team` | Professionals who currently or previously had access to my care (PATIENT, own). |
| DELETE | `/api/v1/patients/care-team/:doctorId` | End a care relationship: the professional immediately loses access (PATIENT, own). |

### clinical-notes

| Method | Path | Who / what |
| --- | --- | --- |
| GET | `/api/v1/doctors/me/patients` | Patients with an active care relationship (verified DOCTOR). |
| GET | `/api/v1/doctors/me/patients/:patientId` | Minimum-necessary patient overview (verified DOCTOR, care relationship). |
| GET | `/api/v1/doctors/me/patients/:patientId/mood-summary` | 30-day mood aggregates (care relationship + SHARE_MOOD_SUMMARY consent). |
| GET | `/api/v1/doctors/me/patients/:patientId/ai-summary` | AI summary of recent companion conversations (care relationship + SHARE_AI_SUMMARY consent). |
| GET | `/api/v1/doctors/me/patients/:patientId/intakes` | Pre-consultation intakes (care relationship + SHARE_INTAKE consent). |
| GET | `/api/v1/doctors/me/patients/:patientId/notes` | My notes for this patient (verified DOCTOR, care relationship). |
| POST | `/api/v1/doctors/me/patients/:patientId/notes` | Create a draft note (verified DOCTOR, care relationship). |
| GET | `/api/v1/doctors/me/notes/:id` | Read one of my notes (author only). |
| PATCH | `/api/v1/doctors/me/notes/:id` | Edit a draft note (author only; final notes are immutable). |
| POST | `/api/v1/doctors/me/notes/:id/finalize` | Approve and finalize a note (author only). AI-drafted text becomes part of the record only here. |
| POST | `/api/v1/doctors/me/notes/:id/addenda` | Append a correction to a final note (author only). |
| DELETE | `/api/v1/doctors/me/notes/:id` | Delete a draft note (author only). |
| POST | `/api/v1/doctors/me/ai-assist` | Generate an AI draft for professional review (verified DOCTOR; patient context needs DOCTOR_AI_ASSIST consent). |

### consent

| Method | Path | Who / what |
| --- | --- | --- |
| GET | `/api/v1/consents/me` | My current consent states (owner only). |
| GET | `/api/v1/consents/me/history` | My full consent history (owner only). |
| POST | `/api/v1/consents` | Grant or withdraw one of my consents. Doctor-scoped consents must name an approved professional. |
| GET | `/api/v1/policies/:type` | Current published policy text (public). |

### crisis-resources

| Method | Path | Who / what |
| --- | --- | --- |
| GET | `/api/v1/crisis-resources` | Verified crisis resources for a country (public). |
| GET | `/api/v1/admin/crisis-resources` | All crisis resources incl. inactive and expired (ADMIN crisis:manage). |
| POST | `/api/v1/admin/crisis-resources` | Add a verified crisis resource (ADMIN crisis:manage). |
| PATCH | `/api/v1/admin/crisis-resources/:id` | Edit a resource; contact changes require re-verification (ADMIN crisis:manage). |
| POST | `/api/v1/admin/crisis-resources/:id/verify` | Record that the details were re-checked against the official source today (ADMIN crisis:manage). |
| DELETE | `/api/v1/admin/crisis-resources/:id` | Delete a resource (ADMIN crisis:manage). |

### doctors

| Method | Path | Who / what |
| --- | --- | --- |
| GET | `/api/v1/doctors/me` | My professional profile, verification status and completeness (DOCTOR, own). |
| PATCH | `/api/v1/doctors/me` | Update my profile (DOCTOR, own). Verification fields cannot be changed here. |
| PATCH | `/api/v1/doctors/me/availability` | Replace my weekly working hours (DOCTOR, own). |
| PUT | `/api/v1/doctors/me/availability` | Alias of PATCH /doctors/me/availability. |
| GET | `/api/v1/doctors/me/availability/exceptions` | My leave and extra availability blocks (DOCTOR, own). |
| POST | `/api/v1/doctors/me/availability/exceptions` | Add leave or extra availability (DOCTOR, own). Reports overlapping bookings. |
| DELETE | `/api/v1/doctors/me/availability/exceptions/:id` | Remove one of my availability blocks (DOCTOR, ownership enforced). |
| GET | `/api/v1/doctors` | Search verified professionals (public). |
| GET | `/api/v1/doctors/facets` | Specialties and languages offered by verified professionals (public). |
| GET | `/api/v1/doctors/categories` | Professional categories and their scope of practice (public). |
| GET | `/api/v1/doctors/:id` | Verified professional profile (public). |
| GET | `/api/v1/doctors/:id/slots` | Free slots between two dates in the professional’s timezone (public). |

### feature-flags

| Method | Path | Who / what |
| --- | --- | --- |
| GET | `/api/v1/feature-flags` | UI feature toggles (public, non-sensitive). |
| GET | `/api/v1/admin/feature-flags` | All flags (ADMIN settings:manage). |
| PUT | `/api/v1/admin/feature-flags/:key` | Turn a known flag on or off (ADMIN settings:manage). |

### files

| Method | Path | Who / what |
| --- | --- | --- |
| GET | `/api/v1/files/:ref` | Download a private document via signed link (owner or authorized admin). |

### health

| Method | Path | Who / what |
| --- | --- | --- |
| GET | `/api/v1/health` | Liveness probe (public). |
| GET | `/api/v1/health/ready` | Readiness probe: MongoDB and Redis reachable (public, no details beyond up/down). |

### journal

| Method | Path | Who / what |
| --- | --- | --- |
| GET | `/api/v1/patients/journal-entries/prompts` | Optional reflection prompts (PATIENT). |
| POST | `/api/v1/patients/journal-entries` | Write a private journal entry (PATIENT, own data, encrypted at rest). |
| GET | `/api/v1/patients/journal-entries` | List my journal entries with previews (PATIENT, own data). |
| GET | `/api/v1/patients/journal-entries/:id` | Read one of my entries (PATIENT, ownership enforced). |
| PATCH | `/api/v1/patients/journal-entries/:id` | Edit one of my entries (PATIENT, ownership enforced). |
| DELETE | `/api/v1/patients/journal-entries/:id` | Delete one of my entries (PATIENT, ownership enforced). |

### messaging

| Method | Path | Who / what |
| --- | --- | --- |
| GET | `/api/v1/messaging/threads` | My message threads (PATIENT or verified DOCTOR). |
| POST | `/api/v1/messaging/threads` | Open (or fetch) the thread with a care-relationship counterpart. |
| GET | `/api/v1/messaging/threads/:id/messages` | Messages in a thread (participants only). |
| POST | `/api/v1/messaging/threads/:id/messages` | Send a message (participants only, active care relationship). |
| POST | `/api/v1/messaging/threads/:id/read` | Mark the thread as read (participants only). |

### mood

| Method | Path | Who / what |
| --- | --- | --- |
| POST | `/api/v1/patients/mood-entries` | Add a mood check-in (PATIENT, own data). |
| GET | `/api/v1/patients/mood-entries` | List my mood check-ins (PATIENT, own data). |
| GET | `/api/v1/patients/mood-entries/trend` | Daily averages for my mood chart (PATIENT, own data). |
| GET | `/api/v1/patients/mood-entries/today` | Today's latest check-in, if any (PATIENT, own data). |
| DELETE | `/api/v1/patients/mood-entries/:id` | Delete one of my check-ins (PATIENT, ownership enforced). |

### notifications

| Method | Path | Who / what |
| --- | --- | --- |
| GET | `/api/v1/notifications` | My notifications (owner only). |
| GET | `/api/v1/notifications/unread-count` | Number of unread notifications. |
| POST | `/api/v1/notifications/:id/read` | Mark one of my notifications read. |
| POST | `/api/v1/notifications/read-all` | Mark all my notifications read. |

### privacy

| Method | Path | Who / what |
| --- | --- | --- |
| GET | `/api/v1/privacy/export` | Download all my personal data as JSON (PATIENT/DOCTOR, own data). |
| DELETE | `/api/v1/privacy/data/:category` | Permanently delete one category of my data now (PATIENT). |
| POST | `/api/v1/privacy/deletion-request` | Schedule account deletion after the grace period (password required). |
| POST | `/api/v1/privacy/deletion-cancel` | Cancel a scheduled account deletion. |

### support

| Method | Path | Who / what |
| --- | --- | --- |
| POST | `/api/v1/support/tickets` | Open a support request (PATIENT/DOCTOR). |
| GET | `/api/v1/support/tickets` | My support requests. |
| GET | `/api/v1/support/tickets/:id` | One of my support requests (owner only). |
| POST | `/api/v1/support/tickets/:id/replies` | Reply to my support request (owner only). |
| GET | `/api/v1/admin/support-tickets` | Support queue (ADMIN support:manage). |
| GET | `/api/v1/admin/support-tickets/:id` | Read a ticket (ADMIN support:manage, audited). |
| POST | `/api/v1/admin/support-tickets/:id/replies` | Reply to a ticket (ADMIN support:manage). |
| POST | `/api/v1/admin/support-tickets/:id/status` | Change ticket status (ADMIN support:manage). |

### users

| Method | Path | Who / what |
| --- | --- | --- |
| PATCH | `/api/v1/users/me` | Update my name, timezone, language or country (own account). |
| GET | `/api/v1/patients/me/profile` | My patient profile (PATIENT, own data). |
| PATCH | `/api/v1/patients/me/profile` | Update my patient profile (PATIENT, own data). |

### verification

| Method | Path | Who / what |
| --- | --- | --- |
| GET | `/api/v1/doctors/me/verification` | My verification application and status (DOCTOR, own record only). |
| POST | `/api/v1/doctors/verification-documents` | Upload a verification document: PDF/PNG/JPEG ≤ 5 MB (DOCTOR, own application). |
| DELETE | `/api/v1/doctors/verification-documents/:documentId` | Remove one of my documents before approval (DOCTOR, own application). |
| GET | `/api/v1/admin/doctors/pending-verification` | Applications awaiting review (ADMIN + doctors:verify). |
| GET | `/api/v1/admin/verifications/:id` | Full application with signed document links (ADMIN + doctors:verify). Audited. |
| POST | `/api/v1/admin/verifications/:id/approve` | Approve a professional (ADMIN + doctors:verify). |
| POST | `/api/v1/admin/verifications/:id/reject` | Reject with a recorded reason (ADMIN + doctors:verify). |
| POST | `/api/v1/admin/verifications/:id/request-info` | Ask the professional for more information (ADMIN + doctors:verify). |
| POST | `/api/v1/admin/verifications/:id/suspend` | Suspend an approved professional (ADMIN + doctors:verify). |
| POST | `/api/v1/admin/verifications/:id/reactivate` | Reactivate a suspended professional (ADMIN + doctors:verify). |

### wellness

| Method | Path | Who / what |
| --- | --- | --- |
| GET | `/api/v1/wellness` | Published self-help content (public). |
| GET | `/api/v1/wellness/:slug` | One published item (public). |
| GET | `/api/v1/admin/wellness` | All content incl. drafts (ADMIN content:manage). |
| POST | `/api/v1/admin/wellness` | Create draft content (ADMIN content:manage). |
| PATCH | `/api/v1/admin/wellness/:id` | Edit content; published items return to draft for re-review (ADMIN content:manage). |
| POST | `/api/v1/admin/wellness/:id/status` | Review and publish, unpublish or archive (ADMIN content:manage). |
| POST | `/api/v1/admin/wellness/sync-knowledge` | Re-sync published content to the AI knowledge base (ADMIN content:manage). |
