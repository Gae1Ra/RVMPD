"""Offline stub: deterministic insights so demos need no AWS credentials or GPU."""
from ..models import MedicalInsight, RiskLevel, VitalsSnapshot
from .base import MedicalAiProvider

PROTOCOLS = [
    "onboard://protocols/vital-thresholds-v1.md",
    "onboard://protocols/hypoxia-response.md",
    "onboard://protocols/radiation-shelter.md",
]


class MockMedicalAiProvider(MedicalAiProvider):
    name = "mock"

    def analyze(self, snap: VitalsSnapshot, context: str) -> MedicalInsight:
        risk, findings, action, sources = self._rule(snap, context)
        return MedicalInsight(
            risk_level=risk,
            findings=findings,
            recommended_action=action,
            sources=sources,
            provider="mock",
            model="vitalis-mock-v1",
            invoked=True,
            anomaly_detected=True,
            patient_id=snap.patient_id,
        )

    def _rule(self, snap: VitalsSnapshot, context: str) -> tuple[RiskLevel, str, str, list[str]]:
        titles = " ".join(snap.alert_titles).lower()
        scenario = (snap.scenario or "").lower()

        if snap.spo2 is not None and snap.spo2 < 92:
            return (
                "high",
                f"SpO2 at {snap.spo2:.1f}% is below the 92% critical threshold"
                + (f"; HR {snap.hr:.0f} bpm" if snap.hr else "")
                + ". Pattern consistent with possible hypoxia in the filtered window.",
                "Sit upright, check cabin O2/CO2, breathe slowly; notify the flight surgeon if SpO2 stays low.",
                [PROTOCOLS[1], PROTOCOLS[0]],
            )
        if "radiation" in titles or "solar" in scenario or (snap.scenario == "solar_particle_event"):
            return (
                "high",
                f"Radiation-related scenario or alerts with filtered vitals ({context}). "
                "Possible early autonomic response to elevated dose rate.",
                "Move to the shielded area, contact ground control, and log how you feel.",
                [PROTOCOLS[2], PROTOCOLS[0]],
            )
        if snap.temp is not None and snap.temp > 38.0:
            return (
                "medium",
                f"Core temperature {snap.temp:.1f} C exceeds 38.0 C with supporting vitals in context.",
                "Rest, hydrate, re-measure in 15 minutes; report if temperature keeps rising.",
                [PROTOCOLS[0]],
            )
        if snap.hr is not None and (snap.hr > 110 or snap.hr < 50):
            level: RiskLevel = "high" if snap.hr > 130 or snap.hr < 45 else "medium"
            return (
                level,
                f"Heart rate {snap.hr:.0f} bpm outside clinical anomaly band (50–110) after sensor filtering.",
                "Stop exertion, rest seated, reassess in 5 minutes; notify medical if it does not settle.",
                [PROTOCOLS[0]],
            )
        if snap.global_status == "red" or any("critical" in t.lower() for t in snap.alert_titles):
            return (
                "high",
                f"Elevated global status with active alerts. Filtered context: {context}.",
                "Follow the active on-board alert guidance and notify the medical team now.",
                [PROTOCOLS[0]],
            )
        return (
            "medium",
            f"Anomaly filter fired on filtered vitals ({context}). "
            "Local mock provider — replace with Bedrock RAG for protocol citations.",
            "Pause demanding tasks, review active alerts, and re-check vitals in 5 minutes.",
            [PROTOCOLS[0]],
        )
