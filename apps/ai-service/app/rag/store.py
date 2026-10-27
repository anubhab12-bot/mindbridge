"""Pluggable vector store for the curated wellness knowledge base.

The default `InMemoryVectorStore` uses hashed bag-of-words TF-IDF vectors (no external model or
service), which is enough for a small curated library. A production deployment can implement
`VectorStore` against pgvector, Qdrant, Atlas Vector Search, etc. without touching callers.
The store only ever holds admin-published educational content, never patient data.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass
from typing import Protocol

from app.schemas import KnowledgeDocument

_TOKEN = re.compile(r"[a-zऀ-ॿ]{2,}")
_STOP = set(
    "the and for are but not you your with this that have from they was were will what when how can about into "
    "out more some than then them there these those which who why would could should may might our has had its "
    "also just very like feel feeling".split()
)
_DIM = 4096


def _tokens(text: str) -> list[str]:
    return [t for t in _TOKEN.findall(text.lower()) if t not in _STOP]


@dataclass
class Passage:
    doc: KnowledgeDocument
    text: str
    score: float


class VectorStore(Protocol):
    def replace_all(self, docs: list[KnowledgeDocument]) -> int: ...
    def search(self, query: str, k: int, language: str | None = None) -> list[Passage]: ...
    def count(self) -> int: ...


class InMemoryVectorStore:
    def __init__(self) -> None:
        self._chunks: list[tuple[KnowledgeDocument, str, dict[int, float]]] = []
        self._idf: dict[int, float] = {}

    @staticmethod
    def _chunk(body: str, size: int = 700) -> list[str]:
        paras = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
        chunks: list[str] = []
        buf = ""
        for p in paras:
            if len(buf) + len(p) > size and buf:
                chunks.append(buf)
                buf = ""
            buf = f"{buf}\n\n{p}".strip()
        if buf:
            chunks.append(buf)
        return chunks or [body[:size]]

    def replace_all(self, docs: list[KnowledgeDocument]) -> int:
        raw: list[tuple[KnowledgeDocument, str, Counter[int]]] = []
        df: Counter[int] = Counter()
        for d in docs:
            for c in self._chunk(f"{d.title}\n\n{d.body}"):
                tf = Counter(hash(t) % _DIM for t in _tokens(c))
                raw.append((d, c, tf))
                df.update(set(tf))
        n = max(len(raw), 1)
        self._idf = {h: math.log((1 + n) / (1 + f)) + 1 for h, f in df.items()}
        self._chunks = [(d, c, self._weigh(tf)) for d, c, tf in raw]
        return len(self._chunks)

    def _weigh(self, tf: Counter[int]) -> dict[int, float]:
        vec = {h: (1 + math.log(f)) * self._idf.get(h, 1.0) for h, f in tf.items()}
        norm = math.sqrt(sum(v * v for v in vec.values())) or 1.0
        return {h: v / norm for h, v in vec.items()}

    def search(self, query: str, k: int, language: str | None = None) -> list[Passage]:
        q = self._weigh(Counter(hash(t) % _DIM for t in _tokens(query)))
        scored = []
        for d, c, v in self._chunks:
            if language and d.language != language:
                continue
            score = sum(w * v.get(h, 0.0) for h, w in q.items())
            if score > 0:
                scored.append(Passage(d, c, score))
        return sorted(scored, key=lambda p: p.score, reverse=True)[:k]

    def count(self) -> int:
        return len(self._chunks)
