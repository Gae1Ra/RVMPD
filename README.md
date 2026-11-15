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
| `VITALIS_USE_BEDROCK=1` | Use AWS Bedrock Mantle (`AWS_BEARER_TOKEN_BEDROCK`) |
| `VITALIS_MODEL` | Model id, default `claude-haiku-5-5` (Bedrock: `anthropic.claude-haiku-5-5`) |
| `VITALIS_DB` | Path of the database file |
| `VITALIS_SPEND_CAP_USD` | Hard spend cap (default `0.50`) |
| `VITALIS_INPUT_USD_PER_MTOK` / `VITALIS_OUTPUT_USD_PER_MTOK` | Haiku 5.5 prices (default `0.10` / `0.50`) |

If the model is not configured, fails, hits the spend cap, or is rate-limited, the on-board engine answers. The model only receives aggregated statistics, never raw readings. Copy `backend/.env.example` to `backend/.env` for local secrets (never commit `.env`).

### Usar AWS Bedrock

Para principiantes (cuenta compartida de hackathon; **no** crear usuarios IAM):

1. En la consola de Amazon Bedrock (región **us-east-2**), genera una **API key de corta duración** (máx. 12 h).
2. Copia `backend/.env.example` → `backend/.env` y rellena:
   - `VITALIS_USE_BEDROCK=1`
   - `AWS_REGION=us-east-2` (debe coincidir con la región de la clave)
   - `AWS_BEARER_TOKEN_BEDROCK=…` (la clave corta; no uses access keys IAM)
   - `VITALIS_MODEL=anthropic.claude-haiku-5-5` (Mantle). Si usas `bedrock-runtime` en lugar de Mantle, us-east-2 suele exigir el perfil `us.anthropic.claude-haiku-5-5`.
3. Instala deps (`pip install -r requirements.txt`) y arranca el backend.
4. Comprueba sin gastar mucho: `cd backend && python scripts/bedrock_smoke_test.py`
5. Renueva la clave cada ≤12 h. Si ves en logs “credencial vencida, genera una nueva”, regenera el token y sigue; el análisis local sigue funcionando.
6. El tope de gasto por defecto es **$0.50** (`VITALIS_SPEND_CAP_USD`). Súbelo solo cuando quieras (presupuesto compartido ~$10). También hay 1 llamada LLM / 30 s y máx. 100 por proceso del servidor.
7. Estado sin red: `GET /api/analysis/engine` → provider, model, spent_usd, cap_usd.

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
