#!/usr/bin/env python3
"""Wait for enough simulator readings, then call analysis endpoints and print a readable report.

Requires a running backend (uvicorn). Does not need Bedrock for the local engine path.
Optional Bedrock refinement uses backend/.env when the server was started with those vars.

Usage (from anywhere):
  python backend/scripts/try_analysis.py
  cd backend && python scripts/try_analysis.py
"""
from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# Allow `python scripts/try_analysis.py` from backend/ and imports of app.analysis.MIN_ROWS.
_BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND))

try:
    from dotenv import load_dotenv

    load_dotenv(_BACKEND / ".env")
    load_dotenv(_BACKEND.parent / ".env")
except ImportError:
    pass

from app.analysis import MIN_ROWS  # noqa: E402

BASE = "http://127.0.0.1:8000"
POLL_S = 1.0
TIMEOUT_S = 90.0


def _get(path: str):
    req = urllib.request.Request(BASE + path, method="GET")
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode())


def _post(path: str, body: dict | None = None):
    data = json.dumps(body or {}).encode()
    req = urllib.request.Request(
        BASE + path,
        data=data,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode())


def _section(title: str) -> None:
    print(f"\n=== {title} ===")


def wait_for_readings(need: int = MIN_ROWS) -> int:
    """Poll GET /api/stats until enough rows are stored (simulator ~1/s)."""
    _section(f"Waiting for ≥{need} readings")
    started = time.monotonic()
    rows = 0
    while True:
        try:
            stats = _get("/api/stats")
            rows = int(stats.get("rows") or 0)
        except urllib.error.URLError as e:
            elapsed = time.monotonic() - started
            if elapsed >= TIMEOUT_S:
                raise SystemExit(
                    f"Backend not reachable at {BASE} after {TIMEOUT_S:.0f}s ({e}). "
                    "Start uvicorn first: cd backend && uvicorn app.main:app --port 8000"
                ) from e
            print(f"  backend down ({e}); retrying…")
            time.sleep(POLL_S)
            continue

        print(f"  rows={rows}/{need}")
        if rows >= need:
            return rows
        if time.monotonic() - started >= TIMEOUT_S:
            raise SystemExit(
                f"Timed out after {TIMEOUT_S:.0f}s with only {rows}/{need} readings. "
                "Is the simulator loop running (uvicorn lifespan)?"
            )
        time.sleep(POLL_S)


def print_report(report: dict, engine: dict) -> None:
    _section("Engine status (GET /api/analysis/engine)")
    print(f"  provider:   {engine.get('provider')}")
    print(f"  model:      {engine.get('model')}")
    print(f"  configured: {engine.get('configured')}")
    print(f"  spent_usd:  {engine.get('spent_usd')}")
    print(f"  cap_usd:    {engine.get('cap_usd')}")

    _section("Analysis report (POST /api/analysis)")
    print(f"  engine:      {report.get('engine')}")
    print(f"  model:       {report.get('model')}")
    print(f"  data_points: {report.get('data_points')}")
    print(f"  summary:     {report.get('summary')}")
    findings = report.get("findings") or []
    if not findings:
        print("  findings:    (none)")
    else:
        print(f"  findings ({len(findings)}):")
        for i, f in enumerate(findings, 1):
            print(f"    {i}. {f.get('condition')} [{f.get('likelihood')}]")
            for line in f.get("evidence") or []:
                print(f"       - {line}")
            if f.get("action"):
                print(f"       action: {f['action']}")

    if report.get("engine") == "local":
        _section("Local engine / fallback reason")
        summary = (report.get("summary") or "").lower()
        if "spend cap" in summary or "tope de gasto" in summary:
            print("  reason: spend_cap (also logged as fallback=spend_cap)")
        elif "rate limit" in summary or "límite de frecuencia" in summary:
            print("  reason: rate_limit (also logged as fallback=rate_limit)")
        elif "waiting for readings" in summary:
            print("  reason: thin_data — wait for more simulator readings (no LLM call)")
        elif not engine.get("configured"):
            print("  reason: LLM not configured (set VITALIS_USE_BEDROCK=1 + key, or ANTHROPIC_API_KEY)")
        else:
            print(
                "  reason: local fallback — check uvicorn logs for "
                "`fallback=<code>` (e.g. expired_credential, model_not_enabled, "
                "wrong_region, timeout, invalid_response, model_error, none)."
            )


def main() -> int:
    print(f"BASE={BASE} MIN_ROWS={MIN_ROWS}")
    wait_for_readings(MIN_ROWS)
    report = _post("/api/analysis", {"minutes": 60})
    engine = _get("/api/analysis/engine")
    print_report(report, engine)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
