"""In-process counters for AI usage, errors, latency and tokens. Contains no message content."""

from __future__ import annotations

import threading
from collections import defaultdict
from typing import Any


class Metrics:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.counters: dict[str, int] = defaultdict(int)
        self.latency_ms_total: dict[str, int] = defaultdict(int)

    def inc(self, key: str, n: int = 1) -> None:
        with self._lock:
            self.counters[key] += n

    def observe(self, endpoint: str, latency_ms: int, input_tokens: int, output_tokens: int) -> None:
        with self._lock:
            self.counters[f"{endpoint}.requests"] += 1
            self.counters["tokens.input"] += input_tokens
            self.counters["tokens.output"] += output_tokens
            self.latency_ms_total[endpoint] += latency_ms

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            avg = {
                k: round(v / max(self.counters.get(f"{k}.requests", 1), 1))
                for k, v in self.latency_ms_total.items()
            }
            return {"counters": dict(self.counters), "avg_latency_ms": avg}


metrics = Metrics()
