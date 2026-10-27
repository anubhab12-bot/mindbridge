"""Deterministic, reviewable response templates used instead of model output on high-risk paths
and as safe fallbacks. They never contain phone numbers: verified contacts are rendered by the
app from the admin-maintained crisis registry.
"""

from __future__ import annotations

TEMPLATE_VERSION = "templates-2026.10.27"


def _resources_line(has_resources: bool) -> str:
    if has_resources:
        return "The verified crisis contacts shown on your screen are free to call and available to help right now."
    return (
        "I don't have a verified local crisis line for your location, so please call your local emergency number "
        "or go to the nearest hospital emergency department."
    )


def imminent(has_resources: bool, has_emergency: bool) -> str:
    emergency = (
        "Please call the emergency number shown on your screen now"
        if has_emergency
        else "Please call your local emergency number now or go to the nearest emergency department"
    )
    return (
        "I'm really glad you told me, and I'm taking what you said seriously. Your safety matters most right now. "
        f"{emergency}. If you can, move away from anything you could use to hurt yourself and go to where another "
        "person is, or ask someone nearby to stay with you. "
        f"{_resources_line(has_resources)} "
        "I'm an AI and I can't contact anyone for you, but I'm here while you reach out. Are you somewhere safe right now?"
    )


def high(has_resources: bool) -> str:
    return (
        "Thank you for trusting me with something this painful. It sounds like you're carrying a lot right now, "
        "and you don't have to carry it alone. "
        "I want to ask you directly, because it matters: are you thinking about ending your life, or are you safe right now? "
        f"{_resources_line(has_resources)} "
        "Talking to a trained person can really help, and you can also reach out to someone you trust and let them "
        "know how you're feeling. If you'd like, I can help you find a qualified professional on MindBridge. "
        "I'm an AI, not a counsellor, but I'm here to keep talking with you."
    )


def third_party(has_resources: bool) -> str:
    return (
        "It sounds like you're worried about someone you care about, and it's good that you're paying attention. "
        "If they might be in immediate danger, contact emergency services and try not to leave them alone. "
        "It's okay to ask them directly and gently whether they are thinking about suicide; asking does not put the idea "
        "in their head. Listen without judging, and encourage them to talk to a professional or a crisis line. "
        f"{_resources_line(has_resources)} Please also look after yourself; supporting someone can be heavy."
    )


def data_request() -> str:
    return (
        "I don't have access to anyone else's information, and I can't look up other people's conversations or records. "
        "I'm only here to support you in this conversation. Is there something on your mind you'd like to talk about?"
    )


def fallback(crisis: bool, has_resources: bool) -> str:
    if crisis:
        return high(has_resources)
    return (
        "I'm sorry, I'm having trouble responding properly right now. I still want to hear what's on your mind. "
        "You could try again in a moment, write down what you're feeling in your journal, or reach out to someone you trust. "
        "If you're feeling unsafe at any point, please use the crisis support options in the app."
    )
