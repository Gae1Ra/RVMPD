"""Galaxy Watch → CONTRACT vitals mapping and last-sample store.

Decision support only. Missing sensors stay null — never invent clinical values.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field


class WatchIngest(BaseModel):
    """POST /api/ingest/watch body. Null means the watch/SDK did not provide that sample."""

    device: str = "galaxy_watch"
    t_device: str | None = None
    hr: float | None = None
    spo2: float | None = None
    temp: float | None = None
    hrv_rmssd: float | None = None
    sqi: dict[str, float | None] = Field(default_factory=dict)
    artifact: bool = False
    permissions: list[str] = Field(default_factory=list)


CONTRACT_WATCH_KEYS = ("hr", "spo2", "temp", "hrv_rmssd")
# Never claimed from a typical Galaxy Watch third-party path:
WATCH_UNAVAILABLE = ("resp_rate", "bp_sys")


def map_watch_to_contract(body: WatchIngest) -> dict[str, float | None]:
    """Map ingest fields to CONTRACT vital keys; missing → null."""
    return {
        "hr": body.hr,
        "spo2": body.spo2,
        "temp": body.temp,
        "hrv_rmssd": body.hrv_rmssd,
        "resp_rate": None,
        "bp_sys": None,
    }


def _iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


@dataclass
class WatchStore:
    """Holds the latest watch aggregate for demo overlay / status."""

    last: WatchIngest | None = None
    last_sync: str | None = None
    mapped: dict[str, float | None] = field(default_factory=dict)
    receive_count: int = 0

    def ingest(self, body: WatchIngest) -> dict[str, Any]:
        self.last = body
        self.last_sync = _iso_now()
        self.mapped = map_watch_to_contract(body)
        self.receive_count += 1
        return {
            "ok": True,
            "mapped": self.mapped,
            "last_sync": self.last_sync,
            "artifact": body.artifact,
            "device": body.device,
            "receive_count": self.receive_count,
        }

    def status(self) -> dict[str, Any]:
        available = {
            k: self.mapped.get(k) is not None for k in (*CONTRACT_WATCH_KEYS, *WATCH_UNAVAILABLE)
        }
        return {
            "connected": self.last is not None,
            "last_sync": self.last_sync,
            "device": self.last.device if self.last else None,
            "available": available,
            "mapped": self.mapped,
            "receive_count": self.receive_count,
            "note": "Decision support, not a medical diagnosis.",
        }

    def overlay_truth(self, truth: dict) -> dict:
        """Apply last watch sample onto simulator truth for galaxy_watch scenario.

        Only overrides keys that are non-null in the last ingest. Leaves others alone
        so the existing engine keeps running without invented clinical thresholds.
        """
        if not self.last:
            return truth
        out = dict(truth)
        if self.mapped.get("hr") is not None:
            out["hr"] = float(self.mapped["hr"])
        if self.mapped.get("spo2") is not None:
            out["spo2"] = float(self.mapped["spo2"])
        if self.mapped.get("temp") is not None:
            out["temp"] = float(self.mapped["temp"])
        if self.mapped.get("hrv_rmssd") is not None:
            out["rmssd"] = float(self.mapped["hrv_rmssd"])
        if self.last.artifact:
            out["ecg_quality"] = min(float(out.get("ecg_quality", 1.0)), 0.2)
        return out
