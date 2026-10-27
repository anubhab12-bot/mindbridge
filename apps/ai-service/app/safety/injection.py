"""Prompt-injection screening for user-supplied text.

User text is always passed to the model inside a clearly delimited data block, so injection
detection is not what keeps the model on-policy; it is used to log the attempt and to strip
fake role markers that could confuse a provider's chat template.
"""

import re

_PATTERNS = [
    r"\bignore\s+(?:all\s+|any\s+)?(?:previous|prior|above|earlier|your)\s+(?:instructions|rules|prompts?|guidelines)\b",
    r"\bdisregard\s+(?:all\s+|the\s+)?(?:previous|prior|above|system)\b",
    r"\b(?:reveal|show|print|repeat|output)\s+(?:me\s+)?(?:your|the)\s+(?:system\s+)?(?:prompt|instructions|rules)\b",
    r"\byou\s+are\s+now\s+(?:a|an|my|in)\b",
    r"\b(?:developer|god|jailbreak|dan)\s+mode\b",
    r"\bpretend\s+(?:to\s+be|you\s+are)\s+(?:a|an|my)\s+(?:doctor|psychiatrist|therapist|human)\b",
    r"\bact\s+as\s+(?:a|an|my)\s+(?:doctor|psychiatrist|therapist)\b",
    r"\bnew\s+instructions\s*:",
    r"</?\s*(?:system|assistant|developer|tool)\s*>",
    r"^\s*(?:system|assistant)\s*:",
]
_COMPILED = [re.compile(p, re.IGNORECASE | re.MULTILINE) for p in _PATTERNS]
_ROLE_MARKERS = re.compile(
    r"</?\s*(?:system|assistant|developer|tool|user)\s*>|^\s*(?:system|assistant|developer)\s*:", re.I | re.M
)


def detect_injection(text: str) -> bool:
    return any(p.search(text) for p in _COMPILED)


def sanitise_user_text(text: str) -> str:
    """Removes fake role markers and control characters; keeps the user's words otherwise intact."""
    cleaned = _ROLE_MARKERS.sub(" ", text)
    cleaned = "".join(ch for ch in cleaned if ch == "\n" or ch == "\t" or ord(ch) >= 32)
    return cleaned.replace("<<<", "‹‹‹").replace(">>>", "›››").strip()
