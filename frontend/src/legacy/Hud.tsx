import { fmt, METRICS, TRUST_LIMIT } from '../meta'
import type { Frame } from '../types'
import { StatusBadge, StatusIcon, type Tone } from './Status'

function Tile({ label, value, unit, tone }: { label: string; value: string | null; unit: string; tone: Tone }) {
  return (
    <div className={`hud-tile tone-edge-${tone}`}>
      <span className="hud-label">{label}</span>
      <span className="hud-value num">
        {value ?? <span className="hud-check">Sensor check</span>}
        {value && <small>{unit}</small>}
      </span>
      <StatusBadge tone={tone} />
    </div>
  )
}

export function Hud({ frame }: { frame: Frame }) {
  const { hr, spo2 } = frame.vitals
  const alert = frame.alerts[0]
  const trusted = (sqi: number) => sqi >= TRUST_LIMIT
  return (
    <section className="hud" aria-label="High-contrast display">
      <Tile
        label={METRICS.hr.name}
        value={trusted(hr.sqi) ? fmt(hr.value, 0) : null}
        unit={hr.unit}
        tone={trusted(hr.sqi) ? hr.status : 'none'}
      />
      <Tile
        label={METRICS.spo2.name}
        value={trusted(spo2.sqi) ? fmt(spo2.value, 0) : null}
        unit={spo2.unit}
        tone={trusted(spo2.sqi) ? spo2.status : 'none'}
      />
      <Tile
        label="Radiation dose rate"
        value={frame.radiation.dose_rate_usv_h.toFixed(1)}
        unit="µSv/h"
        tone={frame.radiation.status}
      />
      <div className={`hud-alert ${alert ? `tone-edge-${alert.level}` : 'tone-edge-green'}`} role="status">
        <StatusIcon tone={alert ? alert.level : 'green'} size={28} />
        <span>{alert ? alert.title : 'No active alerts'}</span>
      </div>
    </section>
  )
}
