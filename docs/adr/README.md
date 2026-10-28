# Architecture decision records

Each record states one decision, why it was made, and its consequences. New records get the next
number. A record is never edited after it is accepted. Supersede it with a new one instead.

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](0001-modular-monolith-and-separate-ai-service.md) | NestJS modular monolith, plus a separate Python AI service | Accepted |
| [0002](0002-angular-21.md) | Angular 21 instead of 22 | Accepted |
| [0003](0003-hand-built-design-system.md) | Hand-built SCSS design system, no component library | Accepted |
| [0004](0004-vitest-for-api-tests.md) | Vitest with SWC for API tests | Accepted |
| [0005](0005-token-and-session-model.md) | In-memory access token, plus a rotating HttpOnly refresh cookie | Accepted |
| [0006](0006-llm-independent-safety-layer.md) | A safety layer that does not depend on the LLM | Accepted |
| [0007](0007-application-level-field-encryption.md) | Application-level AES-256-GCM for sensitive free text | Accepted |
