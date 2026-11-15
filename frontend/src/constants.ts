import type { Indicator, IndicatorId, Level, LevelMeta, MetricKey, Mission, Status } from './types'
import { formatNumber } from './i18n/format'
import type { Locale } from './i18n/es'

/** UI indicator id ↔ CONTRACT vital key */
export const INDICATOR_METRIC: Record<IndicatorId, MetricKey> = {
  fc: 'hr',
  spo2: 'spo2',
  pa: 'bp_sys',
  fr: 'resp_rate',
  temp: 'temp',
  hrv: 'hrv_rmssd',
}

export const METRIC_INDICATOR: Record<MetricKey, IndicatorId> = {
  hr: 'fc',
  spo2: 'spo2',
  bp_sys: 'pa',
  resp_rate: 'fr',
  temp: 'temp',
  hrv_rmssd: 'hrv',
}

/**
 * Backend status (green/amber/red) → UI Level (0–3).
 * Level 1 (OBSERVACIÓN) is unused for ternary backend status; reserved for local threshold logic.
 * Documented in DECISIONES.md §5.
 */
export function statusToLevel(status: Status): Level {
  switch (status) {
    case 'red':
      return 3
    case 'amber':
      return 2
    default:
      return 0
  }
}

/** Structural indicator seeds — visible strings come from i18n dictionaries. */
export const INITIAL_INDICATORS: Indicator[] = [
  {
    id: 'fc',
    abbr: 'FC',
    astroName: '',
    clinicalName: '',
    unit: 'lpm',
    decimals: 0,
    base: 72,
    current: 72,
    prevEvent: 72,
    ref: [60, 80],
    warn: [50, 100],
    crit: [40, 120],
    rangeText: '60–80',
    chartMin: 40,
    chartMax: 140,
    plainDesc: '',
    whatMeasures: '',
    whenNotify: '',
    metricKey: 'hr',
  },
  {
    id: 'spo2',
    abbr: 'SpO₂',
    astroName: '',
    clinicalName: '',
    unit: '%',
    decimals: 0,
    base: 98,
    current: 98,
    prevEvent: 98,
    ref: [95, 100],
    warn: [92, 100],
    crit: [88, 100],
    rangeText: '95–100',
    chartMin: 85,
    chartMax: 100,
    plainDesc: '',
    whatMeasures: '',
    whenNotify: '',
    metricKey: 'spo2',
  },
  {
    id: 'pa',
    abbr: 'PA',
    astroName: '',
    clinicalName: '',
    unit: 'mmHg',
    decimals: 0,
    base: 118,
    current: 118,
    prevEvent: 118,
    ref: [110, 125],
    warn: [100, 138],
    crit: [90, 155],
    rangeText: '110–125',
    chartMin: 85,
    chartMax: 165,
    plainDesc: '',
    whatMeasures: '',
    whenNotify: '',
    metricKey: 'bp_sys',
  },
  {
    id: 'fr',
    abbr: 'FR',
    astroName: '',
    clinicalName: '',
    unit: 'rpm',
    decimals: 0,
    base: 15,
    current: 15,
    prevEvent: 15,
    ref: [12, 18],
    warn: [10, 22],
    crit: [8, 28],
    rangeText: '12–18',
    chartMin: 6,
    chartMax: 32,
    plainDesc: '',
    whatMeasures: '',
    whenNotify: '',
    metricKey: 'resp_rate',
  },
  {
    id: 'temp',
    abbr: 'Temp.',
    astroName: '',
    clinicalName: '',
    unit: '°C',
    decimals: 1,
    base: 36.8,
    current: 36.8,
    prevEvent: 36.8,
    ref: [36.2, 37.2],
    warn: [35.8, 37.8],
    crit: [35.0, 38.5],
    rangeText: '36.2–37.2',
    chartMin: 34.8,
    chartMax: 39.0,
    plainDesc: '',
    whatMeasures: '',
    whenNotify: '',
    metricKey: 'temp',
  },
  {
    id: 'hrv',
    abbr: 'HRV',
    astroName: '',
    clinicalName: '',
    unit: 'ms',
    decimals: 0,
    base: 54,
    current: 54,
    prevEvent: 54,
    ref: [40, 70],
    warn: [28, 85],
    crit: [18, 100],
    rangeText: '40–70',
    chartMin: 10,
    chartMax: 100,
    plainDesc: '',
    whatMeasures: '',
    whenNotify: '',
    metricKey: 'hrv_rmssd',
  },
]

export const INITIAL_MISSIONS: Mission[] = [
  { id: 'water', title: 'water', xp: 10, done: false, isExercise: false },
  { id: 'breath', title: 'breath', xp: 20, done: false, isExercise: false },
  { id: 'react', title: 'react', xp: 25, done: false, isExercise: false },
  { id: 'exercise', title: 'exercise', xp: 40, done: false, isExercise: true },
  { id: 'rest', title: 'rest', xp: 20, done: false, isExercise: false },
]

/** @deprecated Prefer useT().formatNumber — kept for non-React helpers. */
export function formatEs(val: number, decimals = 0, locale: Locale = 'es'): string {
  return formatNumber(val, decimals, locale)
}

export function formatMissionClock(totalSeconds: number): string {
  const d = Math.floor(totalSeconds / 86400)
  const h = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0')
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const s = String(totalSeconds % 60).padStart(2, '0')
  return `T+ ${d}d ${h}:${m}:${s}`
}

export function getIndicatorLevel(ind: Indicator): Level {
  if (ind.status) return statusToLevel(ind.status)
  const v = ind.current
  if (v < ind.crit[0] || v > ind.crit[1]) return 3
  if (v < ind.warn[0] || v > ind.warn[1]) return 2
  if (v < ind.ref[0] || v > ind.ref[1]) return 1
  return 0
}

export function getLevelMeta(
  level: Level,
  labels?: { label: string; globalTitle: string },
): LevelMeta {
  const text = labels ?? {
    label: ['NORMAL', 'OBSERVACIÓN', 'ADVERTENCIA', 'CRÍTICO'][level],
    globalTitle: ['Todo en orden', 'En observación', 'Haz una pausa', 'Avisa ahora'][level],
  }
  switch (level) {
    case 3:
      return {
        level: 3,
        label: text.label,
        globalTitle: text.globalTitle,
        colorVar: 'var(--danger)',
        bgVar: 'var(--danger)',
        shape: 'square',
        isFilled: true,
      }
    case 2:
      return {
        level: 2,
        label: text.label,
        globalTitle: text.globalTitle,
        colorVar: 'var(--danger)',
        bgVar: 'var(--danger-bg)',
        shape: 'triangle',
        isFilled: false,
      }
    case 1:
      return {
        level: 1,
        label: text.label,
        globalTitle: text.globalTitle,
        colorVar: 'var(--status-watch)',
        bgVar: 'var(--surface-data)',
        shape: 'diamond',
        isFilled: false,
      }
    default:
      return {
        level: 0,
        label: text.label,
        globalTitle: text.globalTitle,
        colorVar: 'var(--accent)',
        bgVar: 'var(--glow-blue)',
        shape: 'circle',
        isFilled: false,
      }
  }
}
