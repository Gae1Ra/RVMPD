import React from 'react'
import type { Indicator, IndicatorId, Role } from '../types'
import { getIndicatorLevel } from '../constants'
import { LevelShape } from './LevelShape'
import { useT } from '../i18n'
import { localizedLevelMeta } from '../i18n/localize'

interface VitalsGridProps {
  indicators: Indicator[]
  selectedId: IndicatorId
  role: Role
  onSelect: (id: IndicatorId) => void
  onOpenInfo: (id: IndicatorId) => void
}

export const VitalsGrid: React.FC<VitalsGridProps> = ({
  indicators,
  selectedId,
  role,
  onSelect,
  onOpenInfo,
}) => {
  const { t, tf, formatNumber } = useT()
  const isAstro = role === 'astronauta'

  return (
    <section aria-label={t.vitals.section} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {indicators.map((ind) => {
        const level = getIndicatorLevel(ind)
        const meta = localizedLevelMeta(level, t)
        const isSelected = selectedId === ind.id
        const label = isAstro ? ind.astroName : ind.abbr
        const valDisplay =
          ind.id === 'pa' && ind.diastolic !== undefined
            ? `${ind.current}/${ind.diastolic}`
            : formatNumber(ind.current, ind.decimals)

        return (
          <article
            key={ind.id}
            onClick={() => onSelect(ind.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(ind.id)
              }
            }}
            aria-label={tf(t.vitals.statusAria, {
              label,
              value: valDisplay,
              unit: ind.unit,
              status: meta.label,
            })}
            className={`vitalis-surface p-4 cursor-pointer flex flex-col justify-between gap-2 ${
              isSelected ? 'vitalis-card-selected' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold">{label}</span>
              </div>

              <div className="flex items-center gap-2">
                {level === 3 ? (
                  <span
                    className="px-2 py-0.5 rounded-[8px] text-[13px] font-bold font-mono tracking-wider flex items-center gap-1.5"
                    style={{
                      background: 'var(--danger)',
                      color: 'var(--on-accent)',
                    }}
                  >
                    <LevelShape level={level} size={11} />
                    {meta.label}
                  </span>
                ) : (
                  <span
                    className="text-[13px] font-semibold font-mono tracking-wider flex items-center gap-1.5"
                    style={{ color: meta.colorVar }}
                  >
                    <LevelShape level={level} size={12} />
                    {meta.label}
                  </span>
                )}

                {isAstro && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenInfo(ind.id)
                    }}
                    aria-label={tf(t.vitals.whatMeasuresAria, { name: ind.astroName })}
                    className="w-7 h-7 rounded-full border text-[14px] font-mono font-semibold flex items-center justify-center cursor-pointer transition hover:opacity-80"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--pill-bg)',
                      color: 'var(--text)',
                    }}
                  >
                    ?
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2 my-1">
              <div className="flex items-baseline gap-1.5">
                <span className="font-metric tabular-nums tracking-tight">{valDisplay}</span>
                <span className="text-[15px] font-medium" style={{ color: 'var(--text-muted)' }}>
                  {ind.unit}
                </span>
                {ind.delta !== undefined && (
                  <span className="font-mono tabular-nums text-[13px] font-medium" style={{ color: meta.colorVar }}>
                    {ind.delta > 0 ? '+' : ''}
                    {formatNumber(ind.delta, ind.decimals)}
                  </span>
                )}
              </div>
              <span className="font-mono tabular-nums text-[14px]" style={{ color: 'var(--text-muted)' }}>
                {ind.rangeText}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 text-[14px]" style={{ color: 'var(--text-muted)' }}>
              <span className="truncate">{isAstro ? ind.plainDesc : ind.clinicalName}</span>
              <span className="font-mono text-[12px] shrink-0 flex items-center gap-1.5">
                {ind.artifact && <span style={{ color: 'var(--status-watch)' }}>{t.vitals.artifact}</span>}
                {ind.sqi !== undefined && (
                  <span title="Signal quality index">{tf(t.vitals.sqi, { n: Math.round(ind.sqi * 100) })}</span>
                )}
              </span>
            </div>
          </article>
        )
      })}
    </section>
  )
}
