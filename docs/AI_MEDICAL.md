# Medical AI template (AWS Bedrock path)

Practical integration notes for contained medical AI on top of the existing
VITALIS FastAPI + WebSocket stack. Adapted from the Bedrock/Wi-Fi architecture
guide — **not** a disconnected copy of `servidor_medico.py`.

## Where it fits vs the current filter → alert flow

```
Wearable / simulator
        │
        ▼
FastAPI pipeline (range check → filter → vitals → Holm stats → alerts)
        │
        ├─ WebSocket /ws  → live frames (unchanged)
        │
        └─ Clinical anomaly filter (medical_ai.filter)
                 │  only if anomaly (or force=true)
                 ▼
           Medical AI provider
                 ├─ mock (default, offline)
                 └─ bedrock (RetrieveAndGenerate + KB + Guardrails)
                 │
                 ▼
           POST /api/medical-ai/insight  → UI Medical AI panel
```

Existing pieces stay in place:

| Layer | Role | AI? |
|---|---|---|
| Simulator + pipeline | Produce vitals / SQI | No |
| Stats + AlertTracker | Baseline tests, amber/red alerts | No — free |
| `/api/analysis` | Local trend/rule report (+ optional Anthropic refine) | Separate path |
| **Medical AI template** | Structured risk / findings / action / sources | **Only on anomaly** |

**Cost guardrail (from the guide):** never send every telemetry tick to Bedrock.
Python filters noise and thresholds first; AI runs when HR/SpO2/temp cross bands,
or when `global.status` is amber/red, or when physiological alerts are active.

## Feature flag

| Variable | Default | Meaning |
|---|---|---|
| `VITALIS_MEDICAL_AI` | unset / off | Enable the provider path |
| `VITALIS_MEDICAL_AI_PROVIDER` | `mock` | `mock` or `bedrock` |

With the flag off, `POST /api/medical-ai/insight` still returns the additive JSON
shape (UI demos work) using the mock rules with `provider: "disabled"` and
`invoked: false`.

## Enabling Bedrock later

1. Create a private S3 bucket with triage / vital-range / protocol PDFs.
2. Bedrock → Knowledge Bases → create with **S3 Vectors** (avoid Quick create /
   OpenSearch Serverless). Sync; note `KNOWLEDGE_BASE_ID`.
3. Bedrock → Guardrails → contextual grounding + PII filters; note `GUARDRAIL_ID`.
4. Prefer serverless on-demand models (Claude Sonnet 4.6 or Amazon Nova Pro) — do
   **not** leave GPU endpoints running. The analysis refine path (`llm.py`) defaults
   to `us.anthropic.claude-sonnet-4-6` via `VITALIS_MODEL` (still fully configurable).
5. Install `boto3`, set env vars, restart uvicorn:

```
export VITALIS_MEDICAL_AI=1
export VITALIS_MEDICAL_AI_PROVIDER=bedrock
export AWS_REGION=us-east-1
export VITALIS_KNOWLEDGE_BASE_ID=...
export VITALIS_GUARDRAIL_ID=...
export VITALIS_GUARDRAIL_VERSION=1
# optional:
export VITALIS_MODEL_ARN=arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-pro-v1:0
# or VITALIS_BEDROCK_MODEL=amazon.nova-pro-v1:0
pip install boto3
```

AWS credentials come from the normal chain (`aws configure`, instance role, etc.).
This repo never requires them for local/demo.

Also set billing budgets at $15 / $50 as the guide recommends.

## Hackathon alternatives (high level)

| Option | When |
|---|---|
| **Mock provider (default)** | Offline demos, CI, no credentials |
| **Bedrock native (Claude / Nova) + KB** | AWS track, credits available |
| **Existing `llm.py` Anthropic refine** | Rewrite `/api/analysis` prose (default Claude Sonnet 4.6; override with `VITALIS_MODEL`) |
| Ollama / Colab MedGemma / Gemini / Groq | External; wire a new provider implementing the same interface |

## Additive API (proposed CONTRACT appendix)

See `docs/CONTRACT.md` § Medical AI (additive). Existing clients ignore these
routes. Do not change the WebSocket `frame` shape for AI payloads.

## Code map

- `backend/app/medical_ai/` — filter, models, mock + bedrock providers, facade
- `GET /api/medical-ai/status` — flag / env readiness (no AWS calls)
- `POST /api/medical-ai/insight` — structured insight
- `frontend/src/components/MedicalAiPanel.tsx` — risk / findings / action / sources
