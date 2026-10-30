# ADR-0005: Token and session model

- Status: Accepted
- Date: 2026-10-27

## Context

The web app needs persistent sign-in that holds up against XSS token theft and CSRF, plus a way for
users and admins to end sessions.

## Decision

- The **access token** is a 15-minute JWT, held in memory by the SPA and sent as a Bearer header.
- The **refresh token** is opaque and random, in an `HttpOnly`, `SameSite=Strict`, `Secure` cookie scoped to `/api/v1/auth`. The server stores only its hash, as a session record. It rotates on every refresh. Reusing an old token revokes the session.
- Cookie endpoints also require an `x-mindbridge-csrf` header.
- **MFA:** TOTP for doctors and admins. Passwords are hashed with Argon2id.

## Consequences

- An XSS bug cannot read a long-lived credential. It can still act within the page while it runs, so the CSP and output encoding still matter.
- Reloading the page triggers a refresh call, which `auth.init()` does on startup.
- Session lists and revocation work, because sessions are server-side records.
