# Backend / frontend contract

The backend and the frontend are built separately. This file is the only thing they share. Change it first, then change the code.

- Backend: `http://localhost:8000`
- Frontend dev server: `http://localhost:5173` (CORS is open for it)
- The frontend reads the backend address from `VITE_API_URL` (default `http://localhost:8000`). The WebSocket address is the same host with `ws://` and the path `/ws`.

## WebSocket `/ws`

The server pushes one `frame` message 5 times per second. The client never sends anything.

```json
{
  "type": "frame",
  "t": 1234.6,
  "scenario": "nominal",
  "wave": {
    "fs": 250,
    "ecg": [0.01, 0.02],
    "ppg": [0.51, 0.52],
    "resp": [0.10, 0.11]
  },
  "vitals": {
    "hr":        {"value": 72.0, "unit": "bpm",  "baseline": 68.0, "delta": 4.0,  "status": "green", "p_adj": 0.81, "sqi": 0.97},
    "hrv_rmssd": {"value": 42.0, "unit": "ms",   "baseline": 45.0, "delta": -3.0, "status": "green", "p_adj": 0.64, "sqi": 0.97},
    "spo2":      {"value": 97.5, "unit": "%",    "baseline": 98.0, "delta": -0.5, "status": "green", "p_adj": 0.90, "sqi": 0.95},
    "temp":      {"value": 36.7, "unit": "°C",   "baseline": 36.6, "delta": 0.1,  "status": "green", "p_adj": 0.95, "sqi": 1.0},
    "resp_rate": {"value": 14.0, "unit": "rpm",  "baseline": 14.0, "delta": 0.0,  "status": "green", "p_adj": 0.99, "sqi": 0.96},
    "bp_sys":    {"value": 118.0, "unit": "mmHg", "baseline": 117.0, "delta": 1.0, "status": "green", "p_adj": 0.88, "sqi": 0.9}
  },
  "radiation": {"dose_rate_usv_h": 12.4, "dose_total_msv": 4.213, "status": "green"},
  "global": {"status": "green", "confidence": 0.95, "sqi": 0.96, "link": "ok"},
  "alerts": [
    {
      "id": "spo2-1234",
      "t": 1234.6,
      "metric": "spo2",
      "level": "amber",
      "origin": "physiological",
      "title": "Oxygen saturation below your baseline",
      "explanation": "One or two plain sentences on what this means.",
      "guidance": ["Step one", "Step two", "Step three"]
    }
  ]
}
```

Rules:

- `t` is mission elapsed time in seconds.
- `wave` holds the new samples since the previous frame: 50 per channel at 250 Hz. `ecg` is in mV. `ppg` and `resp` are normalised to 0..1.
- `vitals` is recomputed once per second; the frames in between repeat the last values. The six keys above are always present.
- `status` is always one of `green`, `amber`, `red`.
- `p_adj` is the Holm-corrected p-value of the test "this vital differs from the personal baseline".
- `sqi` is the signal quality index, 0..1. Under 0.5 the reading is not trusted.
- `origin` is `physiological` (the body changed) or `artifact` (the sensor or radiation corrupted the reading). An `artifact` alert never raises `global.status` above `amber`.
- `alerts` holds the alerts that are active now, newest first, at most 5.
- `global.status` is the worst status among the vitals and radiation, after artifact suppression.

