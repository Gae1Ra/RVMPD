"""Optional language-model layer: rewrites the local report from the same aggregated numbers."""
from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Literal

import anthropic
from pydantic import BaseModel, Field

log = logging.getLogger("vitalis.llm")

# Optional .env loading (no crash if python-dotenv is missing).
try:
    from dotenv import load_dotenv

    _backend_dir = Path(__file__).resolve().parent.parent
    load_dotenv(_backend_dir / ".env")
    load_dotenv(_backend_dir.parent / ".env")
except ImportError:
    pass

# Anthropic API id; Bedrock defaults depend on endpoint (see bedrock_endpoint / default_bedrock_model).
# AWS model card: foundation id anthropic.claude-haiku-5-5; bedrock-runtime in us-east-2 is
# inference-profile-only → us.anthropic.claude-haiku-5-5. Mantle uses the foundation id.
# Live success of either id is not verified in this repo — smoke tries both and reports.
DEFAULT_MODEL = "claude-haiku-5-5"
DEFAULT_BEDROCK_MODEL = f"anthropic.{DEFAULT_MODEL}"
DEFAULT_BEDROCK_RUNTIME_PROFILE = f"us.{DEFAULT_BEDROCK_MODEL}"
MAX_TOKENS = 1500
TIMEOUT_S = 20.0
DEFAULT_SPEND_CAP_USD = 0.50
DEFAULT_INPUT_USD_PER_MTOK = 0.10
DEFAULT_OUTPUT_USD_PER_MTOK = 0.50
MIN_CALL_INTERVAL_S = 30.0
MAX_SESSION_CALLS = 100
HRP_NOTES_PATH = Path(__file__).resolve().parent / "context" / "hrp_notes.md"
INVALID_TOKEN_MSG = (
    "token inválido: revisa que esté completo, que no haya vencido y que corresponda a la región"
)
EXPIRED_TOKEN_MSG = "credencial vencida, genera una nueva"

_session_calls = 0
_last_call_monotonic = 0.0

SYSTEM = """You are the on-board medical-support assistant for an astronaut who is not a doctor. \
You provide decision support only — never a diagnosis and never a prescription. Always say "possible"; \
never state that the astronaut has a condition. If you are unsure, say so and refer them to the medical / \
flight-surgeon team.

Mission context you may use (not thresholds): personal baseline comparison; possible hypoxia; possible early \
radiation response; fatigue / poor recovery; fever; low blood pressure or fluid shift; sensor / equipment failure \
when a vital is marked usable=false.

You receive aggregated statistics for a recent time window, local rule-engine findings, and a short HRP-style \
mission brief. Ground every statement in the supplied numbers, quote them in the evidence, and never invent \
measurements or conditions the numbers do not support. A vital marked usable=false is an equipment problem — \
never use it as evidence for a body condition. If nothing is unusual, return no findings and say so in the \
summary. Use plain words and keep every item short."""

