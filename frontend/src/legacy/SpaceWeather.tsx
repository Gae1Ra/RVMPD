import { useEffect, useState } from 'react'
import { api } from '../api'
import type { SpaceWeather as Weather } from '../types'

const REFRESH_MS = 5 * 60 * 1000

const S_WORDS = ['No radiation storm', 'Minor storm', 'Moderate storm', 'Strong storm', 'Severe storm', 'Extreme storm']

export function SpaceWeather() {
  const [data, setData] = useState<Weather | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      api
        .spaceWeather()
        .then((d) => {
          if (cancelled) return
          setData(d)
          setFailed(false)
        })
        .catch(() => !cancelled && setFailed(true))
    load()
    const timer = window.setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  return (
    <section className="card" aria-label="Space weather">
      <h2>Space weather</h2>
      {data ? (
        <dl className="weather num">
          <div>
            <dt>Proton flux</dt>
            <dd>{data.proton_flux_pfu.toFixed(2)} pfu</dd>
          </div>
          <div>
            <dt>Radiation storm scale</dt>
            <dd>
              S{data.s_scale} <span className="muted">{S_WORDS[data.s_scale] ?? ''}</span>
            </dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{data.source}</dd>
          </div>
        </dl>
      ) : (
        <p className="muted">{failed ? 'Space weather is unavailable right now. Retrying every 5 minutes.' : 'Loading…'}</p>
      )}
    </section>
  )
}
