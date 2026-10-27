import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.providers.base import ProviderError
from app.providers.remote import OpenAICompatibleProvider
from tests.conftest import TOKEN

AUTH = {"Authorization": f"Bearer {TOKEN}"}


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app(Settings(AI_SERVICE_TOKEN=TOKEN, AI_PROVIDER="mock")))  # type: ignore[call-arg]


def test_health_is_public(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "ok"}


def test_routes_require_service_token(client: TestClient) -> None:
    r = client.post("/v1/support/respond", json={"session_ref": "x", "user_message": "hi"})
    assert r.status_code == 401
    r = client.post(
        "/v1/support/respond",
        json={"session_ref": "x", "user_message": "hi"},
        headers={"Authorization": "Bearer wrong"},
    )
    assert r.status_code == 401


def test_support_respond_roundtrip(client: TestClient) -> None:
    r = client.post(
        "/v1/support/respond", headers=AUTH, json={"session_ref": "x", "user_message": "I feel lonely"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["meta"]["is_mock"] is True
    assert body["safety"]["risk_level"] == "NONE"


def test_strict_schema_rejects_unknown_fields(client: TestClient) -> None:
    r = client.post(
        "/v1/support/respond",
        headers=AUTH,
        json={"session_ref": "x", "user_message": "hi", "patient_id": "123"},
    )
    assert r.status_code == 422


def test_screen_endpoint(client: TestClient) -> None:
    r = client.post("/v1/safety/screen", headers=AUTH, json={"text": "I want to end my life"})
    assert r.json()["risk_level"] == "HIGH"


def test_doctor_assist_is_labelled_draft(client: TestClient) -> None:
    r = client.post(
        "/v1/doctor/assist",
        headers=AUTH,
        json={
            "task": "SUMMARIZE_INTAKE",
            "professional_category": "CLINICAL_PSYCHOLOGIST",
            "context": {"intake": "Main concerns: trouble sleeping for 3 weeks."},
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["label"] == "AI_DRAFT_REQUIRES_PROFESSIONAL_REVIEW"
    assert any("Review" in w for w in body["warnings"])


def test_knowledge_sync_and_rag_sources(client: TestClient) -> None:
    docs = [
        {
            "id": "d1",
            "title": "Box breathing",
            "publisher": "MindBridge editorial (reviewed)",
            "source_url": "https://example.org/box-breathing",
            "body": "Box breathing is a simple breathing technique. Breathe in for four counts, hold for four, "
            "breathe out for four and hold for four. It can help some people feel calmer when anxious.",
        }
    ]
    assert client.post("/v1/knowledge/sync", headers=AUTH, json={"documents": docs}).json()["chunks"] >= 1
    r = client.post(
        "/v1/support/respond",
        headers=AUTH,
        json={"session_ref": "x", "user_message": "what is box breathing technique?"},
    )
    assert r.json()["meta"]["sources"][0]["title"] == "Box breathing"


def test_production_refuses_mock_provider() -> None:
    with pytest.raises(ValueError):
        Settings(AI_SERVICE_TOKEN=TOKEN, AI_PROVIDER="mock", NODE_ENV="production")  # type: ignore[call-arg]


def test_real_provider_requires_model() -> None:
    with pytest.raises(ValueError):
        Settings(AI_SERVICE_TOKEN=TOKEN, AI_PROVIDER="anthropic", AI_API_KEY="k")  # type: ignore[call-arg]


async def test_openai_adapter_times_out_and_retries() -> None:
    calls = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        raise httpx.ReadTimeout("timeout", request=request)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = OpenAICompatibleProvider(
        model="m", api_key="k", base_url="https://llm.example", timeout=0.1, retries=1, client=client
    )
    with pytest.raises(ProviderError):
        await provider.generate(system="s", messages=[{"role": "user", "content": "hi"}], max_tokens=10)
    assert calls["n"] == 2


async def test_openai_adapter_parses_response() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["authorization"] == "Bearer k"
        return httpx.Response(
            200,
            json={
                "choices": [{"message": {"content": "Hello"}}],
                "usage": {"prompt_tokens": 5, "completion_tokens": 1},
            },
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = OpenAICompatibleProvider(
        model="m", api_key="k", base_url="https://llm.example", timeout=1, retries=0, client=client
    )
    result = await provider.generate(system="s", messages=[{"role": "user", "content": "hi"}], max_tokens=10)
    assert result.text == "Hello" and result.input_tokens == 5 and result.is_mock is False


async def test_provider_5xx_is_error() -> None:
    client = httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(500, json={})))
    provider = OpenAICompatibleProvider(
        model="m", api_key="k", base_url="https://llm.example", timeout=1, retries=0, client=client
    )
    with pytest.raises(ProviderError):
        await provider.generate(system="s", messages=[{"role": "user", "content": "hi"}], max_tokens=10)