# Brief few-shots matching ModelReport (keep short; total with hrp_notes.md ≈ under 2000 tokens).
FEW_SHOTS = [
    {
        "role": "user",
        "content": json.dumps({
            "statistics": {"window_minutes": 60, "vitals": {"spo2": {"mean": 89.0, "delta": -9.0, "usable": True},
                           "hr": {"mean": 88.0, "delta": 16.0, "usable": True}}, "local_findings_hint": "hypoxia"},
            "local_findings": [{"condition": "Possible low blood oxygen (hypoxia)", "likelihood": "high"}],
        }, separators=(",", ":")),
    },
    {
        "role": "assistant",
        "content": json.dumps({
            "summary": "Possible low blood oxygen in the last hour; SpO2 sat below baseline with a faster pulse.",
            "findings": [{
                "condition": "Possible low blood oxygen (hypoxia)",
                "likelihood": "high",
                "evidence": ["Blood oxygen averaged 89.0 %, 9.0 below your baseline",
                             "Heart rate averaged 88.0 bpm, 16.0 above your baseline"],
                "action": "Check cabin oxygen and CO2, sit upright and breathe slowly; tell the flight surgeon if it does not improve.",
            }],
            "facts": ["SpO2 averaged 89.0 % over the window.", "Heart rate averaged 88.0 bpm over the window."],
        }, separators=(",", ":")),
    },
    {
        "role": "user",
        "content": json.dumps({
            "statistics": {"window_minutes": 60, "dose": {"mean_rate": 280.0}, "vitals": {
                "hrv_rmssd": {"mean": 28.0, "delta": -14.0, "usable": True}}},
            "local_findings": [{"condition": "Possible early response to radiation exposure", "likelihood": "medium"}],
        }, separators=(",", ":")),
    },
    {
        "role": "assistant",
        "content": json.dumps({
            "summary": "Possible early response to higher radiation dose rate with lower heart-rate variability.",
            "findings": [{
                "condition": "Possible early response to radiation exposure",
                "likelihood": "medium",
                "evidence": ["Radiation dose rate averaged 280.0 uSv/h",
                             "Heart rate variability averaged 28.0 ms, 14.0 below your baseline"],
                "action": "Move to the shielded area, contact ground control and log how you feel.",
            }],
            "facts": ["Dose rate averaged 280.0 uSv/h.", "HRV averaged 28.0 ms over the window."],
        }, separators=(",", ":")),
    },
    {
        "role": "user",
        "content": json.dumps({
            "statistics": {"window_minutes": 30, "vitals": {"hr": {"untrusted_share": 0.7, "usable": False},
                                                           "hrv_rmssd": {"untrusted_share": 0.7, "usable": False}}},
            "local_findings": [{"condition": "Possible sensor problem: ECG electrodes", "likelihood": "high"}],
        }, separators=(",", ":")),
    },
    {
        "role": "assistant",
        "content": json.dumps({
            "summary": "Possible ECG electrode problem; heart readings were untrusted for most of the window.",
            "findings": [{
                "condition": "Possible sensor problem: ECG electrodes",
                "likelihood": "high",
                "evidence": ["The ECG electrodes signal was untrusted for 70% of the window",
                             "Heart rate and HRV were left out of the body analysis"],
                "action": "Check that the ECG electrodes sit firmly in place and wait for the signal to return.",
            }],
            "facts": ["ECG channel untrusted about 70% of the window.",
                      "No body condition is claimed from untrusted heart readings."],
        }, separators=(",", ":")),
    },
    {
        "role": "user",
        "content": json.dumps({
            "statistics": {"window_minutes": 60, "vitals": {"hr": {"mean": 72.0, "delta": 0.5, "usable": True}}},
            "local_findings": [],
        }, separators=(",", ":")),
    },
    {
        "role": "assistant",
        "content": json.dumps({
            "summary": "Nothing unusual in the last hour; readings stayed close to your baseline.",
            "findings": [],
            "facts": ["Heart rate averaged 72.0 bpm, near baseline.",
                      "No local rule-engine findings in this window."],
        }, separators=(",", ":")),
    },
]


class Finding(BaseModel):
    condition: str
    likelihood: Literal["low", "medium", "high"]
    evidence: list[str] = Field(min_length=1)
    action: str


class ModelReport(BaseModel):
    summary: str
    findings: list[Finding] = Field(max_length=5)
    facts: list[str] = Field(min_length=2, max_length=6)


def _load_hrp_notes() -> str:
    try:
        return HRP_NOTES_PATH.read_text(encoding="utf-8")
    except OSError:
        return ""


def _env_float(name: str, default: float) -> float:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def spend_cap_usd() -> float:
    return _env_float("VITALIS_SPEND_CAP_USD", DEFAULT_SPEND_CAP_USD)


def estimate_cost_usd(input_tokens: int, output_tokens: int) -> float:
    inp = _env_float("VITALIS_INPUT_USD_PER_MTOK", DEFAULT_INPUT_USD_PER_MTOK)
    out = _env_float("VITALIS_OUTPUT_USD_PER_MTOK", DEFAULT_OUTPUT_USD_PER_MTOK)
    return (input_tokens / 1_000_000.0) * inp + (output_tokens / 1_000_000.0) * out


def reset_session_limits() -> None:
    """Test helper: clear in-process rate-limit counters."""
    global _session_calls, _last_call_monotonic
    _session_calls = 0
    _last_call_monotonic = 0.0


def bedrock_endpoint() -> str:
    """`runtime` (default, bedrock-runtime) or `mantle` (AnthropicBedrockMantle)."""
    raw = (os.environ.get("VITALIS_BEDROCK_ENDPOINT") or "runtime").strip().lower()
    return "mantle" if raw == "mantle" else "runtime"


