from __future__ import annotations

from app.config import Settings
from app.providers.base import LLMProvider
from app.providers.mock import MockProvider
from app.providers.remote import AnthropicProvider, OllamaProvider, OpenAICompatibleProvider


def build_provider(s: Settings) -> LLMProvider:
    if s.ai_provider == "mock":
        return MockProvider()
    kwargs = {
        "model": s.ai_model,
        "api_key": s.ai_api_key.get_secret_value(),
        "base_url": s.ai_base_url,
        "timeout": s.ai_provider_timeout_seconds,
        "retries": s.ai_provider_max_retries,
    }
    if s.ai_provider == "openai_compatible":
        return OpenAICompatibleProvider(**kwargs)  # type: ignore[arg-type]
    if s.ai_provider == "anthropic":
        return AnthropicProvider(**kwargs)  # type: ignore[arg-type]
    return OllamaProvider(**kwargs)  # type: ignore[arg-type]
