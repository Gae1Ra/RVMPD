"""Facade used by FastAPI routes: feature flag, filter, provider selection, safe fallback."""
from __future__ import annotations

import logging

from . import config
from .filter import context_summary, has_clinical_anomaly, is_physically_plausible
from .models import MedicalInsight, VitalsSnapshot
from .providers.base import MedicalAiProvider
from .providers.bedrock import BedrockMedicalAiProvider
from .providers.mock import MockMedicalAiProvider

log = logging.getLogger("vitalis.medical_ai")


def get_provider() -> MedicalAiProvider | None:
    if not config.medical_ai_enabled():
        return None
    if config.provider_name() == "bedrock":
        return BedrockMedicalAiProvider()
    return MockMedicalAiProvider()


def provider_status() -> dict:
    """Introspection for /api/medical-ai/status (no AWS calls)."""
    enabled = config.medical_ai_enabled()
    name = config.provider_name() if enabled else "disabled"
    return {
        "enabled": enabled,
        "provider": name,
        "region": config.aws_region(),
        "knowledge_base_id_set": bool(config.knowledge_base_id()),
        "guardrail_id_set": bool(config.guardrail_id()),
        "model_arn": config.model_arn() if enabled and name == "bedrock" else None,
        "note": (
            "Set VITALIS_MEDICAL_AI=1 to enable. Default provider is mock (offline). "
            "Use VITALIS_MEDICAL_AI_PROVIDER=bedrock with KB/guardrail env vars for AWS."
        ),
    }


def _idle_provider_id():
    from .models import ProviderId

    if not config.medical_ai_enabled():
        return "disabled"
    name = config.provider_name()
    return name if name in ("mock", "bedrock") else "disabled"  # type: ProviderId


def insight_from_vitals(snap: VitalsSnapshot, *, force: bool = False) -> MedicalInsight:
    """Run the filter then the configured provider.

    When the feature is off, returns a disabled stub (invoked=False) so the UI
    can still show a polished empty/idle state. When there is no anomaly and
    force is False, returns anomaly_detected=False without calling a model.
    """
    idle = _idle_provider_id()
    if not is_physically_plausible(snap):
        return MedicalInsight(
            risk_level="low",
            findings="Reading rejected as physiologically impossible sensor noise.",
            recommended_action="Check electrode contact and wait for a clean signal.",
            sources=[],
            provider=idle,
            model=None,
            invoked=False,
            anomaly_detected=False,
            patient_id=snap.patient_id,
        )

    anomaly = has_clinical_anomaly(snap)
    if not anomaly and not force:
        return MedicalInsight(
            risk_level="low",
            findings="Vitals within anomaly thresholds; medical AI not consulted (cost guardrail).",
            recommended_action="Continue routine monitoring. Use Analyze my data for a full window report.",
            sources=[],
            provider=idle,
            model=None,
            invoked=False,
            anomaly_detected=False,
            patient_id=snap.patient_id,
        )

    provider = get_provider()
    ctx = context_summary(snap)
    if provider is None:
        # Feature off: still return a mock-shaped insight for UI demos when forced/anomaly
        insight = MockMedicalAiProvider().analyze(snap, ctx)
        return insight.model_copy(
            update={
                "provider": "disabled",
                "invoked": False,
                "findings": "Medical AI feature flag is off (VITALIS_MEDICAL_AI). " + insight.findings,
            }
        )

    try:
        return provider.analyze(snap, ctx)
    except Exception as e:
        log.warning("Medical AI provider %s failed (%s); falling back to mock", provider.name, type(e).__name__)
        fallback = MockMedicalAiProvider().analyze(snap, ctx)
        return fallback.model_copy(
            update={"findings": f"[fallback after {provider.name} error] " + fallback.findings}
        )


def evaluate_vitals(snap: VitalsSnapshot, *, force: bool = False) -> MedicalInsight:
    """Alias used by routes."""
    return insight_from_vitals(snap, force=force)