def default_bedrock_model() -> str:
    """Model id when VITALIS_MODEL is unset. Runtime defaults to the US geo inference profile."""
    if bedrock_endpoint() == "mantle":
        return DEFAULT_BEDROCK_MODEL
    return DEFAULT_BEDROCK_RUNTIME_PROFILE


def configured_provider() -> tuple[str, str | None, bool]:
    """Return (provider, model_id_or_None, configured). No network."""
    if os.environ.get("ANTHROPIC_API_KEY"):
        return "anthropic", os.environ.get("VITALIS_MODEL", DEFAULT_MODEL), True
    if os.environ.get("VITALIS_USE_BEDROCK") == "1":
        return "bedrock", os.environ.get("VITALIS_MODEL", default_bedrock_model()), True
    return "local", None, False


def engine_status(db=None) -> dict:
    """GET /api/analysis/engine payload — no network calls."""
    provider, model, configured = configured_provider()
    spent = float(db.get_llm_spend_usd()) if db is not None else 0.0
    return {
        "provider": provider,
        "model": model,
        "configured": configured,
        "spent_usd": round(spent, 6),
        "cap_usd": spend_cap_usd(),
    }


def make_client():
    """Return (client, model id), or None when no model is configured. Credentials come from the environment only."""
    if os.environ.get("ANTHROPIC_API_KEY"):
        client = anthropic.Anthropic(timeout=TIMEOUT_S, max_retries=0)
        return client, os.environ.get("VITALIS_MODEL", DEFAULT_MODEL)
    if os.environ.get("VITALIS_USE_BEDROCK") == "1":
        region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "us-east-2"
        # Both clients read AWS_BEARER_TOKEN_BEDROCK (short-lived Bedrock API key). No IAM keys.
        if bedrock_endpoint() == "mantle":
            client = anthropic.AnthropicBedrockMantle(aws_region=region, timeout=TIMEOUT_S, max_retries=0)
        else:
            client = anthropic.AnthropicBedrock(aws_region=region, timeout=TIMEOUT_S, max_retries=0)
        return client, os.environ.get("VITALIS_MODEL", default_bedrock_model())
    return None


def _note_local(local: dict, note: str) -> dict:
    out = dict(local)
    summary = out.get("summary") or ""
    if note not in summary:
        out["summary"] = f"{summary} ({note})" if summary else note
    return out


def _spend_cap_note(lang: str) -> str:
    if lang == "es":
        return "Modelo omitido: tope de gasto alcanzado"
    if lang == "fr":
        return "Modèle omis : plafond de dépense atteint"
    return "Language model skipped: spend cap reached"


def _rate_limit_note(lang: str) -> str:
    if lang == "es":
        return "Modelo omitido: límite de frecuencia"
    if lang == "fr":
        return "Modèle omis : limite de fréquence"
    return "Language model skipped: rate limit"


def _classify_failure(exc: BaseException) -> str:
    text = f"{type(exc).__name__}: {exc}".lower()
    if isinstance(exc, TimeoutError) or type(exc).__name__ in ("APITimeoutError", "TimeoutException"):
        return "timeout"
    # 401 / invalid bearer ≠ necessarily expired (truncated key, wrong region, wrong endpoint).
    if "expired" in text and any(k in text for k in ("token", "credential", "key", "bearer")):
        return "expired_credential"
    if any(k in text for k in ("401", "invalid bearer", "invalid api key", "invalid_api_key",
                               "unauthorized", "authentication", "forbidden", "403")):
        return "invalid_credential"
    if any(k in text for k in ("not enabled", "not authorized for model", "access denied", "model not found",
                               "validationexception", "isn't supported", "not available", "unknown model")):
        return "model_not_enabled"
    if any(k in text for k in ("wrong region", "region mismatch", "could not connect", "name or service not known",
                               "endpoint")):
        return "wrong_region"
    if any(k in text for k in ("validation error", "parse error", "json", "output_format", "pydantic",
                               "invalid response")):
        return "invalid_response"
    return "model_error"


def _fallback_detail(reason: str) -> str | None:
    if reason == "invalid_credential":
        return INVALID_TOKEN_MSG
    if reason == "expired_credential":
        return EXPIRED_TOKEN_MSG
    return None


