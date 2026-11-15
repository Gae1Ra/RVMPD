import pytest
from fastapi.testclient import TestClient

from app.main import app

FRAME_KEYS = {"type", "t", "scenario", "wave", "vitals", "radiation", "global", "alerts"}
VITAL_KEYS = {"value", "unit", "baseline", "delta", "status", "p_adj", "sqi"}
VITALS = {"hr", "hrv_rmssd", "spo2", "temp", "resp_rate", "bp_sys"}
ALERT_KEYS = {"id", "t", "metric", "level", "origin", "title", "explanation", "guidance"}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health(client):
    assert client.get("/api/health").json() == {"ok": True}


def test_scenarios_listed(client):
    ids = [s["id"] for s in client.get("/api/scenarios").json()]
    assert ids == [
        "nominal",
        "solar_particle_event",
        "hypoxia",
        "loose_electrode",
        "fatigue",
        "galaxy_watch",
    ]


def test_scenario_switch_and_unknown(client):
    r = client.post("/api/scenario", json={"id": "hypoxia"})
    assert r.json() == {"ok": True, "scenario": "hypoxia"}
    assert client.post("/api/scenario", json={"id": "nope"}).status_code == 404
    client.post("/api/scenario", json={"id": "nominal"})


def test_checkins_newest_first(client):
    client.post("/api/checkin", json={"mood": 3, "sleep_hours": 7, "note": "first"})
    stored = client.post("/api/checkin", json={"mood": 5, "sleep_hours": 8.5, "note": "second"}).json()
    assert {"id", "t", "mood", "sleep_hours", "note"} <= stored.keys()
    assert client.get("/api/checkins").json()[0]["note"] == "second"
    assert client.post("/api/checkin", json={"mood": 9, "sleep_hours": 7}).status_code == 422


def test_spaceweather_shape(client):
    data = client.get("/api/spaceweather").json()
    assert set(data) == {"source", "proton_flux_pfu", "s_scale", "updated"}
    assert data["source"] in ("NOAA SWPC GOES", "fallback")


def test_websocket_frame_matches_contract(client):
    with client.websocket_connect("/ws") as ws:
        frame = ws.receive_json()
    # Additive keys (e.g. source/watch in galaxy_watch) are allowed.
    assert FRAME_KEYS <= set(frame)
    assert frame["type"] == "frame"
    assert frame["wave"]["fs"] == 250
    assert all(len(frame["wave"][c]) == 50 for c in ("ecg", "ppg", "resp"))
    assert set(frame["vitals"]) == VITALS
    for vital in frame["vitals"].values():
        assert set(vital) == VITAL_KEYS
        assert vital["status"] in ("green", "amber", "red")
        assert 0 <= vital["sqi"] <= 1
    assert set(frame["radiation"]) == {"dose_rate_usv_h", "dose_total_msv", "status"}
    assert set(frame["global"]) == {"status", "confidence", "sqi", "link"}
    assert len(frame["alerts"]) <= 5
    for alert in frame["alerts"]:
        assert set(alert) == ALERT_KEYS
