# ADR-0001: Modular monolith, plus a separate AI service

- Status: Accepted
- Date: 2026-10-27

## Context

MindBridge needs authentication, scheduling, clinical records, messaging and an AI companion. The
team is small, and the domain rules (consent, care relationships, audit) cut across most features.
The AI work fits the Python ecosystem better and has a different risk profile.

## Decision

- One NestJS API holds all business modules and is the only service that touches MongoDB. A worker process runs from the same image for BullMQ jobs.
- A separate, stateless FastAPI service holds risk screening, prompts, providers and RAG. It is reachable only from the API, using a shared token.

## Consequences

- Transactions and access checks stay in one codebase, and there are no distributed calls between business modules.
- The AI service can be scaled, swapped or turned off on its own. The API keeps a local safety screen for when it is down (ADR-0006).
- Module boundaries have to be kept by discipline, because nothing enforces them at the network level.
