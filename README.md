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

Optional Bedrock setup (smoke test + spend cap) is below under **Usar AWS Bedrock**.

### 2. Frontend (terminal B)

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` and `/ws` to `http://localhost:8000`. Optional: set `VITE_API_URL` (e.g. `http://localhost:8000`) to talk to the backend without the proxy.

Use the scenario picker in the header (Nominal, Solar particle event, Hypoxia, Loose electrode, Fatigue). Switch language with **ES | EN** in the header or on the wrist view (choice is stored in `localStorage`, default Spanish).

### Spoken alerts (ElevenLabs + browser fallback)

Amber/red alerts and analysis summaries can be spoken automatically. Tap the discreet **enable voice** banner once (browsers block autoplay until a gesture). Mute with **M** or the header/wrist toggle; volume is stored in `localStorage`.

Optional ElevenLabs (otherwise the UI uses `speechSynthesis`):

| Variable | Effect |
|---|---|
| `ELEVENLABS_API_KEY` | API key (never commit) |
| `ELEVENLABS_VOICE_ID_ES` / `ELEVENLABS_VOICE_ID_EN` | Voice ids from your ElevenLabs account |
| `ELEVENLABS_MODEL` | Default `eleven_flash_v2_5` |
| `VITALIS_TTS_CHAR_CAP` | Character spend cap (default `3000`; cache hits free) |

```
cd backend
python scripts/tts_smoke_test.py          # one real call (needs .env)
python scripts/pregenerate_tts.py         # fill disk cache for demo phrases
```

For demos in Chrome without the tap banner:  
`chromium --autoplay-policy=no-user-gesture-required` (or the equivalent Chrome flag).

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
| `VITALIS_USE_BEDROCK=1` | Use AWS Bedrock (`AWS_BEARER_TOKEN_BEDROCK`) |
| `VITALIS_BEDROCK_ENDPOINT` | `runtime` (default, `AnthropicBedrock`) or `mantle` |
| `VITALIS_MODEL` | Model id (configurable); runtime default `us.anthropic.claude-sonnet-4-6`; Mantle `anthropic.claude-sonnet-4-6` |
| `VITALIS_DB` | Path of the database file |
| `VITALIS_SPEND_CAP_USD` | Hard spend cap (default `0.50`) |
| `VITALIS_INPUT_USD_PER_MTOK` / `VITALIS_OUTPUT_USD_PER_MTOK` | Claude Sonnet 4.6 prices (default `3.30` / `16.50`) |

If the model is not configured, fails, hits the spend cap, or is rate-limited, the on-board engine answers. The model only receives aggregated statistics, never raw readings. Copy `backend/.env.example` to `backend/.env` for local secrets (never commit `.env`).

### Usar AWS Bedrock (principiantes, paso a paso)

Cuenta compartida de hackathon — **no** crear usuarios IAM. Usa una **API key de corta duración** (máx. 12 h) en la consola Bedrock, región **us-east-2**.

Haz esto **en orden**:

1. **Virtualenv** (desde `backend/`):

   ```
   cd backend
   python -m venv .venv
   ```

   - macOS / Linux: `source .venv/bin/activate`
   - Windows (cmd): `.venv\Scripts\activate.bat`
   - Windows (PowerShell): `.venv\Scripts\Activate.ps1`

2. **Instalar dependencias:**

   ```
   pip install -r requirements.txt
   ```

3. **Copiar el ejemplo de entorno:**

   ```
   # macOS / Linux
   cp .env.example .env
   # Windows (cmd)
   copy .env.example .env
   ```

4. **Rellenar `backend/.env`** (nunca subas este archivo; ya está en `.gitignore`):

   | Variable | Valor típico |
   |---|---|
   | `VITALIS_USE_BEDROCK` | `1` |
   | `AWS_REGION` | `us-east-2` (debe coincidir con la región de la clave) |
   | `AWS_BEARER_TOKEN_BEDROCK` | tu API key corta de Bedrock (no access keys IAM) |
   | `VITALIS_BEDROCK_ENDPOINT` | `runtime` (default, `bedrock-runtime`) o `mantle` |
   | `VITALIS_MODEL` | runtime: `us.anthropic.claude-sonnet-4-6`; Mantle: `anthropic.claude-sonnet-4-6` (configurable; ids documentados por AWS) |
   | `VITALIS_SPEND_CAP_USD` | `0.50` al empezar (súbelo después; ver paso 8) |

5. **Smoke test** (llamada barata; necesita la clave en `.env`):

   ```
   cd backend
   python scripts/bedrock_smoke_test.py
   ```

   Debe imprimir `OK …` y, si probó varios ids, `WORKING_MODEL=…`. Un **401** no significa siempre “vencida”: revisa que el token esté completo, no haya vencido y corresponda a la región. Si falla por vencida, regenera (≤12 h) y reintenta.

6. **Arrancar el API:**

   ```
   uvicorn app.main:app --port 8000
   ```

7. **Probar en el navegador:** abre [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger).  
   También puedes esperar ~30 s (el simulador guarda ~1 lectura/s; hace falta `MIN_ROWS=30`) y correr:

   ```
   python scripts/try_analysis.py
   ```

   Eso hace `POST /api/analysis` + `GET /api/analysis/engine` e imprime engine, model, summary, findings, spent y cap. Si `engine` es `local` con Bedrock configurado, mira en los logs de uvicorn el patrón `fallback=<código>` (p. ej. `invalid_credential`, `expired_credential`, `model_not_enabled`, `spend_cap`).

8. **Subir el tope de gasto** solo cuando quieras: edita `VITALIS_SPEND_CAP_USD` en `.env` (presupuesto compartido ~$10) y reinicia uvicorn. También hay 1 llamada LLM / 30 s y máx. 100 por proceso.

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
