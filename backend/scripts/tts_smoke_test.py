#!/usr/bin/env python3
"""Minimal real ElevenLabs TTS call. Never prints the API key.

Run with backend/.env filled (ELEVENLABS_API_KEY + voice ids). User-run only.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import tts
from app.db import Database


def main() -> int:
    if not tts.api_key():
        print("FAIL: missing_key — set ELEVENLABS_API_KEY in backend/.env")
        return 1
    if not tts.voice_id_for("en"):
        print("FAIL: missing_voice — set ELEVENLABS_VOICE_ID_EN in backend/.env")
        return 1

    db = Database()
    text = "VITALIS voice check."
    try:
        audio = tts.synthesize(text, "en", db=db)
    except tts.TtsFallback as e:
        print(f"FAIL: {e.reason}")
        db.close()
        return 1

    out = Path(__file__).resolve().parent.parent / "data" / "tts_smoke.mp3"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(audio)
    st = tts.status(db)
    print(f"OK bytes={len(audio)} model={tts.model_id()} chars_used={st['chars_used']}/{st['chars_cap']}")
    print(f"wrote {out}")
    db.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