## REST

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/health` | | `{"ok": true}` |
| GET | `/api/scenarios` | | `[{"id": "nominal", "name": "Nominal", "description": "..."}]` |
| POST | `/api/scenario` | `{"id": "hypoxia"}` | `{"ok": true, "scenario": "hypoxia"}`, or 404 for an unknown id |
| GET | `/api/checkins` | | list of check-ins, newest first |
| POST | `/api/checkin` | `{"mood": 1-5, "sleep_hours": 0-24, "note": "text"}` | the stored check-in with `id` and `t` (ISO time) |
| GET | `/api/spaceweather` | | `{"source": "NOAA SWPC GOES" or "fallback", "proton_flux_pfu": 0.3, "s_scale": 0, "updated": "ISO time"}` |

Scenario ids: `nominal`, `solar_particle_event`, `hypoxia`, `loose_electrode`, `fatigue`, `galaxy_watch`.

### Galaxy Watch ingest (additive)

Optional phone→backend bridge for contest demos. Does not replace the simulator; use scenario `galaxy_watch` or the UI “Galaxy Watch demo” mode.

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/ingest/watch` | watch aggregates (`hr` / `spo2` / `temp` / `hrv_rmssd` nullable) | `{ok, mapped, last_sync, …}` |
| GET | `/api/ingest/watch/status` | | last sync + which CONTRACT keys are available |

Missing sensors are **`null`** in the ingest body — never invent clinical values. WS `frame` keys stay present for existing clients; in `galaxy_watch` the server may add `source: "watch"` and a `watch` block (`connected`, `last_sync`, `available`). Waveform channels are zeroed in that scenario because third-party apps do not receive raw ECG/PPG from the watch. See project store doc `samsung-watch-bridge.md`.

## Local database

The backend stores everything in one SQLite file, `backend/data/vitalis.db` (path can be changed with the `VITALIS_DB` environment variable). The file stays on the machine and is not committed. Stored: one row of vitals and radiation per second, every alert when it starts, every check-in, every scenario change and every analysis report.

| Method | Path | Query / body | Returns |
|---|---|---|---|
| GET | `/api/history` | `metric` (a vital key, `dose_rate` or `dose_total`), `minutes` (default 60, max 1440) | `{"metric": "hr", "points": [{"t": "ISO time", "value": 71.2, "status": "green"}]}`, oldest first, thinned to at most 300 points |
| GET | `/api/alerts/log` | `limit` (default 50) | list of past alerts, newest first: `{"id", "t" (ISO time), "metric", "level", "origin", "title"}` |
| GET | `/api/stats` | | `{"rows": 12345, "first": "ISO time", "last": "ISO time", "size_kb": 420}` |

Check-ins (`/api/checkin`, `/api/checkins`) keep the same shape but are now stored in the database.

## Health analysis

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/analysis` | `{"minutes": 60, "lang": "en"}` (both optional; `lang` is `"en"`, `"es"`, or `"fr"`, default `"en"`) | a new report, see below |
| GET | `/api/analysis/latest` | | the newest report, or 404 if none exists |
| GET | `/api/analysis/engine` | | provider status (no network): see below |

```json
{
  "id": 7,
  "t": "2026-11-14T22:10:03Z",
  "window_minutes": 60,
  "engine": "local",
  "model": null,
  "summary": "Two or three plain sentences on the overall state.",
  "findings": [
    {
      "condition": "Possible low blood oxygen (hypoxia)",
      "likelihood": "high",
      "evidence": ["Blood oxygen averaged 89.1%, 8.9 below your baseline", "Heart rate rose 14 bpm in the same period"],
      "action": "One sentence on what to do next."
    }
  ],
  "facts": ["Heart rate variability has trended down 12% over the last hour."],
  "data_points": 3540,
  "disclaimer": "Decision support, not a medical diagnosis."
}
```

Rules:

- `engine` is `local` (the built-in rule and trend engine, works with no network) or `llm` (a language model wrote the report from the same data). `model` is the model id when `engine` is `llm`, otherwise null.
- `likelihood` is one of `low`, `medium`, `high`.
- `findings` may be empty; then `summary` says that nothing unusual was found. At most 5 findings, most likely first.
- `facts` holds 2 to 6 short observations from the stored data (trends, averages, links between measurements).
- If the language model is not configured or fails, the backend returns the local report. It never returns an error because of the model.
- Optional `lang` on POST `/api/analysis`: `"en"` (default), `"es"`, or `"fr"`. When the model runs with `"es"` or `"fr"`, it is asked for a Spanish or French narrative with the same JSON schema (numbers stay untranslated). The local rule engine always stays English (as-is).
- Optional refinement uses Anthropic API or AWS Bedrock Mantle (`VITALIS_USE_BEDROCK=1` + `AWS_BEARER_TOKEN_BEDROCK`). The model receives aggregates only, never raw readings. Spend is capped (`VITALIS_SPEND_CAP_USD`, default 0.50) and rate-limited (1 call / 30 s, 100 / process).

`GET /api/analysis/engine` (no network):

```json
{
  "provider": "local",
  "model": null,
  "configured": false,
  "spent_usd": 0.0,
  "cap_usd": 0.5
}
```

- `provider` is `local`, `bedrock`, or `anthropic`.
- `configured` is true when a model path is selected via env vars (does not prove the key works).
- `spent_usd` is cumulative estimated spend from token usage stored in SQLite; `cap_usd` is the hard cap.

## Spoken alerts (TTS)

Optional ElevenLabs text-to-speech for spoken diagnostics. When the key/voices are missing, the spend cap is hit, or the network fails, the API returns a clear browser-fallback payload so the client can use `speechSynthesis`.

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/tts` | `{"text": str, "lang": "es"\|"en"\|"fr"}` | MP3 audio (`audio/mpeg`), or 503 fallback JSON |
| GET | `/api/tts/status` | | provider readiness and character spend (no network) |

