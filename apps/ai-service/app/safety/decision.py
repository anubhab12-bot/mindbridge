"""Safety decision layer, separate from the generative model.

Combines classifier outputs into one assessment and decides how the reply is produced:

* IMMINENT / HIGH  -> deterministic, reviewed crisis template (no LLM text), resources, human support
* third party      -> deterministic guidance for helping someone else
* ELEVATED         -> LLM reply under the crisis-aware policy + output guard, resources shown
* LOW / NONE       -> ordinary supportive reply

Risk scores never drive clinical decisions; they only select a safer response path and what
the UI shows. Escalation is one-way: nothing downstream can lower the level decided here.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.safety.classifier import Classification
from app.schemas import RiskLevel, SafetyAssessment

POLICY_VERSION = "safety-policy-2026.10.27"


@dataclass(frozen=True)
class ResponsePlan:
    use_template: str | None  # "imminent" | "high" | "third_party" | "data_request" | None
    crisis_policy: bool


def decide(c: Classification) -> tuple[SafetyAssessment, ResponsePlan]:
    level = c.level
    crisis_mode = level.rank >= RiskLevel.ELEVATED.rank
    assessment = SafetyAssessment(
        risk_level=level,
        crisis_mode=crisis_mode,
        signals=c.signals,
        show_human_support=crisis_mode
        or (
            level.rank >= RiskLevel.LOW.rank
            and any(s not in ("topic_mention", "negated_mention") for s in c.signals)
        ),
        ask_safety_question=level.rank >= RiskLevel.HIGH.rank and not c.third_party,
        classifier=c.source,
        classifier_degraded=c.degraded,
    )
    if level == RiskLevel.IMMINENT:
        return assessment, ResponsePlan("imminent", True)
    if level == RiskLevel.HIGH:
        return assessment, ResponsePlan("high", True)
    if c.third_party and level.rank <= RiskLevel.ELEVATED.rank:
        return assessment, ResponsePlan("third_party", True)
    if c.data_request and level.rank <= RiskLevel.LOW.rank:
        return assessment, ResponsePlan("data_request", False)
    return assessment, ResponsePlan(None, level == RiskLevel.ELEVATED)
