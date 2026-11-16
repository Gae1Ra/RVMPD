import React, { useEffect, useRef, useState } from 'react'
import type { FrameIngest } from '../types'
import { useT } from '../i18n'

interface WifiReceptionIndicatorProps {
  ingest?: FrameIngest | null
  frameSource?: 'simulator' | 'wifi' | string | null
}

export const WifiReceptionIndicator: React.FC<WifiReceptionIndicatorProps> = ({
  ingest,
  frameSource,
}) => {
  const { t, tf } = useT()
  const receiving = Boolean(ingest?.receiving)
  const connected = Boolean(ingest?.connected) || frameSource === 'wifi'
  const wifi = connected || frameSource === 'wifi'
  const prevCount = useRef<number>(ingest?.receive_count ?? 0)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    const count = ingest?.receive_count ?? 0
    if (count > prevCount.current) {
      prevCount.current = count
      setPulse(true)
      const id = window.setTimeout(() => setPulse(false), 650)
      return () => window.clearTimeout(id)
    }
    prevCount.current = count
  }, [ingest?.receive_count])

  const formatSyncAge = (ageS: number | null | undefined, lastSync: string | null | undefined) => {
    if (ageS != null && Number.isFinite(ageS)) {
      if (ageS < 1.5) return t.wifi.syncNow
      return tf(t.wifi.syncAge, { n: Math.round(ageS) })
    }
    if (!lastSync) return '—'
    const parsed = Date.parse(lastSync)
    if (Number.isNaN(parsed)) return lastSync
    const sec = Math.max(0, Math.round((Date.now() - parsed) / 1000))
    if (sec < 2) return t.wifi.syncNow
    return tf(t.wifi.syncAge, { n: sec })
  }

  const label = wifi
    ? receiving || pulse
      ? t.wifi.receiving
      : t.wifi.live
    : t.wifi.simulator

  const syncLabel = wifi
    ? tf(t.wifi.lastSync, {
        time: formatSyncAge(ingest?.last_ingest_age_s, ingest?.last_sync),
      })
    : t.wifi.waiting

  return (
    <section
      aria-label={t.wifi.aria}
      className={`wifi-reception vitalis-glass px-3 py-2.5 flex items-center gap-3 ${
        wifi ? 'is-wifi' : 'is-sim'
      } ${receiving || pulse ? 'is-receiving' : ''}`}
    >
      <div className="wifi-reception-orb" aria-hidden="true">
        <span className="wifi-reception-core" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-semibold text-[14px] tracking-tight" style={{ color: 'var(--text)' }}>
            {t.wifi.label}
          </span>
          <span
            className="font-mono text-[13px] tabular-nums"
            style={{ color: wifi ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {label}
          </span>
        </div>
        <p className="font-mono text-[12px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
          {syncLabel}
          {wifi && ingest?.device ? ` · ${ingest.device}` : ''}
        </p>
      </div>
      <div
        className="wifi-bars"
        aria-hidden="true"
        title={wifi ? t.wifi.live : t.wifi.simulator}
      >
        <span />
        <span />
        <span />
      </div>
    </section>
  )
}
