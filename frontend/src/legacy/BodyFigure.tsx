import { worstTone, type SheetKey } from '../meta'
import type { Frame, MetricKey } from '../types'
import { StatusBadge, type Tone } from './Status'

export interface SheetTarget {
  title: string
  keys: SheetKey[]
}

interface Region {
  id: string
  label: string
  detail: string
  vitals: MetricKey[]
  keys: SheetKey[]
}

const REGIONS: Region[] = [
  { id: 'head', label: 'Head', detail: 'Sleep and mood', vitals: [], keys: ['mood'] },
  { id: 'chest', label: 'Chest and heart', detail: 'Heart rate, variability, pressure', vitals: ['hr', 'hrv_rmssd', 'bp_sys'], keys: ['hr', 'hrv_rmssd', 'bp_sys'] },
  { id: 'lungs', label: 'Lungs', detail: 'Oxygen, breathing', vitals: ['spo2', 'resp_rate'], keys: ['spo2', 'resp_rate'] },
  { id: 'core', label: 'Core', detail: 'Temperature', vitals: ['temp'], keys: ['temp'] },
]

export function BodyFigure({ frame, onOpen }: { frame: Frame; onOpen: (t: SheetTarget) => void }) {
  const tones = Object.fromEntries(
    REGIONS.map((r) => [r.id, r.vitals.length ? worstTone(frame, r.vitals) : 'none']),
  ) as Record<string, Tone>
  const open = (r: Region) => onOpen({ title: r.label, keys: r.keys })
  const hit = (r: Region) => ({ className: `region tone-${tones[r.id]}`, onClick: () => open(r) })

  return (
    <section className="card body" aria-label="Body overview">
      <h2>Body overview</h2>
      <div className="body-layout">
        {/* Mouse and touch shortcut; the list beside it is the keyboard and screen-reader route. */}
        <svg className="figure" viewBox="0 0 200 330" aria-hidden="true">
          <g className="outline" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M88 66v14M112 66v14" />
            <path d="M62 84q38-10 76 0l8 6v88l-10 100h-24l-4-90h-16l-4 90H64L54 178V90z" />
            <path d="M54 94L34 170M146 94l20 76" />
          </g>
          <circle {...hit(REGIONS[0])} cx="100" cy="40" r="26" />
          <ellipse {...hit(REGIONS[2])} cx="72" cy="125" rx="19" ry="30" />
          <ellipse {...hit(REGIONS[2])} cx="128" cy="125" rx="19" ry="30" />
          <circle {...hit(REGIONS[1])} cx="100" cy="132" r="15" />
          <rect {...hit(REGIONS[3])} x="68" y="168" width="64" height="62" rx="14" />
        </svg>
        <ul className="region-list">
          {REGIONS.map((r) => (
            <li key={r.id}>
              <button type="button" className={`region-btn tone-edge-${tones[r.id]}`} onClick={() => open(r)}>
                <span className="region-name">{r.label}</span>
                <span className="muted region-detail">{r.detail}</span>
                <StatusBadge tone={tones[r.id]} label={r.id === 'head' ? 'Check-in' : undefined} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
