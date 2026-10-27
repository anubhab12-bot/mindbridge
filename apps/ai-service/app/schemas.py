"""Strict request/response contracts between the NestJS API and the AI service."""

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class RiskLevel(StrEnum):
    NONE = "NONE"
    LOW = "LOW"
    ELEVATED = "ELEVATED"
    HIGH = "HIGH"
    IMMINENT = "IMMINENT"

    @property
    def rank(self) -> int:
        return ["NONE", "LOW", "ELEVATED", "HIGH", "IMMINENT"].index(self.value)


class ChatTurn(Strict):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=8000)


class CrisisResource(Strict):
    """A verified resource supplied by the API from the admin-maintained registry."""

    name: str = Field(max_length=120)
    service_type: str = Field(max_length=40)
    phone: str | None = Field(default=None, max_length=40)
    sms: str | None = Field(default=None, max_length=40)
    url: HttpUrl | None = None
    availability: str = Field(default="", max_length=120)
    languages: list[str] = Field(default_factory=list, max_length=30)


class SupportRequest(Strict):
    session_ref: str = Field(max_length=64, description="Opaque, non-identifying conversation reference")
    user_message: str = Field(min_length=1, max_length=4000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=20)
    locale: str = Field(default="en", max_length=10)
    country: str = Field(default="IN", min_length=2, max_length=2)
    first_name: str | None = Field(default=None, max_length=40)
    crisis_resources: list[CrisisResource] = Field(default_factory=list, max_length=20)
    rag_enabled: bool = True


class SafetyAssessment(Strict):
    risk_level: RiskLevel
    crisis_mode: bool
    signals: list[str]
    show_human_support: bool
    ask_safety_question: bool
    classifier: str
    classifier_degraded: bool = False


class SourceRef(Strict):
    title: str
    publisher: str | None = None
    url: str | None = None


class AiMeta(Strict):
    provider: str
    model: str
    prompt_version: str
    policy_version: str
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: int = 0
    is_mock: bool
    fallback_used: bool = False
    output_guard_actions: list[str] = Field(default_factory=list)
    sources: list[SourceRef] = Field(default_factory=list)


class SupportResponse(Strict):
    reply: str
    safety: SafetyAssessment
    meta: AiMeta


class SummarizeRequest(Strict):
    session_ref: str = Field(max_length=64)
    history: list[ChatTurn] = Field(min_length=1, max_length=60)
    audience: Literal["patient", "professional"] = "patient"


class SummarizeResponse(Strict):
    summary: str
    meta: AiMeta


class ScreenRequest(Strict):
    text: str = Field(min_length=1, max_length=8000)


class DoctorTask(StrEnum):
    SUMMARIZE_INTAKE = "SUMMARIZE_INTAKE"
    SUMMARIZE_AUTHORIZED_CONVERSATION = "SUMMARIZE_AUTHORIZED_CONVERSATION"
    DRAFT_NOTE = "DRAFT_NOTE"
    ORGANIZE_CONCERNS = "ORGANIZE_CONCERNS"
    SUGGEST_QUESTIONS = "SUGGEST_QUESTIONS"
    PATIENT_EDUCATION = "PATIENT_EDUCATION"
    FOLLOW_UP_REMINDER = "FOLLOW_UP_REMINDER"
    ADMIN_DOCUMENTATION = "ADMIN_DOCUMENTATION"


class DoctorAssistRequest(Strict):
    task: DoctorTask
    professional_category: str = Field(max_length=40)
    instructions: str | None = Field(default=None, max_length=2000)
    # Only context the API has already authorized (care relationship + patient consent).
    context: dict[str, str] = Field(default_factory=dict, max_length=10)


class DoctorAssistResponse(Strict):
    draft: str
    label: Literal["AI_DRAFT_REQUIRES_PROFESSIONAL_REVIEW"] = "AI_DRAFT_REQUIRES_PROFESSIONAL_REVIEW"
    warnings: list[str]
    meta: AiMeta


class KnowledgeDocument(Strict):
    id: str = Field(max_length=64)
    title: str = Field(max_length=200)
    body: str = Field(max_length=50000)
    language: str = Field(default="en", max_length=10)
    publisher: str | None = Field(default=None, max_length=200)
    source_url: str | None = Field(default=None, max_length=500)
    published_at: str | None = Field(default=None, max_length=40)
    reviewed_at: str | None = Field(default=None, max_length=40)
    tags: list[str] = Field(default_factory=list, max_length=20)


class KnowledgeSyncRequest(Strict):
    documents: list[KnowledgeDocument] = Field(max_length=2000)
