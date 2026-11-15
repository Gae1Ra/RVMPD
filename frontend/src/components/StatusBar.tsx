import React from 'react'
import type { Level } from '../types'
import { getLevelMeta } from '../constants'
import { LevelShape } from './LevelShape'

interface StatusBarProps {
  globalLevel: Level
  readiness: number
  dataAgeSeconds: number
  onExportCsv: () => void
  onOpenNotifyModal: () => void
}

export const StatusBar: React.FC<StatusBarProps> = ({
  globalLevel,
  readiness,
  dataAgeSeconds,
  onExportCsv,
  onOpenNotifyModal,
}) => {
  const meta = getLevelMeta(globalLevel)
  const isAlertActive = globalLevel >= 2

  return (
    <section aria-live="polite" className="vitalis-glass px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        {/* Indicador Semántico Global (Forma + Color) */}
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
            Preparación <strong className="font-data" style={{ color: 'var(--text)' }}>{readiness}</strong>
          </span>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <span className="font-mono tabular-nums text-[14px]" style={{ color: 'var(--text-muted)' }}>
            hace {dataAgeSeconds} s
          </span>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onExportCsv}
          className="px-3.5 py-2 rounded-[12px] text-[14px] font-medium border transition cursor-pointer hover:bg-[var(--surface-hover)]"
          style={{ background: 'var(--pill-bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          Exportar CSV
        </button>

        <button
          onClick={onOpenNotifyModal}
          className="px-4 py-2 rounded-[12px] text-[14px] font-semibold border transition cursor-pointer"
          style={{
            background: isAlertActive ? 'var(--danger)' : 'var(--pill-bg)',
            borderColor: isAlertActive ? 'var(--danger)' : 'var(--border)',
            color: isAlertActive ? 'var(--on-accent)' : 'var(--text)',
          }}
        >
          Avisar equipo
        </button>
      </div>
    </section>
  )
}
