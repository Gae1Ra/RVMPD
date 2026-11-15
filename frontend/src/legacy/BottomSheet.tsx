import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { fmt, METRICS, STATUS_WORD, TRUST_LIMIT, type SheetKey } from '../meta'
import type { Checkin, Frame, HistoryPoint, MetricKey } from '../types'
import type { SheetTarget } from './BodyFigure'
import { StatusBadge } from './Status'

const ORIGIN_LABEL = { physiological: 'Body change', artifact: 'Sensor artifact' } as const

const CHART_W = 320
const CHART_H = 110
const PAD = 8

// Loaded when the sheet opens; if the request fails or is empty the chart is simply left out.
function HistoryChart({ metricKey, baseline, unit }: { metricKey: MetricKey | 'radiation'; baseline: number | null; unit: string }) {
  const [points, setPoints] = useState<HistoryPoint[]>([])

  useEffect(() => {
    let cancelled = false
    api
      .history(metricKey === 'radiation' ? 'dose_rate' : metricKey, 60)
      .then((r) => !cancelled && setPoints(r.points))
      .catch(() => !cancelled && setPoints([]))
    return () => {
      cancelled = true
    }
  }, [metricKey])

  if (points.length < 2) return null
  const values = points.map((p) => p.value)
  const lo = Math.min(...values, baseline ?? Infinity)
  const hi = Math.max(...values, baseline ?? -Infinity)
  const span = hi - lo || 1
  const y = (v: number) => PAD + (1 - (v - lo) / span) * (CHART_H - 2 * PAD)
  const line = values.map((v, i) => `${(PAD + (i / (values.length - 1)) * (CHART_W - 2 * PAD)).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const decimals = METRICS[metricKey].decimals
  const min = Math.min(...values)
  const max = Math.max(...values)

  return (
    <div className="history-chart">
      <h4>Last hour</h4>
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} role="img" aria-label={`${METRICS[metricKey].name} over the last hour, from ${fmt(min, decimals)} to ${fmt(max, decimals)} ${unit}`}>
        {baseline !== null && <line x1={PAD} x2={CHART_W - PAD} y1={y(baseline)} y2={y(baseline)} stroke="var(--muted)" strokeDasharray="4 3" />}
        <polyline points={line} fill="none" stroke="var(--trace)" strokeWidth="2" strokeLinejoin="round" />
        <text x={CHART_W - PAD} y={PAD + 8} textAnchor="end">max {fmt(max, decimals)}</text>
        <text x={CHART_W - PAD} y={CHART_H - 2} textAnchor="end">min {fmt(min, decimals)}</text>
      </svg>
      {baseline !== null && <p className="muted">Dashed line: your baseline</p>}
    </div>
  )
}

function MetricSection({ metricKey, frame }: { metricKey: MetricKey | 'radiation'; frame: Frame }) {
  const meta = METRICS[metricKey]
  const alert = frame.alerts.find((a) => a.metric === metricKey)

  let reading: string
  let baseline: string | null = null
  let baselineValue: number | null = null
  let unit = 'µSv/h'
  let untrusted = false
  if (metricKey === 'radiation') {
    const r = frame.radiation
    reading = `${r.dose_rate_usv_h.toFixed(1)} µSv/h, ${r.dose_total_msv.toFixed(3)} mSv total`
  } else {
    const v = frame.vitals[metricKey]
    reading = `${fmt(v.value, meta.decimals)} ${v.unit}`
    baseline = `${fmt(v.baseline, meta.decimals)} ${v.unit}`
    baselineValue = v.baseline
    unit = v.unit
    untrusted = v.sqi < TRUST_LIMIT
  }

  return (
    <article className="sheet-section">
      <h3>{meta.name}</h3>
      {alert ? (
        <>
          <p className="sheet-alert-head">
            <StatusBadge tone={alert.level} label={`${STATUS_WORD[alert.level]}: ${alert.title}`} />
          </p>
          <span className="chip">{ORIGIN_LABEL[alert.origin]}</span>
          <p>{alert.explanation}</p>
          <h4>What to do</h4>
          <ol className="guidance">
            {alert.guidance.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ol>
        </>
      ) : (
        <>
          <p>{meta.what}</p>
          <p className="muted">Normal range: {meta.normal}</p>
        </>
      )}
      <HistoryChart metricKey={metricKey} baseline={baselineValue} unit={unit} />
      {untrusted && <p className="muted">The sensor signal is weak, so this reading is not trusted right now.</p>}
      <dl className="readings num">
        <div>
          <dt>Now</dt>
          <dd>{reading}</dd>
        </div>
        {baseline && (
          <div>
            <dt>Your baseline</dt>
            <dd>{baseline}</dd>
          </div>
        )}
      </dl>
    </article>
  )
}

function MoodSection({ checkin }: { checkin?: Checkin }) {
  return (
    <article className="sheet-section">
      <h3>Sleep and mood</h3>
      <p>Sleep and mood come from your daily check-in, not from a sensor. Poor sleep and low mood often show up in heart rate variability too.</p>
      <p className="muted">Healthy adults usually need 7 to 9 hours of sleep.</p>
      <dl className="readings num">
        <div>
          <dt>Last check-in</dt>
          <dd>{checkin ? `Mood ${checkin.mood} of 5, ${checkin.sleep_hours} h sleep` : 'None yet'}</dd>
        </div>
      </dl>
    </article>
  )
}

interface Props {
  target: SheetTarget | null
  frame: Frame
  latestCheckin?: Checkin
  onClose: () => void
}

export function BottomSheet({ target, frame, latestCheckin, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!target) return
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [target, onClose])

  if (!target) return null
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={target.title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{target.title}</h2>
          <button ref={closeRef} type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="sheet-body">
          {target.keys.map((k: SheetKey) =>
            k === 'mood' ? (
              <MoodSection key={k} checkin={latestCheckin} />
            ) : (
              <MetricSection key={k} metricKey={k} frame={frame} />
            ),
          )}
        </div>
        <p className="disclaimer">Decision support, not a medical diagnosis.</p>
      </div>
    </div>
  )
}
