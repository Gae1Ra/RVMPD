import type { Frame, MetricKey, Status } from './types'

export const METRIC_KEYS: MetricKey[] = ['hr', 'hrv_rmssd', 'spo2', 'temp', 'resp_rate', 'bp_sys']

export type SheetKey = MetricKey | 'radiation' | 'mood'

interface MetricMeta {
  name: string
  decimals: number
  what: string
  normal: string
}

export const METRICS: Record<MetricKey | 'radiation', MetricMeta> = {
  hr: {
    name: 'Heart rate',
    decimals: 0,
    what: 'How many times your heart beats each minute.',
    normal: 'At rest, 50 to 90 bpm. Your own baseline matters most.',
  },
  hrv_rmssd: {
    name: 'Heart rate variability',
    decimals: 0,
    what: 'How much the time between heartbeats varies. Higher usually means you are rested and recovering.',
    normal: 'Typically 20 to 80 ms. Compare it with your own baseline.',
  },
  spo2: {
    name: 'Blood oxygen',
    decimals: 1,
    what: 'The share of your blood that is carrying oxygen.',
    normal: '95 to 100 %.',
  },
  temp: {
    name: 'Body temperature',
    decimals: 1,
    what: 'Your core body temperature.',
    normal: '36.1 to 37.2 °C.',
  },
  resp_rate: {
    name: 'Breathing rate',
    decimals: 0,
    what: 'How many breaths you take each minute.',
    normal: '12 to 20 breaths per minute at rest.',
  },
  bp_sys: {
    name: 'Blood pressure',
    decimals: 0,
    what: 'The pressure in your arteries when the heart pushes blood out (the top number).',
    normal: '90 to 120 mmHg.',
  },
  radiation: {
    name: 'Radiation',
    decimals: 1,
    what: 'How much ionising radiation your body is absorbing, as a rate per hour and a running total.',
    normal: 'In orbit, about 10 to 30 µSv/h is typical.',
  },
}

export const STATUS_WORD: Record<Status, string> = { green: 'Normal', amber: 'Caution', red: 'Alert' }

export const TRUST_LIMIT = 0.5

const RANK: Record<Status, number> = { green: 0, amber: 1, red: 2 }

// Worst status among trusted readings; 'none' when every reading needs a sensor check.
export function worstTone(frame: Frame, keys: MetricKey[]): Status | 'none' {
  let worst: Status | 'none' = 'none'
  for (const k of keys) {
    const v = frame.vitals[k]
    if (v.sqi < TRUST_LIMIT) continue
    if (worst === 'none' || RANK[v.status] > RANK[worst]) worst = v.status
  }
  return worst
}

export const fmt = (n: number, decimals: number) => n.toFixed(decimals)

export function fmtDelta(n: number, decimals: number) {
  const rounded = Number(n.toFixed(decimals))
  if (rounded === 0) return '±0'
  return (rounded > 0 ? '+' : '−') + Math.abs(rounded).toFixed(decimals)
}
