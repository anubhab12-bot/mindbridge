"""Patient support orchestration: screen -> decide -> (template | generate -> guard) -> respond."""

from __future__ import annotations

import asyncio
import logging
import re
import time

from app.metrics import metrics
from app.prompts import policies, templates
from app.providers.base import LLMProvider, ProviderError
from app.rag.store import VectorStore
from app.safety import decision
from app.safety.classifier import RiskClassifier
from app.safety.injection import detect_injection, sanitise_user_text
from app.safety.output_guard import check_output
from app.schemas import (
    AiMeta,
    SourceRef,
    SummarizeRequest,
    SummarizeResponse,
    SupportRequest,
    SupportResponse,
)

log = logging.getLogger("mindbridge.ai.support")

_INFO_INTENT = re.compile(
    r"\b(?:what\s+(?:is|are)|how\s+(?:do|can|to)|tips?|ways\s+to|explain|why\s+do|help\s+with|techniques?|exercises?)\b",
    re.I,
)
_RAG_MIN_SCORE = 0.12


class SupportService:
    def __init__(
        self,
        provider: LLMProvider,
        classifier: RiskClassifier,
        store: VectorStore,
        max_tokens: int,
        concurrency: int,
    ) -> None:
        self.provider = provider
        self.classifier = classifier
        self.store = store
        self.max_tokens = max_tokens
        self._sem = asyncio.Semaphore(concurrency)

    def _meta(self, **kw: object) -> AiMeta:
        base: dict[str, object] = {
            "provider": self.provider.name,
            "model": self.provider.model,
            "prompt_version": policies.PATIENT_PROMPT_VERSION,
            "policy_version": decision.POLICY_VERSION,
            "is_mock": self.provider.is_mock,
        }
        base.update(kw)
        return AiMeta(**base)  # type: ignore[arg-type]

    async def respond(self, req: SupportRequest) -> SupportResponse:
        started = time.monotonic()
        injection = detect_injection(req.user_message)
        user_text = sanitise_user_text(req.user_message)

        classification = await self.classifier.classify(user_text)
        if injection:
            classification.signals.append("prompt_injection_attempt")
        assessment, plan = decision.decide(classification)
        has_resources = bool(req.crisis_resources)
        has_emergency = any(r.service_type == "EMERGENCY" for r in req.crisis_resources)

        # Safety events are logged as codes only, never message text.
        if assessment.risk_level.rank >= 2 or injection:
            log.info(
                "safety_event", extra={"risk": assessment.risk_level.value, "signals": assessment.signals}
            )
            metrics.inc(f"safety.{assessment.risk_level.value}")

        if plan.use_template:
            reply = {
                "imminent": lambda: templates.imminent(has_resources, has_emergency),
                "high": lambda: templates.high(has_resources),
                "third_party": lambda: templates.third_party(has_resources),
                "data_request": templates.data_request,
            }[plan.use_template]()
            latency = int((time.monotonic() - started) * 1000)
            metrics.observe("support", latency, 0, 0)
            return SupportResponse(
                reply=reply,
                safety=assessment,
                meta=self._meta(
                    provider="template", model=templates.TEMPLATE_VERSION, latency_ms=latency, is_mock=False
                ),
            )

        system = policies.PATIENT_SUPPORT_SYSTEM
        if plan.crisis_policy:
            system += policies.ELEVATED_ADDENDUM
        sources: list[SourceRef] = []
        if req.rag_enabled and _INFO_INTENT.search(user_text) and not plan.crisis_policy:
            passages = [
                p for p in self.store.search(user_text, k=3, language=req.locale) if p.score >= _RAG_MIN_SCORE
            ]
            if passages:
                block = "\n\n".join(
                    f"[{i + 1}] {p.doc.title} ({p.doc.publisher or 'MindBridge library'}):\n{p.text[:900]}"
                    for i, p in enumerate(passages)
                )
                system += policies.RAG_ADDENDUM.format(passages=block)
                seen: set[str] = set()
                for p in passages:
                    if p.doc.id not in seen:
                        seen.add(p.doc.id)
                        sources.append(
                            SourceRef(title=p.doc.title, publisher=p.doc.publisher, url=p.doc.source_url)
                        )
        if req.first_name:
            system += f"\nThe person's preferred first name is {sanitise_user_text(req.first_name)[:40]}."

        messages = [{"role": t.role, "content": sanitise_user_text(t.content)} for t in req.history[-12:]]
        messages.append({"role": "user", "content": f"<<<USER\n{user_text}\nUSER>>>"})

        try:
            async with self._sem:
                result = await self.provider.generate(
                    system=system, messages=messages, max_tokens=self.max_tokens
                )
        except ProviderError:
            metrics.inc("support.provider_errors")
            latency = int((time.monotonic() - started) * 1000)
            return SupportResponse(
                reply=templates.fallback(assessment.crisis_mode, has_resources),
                safety=assessment,
                meta=self._meta(latency_ms=latency, fallback_used=True),
            )

        allowed_numbers = [n for r in req.crisis_resources for n in (r.phone, r.sms) if n]
        allowed_urls = [str(r.url) for r in req.crisis_resources if r.url] + [s.url for s in sources if s.url]
        guard = check_output(result.text, allowed_numbers, allowed_urls)
        reply = guard.text
        fallback_used = False
        if guard.unusable:
            reply = templates.fallback(assessment.crisis_mode, has_resources)
            fallback_used = True
            metrics.inc("support.output_guard_fallbacks")
        if guard.actions:
            metrics.inc("support.output_guard_actions", len(guard.actions))

        latency = int((time.monotonic() - started) * 1000)
        metrics.observe("support", latency, result.input_tokens, result.output_tokens)
        return SupportResponse(
            reply=reply,
            safety=assessment,
            meta=self._meta(
                model=result.model,
                input_tokens=result.input_tokens,
                output_tokens=result.output_tokens,
                latency_ms=latency,
                is_mock=result.is_mock,
                fallback_used=fallback_used,
                output_guard_actions=guard.actions,
                sources=sources,
            ),
        )

    async def summarize(self, req: SummarizeRequest) -> SummarizeResponse:
        started = time.monotonic()
        system = (
            policies.SUMMARY_SYSTEM if req.audience == "patient" else policies.PROFESSIONAL_SUMMARY_SYSTEM
        )
        transcript = "\n".join(f"{t.role.upper()}: {sanitise_user_text(t.content)}" for t in req.history)
        try:
            async with self._sem:
                result = await self.provider.generate(
                    system=system,
                    messages=[{"role": "user", "content": f"<<<CONVERSATION\n{transcript}\nCONVERSATION>>>"}],
                    max_tokens=400,
                    temperature=0.2,
                )
        except ProviderError:
            metrics.inc("summary.provider_errors")
            raise
        guard = check_output(result.text, [], [])
        latency = int((time.monotonic() - started) * 1000)
        metrics.observe("summary", latency, result.input_tokens, result.output_tokens)
        return SummarizeResponse(
            summary=guard.text
            if not guard.unusable
            else "A summary could not be produced safely for this conversation.",
            meta=self._meta(
                model=result.model,
                input_tokens=result.input_tokens,
                output_tokens=result.output_tokens,
                latency_ms=latency,
                is_mock=result.is_mock,
                output_guard_actions=guard.actions,
            ),
        )
