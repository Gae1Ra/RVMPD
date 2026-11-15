import { useEffect, useState } from 'react'
import { api } from '../api'
import { STATUS_WORD } from '../meta'
import type { AlertLogEntry, Stats } from '../types'
import { StatusBadge } from './Status'

const REFRESH_MS = 30_000

const ORIGIN_LABEL = { physiological: 'Body change', artifact: 'Sensor artifact' } as const

const formatSize = (kb: number) => (kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`)

export function StoredData() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [alerts, setAlerts] = useState<AlertLogEntry[] | null>(null)

  useEffect(() => {
    let cancelled = false
    // A failed request keeps what was shown before, or nothing at all.
    const load = () => {
      api.stats().then((s) => !cancelled && setStats(s)).catch(() => undefined)
      api.alertLog(5).then((a) => !cancelled && setAlerts(a)).catch(() => undefined)
    }
    load()
    const timer = window.setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  if (!stats && !alerts) return null
  return (
    <section className="card" aria-label="Stored on this device">
      <h2>Stored on this device</h2>
      {stats && (
        <>
          <dl className="weather num">
            <div>
              <dt>Readings stored</dt>
              <dd>{stats.rows.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Since</dt>
              <dd>{new Date(stats.first).toLocaleString()}</dd>
            </div>
            <div>
              <dt>File size</dt>
              <dd>{formatSize(stats.size_kb)}</dd>
            </div>
          </dl>
          <p className="muted">Your data stays on board and works without a link to Earth.</p>
        </>
      )}
      {alerts && (
        <div>
          <h3>Recent alerts</h3>
          {alerts.length === 0 ? (
            <p className="muted">No alerts yet.</p>
          ) : (
            <ul className="alert-log">
              {alerts.map((a) => (
                <li key={a.id}>
                  <span className="muted num">{new Date(a.t).toLocaleTimeString()}</span>
                  <span>{a.title}</span>
                  <StatusBadge tone={a.level} label={STATUS_WORD[a.level]} />
                  <span className="chip">{ORIGIN_LABEL[a.origin]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
