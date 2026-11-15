"""Galaxy Watch ingest stub — additive, does not invent clinical values."""
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
    assert res["mapped"]["hr"] == 71.0
    assert res["mapped"]["spo2"] is None
    assert res["mapped"]["resp_rate"] is None
    assert res["last_sync"]

    status = client.get("/api/ingest/watch/status").json()
    assert status["connected"] is True
    assert status["available"]["hr"] is True
    assert status["available"]["spo2"] is False
    assert status["available"]["bp_sys"] is False
    assert "diagnosis" in status["note"].lower() or "Decision support" in status["note"]


def test_galaxy_watch_scenario_and_frame(client):
    ids = [s["id"] for s in client.get("/api/scenarios").json()]
    assert "galaxy_watch" in ids
    assert client.post("/api/scenario", json={"id": "galaxy_watch"}).json()["ok"] is True

    with client.websocket_connect("/ws") as ws:
        frame = ws.receive_json()
    assert frame["scenario"] == "galaxy_watch"
    assert frame.get("source") == "watch"
    assert "watch" in frame
    assert frame["watch"]["available"]["bp_sys"] is False
    assert frame["watch"]["available"]["resp_rate"] is False
    assert all(v == 0.0 for v in frame["wave"]["ecg"])
    # CONTRACT vitals keys still present
    assert set(frame["vitals"]) >= {"hr", "spo2", "temp", "hrv_rmssd", "resp_rate", "bp_sys"}

    client.post("/api/scenario", json={"id": "nominal"})
