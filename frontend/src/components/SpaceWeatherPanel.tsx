import React, { useEffect, useState } from 'react'
import { api } from '../api'
import type { SpaceWeather } from '../types'
import { useT } from '../i18n'

const REFRESH_MS = 5 * 60 * 1000

export const SpaceWeatherPanel: React.FC = () => {
  const { t } = useT()
  const [data, setData] = useState<SpaceWeather | null>(null)
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
        .catch(() => {
          if (!cancelled) setFailed(true)
        })
    load()
    const timer = window.setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  return (
    <section className="vitalis-surface p-4 flex flex-col gap-3" aria-label={t.weather.title}>
      <h2 className="text-[16px] font-semibold">{t.weather.title}</h2>
      {data ? (
        <dl className="grid grid-cols-1 gap-2 text-[14px] font-mono">
          <div className="flex justify-between gap-2">
            <dt style={{ color: 'var(--text-muted)' }}>{t.weather.proton}</dt>
            <dd>{data.proton_flux_pfu.toFixed(2)} pfu</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt style={{ color: 'var(--text-muted)' }}>{t.weather.sScale}</dt>
            <dd>
              S{data.s_scale}{' '}
              <span style={{ color: 'var(--text-muted)' }}>{t.weather.sWords[data.s_scale] ?? ''}</span>
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt style={{ color: 'var(--text-muted)' }}>{t.weather.source}</dt>
            <dd className="text-right">{data.source}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
          {failed ? t.weather.unavailable : t.weather.loading}
        </p>
      )}
    </section>
  )
}
