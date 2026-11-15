#!/usr/bin/env python3
"""Minimal real Bedrock call (Haiku 5.5). Default: bedrock-runtime via AnthropicBedrock.

Tries foundation id then US geo inference profile when VITALIS_MODEL is unset.
Never prints the API key. Run with your short-lived key in backend/.env.
"""
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
ENDPOINT = (os.environ.get("VITALIS_BEDROCK_ENDPOINT") or "runtime").strip().lower()
if ENDPOINT != "mantle":
    ENDPOINT = "runtime"

FOUNDATION_ID = "anthropic.claude-haiku-5-5"
RUNTIME_PROFILE = "us.anthropic.claude-haiku-5-5"
INVALID_TOKEN_MSG = (
    "token inválido: revisa que esté completo, que no haya vencido y que corresponda a la región"
)


def fail(reason: str, detail: str = "") -> int:
    print(f"FAIL: {reason}")
    if detail:
        print(detail)
    return 1


def classify(exc: BaseException) -> str:
    text = f"{type(exc).__name__}: {exc}".lower()
    if "expired" in text and any(k in text for k in ("token", "credential", "key", "bearer")):
        return "expired_key — regenera AWS_BEARER_TOKEN_BEDROCK (máx. 12 h) en la consola Bedrock"
    if any(k in text for k in ("401", "invalid bearer", "invalid api key", "unauthorized", "authentication")):
        return f"invalid_credential — {INVALID_TOKEN_MSG}"
    if any(k in text for k in ("not enabled", "not authorized", "access denied", "model not found",
                               "isn't supported", "not available", "unknown model", "validationexception")):
        return "model_not_enabled — habilita Claude Haiku 5.5 / prueba el otro id (foundation vs us. profile)"
    if any(k in text for k in ("region", "endpoint", "name or service not known")):
        return ("wrong_region_or_id — AWS_REGION debe coincidir con la clave (us-east-2); "
                f"runtime profile {RUNTIME_PROFILE}; Mantle foundation {FOUNDATION_ID}")
    if any(k in text for k in ("accessdenied", "not authorized to perform", "permission", "403", "forbidden")):
        return "permissions — la clave/cuenta no puede invocar este modelo"
    return f"other_error ({type(exc).__name__})"


def make_client():
    if ENDPOINT == "mantle":
        return anthropic.AnthropicBedrockMantle(aws_region=REGION, timeout=20.0, max_retries=0)
    return anthropic.AnthropicBedrock(aws_region=REGION, timeout=20.0, max_retries=0)


def models_to_try() -> list[str]:
    override = os.environ.get("VITALIS_MODEL")
    if override:
        return [override]
    # Documented AWS ids only — try foundation first, then US geo profile for runtime.
    if ENDPOINT == "mantle":
        return [FOUNDATION_ID, RUNTIME_PROFILE]
    return [FOUNDATION_ID, RUNTIME_PROFILE]


def try_model(client, model: str) -> tuple[bool, object | None, BaseException | None]:
    started = time.monotonic()
    try:
        msg = client.messages.create(
            model=model,
            max_tokens=32,
            messages=[{"role": "user", "content": "Reply with exactly: ok"}],
        )
        latency_ms = int((time.monotonic() - started) * 1000)
        text = "".join(getattr(b, "text", "") for b in msg.content)
        usage = getattr(msg, "usage", None)
        print(f"OK endpoint={ENDPOINT} model={model} latency_ms={latency_ms} reply={text!r}")
        if usage is not None:
            print(f"usage input_tokens={usage.input_tokens} output_tokens={usage.output_tokens}")
        return True, msg, None
    except Exception as e:
        print(f"TRY_FAIL model={model}: {classify(e)}")
        # Never print secrets; exception text may still mention auth — keep type + short message.
        err = str(e)
        if "bearer" in err.lower() or "token" in err.lower():
            err = f"{type(e).__name__}: (auth error details omitted)"
        print(f"  detail={err[:300]}")
        return False, None, e


def main() -> int:
    token = os.environ.get("AWS_BEARER_TOKEN_BEDROCK")
    if not token:
        return fail("missing_key", "Set AWS_BEARER_TOKEN_BEDROCK in backend/.env (short-lived Bedrock API key).")
    if os.environ.get("VITALIS_USE_BEDROCK") not in (None, "", "1"):
        print("Note: VITALIS_USE_BEDROCK is not 1; this script still calls Bedrock directly.")

    print(f"region={REGION} endpoint={ENDPOINT} client="
          f"{'AnthropicBedrockMantle' if ENDPOINT == 'mantle' else 'AnthropicBedrock'}")
    client = make_client()
    candidates = models_to_try()
    print(f"candidates={candidates}")

    last_exc: BaseException | None = None
    for model in candidates:
        ok, _, exc = try_model(client, model)
        if ok:
            if len(candidates) > 1:
                print(f"WORKING_MODEL={model}")
            return 0
        last_exc = exc

    if last_exc is not None:
        return fail(classify(last_exc), "Ningún candidato funcionó. Revisa endpoint, región e id (sin inventar otros).")
    return fail("no_candidates", "No model ids to try.")


if __name__ == "__main__":
    raise SystemExit(main())
