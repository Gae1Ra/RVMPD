"""Medical AI template: filter, mock provider, additive routes. No AWS required."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.medical_ai import insight_from_vitals, provider_status
from app.medical_ai.filter import has_clinical_anomaly, is_physically_plausible
from app.medical_ai.models import VitalsSnapshot


INSIGHT_KEYS = {
    "risk_level",
    "findings",
    "recommended_action",
    "sources",
    "provider",
    "model",
    "invoked",
    "anomaly_detected",
    "patient_id",
    "disclaimer",
}


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_noise_rejected():
    snap = VitalsSnapshot(hr=10, spo2=97.0)
    assert not is_physically_plausible(snap)
    assert not has_clinical_anomaly(snap)


def test_anomaly_thresholds():
    assert has_clinical_anomaly(VitalsSnapshot(hr=120, spo2=97.0))
    assert has_clinical_anomaly(VitalsSnapshot(spo2=90.0))
    assert has_clinical_anomaly(VitalsSnapshot(temp=38.5))
    assert not has_clinical_anomaly(VitalsSnapshot(hr=72, spo2=97.0, temp=36.7))


def test_mock_insight_on_anomaly(monkeypatch):
    monkeypatch.setenv("VITALIS_MEDICAL_AI", "1")
    monkeypatch.setenv("VITALIS_MEDICAL_AI_PROVIDER", "mock")
    insight = insight_from_vitals(VitalsSnapshot(hr=125, spo2=96.0, patient_id="A-01"))
    assert insight.invoked and insight.anomaly_detected
    assert insight.provider == "mock"
    assert insight.risk_level in ("low", "medium", "high")
    assert insight.sources


def test_no_call_when_nominal(monkeypatch):
    monkeypatch.setenv("VITALIS_MEDICAL_AI", "1")
    insight = insight_from_vitals(VitalsSnapshot(hr=72, spo2=97.0, temp=36.6))
    assert not insight.invoked and not insight.anomaly_detected
    assert insight.risk_level == "low"


def test_force_invokes_without_anomaly(monkeypatch):
    monkeypatch.setenv("VITALIS_MEDICAL_AI", "1")
    insight = insight_from_vitals(VitalsSnapshot(hr=72, spo2=97.0), force=True)
    assert insight.invoked and insight.provider == "mock"


def test_disabled_by_default(monkeypatch):
    monkeypatch.delenv("VITALIS_MEDICAL_AI", raising=False)
    status = provider_status()
    assert status["enabled"] is False and status["provider"] == "disabled"


def test_status_and_insight_routes(client, monkeypatch):
    monkeypatch.delenv("VITALIS_MEDICAL_AI", raising=False)
    status = client.get("/api/medical-ai/status").json()
    assert status["enabled"] is False

    # Offline-friendly: even with flag off, route returns the additive shape
    body = {"hr": 130, "spo2": 88.0, "force": False}
    insight = client.post("/api/medical-ai/insight", json=body).json()
    assert set(insight) == INSIGHT_KEYS
    assert insight["anomaly_detected"] is True
    assert insight["risk_level"] in ("low", "medium", "high")

    monkeypatch.setenv("VITALIS_MEDICAL_AI", "1")
    monkeypatch.setenv("VITALIS_MEDICAL_AI_PROVIDER", "mock")
    live = client.post("/api/medical-ai/insight", json={"spo2": 89.0}).json()
    assert live["provider"] == "mock" and live["invoked"] is True
    assert client.post("/api/medical-ai/insight").status_code == 200
