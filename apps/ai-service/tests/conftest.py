import os

import pytest

os.environ.setdefault("AI_SERVICE_TOKEN", "test-ai-service-token-0123456789-abcdefghijk")
os.environ.setdefault("AI_PROVIDER", "mock")

from app.providers.base import ProviderError, ProviderResult  # noqa: E402
from app.rag.store import InMemoryVectorStore  # noqa: E402
from app.safety.classifier import KeywordRiskClassifier  # noqa: E402
from app.schemas import CrisisResource  # noqa: E402
from app.services.support import SupportService  # noqa: E402

TOKEN = os.environ["AI_SERVICE_TOKEN"]


class ScriptedProvider:
    """Returns a fixed reply (or raises) so tests can exercise the guard and fallback paths."""

    name = "scripted"
    model = "scripted-test"
    is_mock = False

    def __init__(self, reply: str = "", fail: bool = False) -> None:
        self.reply = reply
        self.fail = fail
        self.calls = 0

    async def generate(
        self, *, system: str, messages: list[dict[str, str]], max_tokens: int, temperature: float = 0.4
    ) -> ProviderResult:
        self.calls += 1
        self.last_system = system
        self.last_messages = messages
        if self.fail:
            raise ProviderError("provider unavailable: TimeoutException")
        return ProviderResult(self.reply, self.model, 10, 20)

    async def health(self) -> bool:
        return not self.fail


@pytest.fixture
def resources() -> list[CrisisResource]:
    return [
        CrisisResource(
            name="Tele-MANAS",
            service_type="MENTAL_HEALTH_HELPLINE",
            phone="14416",
            url="https://telemanas.mohfw.gov.in/",
            availability="24x7",
        ),
        CrisisResource(
            name="Emergency Response Support System",
            service_type="EMERGENCY",
            phone="112",
            availability="24x7",
        ),
    ]


def make_service(provider: ScriptedProvider) -> SupportService:
    return SupportService(provider, KeywordRiskClassifier(), InMemoryVectorStore(), 400, 4)
