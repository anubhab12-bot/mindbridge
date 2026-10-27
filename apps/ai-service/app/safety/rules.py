"""
Rule-based risk screening.

This layer is deterministic and independent of any language model, so risk detection keeps
working when a provider is slow, unavailable or wrong. It is deliberately conservative: when in
doubt it escalates. It handles common sources of error that keyword lists get wrong:

* idioms ("this traffic is killing me", "dying to see it")         -> removed before matching
* negation ("I would never kill myself")                            -> reduced, unless the phrase is
                                                                        itself a negation ("don't want to live")
* historical statements ("years ago I tried to end my life")       -> reduced, but recent attempts stay high
* third-party concern ("my friend wants to kill herself")          -> helper guidance, not self-risk
* topic mentions ("an essay about suicide prevention")              -> low, informational

Every pattern and threshold here needs review by qualified clinicians before production use.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

from app.schemas import RiskLevel

RULES_VERSION = "rules-2026.10.27"

# --------------------------------------------------------------------------------------------- normalisation

_CONTRACTIONS = {
    r"\bim\b": "i'm",
    r"\bive\b": "i've",
    r"\bdont\b": "don't",
    r"\bcant\b": "can't",
    r"\bwont\b": "won't",
    r"\bwanna\b": "want to",
    r"\bgonna\b": "going to",
    r"\bkms\b": "kill myself",
    r"\bkys\b": "kill yourself",
    r"\bunalive\b": "kill",
    r"\bsuicidle\b": "suicidal",
    r"\bsewerslide\b": "suicide",
    r"\bsucide\b": "suicide",
    r"\bsuicde\b": "suicide",
    r"\bmy self\b": "myself",
}

# Idioms that contain risk words but are not about harm. Removed before matching.
_IDIOMS = [
    r"\b(?:this|that|it|work|traffic|the heat|my back|these shoes|the wait|the suspense|exams?)\s+(?:is|are)\s+killing\s+me\b",
    r"\bkilling\s+it\b",
    r"\bkill(?:ing)?\s+(?:some\s+)?time\b",
    r"\bcould\s+kill\s+for\s+an?\b",
    r"\bdying\s+to\s+(?:see|know|try|meet|go|watch|hear|eat)\b",
    r"\bdying\s+of\s+(?:laughter|embarrassment|boredom)\b",
    r"\bi(?:'m| am)\s+dead\s*(?:lol|lmao|😂)",
    r"\bdead\s+tired\b",
    r"\bdrop[- ]dead\s+gorgeous\b",
    r"\bsuicide\s+squad\b",
    r"\bshoot\s+me\s+(?:a|an)\s+(?:message|text|email|dm)\b",
    r"\bkill\s+(?:the\s+)?(?:lights|engine|process|app|tab)\b",
    r"\bto\s+die\s+for\b",
    r"\bover\s+my\s+dead\s+body\b",
]

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?;])\s+|\n+|\s+but\s+|\s+however\s+|\s+although\s+")


def normalise(text: str) -> str:
    t = unicodedata.normalize("NFKC", text).lower()
    t = t.replace("’", "'").replace("‘", "'").replace("`", "'")
    t = re.sub(r"[^\S\n]+", " ", t)
    for pattern, repl in _CONTRACTIONS.items():
        t = re.sub(pattern, repl, t)
    for idiom in _IDIOMS:
        t = re.sub(idiom, " ", t)
    return t.strip()


# --------------------------------------------------------------------------------------------- patterns

SELF = r"(?:myself|my\s+(?:own\s+)?life|me)"
INTENT = r"(?:want|wanna|going|plan(?:ning)?|intend(?:ing)?|thinking\s+(?:about|of)|think\s+about|considering|ready|decided|about)"


@dataclass(frozen=True)
class Rule:
    code: str
    level: RiskLevel
    pattern: re.Pattern[str]
    # The phrase itself expresses a wish not to live, so a preceding "don't" is not protective.
    inherently_negative: bool = False


def _r(code: str, level: RiskLevel, pattern: str, inherently_negative: bool = False) -> Rule:
    return Rule(code, level, re.compile(pattern), inherently_negative)


RULES: list[Rule] = [
    # ---- imminent: plan with timing/means, act in progress, goodbye messages, medical emergency
    _r("overdose_in_progress", RiskLevel.IMMINENT,
       r"\bi(?:'ve|\s+have)?\s+(?:just\s+)?(?:took|taken|swallowed|overdosed\s+on)\s+(?:a\s+lot\s+of|all\s+(?:of\s+)?(?:my|the)|too\s+many|a\s+(?:whole|full)\s+(?:bottle|strip|pack)\s+of|\d{2,}|\w+\s+(?:bottles?|strips?|packs?)\s+of)\b"),
    _r("overdose_in_progress", RiskLevel.IMMINENT, r"\bi(?:'ve|\s+have)?\s+(?:just\s+)?overdosed\b"),
    _r("imminent_plan", RiskLevel.IMMINENT,
       rf"\b(?:going\s+to|about\s+to|will|gonna|ready\s+to)\s+(?:kill\s+{SELF}|end\s+(?:it|{SELF}|it\s+all)|take\s+my\s+(?:own\s+)?life|jump|hang\s+myself)\b[^.!?]*\b(?:tonight|today|now|right\s+now|in\s+a\s+(?:few\s+)?(?:minutes?|hours?)|this\s+(?:evening|morning|weekend))\b"),
    _r("imminent_plan", RiskLevel.IMMINENT,
       r"\b(?:tonight|today|right\s+now)\s+(?:i(?:'m|\s+am)\s+going\s+to|i\s+will)\s+(?:kill\s+myself|end\s+it|end\s+my\s+life)\b"),
    _r("at_location_of_means", RiskLevel.IMMINENT,
       r"\bi(?:'m|\s+am)\s+(?:standing\s+)?(?:on|at)\s+(?:the|a)\s+(?:edge|ledge|bridge|roof(?:top)?|railway\s+tracks?|tracks|cliff)\b"),
    _r("has_means_ready", RiskLevel.IMMINENT,
       r"\bi\s+(?:have|got|bought)\s+(?:a|the)\s+(?:gun|rope|noose|knife|blade|pills|poison)\s+(?:ready|with\s+me|right\s+here|in\s+my\s+hand)\b"),
    _r("goodbye_message", RiskLevel.IMMINENT,
       r"\b(?:this\s+is\s+(?:my\s+)?(?:final\s+)?goodbye|goodbye\s+forever|my\s+(?:final|last)\s+(?:message|words|note)|won't\s+be\s+(?:here|alive)\s+(?:tomorrow|much\s+longer))\b"),
    _r("serious_injury", RiskLevel.IMMINENT,
       r"\bi(?:'ve|\s+have)?\s+(?:cut|hurt|stabbed|burned)\s+myself\b[^.!?]*\b(?:bleeding\s+(?:a\s+lot|badly|won't\s+stop)|deep|badly|can't\s+stop\s+the\s+bleeding)\b"),
    _r("harm_to_others_imminent", RiskLevel.IMMINENT,
       r"\b(?:going\s+to|about\s+to|will)\s+(?:kill|shoot|stab|hurt)\s+(?:him|her|them|someone|somebody|people|everyone|my\s+\w+)\b[^.!?]*\b(?:tonight|today|now|right\s+now)\b"),

    # ---- high: active ideation, intent, method seeking, current self-harm
    _r("suicidal_intent", RiskLevel.HIGH,
       rf"\b{INTENT}\s+(?:to\s+|on\s+|of\s+)?(?:kill(?:ing)?\s+{SELF}|end(?:ing)?\s+(?:{SELF}|it\s+all|everything)|tak(?:e|ing)\s+my\s+(?:own\s+)?life|commit(?:ting)?\s+suicide|suicide)\b"),
    _r("suicidal_intent", RiskLevel.HIGH, rf"\b(?:kill\s+myself|end\s+my\s+life|take\s+my\s+own\s+life|commit\s+suicide)\b"),
    _r("suicidal_ideation", RiskLevel.HIGH, r"\bi(?:'m|\s+am|\s+feel|\s+have\s+been|'ve\s+been)\s+(?:so\s+|really\s+|very\s+|feeling\s+)?suicidal\b"),
    _r("suicidal_ideation", RiskLevel.HIGH, r"\b(?:suicidal\s+(?:thoughts?|feelings?|urges?)|thoughts?\s+of\s+(?:suicide|killing\s+myself|ending\s+my\s+life))\b"),
    _r("wish_to_die", RiskLevel.HIGH,
       r"\bi\s+(?:just\s+)?(?:want|wish|wanted)\s+(?:to\s+(?:be\s+)?(?:dead|die)|i\s+(?:was|were)\s+dead|to\s+not\s+(?:be\s+alive|exist|wake\s+up))\b"),
    _r("wish_to_die", RiskLevel.HIGH,
       r"\b(?:don't|do\s+not|no\s+longer)\s+want\s+to\s+(?:be\s+alive|live|exist|wake\s+up|be\s+here(?:\s+anymore)?|go\s+on)\b",
       inherently_negative=True),
    _r("wish_to_die", RiskLevel.HIGH,
       r"\b(?:sleep\s+and\s+never\s+wake\s+up|never\s+wake\s+up\s+again|wish\s+i\s+(?:had\s+never\s+been\s+born|could\s+just\s+die))\b"),
    _r("hopeless_about_living", RiskLevel.HIGH,
       r"\b(?:better\s+off\s+(?:dead|without\s+me)|no\s+(?:reason|point)\s+(?:to|in)\s+(?:live|living|being\s+alive|go\s+on)|nothing\s+(?:left\s+)?to\s+live\s+for|can't\s+go\s+on\s+(?:living|like\s+this|anymore)|end\s+it\s+all|want\s+it\s+(?:all\s+)?to\s+(?:end|be\s+over))\b",
       inherently_negative=True),
    _r("method_seeking", RiskLevel.HIGH,
       r"\b(?:how\s+(?:many|much)\s+\w+(?:\s+\w+)?\s+(?:would|will|does\s+it\s+take\s+to|to)\s+(?:kill|die|overdose)|lethal\s+dose|painless\s+way\s+to\s+die|easiest\s+way\s+to\s+(?:die|kill\s+myself)|how\s+(?:to|do\s+i|can\s+i)\s+(?:kill\s+myself|hang\s+myself|commit\s+suicide|end\s+my\s+life|overdose))\b"),
    _r("self_harm_current", RiskLevel.HIGH,
       r"\bi(?:'ve|\s+have)?\s*(?:been\s+)?(?:cutting|burning|hitting|hurting|harming|scratching)\s+myself\b"),
    _r("self_harm_current", RiskLevel.HIGH,
       r"\b(?:want|urge|urges|need|going)\s+to\s+(?:cut|hurt|harm|burn)\s+myself\b"),
    _r("self_harm_current", RiskLevel.HIGH, r"\bi\s+(?:cut|hurt|harmed|burned)\s+myself\b"),
    _r("uncertain_safety", RiskLevel.HIGH,
       r"\b(?:can't|cannot|don't\s+know\s+if\s+i\s+can)\s+(?:promise|keep)\s+(?:i(?:'ll|\s+will)\s+(?:be|stay)\s+safe|myself\s+safe|that\s+i\s+won't\s+hurt\s+myself)\b",
       inherently_negative=True),
    _r("harm_to_others", RiskLevel.HIGH,
       r"\bi\s+(?:want|am\s+going|'m\s+going|plan|feel\s+like\s+i\s+(?:could|might|want\s+to))\s+(?:to\s+)?(?:kill|shoot|stab|seriously\s+hurt)\s+(?:him|her|them|someone|somebody|people|everyone)\b"),

    # ---- elevated: hopelessness, entrapment, safety concerns, possible medical emergency
    _r("hopelessness", RiskLevel.ELEVATED,
       r"\b(?:i\s+feel\s+(?:so\s+|completely\s+|totally\s+)?(?:hopeless|worthless|trapped|empty\s+inside)|i(?:'m|\s+am)\s+(?:a\s+burden|worthless|hopeless)|there(?:'s|\s+is)\s+no\s+way\s+out|can't\s+take\s+(?:it|this)\s+(?:anymore|any\s+longer)|give\s+up\s+on\s+(?:everything|life)|what's\s+the\s+point\s+of\s+(?:anything|living|life))\b"),
    _r("wish_to_disappear", RiskLevel.ELEVATED, r"\b(?:wish\s+i\s+could\s+(?:just\s+)?disappear|want\s+to\s+disappear(?:\s+forever)?)\b"),
    _r("unsafe_at_home", RiskLevel.ELEVATED,
       r"\b(?:i(?:'m|\s+am)\s+(?:not\s+safe|scared\s+to\s+go)\s+(?:at\s+)?home|(?:he|she|they|my\s+(?:husband|wife|partner|father|mother|dad|mom|mum|brother|uncle|boyfriend|girlfriend))\s+(?:hits|beats|hurts|threatens|abuses)\s+me)\b"),
    _r("possible_medical_emergency", RiskLevel.ELEVATED,
       r"\b(?:i\s+can't\s+breathe|chest\s+pain|i(?:'m|\s+am)\s+(?:going\s+to\s+)?(?:faint|passing\s+out)|i\s+fainted|having\s+a\s+seizure)\b"),
]

# Mentions of risk topics without a first-person framing.
_TOPIC = re.compile(r"\b(?:suicide|suicidal|self[- ]?harm|overdose|kill\s+(?:him|her|them)selves|end\s+(?:his|her|their)\s+li(?:fe|ves))\b")
_THIRD_PARTY = re.compile(
    r"\b(?:my\s+(?:friend|brother|sister|mom|mum|mother|dad|father|son|daughter|partner|husband|wife|boyfriend|girlfriend|cousin|classmate|colleague|roommate)|a\s+friend|someone\s+i\s+know|he|she|they)\b[^.!?]{0,60}\b(?:wants?\s+to\s+(?:kill|hurt|end)|is\s+(?:suicidal|cutting|self[- ]harming)|(?:kill|hurt|harm)(?:ing)?\s+(?:him|her|them)sel(?:f|ves)|end\s+(?:his|her|their)\s+life|talk(?:s|ed|ing)?\s+about\s+(?:suicide|dying|killing\s+(?:him|her|them)self))"
)

_NEGATORS = re.compile(
    r"\b(?:not|never|no\s+longer|don't|do\s+not|won't|will\s+not|wouldn't|would\s+never|i'm\s+not|am\s+not|isn't|aren't|nor|without)\s+(?:\w+\s+){0,3}$"
)
_HEDGES = re.compile(r"\b(?:not\s+sure|not\s+certain|don't\s+know\s+(?:if|whether))\b")
_HISTORICAL = re.compile(
    r"\b(?:used\s+to|years?\s+ago|months?\s+ago|in\s+the\s+past|when\s+i\s+was\s+(?:younger|a\s+(?:kid|teen(?:ager)?|child|student)|\d{1,2})|back\s+(?:then|in\s+(?:school|college|\d{4}))|as\s+a\s+(?:teen(?:ager)?|kid|child)|in\s+(?:19|20)\d{2}|a\s+long\s+time\s+ago|anymore|no\s+longer|recovered|survivor)\b"
)
_RECENT = re.compile(r"\b(?:last\s+night|yesterday|earlier\s+today|this\s+(?:morning|afternoon|evening|week)|an?\s+hour\s+ago|just\s+now|tonight|today|right\s+now)\b")
_ATTEMPT = re.compile(r"\b(?:tried|attempted|try)\s+to\s+(?:kill\s+myself|end\s+my\s+life|take\s+my\s+(?:own\s+)?life|commit\s+suicide)|\b(?:suicide\s+)?attempt(?:ed)?\b")

_DATA_REQUEST = re.compile(
    r"\b(?:other\s+(?:users?|patients?|people)'?s?\s+(?:conversations?|chats?|messages?|data|records?|notes?)|what\s+did\s+(?:the\s+)?(?:previous|last|other)\s+(?:user|person|patient)\s+say|show\s+me\s+(?:the\s+)?(?:database|all\s+(?:users|patients))|patient\s+records?\s+(?:of|for)\s+\w+)\b"
)


# --------------------------------------------------------------------------------------------- evaluation


@dataclass
class RuleResult:
    level: RiskLevel = RiskLevel.NONE
    signals: list[str] = field(default_factory=list)
    third_party: bool = False
    data_request: bool = False

    def raise_to(self, level: RiskLevel, signal: str) -> None:
        if level.rank > self.level.rank:
            self.level = level
        if signal not in self.signals:
            self.signals.append(signal)


def _is_negated(clause: str, start: int) -> bool:
    prefix = clause[max(0, start - 40) : start]
    if _HEDGES.search(prefix):
        return False
    return bool(_NEGATORS.search(prefix))


def evaluate(text: str) -> RuleResult:
    result = RuleResult()
    norm = normalise(text)
    if not norm:
        return result
    if _DATA_REQUEST.search(norm):
        result.data_request = True
        result.signals.append("data_request")

    clauses = [c for c in _SENTENCE_SPLIT.split(norm) if c and c.strip()]
    for clause in clauses:
        third = bool(_THIRD_PARTY.search(clause))
        first_person_self = bool(re.search(r"\b(?:myself|my\s+life|i\s+want\s+to\s+die|i(?:'m|\s+am)\s+suicidal)\b", clause))
        if third and not first_person_self:
            result.third_party = True
            result.raise_to(RiskLevel.ELEVATED, "third_party_risk")
            continue

        historical = bool(_HISTORICAL.search(clause)) and not _RECENT.search(clause)
        if _ATTEMPT.search(clause) and re.search(r"\b(?:i|i've|i\s+have|i\s+had)\b", clause):
            if historical:
                result.raise_to(RiskLevel.LOW, "past_attempt")
            else:
                result.raise_to(RiskLevel.HIGH, "recent_attempt")

        for rule in RULES:
            m = rule.pattern.search(clause)
            if not m:
                continue
            if not rule.inherently_negative and _is_negated(clause, m.start()):
                result.raise_to(RiskLevel.LOW, "negated_mention")
                continue
            if historical and rule.level.rank >= RiskLevel.ELEVATED.rank and rule.level != RiskLevel.IMMINENT:
                result.raise_to(RiskLevel.LOW, "historical_mention")
                continue
            result.raise_to(rule.level, rule.code)

        if result.level == RiskLevel.NONE and _TOPIC.search(clause):
            result.raise_to(RiskLevel.LOW, "topic_mention")

    return result
