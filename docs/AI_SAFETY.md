# AI safety

_Last updated: 2026-10-28._ The safety design below has **not been clinically reviewed**. Every
risk pattern, threshold, template and policy in `apps/ai-service/app/safety` and
`apps/ai-service/app/prompts` needs review by qualified mental health clinicians before any real
patient uses the companion.

## What the AI does and does not do

| The companion **does** | The companion **does not** |
| --- | --- |
| Offer supportive, non-judgemental conversation | Diagnose, or say a person "has" a condition |
| Suggest self-help techniques from the reviewed MindBridge library (RAG) | Recommend, start, stop or dose medication |
| Show verified crisis contacts and offer human support | Claim to be a human, a therapist or a doctor |
| Encourage contact with professionals and trusted people | Promise confidentiality, or claim to have contacted anyone |
| Summarise a conversation for the patient, privately | Make clinical decisions. Risk levels only choose a safer response path. |

Doctor-side AI assist produces **drafts** only. Each draft carries the warnings "AI-generated
draft. Review, edit and approve before it becomes part of any record." and "Does not diagnose,
assess suicide risk or recommend medication." A draft becomes part of a record only when the
doctor saves it as a draft note (the web app asks them to confirm they reviewed it) and then
finalises that note. Final notes are immutable. A draft can only be
attached to a note for the same patient.

## Pipeline for a patient message

```
patient text
   │
   ├─▶ API local screen (apps/api/src/modules/ai/local-safety.ts) ─────────────┐ always runs
   │                                                                          │
   ▼                                                                          │
AI service /v1/support/respond                                                │
   1. detect_injection + sanitise_user_text (strip fake role markers)         │
   2. classify: deterministic rules (always) [+ provider classifier, opt.]    │
   3. decide(): risk level ─▶ response plan                                   │
        IMMINENT / HIGH   ─▶ reviewed template, no LLM text                   │
        third party       ─▶ helper-guidance template                         │
        ELEVATED          ─▶ LLM + crisis-aware policy addendum, no RAG       │
        LOW / NONE        ─▶ LLM with supportive policy (+ RAG for info asks) │
   4. generate (user text sent inside <<<USER … USER>>> as data)              │
   5. output guard: drop diagnosis, medication advice, false identity,        │
      false promises, dependency, shaming, unverified phone numbers and URLs  │
   6. too little left ─▶ reviewed fallback template                           │
   │                                                                          │
   ▼                                                                          ▼
API: final level = max(AI service level, local level)   ◀─────────────────────┘
     local higher ─▶ replace the reply with the crisis template
     crisisMode   ─▶ the web app shows the crisis panel with verified contacts
```

Key properties:

- **Escalation is one-way.** The provider classifier, if turned on, can only raise the rule-based level. The API's local screen can only raise the AI service's level. A classifier failure marks the result `degraded` and never lowers risk.
- **High-risk replies never contain generated text.** For HIGH and IMMINENT, the patient sees a reviewed template (`prompts/templates.py`, versioned `TEMPLATE_VERSION`) plus the crisis panel.
- **The rules are LLM-independent.** `safety/rules.py` normalises slang and misspellings ("kms", "unalive", "sewerslide"), removes idioms ("this traffic is killing me"), and handles negation, historical statements and third-party concern. When unsure, it escalates.
- **The AI service being down is not a safety failure.** If the service times out or is unreachable, the API runs its own conservative screen and shows the crisis template and contacts when needed. Going over the daily quota (`AI_DAILY_MESSAGE_QUOTA`) never blocks crisis support either.
- **Provider errors fall back to templates.** A failed provider call returns a reviewed fallback message, never an error the patient has to interpret.

## Crisis contacts

- Phone numbers and links come **only** from the crisis-resources registry. Admins with `crisis:manage` enter them, and each entry needs a source URL and a verification date.
- Entries older than `CRISIS_RESOURCE_MAX_AGE_DAYS` (default 180) or inactive are never served. Admins see them under a "stale" filter so they can re-verify them.
- Templates never contain numbers. The web app renders contacts from the registry, and the output guard strips any number or URL the model produces that is not in the list sent with the request.
- The seed (`seed-crisis-resources`) contains only India's Tele-MANAS and 112 emergency entries, checked against official sources on 2026-10-27. **No other numbers are invented.** Each deployment must add and verify contacts for its own countries.
- If a country has no verified entries, the UI shows general advice to contact local emergency services. It does not guess a number.

## Mock provider and honest labelling

- `AI_PROVIDER=mock` is the default. The mock returns canned supportive text with `is_mock: true`.
- The API stores `isMock` on every AI message, and the web app shows **"Simulated reply (mock)"** on those messages and on mock summaries and drafts. Mock output is never presented as real AI output.
- Template replies report `provider: "template"` so they can be told apart from model output in metrics.

## Prompt injection

User text is always passed as delimited data, and the system policy tells the model to treat it as
data. `safety/injection.py` flags common jailbreak phrases (to log the attempt as a signal) and
removes fake role markers such as `<system>` or `assistant:`. Detection is defence in depth. It is
not what keeps the model on policy.

## Privacy

- AI conversations are encrypted at rest in MongoDB. They expire after `AI_CONVERSATION_RETENTION_DAYS`, and the patient can delete them at any time.
- The AI service is stateless and does not log message text. Safety events are logged as codes (`risk`, `signals`) only.
- The AI companion needs the patient's `AI_PROCESSING` consent. Sharing an AI summary with a doctor needs `SHARE_AI_SUMMARY` for that doctor, and doctor AI assist with patient context needs `DOCTOR_AI_ASSIST`.
- When a real provider is configured, message text leaves the platform for that provider. The provider's data processing terms and region must be reviewed, and the published AI notice (`AI_PROCESSING` policy) must say so.

## Using a real model

1. Set `AI_PROVIDER` (`openai_compatible`, `anthropic` or `ollama`), `AI_MODEL`, `AI_API_KEY` and `AI_BASE_URL` (where needed) in the environment. Never put them in code.
2. Optionally set `AI_RISK_CLASSIFIER=provider`. The rules still run, and the model can only raise the level.
3. Before real users see it, run the safety test suite (`uv run pytest`) and a red-team evaluation **against that model**, and have clinicians review the transcripts. The existing tests only exercise the rules, the templates, the guard and the mock.
4. Monitor `support.output_guard_actions`, `support.output_guard_fallbacks`, `support.provider_errors` and the per-level safety counters on the admin AI page.

## Tests

`apps/ai-service/tests` (73 tests, all passing on 2026-10-27) covers idioms, negation, history,
third-party concern, slang, the decision table, templates, the output guard, injection handling and
the API contract. `apps/api/src/modules/ai/*.spec.ts` covers the local screen, the "max of both
levels" rule, and the fallbacks for quota and an unavailable AI service.
