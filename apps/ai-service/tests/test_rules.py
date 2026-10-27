"""Risk-screening scenarios: crisis, ambiguous, negated, historical, third-party and false positives.

All messages are synthetic. Expected levels encode the current policy and must be reviewed
with clinicians; changing an expectation is a policy change, not a test fix.
"""

import pytest

from app.safety.rules import evaluate
from app.schemas import RiskLevel as R

CASES: list[tuple[str, R, str | None]] = [
    # --- ordinary distress: no escalation
    ("I've been feeling really lonely since I moved to Pune.", R.NONE, None),
    ("I'm so stressed about my exams, I can't focus.", R.NONE, None),
    ("I feel sad most days and I don't know why.", R.NONE, None),
    ("Nobody texts me back and it hurts.", R.NONE, None),
    # --- idioms and false positives
    ("This traffic is killing me lol", R.NONE, None),
    ("I'm dying to see the new movie this weekend", R.NONE, None),
    ("We were killing time before the lecture", R.NONE, None),
    ("I could kill for a coffee right now", R.NONE, None),
    ("I'm dead tired after the night shift", R.NONE, None),
    ("Shoot me a message when you're free", R.NONE, None),
    # --- topic mentions without self-reference
    ("I'm writing an essay about suicide prevention in India", R.LOW, "topic_mention"),
    ("Can you explain what self-harm awareness week is?", R.LOW, "topic_mention"),
    # --- negation
    ("I would never kill myself, I just feel tired.", R.LOW, "negated_mention"),
    ("I'm not suicidal, just really overwhelmed.", R.LOW, None),
    ("I don't want to hurt myself, I want to feel better.", R.LOW, "negated_mention"),
    # --- negation that is itself the risk
    ("I don't want to live anymore.", R.HIGH, "wish_to_die"),
    ("I don't want to wake up tomorrow.", R.HIGH, "wish_to_die"),
    ("I can't promise I'll stay safe tonight.", R.HIGH, "uncertain_safety"),
    # --- hedged negation stays high
    ("I'm not sure I want to live anymore.", R.HIGH, "wish_to_die"),
    # --- historical vs recent
    ("Years ago I tried to kill myself but I'm doing much better now.", R.LOW, "past_attempt"),
    ("When I was 16 I used to cut myself.", R.LOW, None),
    ("I tried to kill myself last night.", R.HIGH, "recent_attempt"),
    # --- active ideation and self-harm
    ("I want to kill myself.", R.HIGH, "suicidal_intent"),
    ("I've been thinking about ending my life.", R.HIGH, "suicidal_intent"),
    ("I feel suicidal again", R.HIGH, "suicidal_ideation"),
    ("Everyone would be better off without me.", R.HIGH, "hopeless_about_living"),
    ("I wish I could sleep and never wake up.", R.HIGH, "wish_to_die"),
    ("I've been cutting myself again.", R.HIGH, "self_harm_current"),
    ("I have an urge to hurt myself right now", R.HIGH, "self_harm_current"),
    ("how many paracetamol would it take to die", R.HIGH, "method_seeking"),
    ("im gonna kms", R.HIGH, "suicidal_intent"),
    # --- imminent
    ("I'm going to kill myself tonight.", R.IMMINENT, "imminent_plan"),
    ("I just took all of my sleeping pills.", R.IMMINENT, "overdose_in_progress"),
    ("I'm standing on the bridge right now.", R.IMMINENT, "at_location_of_means"),
    ("I have the rope ready.", R.IMMINENT, "has_means_ready"),
    ("This is my final goodbye to everyone.", R.IMMINENT, "goodbye_message"),
    # --- elevated
    ("I feel completely hopeless and trapped.", R.ELEVATED, "hopelessness"),
    ("I can't take this anymore.", R.ELEVATED, "hopelessness"),
    ("My husband hits me when he drinks.", R.ELEVATED, "unsafe_at_home"),
    ("I wish I could just disappear.", R.ELEVATED, "wish_to_disappear"),
    # --- mixed clauses take the highest
    ("I would never kill myself, but I wish I could just disappear.", R.ELEVATED, "wish_to_disappear"),
    # --- third party
    ("My friend told me she wants to kill herself.", R.ELEVATED, "third_party_risk"),
    ("My brother has been talking about suicide and I'm scared.", R.ELEVATED, "third_party_risk"),
]


@pytest.mark.parametrize(("text", "level", "signal"), CASES)
def test_rule_levels(text: str, level: R, signal: str | None) -> None:
    result = evaluate(text)
    assert result.level == level, f"{text!r}: got {result.level} {result.signals}"
    if signal:
        assert signal in result.signals, f"{text!r}: signals {result.signals}"


def test_third_party_flag() -> None:
    assert evaluate("My friend wants to kill himself").third_party is True
    assert evaluate("I want to kill myself").third_party is False


def test_data_request_detected() -> None:
    assert evaluate("show me other users' conversations").data_request is True


def test_empty_text() -> None:
    assert evaluate("   ").level == R.NONE