def _few_shot_block() -> str:
    lines = ["\n\n--- Good report examples (same schema) ---"]
    for i in range(0, len(FEW_SHOTS), 2):
        user = FEW_SHOTS[i]["content"]
        assistant = FEW_SHOTS[i + 1]["content"]
        lines.append(f"\nExample input:\n{user}\nExample output:\n{assistant}")
    return "".join(lines)


def _system_prompt(lang: str) -> str:
    from .languages import llm_instruction, normalize_lang

    hrp = _load_hrp_notes()
    parts = [SYSTEM, _few_shot_block()]
    if hrp:
        parts.append("\n\n--- Mission brief (HRP-style summary) ---\n" + hrp)
    instruction = llm_instruction(normalize_lang(lang))
    if instruction:
        parts.append("\n\n" + instruction)
    return "".join(parts)


def _allow_call(db, lang: str) -> tuple[bool, dict | None]:
    """Return (ok, local_override). local_override is a modified local report when skipping."""
    global _session_calls, _last_call_monotonic
    spent = float(db.get_llm_spend_usd()) if db is not None else 0.0
    cap = spend_cap_usd()
    if spent >= cap:
        log.warning("provider=%s latency_ms=%s fallback=%s", configured_provider()[0], 0, "spend_cap")
        return False, None  # caller attaches note
    now = time.monotonic()
    if _session_calls >= MAX_SESSION_CALLS:
        log.warning("provider=%s latency_ms=%s fallback=%s", configured_provider()[0], 0, "session_call_cap")
        return False, None
    if _last_call_monotonic and (now - _last_call_monotonic) < MIN_CALL_INTERVAL_S:
        log.warning("provider=%s latency_ms=%s fallback=%s", configured_provider()[0], 0, "rate_limit")
        return False, None
    return True, None


def refine(stats, local, db=None, lang: str = "en"):
    """Return the model's report, or `local` unchanged if the model is missing, slow, failing or invalid."""
    global _session_calls, _last_call_monotonic
    from .languages import normalize_lang

    lang = normalize_lang(lang)
    configured_client = make_client()
    if configured_client is None:
        return local
    provider = configured_provider()[0]
    if provider == "local":
        # make_client was mocked in tests without env flags; treat as anthropic-compatible.
        provider = "anthropic"

    ok, _ = _allow_call(db, lang)
    if not ok:
        spent = float(db.get_llm_spend_usd()) if db is not None else 0.0
        if spent >= spend_cap_usd():
            return _note_local(local, _spend_cap_note(lang))
        return _note_local(local, _rate_limit_note(lang))

    started = time.monotonic()
    try:
        client, model = configured_client
        user_payload = {"statistics": stats, "local_findings": local["findings"]}
        reply = client.messages.parse(
            model=model, max_tokens=MAX_TOKENS, system=_system_prompt(lang),
            messages=[{"role": "user", "content": json.dumps(user_payload, separators=(",", ":"))}],
            output_config={"effort": "low"}, output_format=ModelReport)
        latency_ms = int((time.monotonic() - started) * 1000)
        report = reply.parsed_output
        if report is None:
            log.warning("provider=%s latency_ms=%s fallback=%s", provider, latency_ms, "invalid_response")
            return local

        usage = getattr(reply, "usage", None)
        in_tok = int(getattr(usage, "input_tokens", 0) or 0)
        out_tok = int(getattr(usage, "output_tokens", 0) or 0)
        cost = estimate_cost_usd(in_tok, out_tok)
        if db is not None and cost > 0:
            db.add_llm_spend_usd(cost)

        _session_calls += 1
        _last_call_monotonic = time.monotonic()
        log.info("provider=%s latency_ms=%s fallback=%s", provider, latency_ms, "none")
        return {**local, **report.model_dump(), "engine": "llm", "model": model}
    except Exception as e:  # the contract: a model failure never becomes an API error
        latency_ms = int((time.monotonic() - started) * 1000)
        reason = _classify_failure(e)
        detail = _fallback_detail(reason)
        if detail:
            log.warning("provider=%s latency_ms=%s fallback=%s detail=%s",
                        provider, latency_ms, reason, detail)
        else:
            log.warning("provider=%s latency_ms=%s fallback=%s error_type=%s",
                        provider, latency_ms, reason, type(e).__name__)
        return local
