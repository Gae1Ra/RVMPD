import type { Alert, Frame, MetricKey, Scenario, Status, Vital } from './types'
import { METRIC_KEYS } from './meta'

// In-browser stand-in for the backend, used when the WebSocket cannot connect.
// Produces frames shaped exactly like the contract.

export const MOCK_SCENARIOS: Scenario[] = [
  { id: 'nominal', name: 'Nominal', description: 'Everything within the personal baseline.' },
  { id: 'solar_particle_event', name: 'Solar particle event', description: 'Radiation dose rate climbs sharply.' },
  { id: 'hypoxia', name: 'Hypoxia', description: 'Blood oxygen falls while breathing speeds up.' },
  { id: 'loose_electrode', name: 'Loose electrode', description: 'A sensor artifact corrupts the heart signal.' },
  { id: 'fatigue', name: 'Fatigue', description: 'Heart rate variability drops as fatigue builds.' },
]

const FS = 250
const SAMPLES_PER_FRAME = 50

const BASE: Record<MetricKey, { value: number; unit: string }> = {
  hr: { value: 68, unit: 'bpm' },
  hrv_rmssd: { value: 45, unit: 'ms' },
  spo2: { value: 98, unit: '%' },
  temp: { value: 36.6, unit: '°C' },
  resp_rate: { value: 14, unit: 'rpm' },
  bp_sys: { value: 117, unit: 'mmHg' },
}

const NOISE: Record<MetricKey, number> = { hr: 1.2, hrv_rmssd: 1.5, spo2: 0.3, temp: 0.03, resp_rate: 0.4, bp_sys: 1.5 }

interface Effect {
  target: Partial<Record<MetricKey, number>>
  status: Partial<Record<MetricKey, Status>>
  lowSqi?: MetricKey[]
  radiation?: { rate: number; status: Status }
  alert?: Omit<Alert, 'id' | 't'>
}

const EFFECTS: Record<string, Effect> = {
  nominal: { target: {}, status: {} },
  solar_particle_event: {
    target: { hr: 78 },
    status: { hr: 'amber' },
    radiation: { rate: 480, status: 'red' },
    alert: {
      metric: 'radiation',
      level: 'red',
      origin: 'physiological',
      title: 'Radiation dose rate is high',
      explanation: 'A burst of charged particles from the Sun is raising your dose rate well above the usual level.',
      guidance: [
        'Move to the most shielded part of the vehicle.',
        'Stay there until the dose rate drops back to normal.',
        'Tell mission control and note the time you started sheltering.',
      ],
    },
  },
  hypoxia: {
    target: { spo2: 88, hr: 96, resp_rate: 22 },
    status: { spo2: 'red', hr: 'amber', resp_rate: 'amber' },
    alert: {
      metric: 'spo2',
      level: 'red',
      origin: 'physiological',
      title: 'Oxygen saturation far below your baseline',
      explanation: 'Less oxygen is reaching your blood than usual, and your breathing and heart rate are rising to compensate.',
      guidance: [
        'Stop physical effort and sit or float still.',
        'Check the cabin oxygen level and ventilation.',
        'Contact mission control now if the reading stays low.',
      ],
    },
  },
  loose_electrode: {
    target: {},
    status: { hr: 'amber', hrv_rmssd: 'amber' },
    lowSqi: ['hr', 'hrv_rmssd'],
    alert: {
      metric: 'hr',
      level: 'amber',
      origin: 'artifact',
      title: 'Heart signal is noisy',
      explanation: 'The chest sensor is probably not touching your skin well, so the heart readings cannot be trusted right now.',
      guidance: [
        'Press the chest sensor flat against your skin.',
        'Check that the electrode patch is not dry or peeling.',
        'Wait about 30 seconds for the signal to settle.',
      ],
    },
  },
  fatigue: {
    target: { hrv_rmssd: 24, hr: 74, temp: 36.9 },
    status: { hrv_rmssd: 'amber' },
    alert: {
      metric: 'hrv_rmssd',
      level: 'amber',
      origin: 'physiological',
      title: 'Heart rate variability is low',
      explanation: 'Your body is showing signs of fatigue and may not be recovering well between periods of activity.',
      guidance: [
        'Plan a rest period before your next demanding task.',
        'Drink water and eat a regular meal.',
        'Log your sleep in the daily check-in.',
      ],
    },
  },
}

const P_ADJ: Record<Status, number> = { green: 0.8, amber: 0.012, red: 0.0004 }
const RAMP_SECONDS = 6
const gauss = (x: number, c: number, w: number, a: number) => a * Math.exp(-(((x - c) / w) ** 2))

function ecgShape(p: number) {
  return (
    gauss(p, 0.18, 0.025, 0.12) + // P
    gauss(p, 0.3, 0.008, -0.12) + // Q
    gauss(p, 0.32, 0.01, 1.2) + // R
    gauss(p, 0.345, 0.01, -0.25) + // S
    gauss(p, 0.55, 0.05, 0.3) // T
  )
}

