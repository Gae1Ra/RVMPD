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

# Create and activate a virtualenv
python -m venv .venv
# macOS / Linux:
source .venv/bin/activate
# Windows (cmd):
#   .venv\Scripts\activate.bat
# Windows (PowerShell):
#   .venv\Scripts\Activate.ps1

pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

Optional Bedrock setup (smoke test + spend cap) is below under **Using AWS Bedrock**.

### 2. Frontend (terminal B)

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` and `/ws` to `http://localhost:8000`. Optional: set `VITE_API_URL` (e.g. `http://localhost:8000`) to talk to the backend without the proxy.

Use the scenario picker in the header (Nominal, Solar particle event, Hypoxia, Loose electrode, Fatigue). Switch language with **ES | EN | FR** in the header or on the wrist view (choice is stored in `localStorage`, default Spanish). Numbers use `Intl` (`es-ES` / `en-US` / `fr-FR`).

### Spoken alerts (ElevenLabs + browser fallback)

Amber/red alerts and analysis summaries can be spoken automatically. Tap the discreet **enable voice** banner once (browsers block autoplay until a gesture). Mute with **M** or the header/wrist toggle; volume is stored in `localStorage`.

Optional ElevenLabs (otherwise the UI uses `speechSynthesis` with a matching `es-ES` / `en-US` / `fr-FR` voice when available):

| Variable | Effect |
|---|---|
| `ELEVENLABS_API_KEY` | API key (never commit) |
| `ELEVENLABS_VOICE_ID_ES` / `ELEVENLABS_VOICE_ID_EN` / `ELEVENLABS_VOICE_ID_FR` | Voice ids from your ElevenLabs account (leave empty → browser fallback for that lang) |
| `ELEVENLABS_MODEL` | Default `eleven_flash_v2_5` (sends ISO `language_code`) |
| `VITALIS_TTS_CHAR_CAP` | Character spend cap (default `3000`; cache hits free) |

```
cd backend
python scripts/tts_smoke_test.py          # one real call (needs .env)
python scripts/pregenerate_tts.py         # fill disk cache for demo phrases (ES+EN+FR)
python scripts/pregenerate_tts.py --lang fr
```

For demos in Chrome without the tap banner:  
`chromium --autoplay-policy=no-user-gesture-required` (or the equivalent Chrome flag).

## Adding a language

Keep one registry on each side — do not scatter locale codes:

1. **Frontend registry:** append to `frontend/src/i18n/languages.ts` (`code`, `intl`, `speech`, `voiceEnv`, labels).
2. **Dictionary:** copy `frontend/src/i18n/es.ts` → `frontend/src/i18n/<code>.ts`, type as `Dictionary` so `npm run build` fails on missing keys; export from `index.ts` and register in `context.tsx` `dictionaries`.
3. **Backend registry:** append to `backend/app/languages.py` (voice env name + optional LLM instruction). `POST /api/tts` and `POST /api/analysis` `lang` literals follow this set.
4. **Env:** add `ELEVENLABS_VOICE_ID_<CODE>=` placeholder to `backend/.env.example` (never invent a real voice id).
5. **Alerts / TTS cache:** extend `frontend/src/i18n/alertPhrases.ts` and `backend/scripts/pregenerate_tts.py` for fixed English → locale phrases; document leftovers that stay English.
6. **CONTRACT / README:** mention the new `lang` value.

UI chrome is fully localizable. Fixed alert titles/steps and known analysis condition titles are mapped on the client for ES/FR; dynamic rule-engine evidence/facts/summaries and scenario names stay English (local engine as-is). When a model is configured, `lang=es|fr` asks for a narrative in that language with the same JSON schema (numbers untranslated).

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
| `VITALIS_USE_BEDROCK=1` | Use AWS Bedrock (`AWS_BEARER_TOKEN_BEDROCK`) |
| `VITALIS_BEDROCK_ENDPOINT` | `runtime` (default, `AnthropicBedrock`) or `mantle` |
| `VITALIS_MODEL` | Model id (configurable); runtime default `us.anthropic.claude-sonnet-4-6`; Mantle `anthropic.claude-sonnet-4-6` |
| `VITALIS_DB` | Path of the database file |
| `VITALIS_SPEND_CAP_USD` | Hard spend cap (default `0.50`) |
| `VITALIS_INPUT_USD_PER_MTOK` / `VITALIS_OUTPUT_USD_PER_MTOK` | Claude Sonnet 4.6 prices (default `3.30` / `16.50`) |

If the model is not configured, fails, hits the spend cap, or is rate-limited, the on-board engine answers. The model only receives aggregated statistics, never raw readings. Copy `backend/.env.example` to `backend/.env` for local secrets (never commit `.env`).

### Using AWS Bedrock (beginners, step by step)

Shared hackathon account — do **not** create IAM users. Use a **short-lived API key** (max 12 h) from the Bedrock console, region **us-east-2**.

