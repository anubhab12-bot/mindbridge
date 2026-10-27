"""Provider abstraction. Adding a provider means implementing `generate`; nothing else changes."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Protocol

import httpx


class ProviderError(Exception):
    """Raised for timeouts, transport errors, bad responses and exhausted retries."""


@dataclass
class ProviderResult:
    text: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0
    is_mock: bool = False


class LLMProvider(Protocol):
    name: str
    model: str
    is_mock: bool

    async def generate(
        self, *, system: str, messages: list[dict[str, str]], max_tokens: int, temperature: float = 0.4
    ) -> ProviderResult: ...

    async def health(self) -> bool: ...


RETRYABLE_STATUS = {408, 409, 425, 429, 500, 502, 503, 504}


async def post_with_retries(
    client: httpx.AsyncClient,
    url: str,
    *,
    json: dict[str, object],
    headers: dict[str, str],
    timeout: float,  # noqa: ASYNC109 - timeout is passed through to httpx per request
    retries: int,
) -> dict[str, object]:
    """POST with a hard timeout and bounded exponential backoff. Never logs request bodies."""
    last: Exception | None = None
    for attempt in range(retries + 1):
        try:
            resp = await client.post(url, json=json, headers=headers, timeout=timeout)
            if resp.status_code in RETRYABLE_STATUS and attempt < retries:
                await asyncio.sleep(0.5 * 2**attempt)
                continue
            if resp.status_code >= 400:
                raise ProviderError(f"provider returned HTTP {resp.status_code}")
            data = resp.json()
            if not isinstance(data, dict):
                raise ProviderError("provider returned an unexpected payload")
            return data
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            last = exc
            if attempt < retries:
                await asyncio.sleep(0.5 * 2**attempt)
                continue
        except ValueError as exc:
            raise ProviderError("provider returned invalid JSON") from exc
    raise ProviderError(f"provider unavailable: {type(last).__name__ if last else 'unknown'}")
