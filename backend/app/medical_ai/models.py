"""Additive response shapes for the medical AI template (see docs/CONTRACT.md appendix)."""
from typing import Literal

from pydantic import BaseModel, Field

RiskLevel = Literal["low", "medium", "high"]
ProviderId = Literal["mock", "bedrock", "disabled"]


class VitalsSnapshot(BaseModel):
    """Filtered vitals passed to the AI — never raw waveforms."""

    patient_id: str = "A-01"
    hr: float | None = None
    spo2: float | None = None
    temp: float | None = None
    resp_rate: float | None = None
    hrv_rmssd: float | None = None
    bp_sys: float | None = None
    scenario: str | None = None
    global_status: Literal["green", "amber", "red"] | None = None
    alert_titles: list[str] = Field(default_factory=list)


class MedicalInsight(BaseModel):
    """Structured insight for the UI (risk, findings, action, protocol sources)."""

    risk_level: RiskLevel
    findings: str
    recommended_action: str
    sources: list[str] = Field(default_factory=list)
    provider: ProviderId
    model: str | None = None
    invoked: bool = True
    anomaly_detected: bool = True
    patient_id: str = "A-01"
    disclaimer: str = "Decision support, not a medical diagnosis."
