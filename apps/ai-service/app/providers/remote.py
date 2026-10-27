"""HTTP adapters for real providers. Keys stay on the server; URLs and model names come from config."""

from __future__ import annotations

from typing import Any

import httpx

from app.providers.base import ProviderError, ProviderResult, post_with_retries


class _HttpProvider:
    is_mock = False

    def __init__(
        self,
        *,
        model: str,
        api_key: str,
        base_url: str,
        timeout: float,
        retries: int,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.model = model
        self._key = api_key
        self._base = base_url.rstrip("/")
        self._timeout = timeout
        self._retries = retries
        self._client = client or httpx.AsyncClient()

    async def generate(
        self, *, system: str, messages: list[dict[str, str]], max_tokens: int, temperature: float = 0.4
    ) -> ProviderResult:
        raise NotImplementedError

    async def health(self) -> bool:
        try:
            await self.generate(
                system="Reply with OK.", messages=[{"role": "user", "content": "ping"}], max_tokens=5
            )
            return True
        except ProviderError:
            return False


class OpenAICompatibleProvider(_HttpProvider):
    """Any `/v1/chat/completions` compatible endpoint (hosted or self-hosted such as vLLM)."""

    name = "openai_compatible"

    async def generate(
        self, *, system: str, messages: list[dict[str, str]], max_tokens: int, temperature: float = 0.4
    ) -> ProviderResult:
        base = self._base or "https://api.openai.com"
        headers = {"Content-Type": "application/json"}
        if self._key:
            headers["Authorization"] = f"Bearer {self._key}"
        data = await post_with_retries(
            self._client,
            f"{base}/v1/chat/completions",
            json={
                "model": self.model,
                "messages": [{"role": "system", "content": system}, *messages],
                "max_tokens": max_tokens,
                "temperature": temperature,
            },
            headers=headers,
            timeout=self._timeout,
            retries=self._retries,
        )
        try:
            choices: list[Any] = data["choices"]  # type: ignore[assignment]
            text = str(choices[0]["message"]["content"] or "")
            usage: dict[str, Any] = data.get("usage") or {}  # type: ignore[assignment]
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderError("unexpected response shape") from exc
        return ProviderResult(
            text.strip(),
            self.model,
            int(usage.get("prompt_tokens", 0)),
            int(usage.get("completion_tokens", 0)),
        )


class AnthropicProvider(_HttpProvider):
    name = "anthropic"

    async def generate(
        self, *, system: str, messages: list[dict[str, str]], max_tokens: int, temperature: float = 0.4
    ) -> ProviderResult:
        base = self._base or "https://api.anthropic.com"
        data = await post_with_retries(
            self._client,
            f"{base}/v1/messages",
            json={
                "model": self.model,
                "system": system,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            },
            headers={
                "x-api-key": self._key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            timeout=self._timeout,
            retries=self._retries,
        )
        try:
            blocks: list[Any] = data["content"]  # type: ignore[assignment]
            text = "".join(str(b.get("text", "")) for b in blocks if b.get("type") == "text")
            usage: dict[str, Any] = data.get("usage") or {}  # type: ignore[assignment]
        except (KeyError, TypeError) as exc:
            raise ProviderError("unexpected response shape") from exc
        return ProviderResult(
            text.strip(), self.model, int(usage.get("input_tokens", 0)), int(usage.get("output_tokens", 0))
        )


class OllamaProvider(_HttpProvider):
    """Optional local model via Ollama's `/api/chat`."""

    name = "ollama"

    async def generate(
        self, *, system: str, messages: list[dict[str, str]], max_tokens: int, temperature: float = 0.4
    ) -> ProviderResult:
        data = await post_with_retries(
            self._client,
            f"{self._base}/api/chat",
            json={
                "model": self.model,
                "stream": False,
                "messages": [{"role": "system", "content": system}, *messages],
                "options": {"num_predict": max_tokens, "temperature": temperature},
            },
            headers={"Content-Type": "application/json"},
            timeout=self._timeout,
            retries=self._retries,
        )
        try:
            msg: dict[str, Any] = data["message"]  # type: ignore[assignment]
            text = str(msg.get("content", ""))
        except (KeyError, TypeError) as exc:
            raise ProviderError("unexpected response shape") from exc
        return ProviderResult(
            text.strip(),
            self.model,
            int(str(data.get("prompt_eval_count", 0) or 0)),
            int(str(data.get("eval_count", 0) or 0)),
        )