`POST /api/tts` success: raw MP3 bytes. Soft failures return **503** with:

```json
{"fallback": "browser", "reason": "missing_key"}
```

Known `reason` values: `missing_key`, `missing_voice`, `char_cap`, `text_too_long`, `empty_text`, `timeout`, `network`, `invalid_key`, `quota`. Max **500** characters per request. Characters are counted only on ElevenLabs cache misses; hits under `backend/data/tts_cache/` spend nothing.

`GET /api/tts/status` (no network):

```json
{
  "provider": "elevenlabs",
  "configured": true,
  "chars_used": 120,
  "chars_cap": 3000
}
```

- `provider` is `elevenlabs` when `ELEVENLABS_API_KEY` and both voice ids are set, otherwise `browser`.
- `configured` does not prove the key works.
- `chars_used` / `chars_cap` track characters sent to ElevenLabs (SQLite); default cap `VITALIS_TTS_CHAR_CAP=3000`.

## Medical AI (additive appendix — proposed)

Optional routes for the contained medical AI template (`docs/AI_MEDICAL.md`).
Existing clients ignore them. The WebSocket `frame` shape is unchanged.

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/medical-ai/status` | | feature flag / provider readiness (no model call) |
| POST | `/api/medical-ai/insight` | optional vitals snapshot + `force` (bool) | structured insight below |

```json
{
  "risk_level": "low",
  "findings": "Plain-language clinical finding from filtered vitals.",
  "recommended_action": "One short recommended action.",
  "sources": ["onboard://protocols/vital-thresholds-v1.md"],
  "provider": "mock",
  "model": "vitalis-mock-v1",
  "invoked": true,
  "anomaly_detected": true,
  "patient_id": "A-01",
  "disclaimer": "Decision support, not a medical diagnosis."
}
```

Rules:

- `risk_level` is one of `low`, `medium`, `high` (maps to guide BAJO / MEDIO / ALTO in the UI).
- `provider` is `mock`, `bedrock`, or `disabled` (feature flag off).
- `invoked` is true only when a provider actually ran. Nominal vitals skip the model unless `force` is true (cost guardrail).
- `sources` lists protocol / KB citation URIs when available; may be empty.
- Request body fields (`hr`, `spo2`, `temp`, …) are optional; omitted fields are taken from the live engine snapshot.
- This path stays separate from `/api/analysis` (window trends) by design — see `DECISIONES.md` §9. Both coexist; do not fold insight fields into the analysis report.
