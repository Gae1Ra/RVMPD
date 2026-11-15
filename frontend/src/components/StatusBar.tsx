import React from 'react'
import type { Level } from '../types'
import { LevelShape } from './LevelShape'
import type { LinkMode } from '../hooks/useTelemetry'
import { useT } from '../i18n'
import { localizedLevelMeta } from '../i18n/localize'

interface StatusBarProps {
  globalLevel: Level
  readiness: number
  dataAgeSeconds: number
  onExportCsv: () => void
  onOpenNotifyModal: () => void
  sqi?: number
  confidence?: number
  linkMode?: LinkMode
}

export const StatusBar: React.FC<StatusBarProps> = ({
  globalLevel,
  readiness,
  dataAgeSeconds,
  onExportCsv,
  onOpenNotifyModal,
  sqi,
  confidence,
  linkMode,
}) => {
  const { t, tf } = useT()
  const meta = localizedLevelMeta(globalLevel, t)
  const isAlertActive = globalLevel >= 2

  return (
    <section aria-live="polite" className="vitalis-glass px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        <span className="inline-flex items-center justify-center w-5 h-5" aria-hidden="true">
          <LevelShape level={globalLevel} size={18} />
        </span>

        <div className="flex flex-wrap items-baseline gap-2 text-[15px] sm:text-[16px]">
          <span
            className="font-semibold tracking-tight"
            style={{ color: globalLevel > 0 ? meta.colorVar : 'var(--text)' }}
          >
            {meta.globalTitle}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <span className="font-mono tabular-nums text-[14px] sm:text-[15px]" style={{ color: 'var(--text-muted)' }}>
            {t.status.readiness} <strong className="font-data" style={{ color: 'var(--text)' }}>{readiness}</strong>
          </span>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <span className="font-mono tabular-nums text-[14px]" style={{ color: 'var(--text-muted)' }}>
            {tf(t.status.ago, { n: dataAgeSeconds })}
          </span>
          {sqi !== undefined && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <span className="font-mono tabular-nums text-[14px]" style={{ color: 'var(--text-muted)' }}>
                {tf(t.status.sqi, { n: Math.round(sqi * 100) })}
              </span>
            </>
          )}
          {confidence !== undefined && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <span className="font-mono tabular-nums text-[14px]" style={{ color: 'var(--text-muted)' }}>
                {tf(t.status.conf, { n: Math.round(confidence * 100) })}
              </span>
            </>
          )}
          {linkMode === 'demo' && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <span className="font-mono text-[13px]" style={{ color: 'var(--status-watch)' }}>
                {t.status.noBackend}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="status-bar-actions flex items-center gap-2.5 w-full sm:w-auto">
        <button
          onClick={onExportCsv}
          className="touch-target flex-1 sm:flex-none px-3.5 py-2 rounded-[12px] text-[14px] font-medium border transition cursor-pointer hover:bg-[var(--surface-hover)]"
          style={{ background: 'var(--pill-bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          {t.status.exportCsv}
        </button>

        <button
          onClick={onOpenNotifyModal}
          className="touch-target flex-1 sm:flex-none px-4 py-2 rounded-[12px] text-[14px] font-semibold border transition cursor-pointer"
          style={{
            background: isAlertActive ? 'var(--danger)' : 'var(--pill-bg)',
            borderColor: isAlertActive ? 'var(--danger)' : 'var(--border)',
            color: isAlertActive ? 'var(--on-accent)' : 'var(--text)',
          }}
        >
          {t.status.notifyTeam}
        </button>
      </div>
    </section>
  )
}
