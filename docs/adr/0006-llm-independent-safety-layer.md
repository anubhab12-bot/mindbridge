# ADR-0006: A safety layer that does not depend on the LLM

- Status: Accepted
- Date: 2026-10-27

## Context

The companion talks to people who may be at risk. LLMs can miss risk, invent phone numbers, give
medication advice, or be unavailable. The safety behaviour must not depend on any of those going
well.

## Decision

- Deterministic rules screen every message before any model call. An optional LLM classifier can only *raise* the level.
- A decision table maps the risk level to a response plan. HIGH and IMMINENT always get reviewed templates, never generated text.
- An output guard removes diagnoses, medication advice, false identity or promises, and any phone number or URL that is not in the verified crisis list.
- The API runs its own conservative screen and keeps the higher of the two levels, so crisis resources still appear when the AI service is down or over quota.
- Mock output is always flagged `is_mock` and labelled in the UI.

## Consequences

- Safety holds when the provider fails, but rules need ongoing clinical review and will produce false positives. We accept that trade.
- Details are in [AI_SAFETY.md](../AI_SAFETY.md).
