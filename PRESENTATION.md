# VITALIS — contest demo (judges)

Presentation tip for NASA Space Apps 2026. **Branch only — not for merge into `main`.**

## How to run

1. **Checkout this branch** (`demo/nasa-space-apps`), then start both processes (Python 3.11+, Node 20+).
2. **Backend (terminal A):** `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --port 8000`
3. **Frontend (terminal B):** `cd frontend && npm install && npm run dev` → open **http://localhost:5173**
4. **Simulator mode (default):** use the header toggle **Simulator**. Pick scenarios (Nominal, Solar particle event, Hypoxia, Loose electrode, Fatigue) and switch **Panel / Wrist** as needed.
5. **Galaxy Watch demo:** tap **Galaxy Watch demo** in the header (or open `http://localhost:5173?source=galaxy_watch`). Shows HR / occasional SpO₂ / skin temp / HRV when available; ECG/PPG are blanked on purpose for third-party watch honesty.
6. **Optional watch mock feed:** with the backend up, `cd backend && python scripts/watch_mock_generator.py` posts sample watch packets to `/api/ingest/watch`.
7. **Languages:** switch **ES | EN | FR** in the header (stored in `localStorage`; default Spanish).
8. **Voice:** tap the **enable voice** banner **once** so the browser allows spoken alerts; mute with **M** or the header control. Works with browser `speechSynthesis` without API keys.
9. **No secrets required** for a basic demo. Optional Bedrock / ElevenLabs live in local `.env` only — never commit keys.
