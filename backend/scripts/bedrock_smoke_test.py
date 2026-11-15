#!/usr/bin/env python3
"""Minimal real Bedrock Mantle call (Haiku 5.5). Run with your short-lived key in backend/.env."""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

# Allow `python scripts/bedrock_smoke_test.py` from backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
    load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")
except ImportError:
    pass

import anthropic


REGION = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "us-east-2"
MODEL = os.environ.get("VITALIS_MODEL", "anthropic.claude-haiku-5-5")


def fail(reason: str, detail: str = "") -> int:
    print(f"FAIL: {reason}")
    if detail:
        print(detail)
    return 1


def classify(exc: BaseException) -> str:
    text = f"{type(exc).__name__}: {exc}".lower()
    if any(k in text for k in ("expired", "unauthorized", "401", "invalid api key", "credential", "403")):
        return "expired_key — regenera AWS_BEARER_TOKEN_BEDROCK (máx. 12 h) en la consola Bedrock"
    if any(k in text for k in ("not enabled", "not authorized", "access denied", "model not found",
                               "isn't supported", "not available", "unknown model")):
        return "model_not_enabled — habilita Claude Haiku 5.5 / revisa VITALIS_MODEL"
    if any(k in text for k in ("region", "endpoint", "name or service not known")):
        return "wrong_region_or_id — AWS_REGION debe coincidir con la clave (us-east-2); Mantle id anthropic.claude-haiku-5-5"
    if any(k in text for k in ("accessdenied", "not authorized to perform", "permission")):
        return "permissions — la clave/cuenta no puede invocar este modelo"
    return f"other_error ({type(exc).__name__})"


def main() -> int:
    token = os.environ.get("AWS_BEARER_TOKEN_BEDROCK")
    if not token:
        return fail("missing_key", "Set AWS_BEARER_TOKEN_BEDROCK in backend/.env (short-lived Bedrock API key).")
    if os.environ.get("VITALIS_USE_BEDROCK") not in (None, "", "1"):
        print("Note: VITALIS_USE_BEDROCK is not 1; this script still calls Mantle directly.")

    print(f"region={REGION} model={MODEL}")
    client = anthropic.AnthropicBedrockMantle(aws_region=REGION, timeout=20.0, max_retries=0)
    started = time.monotonic()
    try:
        msg = client.messages.create(
            model=MODEL,
            max_tokens=32,
            messages=[{"role": "user", "content": "Reply with exactly: ok"}],
        )
    except Exception as e:
        return fail(classify(e), str(e))

    latency_ms = int((time.monotonic() - started) * 1000)
    text = "".join(getattr(b, "text", "") for b in msg.content)
    usage = getattr(msg, "usage", None)
    print(f"OK latency_ms={latency_ms} reply={text!r}")
    if usage is not None:
        print(f"usage input_tokens={usage.input_tokens} output_tokens={usage.output_tokens}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
