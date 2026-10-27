"""MindBridge AI service. Internal only: every route except /health needs the shared service token."""

from __future__ import annotations

import hmac
import logging
from contextlib import asynccontextmanager
from typing import Annotated, Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from app.config import Settings, get_settings
from app.metrics import metrics
from app.providers.base import ProviderError
from app.providers.factory import build_provider
from app.rag.store import InMemoryVectorStore
from app.safety import rules
from app.safety.classifier import KeywordRiskClassifier, ProviderRiskClassifier, RiskClassifier
from app.safety.decision import POLICY_VERSION, decide
from app.schemas import (
    DoctorAssistRequest,
    DoctorAssistResponse,
    KnowledgeSyncRequest,
    SafetyAssessment,
    ScreenRequest,
    SummarizeRequest,
    SummarizeResponse,
    SupportRequest,
    SupportResponse,
)
from app.services.doctor_assist import DoctorAssistService
from app.services.support import SupportService


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        import json

        payload: dict[str, Any] = {
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        for key in ("risk", "signals", "endpoint", "status"):
            if hasattr(record, key):
                payload[key] = getattr(record, key)
        return json.dumps(payload)


def _configure_logging(level: str) -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(_JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)
    # httpx logs full URLs; keep it quiet so nothing request-specific leaks into logs.
    logging.getLogger("httpx").setLevel(logging.WARNING)


class Container:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.provider = build_provider(settings)
        self.store = InMemoryVectorStore()
        self.classifier: RiskClassifier = (
            ProviderRiskClassifier(self.provider)
            if settings.ai_risk_classifier == "provider"
            else KeywordRiskClassifier()
        )
        self.support = SupportService(
            self.provider,
            self.classifier,
            self.store,
            settings.ai_max_output_tokens,
            settings.ai_max_concurrency,
        )
        self.doctor = DoctorAssistService(self.provider)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    _configure_logging(settings.ai_log_level)
    container = Container(settings)

    @asynccontextmanager
    async def lifespan(_: FastAPI):  # type: ignore[no-untyped-def]
        yield

    is_prod = settings.environment == "production"
    app = FastAPI(
        title="MindBridge AI service",
        version="1.0.0",
        lifespan=lifespan,
        docs_url=None if is_prod else "/docs",
        redoc_url=None,
        openapi_url=None if is_prod else "/openapi.json",
    )
    app.state.container = container

    def require_token(authorization: Annotated[str | None, Header()] = None) -> None:
        expected = f"Bearer {settings.ai_service_token.get_secret_value()}"
        if not authorization or not hmac.compare_digest(authorization.encode(), expected.encode()):
            raise HTTPException(status_code=401, detail="unauthorized")

    Auth = Depends(require_token)

    @app.exception_handler(ProviderError)
    async def _provider_error(_: Request, exc: ProviderError) -> JSONResponse:
        metrics.inc("provider_errors")
        return JSONResponse(status_code=503, content={"detail": "ai_provider_unavailable"})

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/v1/health/provider", dependencies=[Auth])
    async def provider_health() -> dict[str, Any]:
        ok = await container.provider.health()
        return {
            "provider": container.provider.name,
            "model": container.provider.model,
            "is_mock": container.provider.is_mock,
            "healthy": ok,
            "rules_version": rules.RULES_VERSION,
            "policy_version": POLICY_VERSION,
            "knowledge_chunks": container.store.count(),
        }

    @app.post("/v1/support/respond", response_model=SupportResponse, dependencies=[Auth])
    async def support_respond(req: SupportRequest) -> SupportResponse:
        return await container.support.respond(req)

    @app.post("/v1/support/summarize", response_model=SummarizeResponse, dependencies=[Auth])
    async def support_summarize(req: SummarizeRequest) -> SummarizeResponse:
        return await container.support.summarize(req)

    @app.post("/v1/safety/screen", response_model=SafetyAssessment, dependencies=[Auth])
    async def safety_screen(req: ScreenRequest) -> SafetyAssessment:
        assessment, _ = decide(await container.classifier.classify(req.text))
        return assessment

    @app.post("/v1/doctor/assist", response_model=DoctorAssistResponse, dependencies=[Auth])
    async def doctor_assist(req: DoctorAssistRequest) -> DoctorAssistResponse:
        return await container.doctor.assist(req)

    @app.post("/v1/knowledge/sync", dependencies=[Auth])
    async def knowledge_sync(req: KnowledgeSyncRequest) -> dict[str, int]:
        chunks = container.store.replace_all(req.documents)
        return {"documents": len(req.documents), "chunks": chunks}

    @app.get("/v1/metrics", dependencies=[Auth])
    async def get_metrics() -> dict[str, Any]:
        return metrics.snapshot()

    return app
