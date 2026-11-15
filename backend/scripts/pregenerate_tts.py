#!/usr/bin/env python3
"""Pregenerate ElevenLabs MP3 cache for fixed alert titles/steps (ES + EN + FR).

Uses the same cache key as POST /api/tts. Requires ELEVENLABS_API_KEY and
voice ids in backend/.env. Never prints the API key.

Usage:
  python scripts/pregenerate_tts.py
  python scripts/pregenerate_tts.py --lang fr
  python scripts/pregenerate_tts.py --lang es,en
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import tts
from app.alerts import ARTIFACT, PHYSIOLOGICAL, RADIATION
from app.db import Database
from app.languages import SUPPORTED_LANGS, normalize_lang

# Demo translations of fixed English alert titles + first guidance step.
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

FR_PHRASES: dict[str, str] = {
    "Heart rate above your baseline": "Fréquence cardiaque au-dessus de votre base",
    "Stop what you are doing and sit or float calmly for a few minutes.":
        "Arrêtez ce que vous faites et asseyez-vous ou flottez calmement quelques minutes.",
    "Heart rate below your baseline": "Fréquence cardiaque en dessous de votre base",
    "Note whether you feel dizzy, faint or unusually tired.":
        "Notez si vous vous sentez étourdi, faible ou inhabituellement fatigué.",
    "Heart rate variability is low": "La variabilité cardiaque est basse",
    "Plan a rest period and aim for a full sleep cycle.":
        "Planifiez un repos et visez un cycle de sommeil complet.",
    "Oxygen saturation below your baseline": "Saturation en oxygène en dessous de votre base",
    "Check the cabin oxygen and carbon dioxide levels.":
        "Vérifiez les niveaux d’oxygène et de dioxyde de carbone de la cabine.",
    "Body temperature above your baseline": "Température corporelle au-dessus de votre base",
    "Rest and cool down, and check the cabin temperature.":
        "Reposez-vous, rafraîchissez-vous et vérifiez la température de la cabine.",
    "Body temperature below your baseline": "Température corporelle en dessous de votre base",
    "Put on warmer clothing and check the cabin temperature.":
        "Mettez des vêtements plus chauds et vérifiez la température de la cabine.",
    "Breathing faster than usual": "Respiration plus rapide que d’habitude",
    "Pause and breathe slowly: in for 4 seconds, out for 6.":
        "Pausez et respirez lentement : inspirez 4 secondes, expirez 6.",
    "Breathing slower than usual": "Respiration plus lente que d’habitude",
    "Take a few deliberate deep breaths.": "Faites quelques respirations profondes délibérées.",
    "Blood pressure above your baseline": "Pression artérielle au-dessus de votre base",
    "Rest quietly and breathe slowly for a few minutes.":
        "Reposez-vous calmement et respirez lentement quelques minutes.",
    "Blood pressure below your baseline": "Pression artérielle en dessous de votre base",
    "Move slowly and avoid sudden changes of position.":
        "Bougez lentement et évitez les changements brusques de position.",
    "ECG signal lost": "Signal ECG perdu",
    "Check that the ECG electrodes are firmly attached to your skin.":
        "Vérifiez que les électrodes ECG sont bien fixées sur la peau.",
    "Radiation hit on the pulse sensor": "Impact de rayonnement sur le capteur de pouls",
    "No action is needed for your body based on these readings.":
        "Aucune action n’est nécessaire pour votre corps d’après ces lectures.",
    "Radiation dose rate is elevated": "Le débit de dose de rayonnement est élevé",
    "Check the space weather forecast on this screen.":
        "Consultez la prévision de météo spatiale sur cet écran.",
    "Radiation dose rate is high": "Le débit de dose de rayonnement est élevé (critique)",
    "Move to the shielded area now.": "Allez maintenant dans la zone blindée.",
    "Vitals have returned to your normal range.":
        "Les signes vitaux sont revenus dans votre plage normale.",
    "Les signes vitaux sont revenus dans votre plage normale.":
        "Les signes vitaux sont revenus dans votre plage normale.",
}

TRANSLATIONS = {"es": ES_PHRASES, "fr": FR_PHRASES}

RECOVERY = {
    "en": "Vitals have returned to your normal range.",
    "es": "Los signos vitales han vuelto a tu rango normal.",
    "fr": "Les signes vitaux sont revenus dans votre plage normale.",
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
    phrases.append(RECOVERY["en"])
    seen: set[str] = set()
    out: list[str] = []
    for p in phrases:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out


def _parse_langs(raw: str | None) -> list[str]:
    if not raw:
        return sorted(SUPPORTED_LANGS)
    langs = []
    for part in raw.split(","):
        code = part.strip().lower()
        if not code:
            continue
        if code not in SUPPORTED_LANGS:
            raise SystemExit(f"Unknown lang '{code}'. Use: {', '.join(sorted(SUPPORTED_LANGS))}")
        langs.append(normalize_lang(code))
    # Deduplicate preserving order
    seen: set[str] = set()
    out: list[str] = []
    for lang in langs:
        if lang not in seen:
            seen.add(lang)
            out.append(lang)
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Pregenerate TTS cache for fixed phrases.")
    parser.add_argument(
        "--lang",
        default="",
        help="Comma-separated language filter (es,en,fr). Default: all.",
    )
    args = parser.parse_args()
    langs = _parse_langs(args.lang or None)

    if not tts.api_key():
        print("FAIL: set ELEVENLABS_API_KEY in .env")
        return 1

    missing_voices = [lang for lang in langs if not tts.voice_id_for(lang)]  # type: ignore[arg-type]
    if missing_voices:
        print(
            "WARN: missing voice env for "
            + ", ".join(missing_voices)
            + " — those langs will report missing_voice (browser fallback)"
        )

    db = Database()
    en_phrases = _collect_en()
    ok = 0
    skip = 0
    fail = 0

    if "en" in langs:
        for text in en_phrases:
            try:
                tts.synthesize(text, "en", db=db)
                ok += 1
                print(f"OK en ({len(text)} chars)")
            except tts.TtsFallback as e:
                fail += 1
                print(f"FAIL en reason={e.reason}")

    for lang in langs:
        if lang == "en":
            continue
        table = TRANSLATIONS.get(lang, {})
        for text in en_phrases:
            translated = table.get(text)
            if not translated:
                skip += 1
                continue
            try:
                tts.synthesize(translated, lang, db=db)
                ok += 1
                print(f"OK {lang} ({len(translated)} chars)")
            except tts.TtsFallback as e:
                fail += 1
                print(f"FAIL {lang} reason={e.reason}")

    for lang in langs:
        text = RECOVERY.get(lang)
        if not text:
            continue
        try:
            tts.synthesize(text, lang, db=db)
            ok += 1
        except tts.TtsFallback as e:
            fail += 1
            print(f"FAIL recovery {lang} reason={e.reason}")

    status = tts.status(db)
    print(
        f"done langs={','.join(langs)} ok={ok} fail={fail} skip={skip} "
        f"chars_used={status['chars_used']}/{status['chars_cap']}"
    )
    db.close()
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
