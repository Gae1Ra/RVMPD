"""Contained medical AI client: mock by default, Bedrock-shaped when enabled.

See docs/AI_MEDICAL.md. Invoked only after the clinical anomaly filter fires
(cost guardrail from the Bedrock/Wi-Fi guide). Never required for local demos.
"""
from .client import evaluate_vitals, get_provider, insight_from_vitals, provider_status
from .models import MedicalInsight, RiskLevel, VitalsSnapshot

__all__ = [
    "MedicalInsight",
    "RiskLevel",
    "VitalsSnapshot",
    "evaluate_vitals",
    "get_provider",
    "insight_from_vitals",
    "provider_status",
]
