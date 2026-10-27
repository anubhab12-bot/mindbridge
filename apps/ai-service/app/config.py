"""Validated configuration. Every provider setting comes from the environment; nothing is hardcoded."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../../.env"), extra="ignore")

    ai_service_token: SecretStr = Field(alias="AI_SERVICE_TOKEN", min_length=32)
    ai_provider: Literal["mock", "openai_compatible", "anthropic", "ollama"] = Field(
        default="mock", alias="AI_PROVIDER"
    )
    ai_model: str = Field(default="", alias="AI_MODEL")
    ai_api_key: SecretStr = Field(default=SecretStr(""), alias="AI_API_KEY")
    ai_base_url: str = Field(default="", alias="AI_BASE_URL")
    ai_provider_timeout_seconds: float = Field(default=15.0, alias="AI_PROVIDER_TIMEOUT_SECONDS", gt=0, le=120)
    ai_provider_max_retries: int = Field(default=1, alias="AI_PROVIDER_MAX_RETRIES", ge=0, le=3)
    ai_max_output_tokens: int = Field(default=600, alias="AI_MAX_OUTPUT_TOKENS", ge=64, le=4000)
    ai_risk_classifier: Literal["keyword", "provider"] = Field(default="keyword", alias="AI_RISK_CLASSIFIER")
    ai_rag_enabled: bool = Field(default=True, alias="AI_RAG_ENABLED")
    ai_max_concurrency: int = Field(default=16, alias="AI_MAX_CONCURRENCY", ge=1, le=256)
    ai_log_level: str = Field(default="INFO", alias="AI_LOG_LEVEL")
    environment: str = Field(default="development", alias="NODE_ENV")

    @model_validator(mode="after")
    def _check_provider(self) -> "Settings":
        if self.ai_provider != "mock" and not self.ai_model:
            raise ValueError("AI_MODEL is required when AI_PROVIDER is not 'mock'")
        if self.ai_provider in ("openai_compatible", "anthropic") and not self.ai_api_key.get_secret_value():
            if self.ai_provider == "anthropic" or not self.ai_base_url:
                raise ValueError("AI_API_KEY is required for this provider")
        if self.ai_provider == "ollama" and not self.ai_base_url:
            raise ValueError("AI_BASE_URL is required for the ollama provider")
        if self.environment == "production" and self.ai_provider == "mock":
            raise ValueError("The mock provider must not be used in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
