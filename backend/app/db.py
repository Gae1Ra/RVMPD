"""Local SQLite storage: one row of vitals per second, alerts, check-ins, scenario changes and reports."""
import json
import math
import os
import sqlite3
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .stats import BASELINE

DEFAULT_PATH = Path(__file__).resolve().parent.parent / "data" / "vitalis.db"
MAX_POINTS = 300
VITALS = tuple(BASELINE)
DOSE = {"dose_rate", "dose_total"}

_VITAL_COLUMNS = ", ".join(f"{v} REAL, {v}_status TEXT, {v}_sqi REAL" for v in VITALS)
SCHEMA = f"""
CREATE TABLE IF NOT EXISTS samples (
    id INTEGER PRIMARY KEY, t TEXT NOT NULL, mission_t REAL, scenario TEXT,
    {_VITAL_COLUMNS},
    dose_rate REAL, dose_total REAL, radiation_status TEXT, global_status TEXT);
CREATE INDEX IF NOT EXISTS samples_t ON samples (t);
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY, t TEXT NOT NULL, metric TEXT, level TEXT, origin TEXT, title TEXT);
CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY, t TEXT NOT NULL, mood INTEGER, sleep_hours REAL, note TEXT);
CREATE TABLE IF NOT EXISTS scenario_changes (id INTEGER PRIMARY KEY, t TEXT NOT NULL, scenario TEXT);
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY, t TEXT NOT NULL, window_minutes INTEGER, engine TEXT, body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS llm_spend (
    id INTEGER PRIMARY KEY CHECK (id = 1), spent_usd REAL NOT NULL DEFAULT 0);
"""
_INSERT_SAMPLE = (
    "INSERT INTO samples (t, mission_t, scenario, "
    + ", ".join(f"{v}, {v}_status, {v}_sqi" for v in VITALS)
    + ", dose_rate, dose_total, radiation_status, global_status) VALUES ("
    + ", ".join("?" * (3 + 3 * len(VITALS) + 4)) + ")")


def iso(moment):
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ")


def now_iso():
    return iso(datetime.now(timezone.utc))


def minutes_ago(minutes):
    return iso(datetime.now(timezone.utc) - timedelta(minutes=minutes))


class Database:
    def __init__(self, path=None):
        self.path = Path(path or os.environ.get("VITALIS_DB") or DEFAULT_PATH)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._local = threading.local()
        self._connections = []
        self._lock = threading.Lock()
        with self._conn() as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.executescript(SCHEMA)

    def _conn(self):
        # One connection per thread, so a long analysis read never blocks the simulation's writes
        conn = getattr(self._local, "conn", None)
        if conn is None:
            conn = sqlite3.connect(self.path, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA synchronous=NORMAL")
            self._local.conn = conn
            with self._lock:
                self._connections.append(conn)
        return conn

    def close(self):
        with self._lock:
            for conn in self._connections:
                conn.close()
            self._connections.clear()
        self._local = threading.local()

    def record_sample(self, t, mission_t, scenario, vitals, dose_rate, dose_total, radiation, global_status):
        """vitals is the frame's {name: {value, status, sqi}} block."""
        cells = [t, mission_t, scenario]
        for name in VITALS:
            v = vitals[name]
            cells += [v["value"], v["status"], v["sqi"]]
        cells += [dose_rate, dose_total, radiation, global_status]
        with self._conn() as conn:
            conn.execute(_INSERT_SAMPLE, cells)

    def samples_since(self, minutes):
        """Every row of the last `minutes`, oldest first."""
        with self._conn() as conn:
            return conn.execute("SELECT * FROM samples WHERE t >= ? ORDER BY t", (minutes_ago(minutes),)).fetchall()

    def history(self, metric, minutes):
        """Points for one metric, oldest first, thinned to at most MAX_POINTS."""
        if metric in DOSE:
            column, status = metric, "radiation_status"
        elif metric in VITALS:
            column, status = metric, f"{metric}_status"
        else:
            raise KeyError(metric)
        with self._conn() as conn:
            rows = conn.execute(f"SELECT t, {column} AS value, {status} AS status FROM samples "
                                "WHERE t >= ? ORDER BY t", (minutes_ago(minutes),)).fetchall()
        step = math.ceil(len(rows) / MAX_POINTS) or 1
        return [dict(r) for r in rows[::step]]

    def log_alert(self, alert):
        with self._conn() as conn:
            conn.execute("INSERT INTO alerts (t, metric, level, origin, title) VALUES (?, ?, ?, ?, ?)",
                         (now_iso(), alert["metric"], alert["level"], alert["origin"], alert["title"]))

    def alert_log(self, limit):
        with self._conn() as conn:
            rows = conn.execute("SELECT * FROM alerts ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]

    def add_checkin(self, mood, sleep_hours, note):
        with self._conn() as conn:
            t = now_iso()
            cur = conn.execute("INSERT INTO checkins (t, mood, sleep_hours, note) VALUES (?, ?, ?, ?)",
                               (t, mood, sleep_hours, note))
        return {"id": cur.lastrowid, "mood": mood, "sleep_hours": sleep_hours, "note": note, "t": t}

    def checkins(self, limit=-1):
        """Newest first; a negative limit means all."""
        with self._conn() as conn:
            rows = conn.execute("SELECT * FROM checkins ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]

    def log_scenario(self, scenario):
        with self._conn() as conn:
            conn.execute("INSERT INTO scenario_changes (t, scenario) VALUES (?, ?)", (now_iso(), scenario))

    def save_report(self, report):
        """Store a report and return it with its new id and time."""
        t = now_iso()
        with self._conn() as conn:
            cur = conn.execute("INSERT INTO reports (t, window_minutes, engine, body) VALUES (?, ?, ?, ?)",
                               (t, report["window_minutes"], report["engine"], json.dumps(report)))
        return {"id": cur.lastrowid, "t": t, **report}

    def latest_report(self):
        with self._conn() as conn:
            row = conn.execute("SELECT id, t, body FROM reports ORDER BY id DESC LIMIT 1").fetchone()
        return {"id": row["id"], "t": row["t"], **json.loads(row["body"])} if row else None

    def stats(self):
        with self._conn() as conn:
            rows, first, last = conn.execute("SELECT COUNT(*), MIN(t), MAX(t) FROM samples").fetchone()
        size = sum(p.stat().st_size for p in (self.path, Path(f"{self.path}-wal")) if p.exists())
        return {"rows": rows, "first": first, "last": last, "size_kb": round(size / 1024)}

    def get_llm_spend_usd(self) -> float:
        with self._conn() as conn:
            row = conn.execute("SELECT spent_usd FROM llm_spend WHERE id = 1").fetchone()
        return float(row["spent_usd"]) if row else 0.0

    def add_llm_spend_usd(self, amount: float) -> float:
        """Add to cumulative LLM spend and return the new total."""
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO llm_spend (id, spent_usd) VALUES (1, ?) "
                "ON CONFLICT(id) DO UPDATE SET spent_usd = spent_usd + excluded.spent_usd",
                (float(amount),),
            )
            row = conn.execute("SELECT spent_usd FROM llm_spend WHERE id = 1").fetchone()
        return float(row["spent_usd"])
