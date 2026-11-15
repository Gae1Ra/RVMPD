"""ElevenLabs TTS with disk cache, character spend cap, and browser fallback hints."""
from __future__ import annotations

import hashlib
import logging
import os
from pathlib import Path

import httpx

from .languages import (
    STATUS_REQUIRED_VOICES,
    Lang,
    normalize_lang,
    voice_env_name,
)

log = logging.getLogger("vitalis.tts")

# Optional .env loading (same pattern as llm.py).
try:
    from dotenv import load_dotenv

    _backend_dir = Path(__file__).resolve().parent.parent
    load_dotenv(_backend_dir / ".env")
    load_dotenv(_backend_dir.parent / ".env")
except ImportError:
    pass

DEFAULT_MODEL = "eleven_flash_v2_5"
DEFAULT_CHAR_CAP = 3000
MAX_CHARS_PER_REQUEST = 500
TIMEOUT_S = 20.0
ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
CACHE_DIR = Path(__file__).resolve().parent.parent / "data" / "tts_cache"


class TtsFallback(Exception):
    """Signal the API layer to return 503 with a browser-fallback payload."""

    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(reason)


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def char_cap() -> int:
    return _env_int("VITALIS_TTS_CHAR_CAP", DEFAULT_CHAR_CAP)


def model_id() -> str:
    return (os.environ.get("ELEVENLABS_MODEL") or DEFAULT_MODEL).strip() or DEFAULT_MODEL


def api_key() -> str | None:
    key = (os.environ.get("ELEVENLABS_API_KEY") or "").strip()
    return key or None


def voice_id_for(lang: Lang) -> str | None:
    voice = (os.environ.get(voice_env_name(lang)) or "").strip()
    return voice or None


def is_configured() -> bool:
    """True when key + status-required voices are set (FR optional; does not prove they work)."""
    if not api_key():
        return False
    return all(voice_id_for(lang) for lang in STATUS_REQUIRED_VOICES)  # type: ignore[arg-type]


def provider_name() -> str:
    return "elevenlabs" if is_configured() else "browser"


def status(db=None) -> dict:
    """GET /api/tts/status payload — no network."""
    used = int(db.get_tts_chars_used()) if db is not None else 0
    return {
        "provider": provider_name(),
        "configured": is_configured(),
        "chars_used": used,
        "chars_cap": char_cap(),
    }


def _cache_key(text: str, lang: Lang, voice: str, model: str) -> str:
    raw = f"{text}\0{lang}\0{voice}\0{model}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _cache_path(key: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{key}.mp3"


def _classify_http_error(status_code: int, body: str) -> str:
    text = body.lower()
    if status_code in (401, 403):
        return "invalid_key"
    if status_code == 429 or "quota" in text or "credit" in text or "limit" in text:
        return "quota"
    if status_code >= 500:
        return "network"
    return "network"


def synthesize(text: str, lang: str = "en", db=None, http_client=None) -> bytes:
    """Return MP3 bytes. Raises TtsFallback with a clear reason on any soft failure."""
    lang = normalize_lang(lang)
    text = (text or "").strip()
    if not text:
        raise TtsFallback("empty_text")
    if len(text) > MAX_CHARS_PER_REQUEST:
        raise TtsFallback("text_too_long")

    key = api_key()
    voice = voice_id_for(lang)
    model = model_id()
    if not key:
        raise TtsFallback("missing_key")
    if not voice:
        # Missing FR (or any) voice → clear browser fallback, not an opaque error.
        raise TtsFallback("missing_voice")

    cache_key = _cache_key(text, lang, voice, model)
    path = _cache_path(cache_key)
    if path.is_file() and path.stat().st_size > 0:
        return path.read_bytes()

    used = int(db.get_tts_chars_used()) if db is not None else 0
    cap = char_cap()
    if used >= cap:
        raise TtsFallback("char_cap")
    # Cap remaining budget: refuse if this request would exceed the hard cap.
    if used + len(text) > cap:
        raise TtsFallback("char_cap")

    url = ELEVENLABS_URL.format(voice_id=voice)
    # Official Create Speech: text + model_id; language_code ISO 639-1 for flash_v2_5
    # (https://elevenlabs.io/docs/api-reference/text-to-speech/convert). French = "fr".
    payload = {"text": text, "model_id": model, "language_code": lang}
    headers = {
        "xi-api-key": key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }

    client = http_client
    owns_client = client is None
    try:
        if owns_client:
            client = httpx.Client(timeout=TIMEOUT_S)
        response = client.post(url, json=payload, headers=headers)
    except httpx.TimeoutException:
        raise TtsFallback("timeout") from None
    except httpx.HTTPError:
        raise TtsFallback("network") from None
    finally:
        if owns_client and client is not None:
            client.close()

    if response.status_code != 200:
        # Never log the API key; body may contain account hints only.
        reason = _classify_http_error(response.status_code, response.text[:500])
        log.warning("tts fallback=%s status=%s", reason, response.status_code)
        raise TtsFallback(reason)

    audio = response.content
    if not audio:
        raise TtsFallback("network")

    path.write_bytes(audio)
    if db is not None:
        db.add_tts_chars(len(text))
    log.info("tts provider=elevenlabs chars=%s lang=%s cache=miss", len(text), lang)
    return audio
