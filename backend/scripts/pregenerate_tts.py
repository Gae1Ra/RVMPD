#!/usr/bin/env python3
"""Pregenerate ElevenLabs MP3 cache for fixed alert titles/steps (ES + EN).

Uses the same cache key as POST /api/tts. Requires ELEVENLABS_API_KEY and
ELEVENLABS_VOICE_ID_ES / ELEVENLABS_VOICE_ID_EN in backend/.env.
Never prints the API key.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import tts
from app.alerts import ARTIFACT, PHYSIOLOGICAL, RADIATION
from app.db import Database

# Spanish demo translations of fixed English alert titles + first guidance step.
# Spoken text only; does not change clinical rules or live alert payloads.
ES_PHRASES: dict[str, str] = {
    "Heart rate above your baseline": "Frecuencia cardíaca por encima de tu base",
    "Stop what you are doing and sit or float calmly for a few minutes.":
        "Detén lo que estás haciendo y siéntate o flota con calma unos minutos.",
    "Heart rate below your baseline": "Frecuencia cardíaca por debajo de tu base",
    "Note whether you feel dizzy, faint or unusually tired.":
        "Anota si te sientes mareado, débil o inusualmente cansado.",
    "Heart rate variability is low": "La variabilidad cardíaca está baja",
    "Plan a rest period and aim for a full sleep cycle.":
        "Planifica un descanso y apunta a un ciclo completo de sueño.",
    "Oxygen saturation below your baseline": "Saturación de oxígeno por debajo de tu base",
    "Check the cabin oxygen and carbon dioxide levels.":
        "Revisa los niveles de oxígeno y dióxido de carbono de la cabina.",
    "Body temperature above your baseline": "Temperatura corporal por encima de tu base",
    "Rest and cool down, and check the cabin temperature.":
        "Descansa, refréscate y revisa la temperatura de la cabina.",
    "Body temperature below your baseline": "Temperatura corporal por debajo de tu base",
    "Put on warmer clothing and check the cabin temperature.":
        "Ponte ropa más abrigada y revisa la temperatura de la cabina.",
    "Breathing faster than usual": "Respiración más rápida de lo habitual",
    "Pause and breathe slowly: in for 4 seconds, out for 6.":
        "Pausa y respira despacio: inspira 4 segundos, espira 6.",
    "Breathing slower than usual": "Respiración más lenta de lo habitual",
    "Take a few deliberate deep breaths.": "Haz algunas respiraciones profundas deliberadas.",
    "Blood pressure above your baseline": "Presión arterial por encima de tu base",
    "Rest quietly and breathe slowly for a few minutes.":
        "Descansa en silencio y respira despacio unos minutos.",
    "Blood pressure below your baseline": "Presión arterial por debajo de tu base",
    "Move slowly and avoid sudden changes of position.":
        "Muévete despacio y evita cambios bruscos de posición.",
    "ECG signal lost": "Señal de ECG perdida",
    "Check that the ECG electrodes are firmly attached to your skin.":
        "Comprueba que los electrodos de ECG estén bien adheridos a la piel.",
    "Radiation hit on the pulse sensor": "Impacto de radiación en el sensor de pulso",
    "No action is needed for your body based on these readings.":
        "No hace falta actuar sobre tu cuerpo por estas lecturas.",
    "Radiation dose rate is elevated": "La tasa de dosis de radiación está elevada",
    "Check the space weather forecast on this screen.":
        "Revisa el pronóstico de clima espacial en esta pantalla.",
    "Radiation dose rate is high": "La tasa de dosis de radiación es alta",
    "Move to the shielded area now.": "Muévete ya a la zona protegida.",
    "Vitals have returned to your normal range.": "Los signos vitales han vuelto a tu rango normal.",
    "Los signos vitales han vuelto a tu rango normal.": "Los signos vitales han vuelto a tu rango normal.",
}


def _collect_en() -> list[str]:
    phrases: list[str] = []
    for title, _why, steps in PHYSIOLOGICAL.values():
        phrases.append(title)
        if steps:
            phrases.append(steps[0])
    for _metric, title, _why, steps in ARTIFACT.values():
        phrases.append(title)
        if steps:
            phrases.append(steps[0])
    for title, _why, steps in RADIATION.values():
        phrases.append(title)
        if steps:
            phrases.append(steps[0])
    phrases.append("Vitals have returned to your normal range.")
    # Deduplicate while preserving order
    seen: set[str] = set()
    out: list[str] = []
    for p in phrases:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out


def main() -> int:
    if not tts.is_configured():
        print("FAIL: set ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID_ES, ELEVENLABS_VOICE_ID_EN in .env")
        return 1

    db = Database()
    en_phrases = _collect_en()
    ok = 0
    skip = 0
    fail = 0

    for text in en_phrases:
        try:
            tts.synthesize(text, "en", db=db)
            ok += 1
            print(f"OK en ({len(text)} chars)")
        except tts.TtsFallback as e:
            fail += 1
            print(f"FAIL en reason={e.reason}")

        es = ES_PHRASES.get(text)
        if not es:
            skip += 1
            continue
        try:
            tts.synthesize(es, "es", db=db)
            ok += 1
            print(f"OK es ({len(es)} chars)")
        except tts.TtsFallback as e:
            fail += 1
            print(f"FAIL es reason={e.reason}")

    # Normalized recovery phrase in both languages
    for lang, text in (
        ("en", "Vitals have returned to your normal range."),
        ("es", "Los signos vitales han vuelto a tu rango normal."),
    ):
        try:
            tts.synthesize(text, lang, db=db)
            ok += 1
        except tts.TtsFallback as e:
            fail += 1
            print(f"FAIL recovery {lang} reason={e.reason}")

    status = tts.status(db)
    print(f"done ok={ok} fail={fail} skip_es={skip} chars_used={status['chars_used']}/{status['chars_cap']}")
    db.close()
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
