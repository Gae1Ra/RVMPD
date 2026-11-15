"""AWS Bedrock RetrieveAndGenerate wiring (Knowledge Base + Guardrails).

Requires boto3 and valid AWS credentials at runtime. Importing this module does
not call AWS. If credentials or KB/guardrail IDs are missing, analyze() raises
so the client layer can fall back to the mock provider.
"""
from __future__ import annotations

import logging
import re

from .. import config
from ..models import MedicalInsight, RiskLevel, VitalsSnapshot
from .base import MedicalAiProvider

log = logging.getLogger("vitalis.medical_ai.bedrock")

PROMPT = (
    "Analyze the following filtered biometric data for patient {patient_id}: {context}. "
    "Based exclusively on the medical protocols in the knowledge base, state: "
    "1) Risk level (LOW, MEDIUM, HIGH), "
    "2) Possible clinical finding, "
    "3) Immediate recommended action. "
    "Respond briefly and structured. Decision support only — not a diagnosis."
)


class BedrockMedicalAiProvider(MedicalAiProvider):
    name = "bedrock"

    def __init__(self):
        self.region = config.aws_region()
        self.kb_id = config.knowledge_base_id()
        self.guardrail_id = config.guardrail_id()
        self.guardrail_version = config.guardrail_version()
        self.model_arn = config.model_arn()
        self._client = None

    def _runtime(self):
        if self._client is not None:
            return self._client
        if not self.kb_id:
            raise RuntimeError("VITALIS_KNOWLEDGE_BASE_ID / KNOWLEDGE_BASE_ID is not set")
        try:
            import boto3  # optional dependency — only needed when provider=bedrock
        except ImportError as e:
            raise RuntimeError("boto3 is required for the Bedrock provider (pip install boto3)") from e
        self._client = boto3.client("bedrock-agent-runtime", region_name=self.region)
        return self._client

    def analyze(self, snap: VitalsSnapshot, context: str) -> MedicalInsight:
        client = self._runtime()
        prompt = PROMPT.format(patient_id=snap.patient_id, context=context)
        kb_cfg: dict = {
            "knowledgeBaseId": self.kb_id,
            "modelArn": self.model_arn,
        }
        if self.guardrail_id:
            kb_cfg["generationConfiguration"] = {
                "guardrailConfiguration": {
                    "guardrailId": self.guardrail_id,
                    "guardrailVersion": self.guardrail_version,
                }
            }
        response = client.retrieve_and_generate(
            input={"text": prompt},
            retrieveAndGenerateConfiguration={
                "type": "KNOWLEDGE_BASE",
                "knowledgeBaseConfiguration": kb_cfg,
            },
        )
        text = response.get("output", {}).get("text") or ""
        sources = _extract_sources(response)
        risk = _parse_risk(text)
        findings, action = _split_findings_action(text)
        return MedicalInsight(
            risk_level=risk,
            findings=findings or text.strip() or "No structured finding returned.",
            recommended_action=action or "Follow on-board alert guidance and notify the flight surgeon if unsure.",
            sources=sources,
            provider="bedrock",
            model=self.model_arn,
            invoked=True,
            anomaly_detected=True,
            patient_id=snap.patient_id,
        )


def _extract_sources(response: dict) -> list[str]:
    uris: list[str] = []
    for citation in response.get("citations") or []:
        for ref in citation.get("retrievedReferences") or []:
            loc = (ref.get("location") or {}).get("s3Location") or {}
            uri = loc.get("uri")
            if uri:
                uris.append(uri)
    # Preserve order, drop duplicates
    seen: set[str] = set()
    out: list[str] = []
    for u in uris:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def _parse_risk(text: str) -> RiskLevel:
    upper = text.upper()
    if re.search(r"\b(HIGH|ALTO|CRITIC)", upper):
        return "high"
    if re.search(r"\b(MEDIUM|MEDIO|MODERAD)", upper):
        return "medium"
    if re.search(r"\b(LOW|BAJO)", upper):
        return "low"
    return "medium"


def _split_findings_action(text: str) -> tuple[str, str]:
    """Best-effort split when the model returns numbered sections."""
    action = ""
    findings = text.strip()
    m = re.search(
        r"(?:recommended action|acci[oó]n(?: inmediata)?(?: recomendada)?)\s*[:\-]\s*(.+)",
        text,
        re.I | re.S,
    )
    if m:
        action = m.group(1).strip().split("\n")[0].strip()
    return findings, action
