"""Local health analysis: trends and rule-based patterns over the stored data. Needs no network."""
import numpy as np

from .alerts import LABEL, SENSOR
from .stats import ARTIFACT_SQI, BASELINE, DELTAS, RADIATION_AMBER, UNIT

MIN_ROWS = 30
MAX_FINDINGS = 5
SENSOR_SHARE = 0.25  # a channel untrusted for this share of the window counts as a sensor problem
MIN_TRUSTED = 10  # trusted readings needed before a vital is used as evidence
CHECKINS_USED = 5
LOW_SLEEP_H, LOW_MOOD = 6.0, 2.5
DISCLAIMER = "Decision support, not a medical diagnosis."
CHANNEL = {"ecg": "ECG electrodes", "ppg": "pulse sensor"}
LEVELS = ("low", "medium", "high")


def _share(flags):
    return float(np.mean(flags)) if len(flags) else 0.0


def _vital_stats(rows, name, times):
    """Summary of one vital. Readings the pipeline did not trust are left out of the mean and trend."""
    trusted = np.array([r[f"{name}_sqi"] >= ARTIFACT_SQI for r in rows])
    status = [r[f"{name}_status"] for r in rows]
    out = {"untrusted_share": round(_share(~trusted), 2),
           "amber_share": round(_share([s == "amber" for s in status]), 2),
           "red_share": round(_share([s == "red" for s in status]), 2), "usable": False}
    if trusted.sum() < MIN_TRUSTED:
        return out
    values = np.array([r[name] for r in rows])[trusted]
    x = times[trusted]
    span = float(np.ptp(x))
    change = float(np.polyfit(x, values, 1)[0] * span) if span > 0 else 0.0
    mean = float(values.mean())
    out.update(mean=round(mean, 2), baseline=BASELINE[name], delta=round(mean - BASELINE[name], 2),
               trend_change=round(change, 2), trend_pct=round(100 * change / BASELINE[name], 1),
               usable=out["untrusted_share"] < SENSOR_SHARE)
    return out


def _dose_hrv_link(rows):
    """Correlation of dose rate with HRV, only when both actually moved in the window."""
    ok = np.array([r["hrv_rmssd_sqi"] >= ARTIFACT_SQI for r in rows])
    dose = np.array([r["dose_rate"] for r in rows])[ok]
    hrv = np.array([r["hrv_rmssd"] for r in rows])[ok]
    if len(dose) < MIN_TRUSTED or np.ptp(dose) < 50 or np.ptp(hrv) < 10:
        return None
    return round(float(np.corrcoef(dose, hrv)[0, 1]), 2)


def window_stats(db, minutes):
    """Aggregate the last `minutes` of stored data into a compact dict."""
    rows = db.samples_since(minutes)
    checkins = db.checkins(CHECKINS_USED)
    stats = {"window_minutes": minutes, "rows": len(rows), "vitals": {}, "dose": None, "hrv_dose_link": None,
             "checkins": {"count": len(checkins), "mood_avg": None, "sleep_avg": None}}
    if checkins:
        stats["checkins"]["mood_avg"] = round(float(np.mean([c["mood"] for c in checkins])), 1)
        stats["checkins"]["sleep_avg"] = round(float(np.mean([c["sleep_hours"] for c in checkins])), 1)
    if len(rows) < MIN_ROWS:
        return stats
    # Wall-clock seconds, so a restart inside the window does not distort the trend
    times = np.array([r["t"][:-1] for r in rows], dtype="datetime64[s]").astype(float)
    stats["vitals"] = {name: _vital_stats(rows, name, times) for name in BASELINE}
    rates = [r["dose_rate"] for r in rows]
    stats["dose"] = {"received_msv": round(rows[-1]["dose_total"] - rows[0]["dose_total"], 4),
                     "mean_rate": round(float(np.mean(rates)), 1), "max_rate": round(max(rates), 1)}
    stats["hrv_dose_link"] = _dose_hrv_link(rows)
    return stats


def _delta(stats, name):
    """Change from baseline for a vital, or None when its readings cannot be trusted."""
    v = stats["vitals"][name]
    return v["delta"] if v["usable"] else None


def _likelihood(strength, supports):
    """strength: size of the main change relative to the action level; supports: list of booleans."""
    if all(supports) and strength >= 1:
        return "high"
    return "medium" if any(supports) else "low"


def _fmt(name, value):
    return f"{value:.1f} {UNIT[name]}"


def _evidence(stats, name, word):
    v = stats["vitals"][name]
    return f"{LABEL[name]} averaged {_fmt(name, v['mean'])}, {abs(v['delta']):.1f} {UNIT[name]} {word} your baseline"


