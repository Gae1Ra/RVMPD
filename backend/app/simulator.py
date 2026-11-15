"""Synthetic astronaut: raw waveforms plus the hidden 'true' vitals behind them."""
import math
from dataclasses import dataclass

import numpy as np

FS = 250  # samples per second
CHUNK = 50  # samples per frame (0.2 s)

NOMINAL = {
    "hr": 68.0, "rmssd": 45.0, "spo2": 98.0, "temp": 36.6, "resp": 14.0,
    "bp_sys": 117.0, "dose_rate": 12.0, "ecg_quality": 1.0, "spike_rate": 0.0,
}


@dataclass(frozen=True)
class Scenario:
    id: str
    name: str
    description: str
    target: dict


def _scenario(id, name, description, **changes):
    return Scenario(id, name, description, {**NOMINAL, **changes})


SCENARIOS = {s.id: s for s in [
    _scenario("nominal", "Nominal", "Healthy crew member, quiet radiation environment."),
    _scenario("solar_particle_event", "Solar particle event",
              "Radiation dose rate climbs, heart rate rises and the pulse sensor is hit by radiation spikes.",
              dose_rate=450.0, hr=82.0, rmssd=25.0, spo2=97.0, resp=15.0, bp_sys=122.0, spike_rate=1.5),
    _scenario("hypoxia", "Hypoxia",
              "Blood oxygen falls while heart rate and breathing speed up.",
              spo2=88.0, hr=90.0, resp=20.0, rmssd=38.0, bp_sys=124.0),
    _scenario("loose_electrode", "Loose electrode",
              "The ECG electrode comes loose: the signal is noise, but the body is fine.",
              ecg_quality=0.0),
    _scenario("fatigue", "Fatigue",
              "Low heart rate variability, slightly raised heart rate and temperature.",
              rmssd=22.0, hr=74.0, temp=36.9),
    # Watch-realistic subset for the Samsung Galaxy Watch contest demo.
    # SpO₂ is intermittent in the Engine overlay; BP/RR are not claimed by the watch UI.
    _scenario("galaxy_watch", "Galaxy Watch demo",
              "Watch-like vitals: HR continuous, occasional SpO₂, skin temperature; no ECG/PPG waveforms from the watch.",
              hr=70.0, rmssd=44.0, spo2=97.5, temp=36.5, resp=14.0, bp_sys=117.0, ecg_quality=0.35),
]}

# Seconds the latent values take to follow a new scenario (about 3x this to settle).
TAU = {"dose_rate": 8.0, "spike_rate": 8.0, "ecg_quality": 3.0}
DEFAULT_TAU = 5.0

# (offset from the R peak in s, amplitude in mV, width in s) for P, Q, R, S, T
ECG_WAVES = [(-0.20, 0.15, 0.025), (-0.04, -0.15, 0.010), (0.0, 1.2, 0.012),
             (0.04, -0.25, 0.010), (0.27, 0.30, 0.050)]
# Pulse wave: systolic peak and a smaller dicrotic bump after each beat
PPG_WAVES = [(0.15, 1.0, 0.07), (0.28, 0.35, 0.05)]


@dataclass
class Chunk:
    ecg: np.ndarray
    ppg: np.ndarray
    resp: np.ndarray
    truth: dict
    dose_rate: float
    dose_total_msv: float
    t: float  # mission time at the end of the chunk, seconds


def _waves(rel, waves):
    """Sum of Gaussians evaluated on a (samples x beats) matrix of times since each beat."""
    return sum(a * np.exp(-0.5 * ((rel - off) / w) ** 2) for off, a, w in waves).sum(axis=1)


class Simulator:
    def __init__(self, seed=None):
        self.rng = np.random.default_rng(seed)
        self.scenario = SCENARIOS["nominal"]
        self.latent = dict(NOMINAL)
        self.n = 0  # samples generated so far
        self.beats = [0.0]  # R-peak times, seconds
        self.resp_phase = 0.0
        self.dose_total_msv = 4.2

    def set_scenario(self, scenario_id):
        self.scenario = SCENARIOS[scenario_id]

    def _relax(self, dt):
        for key, target in self.scenario.target.items():
            k = 1 - math.exp(-dt / TAU.get(key, DEFAULT_TAU))
            self.latent[key] += (target - self.latent[key]) * k

    def _extend_beats(self, until):
        # RR intervals are independent, so successive differences have RMSSD = sd * sqrt(2)
        sd = self.latent["rmssd"] / 1000 / math.sqrt(2)
        while self.beats[-1] < until:
            rr = 60 / self.latent["hr"] + self.rng.normal(0, sd)
            self.beats.append(self.beats[-1] + min(max(rr, 0.3), 2.0))

    def step(self):
        dt = CHUNK / FS
        self._relax(dt)
        t = (self.n + np.arange(CHUNK)) / FS
        self._extend_beats(t[-1] + 1.0)
        self.beats = [b for b in self.beats if b > t[0] - 1.0]
        rel = t[:, None] - np.array(self.beats)[None, :]

        quality = self.latent["ecg_quality"]
        wander = 0.05 * np.sin(2 * np.pi * 0.2 * t)
        ecg = (quality * _waves(rel, ECG_WAVES) + wander + self.rng.normal(0, 0.01, CHUNK)
               + (1 - quality) * self.rng.normal(0, 0.3, CHUNK))

        ppg = 0.05 + 0.65 * _waves(rel, PPG_WAVES) + self.rng.normal(0, 0.005, CHUNK)
        # Radiation hits on the photodiode: one-to-two-sample spikes
        for _ in range(self.rng.poisson(self.latent["spike_rate"] * dt)):
            i = self.rng.integers(0, CHUNK - 1)
            amp = self.rng.uniform(0.45, 0.7)
            ppg[i] += amp
            ppg[i + 1] += 0.6 * amp
        ppg = np.clip(ppg, 0, 1)

        phase = self.resp_phase + 2 * np.pi * self.latent["resp"] / 60 * np.arange(1, CHUNK + 1) / FS
        self.resp_phase = phase[-1] % (2 * np.pi)
        resp = 0.5 + 0.4 * np.sin(phase) + self.rng.normal(0, 0.01, CHUNK)

        dose_rate = self.latent["dose_rate"] * self.rng.normal(1, 0.04)
        self.dose_total_msv += dose_rate / 3600 / 1000 * dt  # uSv/h -> mSv
        self.n += CHUNK
        return Chunk(ecg, ppg, resp, dict(self.latent), dose_rate, self.dose_total_msv, self.n / FS)
