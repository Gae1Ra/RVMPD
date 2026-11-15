"""Supported UI / TTS / analysis languages — single registry for the backend.

To add a language: append here, add frontend `src/i18n/<code>.ts`, register in
`frontend/src/i18n/languages.ts`, and document `ELEVENLABS_VOICE_ID_<CODE>` in
`.env.example`. Do not invent ElevenLabs voice ids.
"""
from __future__ import annotations

from typing import Literal

Lang = Literal["es", "en", "fr"]

# code -> BCP-47-ish tags / ElevenLabs env / display name
LANGUAGES: dict[str, dict[str, str]] = {
    "es": {
        "intl": "es-ES",
        "speech": "es-ES",
        "voice_env": "ELEVENLABS_VOICE_ID_ES",
        "name": "Spanish",
        "llm_instruction": (
            "Respond in Spanish. Keep the same JSON schema field names. "
            "Do not translate numeric values, units, or vital abbreviations."
        ),
    },
    "en": {
        "intl": "en-US",
        "speech": "en-US",
        "voice_env": "ELEVENLABS_VOICE_ID_EN",
        "name": "English",
        "llm_instruction": "",
    },
    "fr": {
        "intl": "fr-FR",
        "speech": "fr-FR",
        "voice_env": "ELEVENLABS_VOICE_ID_FR",
        "name": "French",
        "llm_instruction": (
            "Respond in French. Keep the same JSON schema field names. "
            "Do not translate numeric values, units, or vital abbreviations. "
            "Use supportive wording and prefer \"possible\" (\"possible\") where appropriate."
        ),
    },
}

SUPPORTED_LANGS: frozenset[str] = frozenset(LANGUAGES)
DEFAULT_LANG: Lang = "en"

# Status "configured" still requires the original demo pair so adding FR is optional.
STATUS_REQUIRED_VOICES: tuple[str, ...] = ("es", "en")


def normalize_lang(lang: str | None) -> Lang:
    if lang in SUPPORTED_LANGS:
        return lang  # type: ignore[return-value]
    return DEFAULT_LANG


def voice_env_name(lang: Lang) -> str:
    return LANGUAGES[lang]["voice_env"]


def llm_instruction(lang: Lang) -> str:
    return LANGUAGES[lang].get("llm_instruction") or ""