def _hypoxia(stats):
    spo2, hr, resp = (_delta(stats, n) for n in ("spo2", "hr", "resp_rate"))
    if spo2 is None or spo2 > -DELTAS["spo2"][0]:
        return None
    supports = [hr is not None and hr >= 8, resp is not None and resp >= 3]
    evidence = [_evidence(stats, "spo2", "below")]
    if supports[0]:
        evidence.append(_evidence(stats, "hr", "above"))
    if supports[1]:
        evidence.append(_evidence(stats, "resp_rate", "above"))
    return ("Possible low blood oxygen (hypoxia)", _likelihood(-spo2 / DELTAS["spo2"][1], supports), evidence,
            "Check the cabin oxygen and carbon dioxide levels, sit upright and breathe slowly; "
            "tell the flight surgeon if it does not improve.")


def _radiation(stats):
    dose = stats["dose"]
    if dose["mean_rate"] < RADIATION_AMBER:
        return None
    hrv, hr = _delta(stats, "hrv_rmssd"), _delta(stats, "hr")
    supports = [hrv is not None and hrv <= -10, hr is not None and hr >= 6]
    evidence = [f"Radiation dose rate averaged {dose['mean_rate']} uSv/h (peak {dose['max_rate']}), "
                f"adding {dose['received_msv']:.3f} mSv in this window"]
    if supports[0]:
        evidence.append(_evidence(stats, "hrv_rmssd", "below"))
    if supports[1]:
        evidence.append(_evidence(stats, "hr", "above"))
    return ("Possible early response to radiation exposure", _likelihood(dose["mean_rate"] / 300, supports),
            evidence, "Move to the shielded area, contact ground control and log how you feel.")


def _fatigue(stats):
    hrv, hr = _delta(stats, "hrv_rmssd"), _delta(stats, "hr")
    c = stats["checkins"]
    if hrv is None or hrv > -10:
        return None
    short_sleep = c["sleep_avg"] is not None and c["sleep_avg"] <= LOW_SLEEP_H
    low_mood = c["mood_avg"] is not None and c["mood_avg"] <= LOW_MOOD
    supports = [hr is not None and 3 <= hr <= 15, short_sleep or low_mood]
    if not any(supports):
        return None
    evidence = [_evidence(stats, "hrv_rmssd", "below")]
    if supports[0]:
        evidence.append(_evidence(stats, "hr", "above"))
    if short_sleep:
        evidence.append(f"Recent check-ins average {c['sleep_avg']} h of sleep")
    if low_mood:
        evidence.append(f"Recent check-ins average a mood of {c['mood_avg']} out of 5")
    return ("Possible fatigue or poor recovery", _likelihood(-hrv / DELTAS["hrv_rmssd"][1], supports), evidence,
            "Plan a rest period with a full sleep cycle and postpone demanding tasks if you can.")


def _fever(stats):
    temp, hr = _delta(stats, "temp"), _delta(stats, "hr")
    if temp is None or temp < DELTAS["temp"][0]:
        return None
    supports = [hr is not None and hr >= 8]
    evidence = [_evidence(stats, "temp", "above")]
    if supports[0]:
        evidence.append(_evidence(stats, "hr", "above"))
    return ("Possible fever or infection", _likelihood(temp / DELTAS["temp"][1], supports), evidence,
            "Rest, drink water and re-measure in 15 minutes; report it to the flight surgeon if it keeps rising.")


def _low_pressure(stats):
    bp, hr = _delta(stats, "bp_sys"), _delta(stats, "hr")
    if bp is None or bp > -DELTAS["bp_sys"][0]:
        return None
    supports = [hr is not None and hr >= 8]
    evidence = [_evidence(stats, "bp_sys", "below")]
    if supports[0]:
        evidence.append(_evidence(stats, "hr", "above"))
    return ("Possible low blood pressure or fluid shift", _likelihood(-bp / DELTAS["bp_sys"][1], supports),
            evidence, "Move slowly, drink water and report it to the flight surgeon if you feel dizzy or faint.")


def _low_mood(stats):
    c = stats["checkins"]
    if c["count"] < 3 or c["mood_avg"] > LOW_MOOD:
        return None
    hrv = _delta(stats, "hrv_rmssd")
    supports = [c["sleep_avg"] <= LOW_SLEEP_H, hrv is not None and hrv <= -10]
    evidence = [f"Your last {c['count']} check-ins average a mood of {c['mood_avg']} out of 5"]
    if supports[0]:
        evidence.append(f"They also average only {c['sleep_avg']} h of sleep")
    if supports[1]:
        evidence.append(_evidence(stats, "hrv_rmssd", "below"))
    return ("Possible stress or low mood", _likelihood((3 - c["mood_avg"]) / 1.5, supports), evidence,
            "Talk to a crew mate or the ground team, and keep logging your daily check-in.")


