"""Clinical pre-filter: AI is invoked only on anomaly (guide cost guardrail).

Thresholds mirror the Bedrock/Wi-Fi guide (HR, SpO2, temperature) and also
respect an already-elevated global status or active physiological alerts from
the existing VITALIS pipeline.
"""
from .models import VitalsSnapshot

# Guide thresholds (servidor_medico.py style), adapted to this codebase.
HR_HIGH, HR_LOW = 110.0, 50.0
SPO2_LOW = 92.0
TEMP_HIGH = 38.0

# Physiologically impossible → discard before any AI call (sensor noise).
HR_ABS = (30.0, 230.0)
SPO2_ABS = (50.0, 100.0)


def is_physically_plausible(snap: VitalsSnapshot) -> bool:
    if snap.hr is not None and not (HR_ABS[0] <= snap.hr <= HR_ABS[1]):
        return False
    if snap.spo2 is not None and not (SPO2_ABS[0] <= snap.spo2 <= SPO2_ABS[1]):
        return False
    return True


def has_clinical_anomaly(snap: VitalsSnapshot) -> bool:
    """True when Bedrock (or the mock) should be consulted."""
    if not is_physically_plausible(snap):
        return False
    if snap.global_status in ("amber", "red"):
        return True
    if snap.alert_titles:
        return True
    if snap.hr is not None and (snap.hr > HR_HIGH or snap.hr < HR_LOW):
        return True
    if snap.spo2 is not None and snap.spo2 < SPO2_LOW:
        return True
    if snap.temp is not None and snap.temp > TEMP_HIGH:
        return True
    return False


def context_summary(snap: VitalsSnapshot) -> str:
    parts = []
    if snap.hr is not None:
        parts.append(f"HR: {snap.hr:.0f} bpm")
    if snap.spo2 is not None:
        parts.append(f"SpO2: {snap.spo2:.1f}%")
    if snap.temp is not None:
        parts.append(f"Temp: {snap.temp:.1f} C")
    if snap.resp_rate is not None:
        parts.append(f"RR: {snap.resp_rate:.0f} rpm")
    if snap.hrv_rmssd is not None:
        parts.append(f"HRV: {snap.hrv_rmssd:.0f} ms")
    if snap.bp_sys is not None:
        parts.append(f"BP sys: {snap.bp_sys:.0f} mmHg")
    if snap.scenario:
        parts.append(f"scenario={snap.scenario}")
    if snap.alert_titles:
        parts.append("alerts: " + "; ".join(snap.alert_titles[:3]))
    return ", ".join(parts) if parts else "no vitals"
