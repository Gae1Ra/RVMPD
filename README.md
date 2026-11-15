# VITALIS

Health monitoring for astronauts on long missions. Built by team RVMPD for the NASA Space Apps Challenge 2026, challenge "Create Health Monitoring Software for Astronauts on Space Missions".

VITALIS reads the astronaut's vital signs and the radiation dose, compares each one with that person's own baseline, and tells them in plain words what changed and what to do about it. It is decision support, not a medical diagnosis.

## What it does

- Shows live ECG, pulse and breathing waveforms on a phone-sized screen.
- Tracks heart rate, heart rate variability, oxygen saturation, temperature, breathing rate and blood pressure against a personal baseline.
- Tracks radiation dose rate and accumulated dose, and shows live proton flux from NOAA's GOES satellites.
- Raises green, amber or red status with a statistical guarantee: testing six vitals at once still keeps the false alarm rate at 5% or less (Holm-Bonferroni correction).
- Tells a sensor fault or a radiation hit on the sensor apart from a real change in the body, so a loose electrode does not abort a spacewalk.
- Gives step-by-step guidance for every alert, written for someone who is not a doctor.
- Daily check-in for mood and sleep, and a short task list.
- Stores every reading, alert and check-in in a local database on board, so it works with no link to Earth.
- Health insights: analyses the stored data and lists possible conditions with the evidence behind each one, plus facts and trends.

## Run it

You need Python 3.11 or newer and Node 20 or newer. Run **both** processes so the UI gets live WebSocket frames; if the backend is down, the frontend falls back to its local demo simulator automatically.

### 1. Backend (terminal A)

```
cd backend
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

### 2. Frontend (terminal B)

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` and `/ws` to `http://localhost:8000`. Optional: set `VITE_API_URL` (e.g. `http://localhost:8000`) to talk to the backend without the proxy.

Use the scenario picker in the header (Nominal, Solar particle event, Hypoxia, Loose electrode, Fatigue). Switch language with **ES | EN** in the header or on the wrist view (choice is stored in `localStorage`, default Spanish).

## Adding a language

1. Copy `frontend/src/i18n/es.ts` to `frontend/src/i18n/<code>.ts` and translate every string (same keys).
2. Type the new file as `Dictionary` (imported from `es.ts`) so `npm run build` fails if a key is missing.
3. Register it in `frontend/src/i18n/context.tsx` (`dictionaries` map and `Locale` / `LangSwitcher`).
4. Extend `Locale` in `frontend/src/i18n/es.ts` and the number-format map in `frontend/src/i18n/format.ts`.

UI copy is fully localizable. Backend alert guides, analysis reports, and scenario names stay in English until the CONTRACT adds a locale field (see `DECISIONES.md` §8).

## How it works

```
simulated wearable -> validation -> filtering -> vitals -> statistics -> alerts -> WebSocket -> phone screen
```

## Database and health insights

Everything is stored in one SQLite file, `backend/data/vitalis.db`, created on first run. It stays on the machine and is not part of the repository. Delete the file to start clean.

The "Analyze my data" button runs the on-board engine. It needs no network: it computes averages and trends from the stored data and matches known patterns such as low blood oxygen, an early response to radiation, fatigue, fever, low blood pressure, low mood and sensor faults.

A language model can write the report from the same numbers. This is optional and off by default:

| Variable | Effect |
|---|---|
| `ANTHROPIC_API_KEY` | Use the Anthropic API |
| `VITALIS_USE_BEDROCK=1` | Use AWS Bedrock with the machine's AWS credentials |
| `VITALIS_MODEL` | Model id, default `claude-opus-5-5` |
| `VITALIS_DB` | Path of the database file |

If the model is not configured or fails, the on-board engine answers. The model only receives aggregated statistics, never raw readings. The model path has not been run against a live key yet.

The data has no real sensor behind it yet. A simulator produces the signals, behind the same interface a Bluetooth or serial reader would use.

More detail: [docs/PLAN.md](docs/PLAN.md) and [docs/CONTRACT.md](docs/CONTRACT.md).
