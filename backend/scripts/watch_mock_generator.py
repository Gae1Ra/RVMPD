#!/usr/bin/env python3
"""Post watch-like WiFi samples to POST /api/ingest/watch so the UI can demo without a real watch.

Usage (backend already listening, preferably --host 0.0.0.0 for LAN phones):
  python scripts/watch_mock_generator.py
  python scripts/watch_mock_generator.py --url http://192.168.1.42:8000/api/ingest/watch --hz 1
"""
from __future__ import annotations

import argparse
import json
import math
import random
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sample(t: float) -> dict:
    # Continuous-ish HR with light sinusoid; SpO₂ only every ~25 s (occasional).
    hr = 68 + 4 * math.sin(t / 18) + random.uniform(-1.2, 1.2)
    spo2 = None
    if int(t) % 25 < 4:
        spo2 = round(97.5 + random.uniform(-0.6, 0.4), 1)
    temp = round(36.4 + 0.15 * math.sin(t / 40) + random.uniform(-0.05, 0.05), 2)
    hrv = round(44 + 3 * math.sin(t / 30) + random.uniform(-2, 2), 1)
    return {
        "device": "wifi_mock",
        "t_device": iso_now(),
        "hr": round(hr, 1),
        "spo2": spo2,
        "temp": temp,
        "hrv_rmssd": hrv,
        "sqi": {
            "hr": 0.92,
            "spo2": 0.88 if spo2 is not None else None,
            "temp": 0.85,
            "hrv_rmssd": 0.8,
        },
        "artifact": False,
        "permissions": [
            "READ_HEART_RATE",
            "READ_OXYGEN_SATURATION",
            "READ_SKIN_TEMPERATURE",
            "READ_HEART_RATE_VARIABILITY",
        ],
    }


def post(url: str, body: dict) -> str:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        return resp.read().decode("utf-8")


def main() -> None:
    p = argparse.ArgumentParser(description="Mock WiFi / Galaxy Watch → VITALIS ingest")
    p.add_argument("--url", default="http://127.0.0.1:8000/api/ingest/watch")
    p.add_argument("--hz", type=float, default=1.0, help="Posts per second")
    args = p.parse_args()
    interval = 1.0 / max(args.hz, 0.1)
    t0 = time.time()
    print(f"Posting WiFi vitals to {args.url} every {interval:.2f}s (Ctrl+C to stop)")
    while True:
        body = sample(time.time() - t0)
        try:
            print(post(args.url, body), flush=True)
        except urllib.error.URLError as e:
            print(f"backend unreachable: {e}", flush=True)
        time.sleep(interval)


if __name__ == "__main__":
    main()