Do this **in order**:

1. **Virtualenv** (from `backend/`):

   ```
   cd backend
   python -m venv .venv
   ```

   - macOS / Linux: `source .venv/bin/activate`
   - Windows (cmd): `.venv\Scripts\activate.bat`
   - Windows (PowerShell): `.venv\Scripts\Activate.ps1`

2. **Install dependencies:**

   ```
   pip install -r requirements.txt
   ```

3. **Copy the environment example:**

   ```
   # macOS / Linux
   cp .env.example .env
   # Windows (cmd)
   copy .env.example .env
   ```

4. **Fill in `backend/.env`** (never commit this file; it is already in `.gitignore`):

   | Variable | Typical value |
   |---|---|
   | `VITALIS_USE_BEDROCK` | `1` |
   | `AWS_REGION` | `us-east-2` (must match the key's region) |
   | `AWS_BEARER_TOKEN_BEDROCK` | your short-lived Bedrock API key (not IAM access keys) |
   | `VITALIS_BEDROCK_ENDPOINT` | `runtime` (default, `bedrock-runtime`) or `mantle` |
   | `VITALIS_MODEL` | runtime: `us.anthropic.claude-sonnet-4-6`; Mantle: `anthropic.claude-sonnet-4-6` (configurable; ids documented by AWS) |
   | `VITALIS_SPEND_CAP_USD` | `0.50` to start (raise it later; see step 8) |

5. **Smoke test** (cheap call; needs the key in `.env`):

   ```
   cd backend
   python scripts/bedrock_smoke_test.py
   ```

   It should print `OK …` and, if it tried several ids, `WORKING_MODEL=…`. A **401** does not always mean “expired”: check that the token is complete, not expired, and matches the region. If it failed because it expired, regenerate (≤12 h) and retry.

6. **Start the API:**

   ```
   uvicorn app.main:app --port 8000
   ```

7. **Try it in the browser:** open [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger).  
   You can also wait ~30 s (the simulator stores ~1 reading/s; `MIN_ROWS=30` is required) and run:

   ```
   python scripts/try_analysis.py
   ```

   That does `POST /api/analysis` + `GET /api/analysis/engine` and prints engine, model, summary, findings, spent, and cap. If `engine` is `local` with Bedrock configured, check the uvicorn logs for the pattern `fallback=<code>` (e.g. `invalid_credential`, `expired_credential`, `model_not_enabled`, `spend_cap`).

8. **Raise the spend cap** only when you want to: edit `VITALIS_SPEND_CAP_USD` in `.env` (shared budget ~$10) and restart uvicorn. There is also a limit of 1 LLM call / 30 s and max 100 per process.

The data has no real sensor behind it yet. A simulator produces the signals, behind the same interface a Bluetooth or serial reader would use.

## Medical AI template (Bedrock-ready, mock by default)

A second, **optional** path returns a structured insight (risk level, findings, recommended action, protocol sources) after the clinical anomaly filter. It is **off by default** and needs **no AWS credentials** for local/demo — the mock provider works offline.

| Variable | Effect |
|---|---|
| `VITALIS_MEDICAL_AI=1` | Enable the medical AI provider path |
| `VITALIS_MEDICAL_AI_PROVIDER` | `mock` (default) or `bedrock` |
| `AWS_REGION` / `AWS_DEFAULT_REGION` | Bedrock region (default `us-east-1`) |
| `VITALIS_KNOWLEDGE_BASE_ID` or `KNOWLEDGE_BASE_ID` | Bedrock Knowledge Base id |
| `VITALIS_GUARDRAIL_ID` or `GUARDRAIL_ID` | Bedrock Guardrail id |
| `VITALIS_GUARDRAIL_VERSION` | Guardrail version (default `1`) |
| `VITALIS_MODEL_ARN` or `MODEL_ARN` | Full model ARN (optional) |
| `VITALIS_BEDROCK_MODEL` | Short model id if ARN not set (default `amazon.nova-pro-v1:0`) |

Enable Bedrock later with `pip install boto3`, the env vars above, and normal AWS credentials. Prefer serverless Claude / Nova on Bedrock with S3 Vectors Knowledge Bases — avoid dedicated GPU endpoints for hackathon budgets. Other hackathon options (Ollama, Colab MedGemma, Gemini, Groq) can implement the same provider interface; see [docs/AI_MEDICAL.md](docs/AI_MEDICAL.md).

UI: **Medical AI · Insight** panel (ES/EN). Routes: `GET /api/medical-ai/status`, `POST /api/medical-ai/insight` (additive CONTRACT appendix).

More detail: [docs/PLAN.md](docs/PLAN.md), [docs/CONTRACT.md](docs/CONTRACT.md), and [docs/AI_MEDICAL.md](docs/AI_MEDICAL.md).
