"""TTS: cache, char cap, 500 limit, missing key, network/invalid key → fallback, status."""
from __future__ import annotations

from unittest.mock import MagicMock

import httpx
import pytest
from fastapi.testclient import TestClient

from app import tts
from app.db import Database
from app.main import app


@pytest.fixture
def tts_env(monkeypatch, tmp_path):
    """Configure ElevenLabs env + isolated cache/db for each test."""
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-key-not-real")
    monkeypatch.setenv("ELEVENLABS_VOICE_ID_ES", "voice-es-placeholder")
    monkeypatch.setenv("ELEVENLABS_VOICE_ID_EN", "voice-en-placeholder")
    monkeypatch.setenv("ELEVENLABS_MODEL", "eleven_flash_v2_5")
    monkeypatch.setenv("VITALIS_TTS_CHAR_CAP", "100")
    cache = tmp_path / "tts_cache"
    cache.mkdir()
    monkeypatch.setattr(tts, "CACHE_DIR", cache)
    db = Database(path=tmp_path / "tts.db")
    yield {"db": db, "cache": cache}
    db.close()


def _fake_response(status_code=200, content=b"ID3fake-mp3", text=""):
    req = httpx.Request("POST", "https://api.elevenlabs.io/v1/text-to-speech/voice-en-placeholder")
    return httpx.Response(status_code, content=content, text=text, request=req)


def test_status_no_network(tts_env, monkeypatch):
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    st = tts.status(tts_env["db"])
    assert st["provider"] == "browser"
    assert st["configured"] is False
    assert st["chars_used"] == 0
    assert st["chars_cap"] == 100


def test_status_configured(tts_env):
    st = tts.status(tts_env["db"])
    assert st["provider"] == "elevenlabs"
    assert st["configured"] is True
    assert st["chars_cap"] == 100


def test_missing_key_fallback(tts_env, monkeypatch):
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    with pytest.raises(tts.TtsFallback) as exc:
        tts.synthesize("hello", "en", db=tts_env["db"])
    assert exc.value.reason == "missing_key"


def test_text_too_long(tts_env):
    with pytest.raises(tts.TtsFallback) as exc:
        tts.synthesize("x" * 501, "en", db=tts_env["db"])
    assert exc.value.reason == "text_too_long"


def test_cache_hit_skips_api_and_chars(tts_env):
    client = MagicMock()
    client.post.return_value = _fake_response()
    audio1 = tts.synthesize("Cache me", "en", db=tts_env["db"], http_client=client)
    assert client.post.call_count == 1
    assert tts_env["db"].get_tts_chars_used() == len("Cache me")

    audio2 = tts.synthesize("Cache me", "en", db=tts_env["db"], http_client=client)
    assert client.post.call_count == 1  # no second API call
    assert audio1 == audio2
    assert tts_env["db"].get_tts_chars_used() == len("Cache me")


def test_char_cap_stops_spend(tts_env):
    client = MagicMock()
    client.post.return_value = _fake_response()
    tts.synthesize("a" * 60, "en", db=tts_env["db"], http_client=client)
    assert tts_env["db"].get_tts_chars_used() == 60
    with pytest.raises(tts.TtsFallback) as exc:
        tts.synthesize("b" * 50, "en", db=tts_env["db"], http_client=client)
    assert exc.value.reason == "char_cap"
    assert client.post.call_count == 1


def test_network_error_fallback(tts_env):
    client = MagicMock()
    client.post.side_effect = httpx.ConnectError("boom")
    with pytest.raises(tts.TtsFallback) as exc:
        tts.synthesize("net fail", "en", db=tts_env["db"], http_client=client)
    assert exc.value.reason == "network"


def test_timeout_fallback(tts_env):
    client = MagicMock()
    client.post.side_effect = httpx.ReadTimeout("slow")
    with pytest.raises(tts.TtsFallback) as exc:
        tts.synthesize("slow", "en", db=tts_env["db"], http_client=client)
    assert exc.value.reason == "timeout"


def test_invalid_key_fallback(tts_env):
    client = MagicMock()
    client.post.return_value = _fake_response(status_code=401, content=b"", text="invalid api key")
    with pytest.raises(tts.TtsFallback) as exc:
        tts.synthesize("bad key", "en", db=tts_env["db"], http_client=client)
    assert exc.value.reason == "invalid_key"


def test_quota_fallback(tts_env):
    client = MagicMock()
    client.post.return_value = _fake_response(status_code=429, content=b"", text="quota exceeded")
    with pytest.raises(tts.TtsFallback) as exc:
        tts.synthesize("quota", "en", db=tts_env["db"], http_client=client)
    assert exc.value.reason == "quota"


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_api_tts_status(client):
    data = client.get("/api/tts/status").json()
    assert set(data) == {"provider", "configured", "chars_used", "chars_cap"}
    assert data["provider"] in ("elevenlabs", "browser")
    assert isinstance(data["configured"], bool)
    assert isinstance(data["chars_used"], int)
    assert isinstance(data["chars_cap"], int)


def test_api_tts_missing_key_returns_browser_fallback(client, monkeypatch):
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)
    monkeypatch.delenv("ELEVENLABS_VOICE_ID_EN", raising=False)
    monkeypatch.delenv("ELEVENLABS_VOICE_ID_ES", raising=False)
    r = client.post("/api/tts", json={"text": "hola", "lang": "es"})
    assert r.status_code == 503
    body = r.json()
    assert body["fallback"] == "browser"
    assert body["reason"] in ("missing_key", "missing_voice")


def test_api_tts_success_mp3(client, monkeypatch, tmp_path):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-key-not-real")
    monkeypatch.setenv("ELEVENLABS_VOICE_ID_ES", "voice-es-placeholder")
    monkeypatch.setenv("ELEVENLABS_VOICE_ID_EN", "voice-en-placeholder")
    monkeypatch.setenv("VITALIS_TTS_CHAR_CAP", "3000")
    cache = tmp_path / "api_cache"
    cache.mkdir()
    monkeypatch.setattr(tts, "CACHE_DIR", cache)

    fake = MagicMock()
    fake.post.return_value = _fake_response(content=b"ID3api-mp3")

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        def post(self, *a, **k):
            return fake.post(*a, **k)

        def close(self):
            pass

    monkeypatch.setattr(httpx, "Client", FakeClient)
    r = client.post("/api/tts", json={"text": "API check", "lang": "en"})
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("audio/mpeg")
    assert r.content == b"ID3api-mp3"


def test_api_tts_rejects_over_500_via_synthesize(client, monkeypatch, tmp_path):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-key-not-real")
    monkeypatch.setenv("ELEVENLABS_VOICE_ID_ES", "voice-es-placeholder")
    monkeypatch.setenv("ELEVENLABS_VOICE_ID_EN", "voice-en-placeholder")
    monkeypatch.setattr(tts, "CACHE_DIR", tmp_path / "c")
    (tmp_path / "c").mkdir()
    r = client.post("/api/tts", json={"text": "z" * 501, "lang": "en"})
    assert r.status_code == 503
    assert r.json() == {"fallback": "browser", "reason": "text_too_long"}
