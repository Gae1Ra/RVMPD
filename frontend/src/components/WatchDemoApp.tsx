import React from 'react'
import type { Frame, Indicator, Level, Status } from '../types'
import { getIndicatorLevel } from '../constants'
import { LevelShape } from './LevelShape'
import { useT } from '../i18n'
import { localizedLevelMeta } from '../i18n/localize'

export type DataSourceMode = 'simulator' | 'galaxy_watch'

interface WatchDemoAppProps {
  indicators: Indicator[]
  frame: Frame | null
  globalLevel: Level
  dataAgeSeconds: number
  linkLive: boolean
  lastSyncLabel: string
}

const WATCH_IDS = ['fc', 'spo2', 'temp', 'hrv'] as const

function statusColor(status: Status | undefined, level: Level): string {
  if (status === 'red' || level >= 3) return 'var(--danger)'
  if (status === 'amber' || level >= 2) return '#E0A040'
  return 'var(--accent)'
}

export const WatchDemoApp: React.FC<WatchDemoAppProps> = ({
  indicators,
  frame,
  globalLevel,
  dataAgeSeconds,
  linkLive,
  lastSyncLabel,
}) => {
  const { t, tf, formatNumber } = useT()
  const meta = localizedLevelMeta(globalLevel, t)
  const watchMeta = frame?.watch
  const available = watchMeta?.available

  const byId = Object.fromEntries(indicators.map((i) => [i.id, i])) as Record<string, Indicator>

  const showMetric = (id: (typeof WATCH_IDS)[number], ind: Indicator | undefined) => {
    if (!ind) return false
    if (id === 'spo2') {
      if (available && available.spo2 === false) return false
      if ((ind.sqi ?? 1) < 0.5) return false
    }
    if (id === 'temp' && available && available.temp === false) return false
    if (id === 'hrv' && available && available.hrv_rmssd === false) return false
    return true
  }

  const connected = watchMeta?.connected ?? linkLive
  const syncPulse = connected && dataAgeSeconds < 8

  return (
    <section className="watch-demo mx-auto w-full max-w-[390px] flex flex-col gap-4" aria-label={t.watchDemo.aria}>
      <div className="watch-demo-hero vitalis-glass px-5 pt-8 pb-6 relative overflow-hidden">
        <div className="watch-demo-orbit" aria-hidden="true" />
        <div className="relative z-[1] flex flex-col items-center text-center gap-3">
          <p className="font-label text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {t.watchDemo.kicker}
          </p>
          <h1 className="font-heading text-[42px] sm:text-[48px] tracking-tight m-0" style={{ color: 'var(--text)' }}>
            {t.brand.name}
          </h1>
          <p className="font-secondary m-0 max-w-[18rem]" style={{ color: 'var(--text-muted)' }}>
            {t.watchDemo.tagline}
          </p>
          <div
            className={`watch-sync-ring ${syncPulse ? 'is-live' : ''}`}
            role="status"
            aria-label={connected ? t.watchDemo.connected : t.watchDemo.disconnected}
          >
            <span className="watch-sync-core" style={{ borderColor: meta.colorVar, background: meta.bgVar }}>
              <LevelShape level={globalLevel} size={22} />
            </span>
          </div>
          <div className="text-[18px] font-bold" style={{ color: meta.colorVar }}>
            {meta.globalTitle}
          </div>
          <p className="font-mono text-[12px] m-0" style={{ color: 'var(--text-muted)' }}>
            {connected ? t.watchDemo.connected : t.watchDemo.disconnected}
            {' · '}
            {tf(t.watchDemo.lastSync, { time: lastSyncLabel })}
          </p>
        </div>
      </div>

      <div className="vitalis-surface px-4 py-4 flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-title text-[20px] m-0">{t.watchDemo.metricsTitle}</h2>
          <span className="font-label text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {t.watchDemo.fromWatch}
          </span>
        </div>

        <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
          {WATCH_IDS.map((id) => {
            const ind = byId[id]
            if (!showMetric(id, ind)) {
              if (id === 'spo2') {
                return (
                  <li
                    key={id}
                    className="watch-metric-row flex items-center justify-between gap-3 px-3 py-3 rounded-[12px]"
                    style={{ background: 'var(--pill-bg)', border: '1px solid var(--border)' }}
                  >
                    <div>
                      <div className="font-label text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {t.vitals.spo2.abbr}
                      </div>
                      <div className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                        {t.watchDemo.spo2Waiting}
                      </div>
                    </div>
                    <span className="font-metric text-[28px]" style={{ color: 'var(--text-muted)' }}>
                      —
                    </span>
                  </li>
                )
              }
              return null
            }
            const level = getIndicatorLevel(ind!)
            const color = statusColor(ind!.status, level)
            const label =
              id === 'temp' ? t.watchDemo.skinTemp : id === 'hrv' ? t.vitals.hrv.astroName : ind!.astroName
            return (
              <li
                key={id}
                className="watch-metric-row flex items-center justify-between gap-3 px-3 py-3 rounded-[12px]"
                style={{ background: 'var(--pill-bg)', border: '1px solid var(--border)' }}
              >
                <div className="min-w-0">
                  <div className="font-label text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {ind!.abbr}
                  </div>
                  <div className="text-[14px] font-semibold truncate">{label}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-metric text-[32px] tabular-nums" style={{ color }}>
                    {formatNumber(ind!.current, ind!.decimals)}
                    <span className="font-label text-[11px] ml-1" style={{ color: 'var(--text-muted)' }}>
                      {ind!.unit}
                    </span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <p className="font-secondary text-[13px] m-0 pt-1" style={{ color: 'var(--text-muted)' }}>
          {t.watchDemo.hiddenNote}
        </p>
        <p className="font-label text-[10px] m-0" style={{ color: 'var(--text-muted)' }}>
          {t.watchDemo.disclaimer}
        </p>
      </div>
    </section>
  )
}