def _sensor_problems(stats):
    findings = []
    for channel, label in CHANNEL.items():
        names = [n for n in BASELINE if SENSOR.get(n) == channel]
        share = stats["vitals"][names[0]]["untrusted_share"]  # one sensor feeds all its vitals equally
        if share < SENSOR_SHARE:
            continue
        left_out = " and ".join(LABEL[n].lower() for n in names)
        findings.append((f"Possible sensor problem: {label}", "high" if share >= 0.6 else "medium",
                         [f"The {label} signal was untrusted for {share:.0%} of the window",
                          f"Readings for {left_out} were left out of the analysis"],
                         f"Check that the {label} sits firmly in place and wait for the signal to return."))
    return findings


def _facts(stats):
    facts = []
    for name, v in stats["vitals"].items():
        if v["usable"] and (abs(v["trend_pct"]) >= 5 or abs(v["delta"]) >= DELTAS[name][0] / 2):
            direction = "up" if v["trend_change"] > 0 else "down"
            facts.append(f"{LABEL[name]} averaged {_fmt(name, v['mean'])} and trended {direction} "
                         f"{abs(v['trend_pct'])}% over the window.")
    for name, v in stats["vitals"].items():
        outside = v["amber_share"] + v["red_share"]
        if outside >= 0.2:
            facts.append(f"{LABEL[name]} was outside its normal range {outside:.0%} of the time.")
    link = stats["hrv_dose_link"]
    if link is not None and abs(link) >= 0.5:
        facts.append(f"Heart rate variability moved {'against' if link < 0 else 'with'} the radiation dose "
                     f"rate (correlation {link}).")
    c = stats["checkins"]
    if c["count"]:
        facts.append(f"Your last {c['count']} check-ins average {c['sleep_avg']} h of sleep and a mood of "
                     f"{c['mood_avg']} out of 5.")
    facts.append(f"You received {stats['dose']['received_msv']:.3f} mSv of radiation in this window.")
    hr = stats["vitals"]["hr"]
    if len(facts) < 2 and hr["usable"]:
        facts.append(f"Heart rate averaged {_fmt('hr', hr['mean'])}, against a baseline of {BASELINE['hr']:.0f} bpm.")
    return facts[:6]


def local_report(stats):
    """Build the report from the aggregated stats; id and time are added when it is saved."""
    minutes, rows = stats["window_minutes"], stats["rows"]
    report = {"window_minutes": minutes, "engine": "local", "model": None, "data_points": rows,
              "disclaimer": DISCLAIMER}
    if rows < MIN_ROWS:
        need = MIN_ROWS - rows
        # Simulator stores ~1 sample/s once the backend is running (see Engine._advance).
        report.update(
            summary=(
                f"Waiting for readings: only {rows} of {MIN_ROWS} needed were stored in the last "
                f"{minutes} minutes. Keep the backend (and simulator) running — about 1 reading "
                f"per second — then retry in ~{need}s. This is not an empty health report."
            ),
            findings=[],
            facts=[
                f"{rows} readings stored in the last {minutes} minutes",
                f"Need at least {MIN_ROWS} readings before analysis can run",
                f"Wait ~{need}s for the live simulator to accumulate more samples",
            ],
        )
        return report

    candidates = [_radiation(stats), _hypoxia(stats), _fever(stats), _low_pressure(stats), _low_mood(stats)]
    if candidates[0] is None:  # a radiation response already explains a falling HRV
        candidates.append(_fatigue(stats))
    candidates = [c for c in candidates if c] + _sensor_problems(stats)
    candidates.sort(key=lambda c: LEVELS.index(c[1]), reverse=True)
    findings = [{"condition": cond, "likelihood": level, "evidence": evidence, "action": action}
                for cond, level, evidence, action in candidates[:MAX_FINDINGS]]

    if findings:
        top = findings[0]
        summary = (f"{len(findings)} possible item(s) found in the last {minutes} minutes. "
                   f"The most likely is: {top['condition'].lower()} ({top['likelihood']} likelihood). "
                   "These are possibilities to check, not a diagnosis.")
    else:
        summary = (f"Nothing unusual was found in the last {minutes} minutes; "
                   "your readings stayed close to your baseline.")
    report.update(summary=summary, findings=findings, facts=_facts(stats))
    return report
