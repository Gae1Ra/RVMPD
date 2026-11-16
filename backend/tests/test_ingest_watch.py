"""WiFi / Galaxy Watch ingest — additive, does not invent clinical values."""
import pytest
from fastapi.testclient import TestClient

from app.ingest.watch import WatchIngest, map_watch_to_contract
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_map_missing_as_null():
    mapped = map_watch_to_contract(
        WatchIngest(hr=72.0, spo2=None, temp=36.5, hrv_rmssd=None)
    )
    assert mapped["hr"] == 72.0
    assert mapped["spo2"] is None
    assert mapped["temp"] == 36.5
    assert mapped["hrv_rmssd"] is None
    assert mapped["resp_rate"] is None
    assert mapped["bp_sys"] is None


def test_ingest_watch_and_status(client):
    empty = client.get("/api/ingest/watch/status").json()
    assert empty["connected"] is False
    assert empty["receiving"] is False
    assert empty["source"] == "simulator"
    assert empty["mapped"] == {}

    body = {
        "device": "galaxy_watch",
        "hr": 71.0,
        "spo2": None,
        "temp": 36.4,
        "hrv_rmssd": 43.0,
        "artifact": False,
        "permissions": ["READ_HEART_RATE"],
    }
    res = client.post("/api/ingest/watch", json=body).json()
    assert res["ok"] is True
    assert res["source"] == "wifi"
    assert res["mapped"]["hr"] == 71.0
    assert res["mapped"]["spo2"] is None
    assert res["mapped"]["resp_rate"] is None
    assert res["last_sync"]

    status = client.get("/api/ingest/watch/status").json()
    assert status["connected"] is True
    assert status["receiving"] is True
    assert status["source"] == "wifi"
    assert status["available"]["hr"] is True
    assert status["available"]["spo2"] is False
    assert status["available"]["bp_sys"] is False
    assert status["last_ingest_age_s"] is not None
    assert "diagnosis" in status["note"].lower() or "Decision support" in status["note"]


def test_wifi_ingest_updates_live_ws_frames(client):
    client.post(
        "/api/ingest/watch",
        json={"device": "lan_mock", "hr": 77.0, "spo2": None, "temp": None, "hrv_rmssd": None},
    )
    with client.websocket_connect("/ws") as ws:
        frame = ws.receive_json()
    assert frame["source"] == "wifi"
    assert frame["ingest"]["receiving"] is True
    assert frame["ingest"]["connected"] is True
    assert frame["ingest"]["device"] == "lan_mock"
    assert frame["ingest"]["available"]["hr"] is True
    assert frame["ingest"]["available"]["bp_sys"] is False
    # No fake ECG from WiFi — channels are blanked while receiving.
    assert all(v == 0.0 for v in frame["wave"]["ecg"])
    assert set(frame["vitals"]) >= {"hr", "spo2", "temp", "hrv_rmssd", "resp_rate", "bp_sys"}


def test_simulator_source_when_idle(client):
    # Wait past the connected window if a prior test posted recently.
    store = app.state.watch_store
    store.last = None
    store.last_sync = None
    store.last_ingest_mono = None
    store.mapped = {}
    with client.websocket_connect("/ws") as ws:
        frame = ws.receive_json()
    assert frame["source"] == "simulator"
    assert frame["ingest"]["connected"] is False
    assert frame["ingest"]["receiving"] is False
