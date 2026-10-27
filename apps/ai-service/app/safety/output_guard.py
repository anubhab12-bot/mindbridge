"""Post-generation checks on model output.

The system prompt asks the model to follow the policy; this guard enforces the parts that can be
checked mechanically. Offending sentences are removed (not rewritten), and if too little remains
the caller falls back to a reviewed template. Every action is reported in metadata.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

_DIAGNOSIS = re.compile(
    r"\b(?:you|it\s+sounds\s+like\s+you|this\s+(?:sounds|seems)\s+like\s+you)\s+(?:have|might\s+have|may\s+have|probably\s+have|likely\s+have|are\s+suffering\s+from|suffer\s+from|are\s+experiencing\s+(?:clinical|major))\s+"
    r"(?:clinical\s+|major\s+|severe\s+|an?\s+)?(?:depression|depressive\s+disorder|bipolar|bpd|borderline|ptsd|ocd|adhd|schizophrenia|psychosis|(?:generali[sz]ed\s+)?anxiety\s+disorder|panic\s+disorder|eating\s+disorder|personality\s+disorder|mental\s+(?:illness|disorder))\b",
    re.I,
)
_DIAGNOSIS_2 = re.compile(
    r"\b(?:i\s+(?:diagnose|think\s+you\s+have)|your\s+diagnosis\s+is|you\s+are\s+(?:clinically\s+)?depressed|you(?:'re|\s+are)\s+bipolar)\b",
    re.I,
)

_DRUGS = (
    r"sertraline|fluoxetine|escitalopram|citalopram|paroxetine|venlafaxine|duloxetine|mirtazapine|bupropion|amitriptyline|"
    r"alprazolam|xanax|lorazepam|ativan|clonazepam|klonopin|diazepam|valium|zolpidem|lithium|quetiapine|olanzapine|"
    r"risperidone|aripiprazole|lamotrigine|valproate|melatonin|antidepressants?|benzodiazepines?|ssris?|sleeping\s+pills"
)
_MEDICATION = re.compile(
    rf"\b(?:\d+(?:\.\d+)?\s?(?:mg|milligrams?|mcg|ml)\b|(?:take|try|start|stop|quit|discontinue|increase|decrease|reduce|double|skip|switch(?:\s+to)?)\s+(?:taking\s+)?(?:your\s+|some\s+|the\s+|a\s+)?(?:{_DRUGS}|medications?|meds|dose|dosage|pills|tablets)\b|\b(?:{_DRUGS})\b[^.!?]{{0,40}}\b(?:would\s+help|should\s+help|is\s+good\s+for|works?\s+well|you\s+should|recommend))",
    re.I,
)
_IDENTITY = re.compile(
    r"\bi(?:'m|\s+am)\s+(?:a\s+|your\s+|an?\s+actual\s+|a\s+real\s+)?(?:licensed\s+|qualified\s+)?(?:therapist|psychiatrist|psychologist|doctor|counsell?or|human|real\s+person|person)\b",
    re.I,
)
_DEPENDENCY = re.compile(
    r"\b(?:i(?:'m|\s+am)\s+(?:the\s+only\s+one|all\s+you\s+need)|only\s+i\s+(?:can\s+)?understand|you\s+don't\s+need\s+(?:anyone|anybody|other\s+people|a\s+therapist|a\s+doctor|professional\s+help)|(?:just\s+)?talk\s+to\s+me\s+instead\s+of|you\s+can\s+rely\s+(?:only\s+)?on\s+me\s+instead|i'll\s+always\s+be\s+here\s+for\s+you,?\s+unlike)\b",
    re.I,
)
_FALSE_PROMISE = re.compile(
    r"\b(?:(?:this|our)\s+(?:conversation|chat)\s+is\s+(?:completely|totally|100%|fully)\s+(?:confidential|private|secret)|i\s+(?:have|'ve|will|'ll)\s+(?:called|contacted|alerted|notified|call|contact|alert|notify)\s+(?:emergency\s+services|the\s+police|an\s+ambulance|someone|your\s+(?:family|doctor))|help\s+is\s+on\s+(?:its|the)\s+way|i\s+guarantee|you\s+will\s+(?:definitely|certainly)\s+(?:feel|get)\s+better)\b",
    re.I,
)
_SHAMING = re.compile(
    r"\b(?:you\s+should\s+be\s+ashamed|that's\s+(?:selfish|stupid|pathetic)|stop\s+being\s+(?:dramatic|weak|lazy)|just\s+get\s+over\s+it|snap\s+out\s+of\s+it)\b",
    re.I,
)
_PHONE = re.compile(r"(?<![\w/])(?:\+?\d[\d\s\-().]{5,}\d)(?![\w/])")
_URL = re.compile(r"https?://[^\s)>\]]+", re.I)
_SENTENCES = re.compile(r"(?<=[.!?])\s+")

MEDICATION_NOTE = "For anything about medication, including starting, stopping or changing it, please speak with a psychiatrist or doctor."


@dataclass
class GuardResult:
    text: str
    actions: list[str] = field(default_factory=list)
    unusable: bool = False


def _digits(s: str) -> str:
    return re.sub(r"\D", "", s)


def check_output(text: str, allowed_numbers: list[str], allowed_urls: list[str]) -> GuardResult:
    actions: list[str] = []
    allowed_digits = {_digits(n) for n in allowed_numbers if n}
    sentences = [s for s in _SENTENCES.split(text.strip()) if s.strip()]
    kept: list[str] = []
    medication_removed = False
    for s in sentences:
        if _DIAGNOSIS.search(s) or _DIAGNOSIS_2.search(s):
            actions.append("removed_diagnosis")
            continue
        if _MEDICATION.search(s):
            actions.append("removed_medication_advice")
            medication_removed = True
            continue
        if _IDENTITY.search(s) and not re.search(
            r"\bnot\s+(?:a\s+)?(?:therapist|psychiatrist|human|doctor|person)\b", s, re.I
        ):
            actions.append("removed_false_identity")
            continue
        if _DEPENDENCY.search(s):
            actions.append("removed_dependency_language")
            continue
        if _FALSE_PROMISE.search(s):
            actions.append("removed_false_promise")
            continue
        if _SHAMING.search(s):
            actions.append("removed_shaming")
            continue

        def _phone(m: re.Match[str]) -> str:
            if _digits(m.group(0)) in allowed_digits or len(_digits(m.group(0))) < 6:
                return m.group(0)
            actions.append("removed_unverified_number")
            return "(see the verified contacts shown in the app)"

        def _url(m: re.Match[str]) -> str:
            url = m.group(0).rstrip(".,;")
            if any(url.startswith(a) for a in allowed_urls):
                return m.group(0)
            actions.append("removed_unverified_link")
            return ""

        s = _URL.sub(_url, _PHONE.sub(_phone, s))
        kept.append(s)

    if medication_removed:
        kept.append(MEDICATION_NOTE)
    out = " ".join(kept).strip()
    original_len = max(len(text.strip()), 1)
    unusable = len(out) < 40 or (len(out) / original_len < 0.35 and len(actions) > 0)
    return GuardResult(out, sorted(set(actions)), unusable)
