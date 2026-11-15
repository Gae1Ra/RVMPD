import { INDICATOR_METRIC, INITIAL_INDICATORS, statusToLevel } from './constants'
import type { Alert, Frame, Indicator, IndicatorId, Level, SeriesPoint, Status } from './types'

const TRUST_LIMIT = 0.5

export function applyFrameToIndicators(frame: Frame, previous: Indicator[]): Indicator[] {
  const artifactMetrics = new Set(
    frame.alerts.filter((a) => a.origin === 'artifact').map((a) => a.metric),
  )

  return previous.map((ind) => {
    const key = INDICATOR_METRIC[ind.id]
    const vital = frame.vitals[key]
    if (!vital) return ind
    return {
      ...ind,
      current: Number(vital.value.toFixed(ind.decimals)),
      // Keep SPEC/UI unit labels (e.g. lpm); CONTRACT units stay on the wire.
      base: vital.baseline,
      baseline: vital.baseline,
      delta: vital.delta,
      sqi: vital.sqi,
      status: vital.status,
      artifact: artifactMetrics.has(key) || vital.sqi < TRUST_LIMIT,
      metricKey: key,
      // CONTRACT only exposes bp_sys — no diastolic field.
      diastolic: ind.id === 'pa' ? undefined : ind.diastolic,
    }
  })
}

export function globalStatusToLevel(status: Status): Level {
  return statusToLevel(status)
}

export function historyToSeries(
  values: number[],
  missionSeconds: number,
  decimals: number,
): SeriesPoint[] {
  const start = Math.max(0, missionSeconds - values.length + 1)
  return values.map((val, idx) => {
    const t = start + idx
    const h = String(Math.floor((t % 86400) / 3600)).padStart(2, '0')
    const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0')
    const s = String(Math.floor(t % 60)).padStart(2, '0')
    return {
      val: Number(val.toFixed(decimals)),
      label: `${h}:${m}:${s}`,
    }
  })
}

export function snapshotPrevEvent(indicators: Indicator[]): Indicator[] {
  return indicators.map((ind) => ({
    ...ind,
    prevEvent: ind.current,
    prevDiastolic: ind.diastolic,
  }))
}

export function primaryAlert(alerts: Alert[]): Alert | null {
  return alerts[0] ?? null
}

export function cloneInitialIndicators(): Indicator[] {
  return INITIAL_INDICATORS.map((ind) => ({ ...ind, metricKey: INDICATOR_METRIC[ind.id as IndicatorId] }))
}