export function createMock() {
  let scenario = 'nominal'
  let scenarioStart = 0
  let t = 0
  let beat = 0
  let dose = 4.213
  let vitals = {} as Record<MetricKey, Vital>
  let lastWholeSecond = -1

  const secondsIn = () => t - scenarioStart

  function computeVitals(fx: Effect): Record<MetricKey, Vital> {
    const ramp = Math.min(1, secondsIn() / RAMP_SECONDS)
    const settled = ramp > 0.6
    const out = {} as Record<MetricKey, Vital>
    for (const k of METRIC_KEYS) {
      const base = BASE[k].value
      const goal = fx.target[k] ?? base
      const noisy = fx.lowSqi?.includes(k) && settled
      const value = base + (goal - base) * ramp + (Math.random() - 0.5) * 2 * NOISE[k] * (noisy ? 6 : 1)
      const status: Status = settled ? (fx.status[k] ?? 'green') : 'green'
      const baseline = base
      out[k] = {
        value: Number(value.toFixed(2)),
        unit: BASE[k].unit,
        baseline,
        delta: Number((value - baseline).toFixed(2)),
        status,
        p_adj: P_ADJ[status],
        sqi: noisy ? 0.3 : 0.93 + Math.random() * 0.06,
      }
    }
    return out
  }

  function waves() {
    const hr = vitals.hr.value
    const respHz = vitals.resp_rate.value / 60
    const fx = EFFECTS[scenario]
    const noisyEcg = !!fx.lowSqi && secondsIn() > RAMP_SECONDS * 0.6
    const ecg: number[] = []
    const ppg: number[] = []
    const resp: number[] = []
    for (let i = 0; i < SAMPLES_PER_FRAME; i++) {
      beat = (beat + hr / 60 / FS) % 1
      const ts = t + i / FS
      let e = ecgShape(beat) * 0.9 + (Math.random() - 0.5) * 0.02
      if (noisyEcg) e += (Math.random() - 0.5) * 0.9
      ecg.push(Number(e.toFixed(4)))
      const pp = (beat + 0.85) % 1
      ppg.push(Number((0.3 + 0.55 * gauss(pp, 0.25, 0.12, 1) + 0.12 * gauss(pp, 0.55, 0.08, 1)).toFixed(4)))
      resp.push(Number((0.5 + 0.4 * Math.sin(2 * Math.PI * respHz * ts)).toFixed(4)))
    }
    return { fs: FS, ecg, ppg, resp }
  }

  function next(): Frame {
    const fx = EFFECTS[scenario]
    t += SAMPLES_PER_FRAME / FS
    const whole = Math.floor(t)
    if (whole !== lastWholeSecond) {
      lastWholeSecond = whole
      vitals = computeVitals(fx)
    }

    const settled = secondsIn() > RAMP_SECONDS * 0.6
    const rate = settled && fx.radiation ? fx.radiation.rate : 12.4 + Math.random() * 0.4
    dose += (rate / 3600) * (SAMPLES_PER_FRAME / FS)
    const radStatus: Status = settled && fx.radiation ? fx.radiation.status : 'green'

    const alerts: Alert[] = settled && fx.alert ? [{ ...fx.alert, id: `${fx.alert.metric}-${Math.floor(scenarioStart)}`, t: scenarioStart }] : []

    // Mirrors the contract rule: an artifact alert never lifts global status above amber.
    const rank: Record<Status, number> = { green: 0, amber: 1, red: 2 }
    let worst: Status = radStatus
    for (const k of METRIC_KEYS) {
      const v = vitals[k]
      const suppressed = v.sqi < 0.5
      const s: Status = suppressed && v.status === 'red' ? 'amber' : v.status
      if (rank[s] > rank[worst]) worst = s
    }
    const meanSqi = METRIC_KEYS.reduce((sum, k) => sum + vitals[k].sqi, 0) / METRIC_KEYS.length

    return {
      type: 'frame',
      t: Number(t.toFixed(2)),
      scenario,
      wave: waves(),
      vitals,
      radiation: { dose_rate_usv_h: Number(rate.toFixed(1)), dose_total_msv: Number(dose.toFixed(3)), status: radStatus },
      global: { status: worst, confidence: fx.lowSqi && settled ? 0.62 : 0.95, sqi: Number(meanSqi.toFixed(2)), link: 'ok' },
      alerts,
    }
  }

  function setScenario(id: string) {
    if (!EFFECTS[id]) return
    scenario = id
    scenarioStart = t
    lastWholeSecond = -1
  }

  vitals = computeVitals(EFFECTS.nominal)

  return { next, setScenario }
}

export type Mock = ReturnType<typeof createMock>
