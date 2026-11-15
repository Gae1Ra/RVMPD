import React from 'react'
import type { Indicator, IndicatorId, Role } from '../types'
import { formatEs, getIndicatorLevel, getLevelMeta } from '../constants'
import { LevelShape } from './LevelShape'

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
  const isAstro = role === 'astronauta'

  return (
    <section
      aria-label="Signos vitales monitoreados"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"
    >
      {indicators.map((ind) => {
        const level = getIndicatorLevel(ind)
        const meta = getLevelMeta(level)
        const isSelected = selectedId === ind.id
        const label = isAstro ? ind.astroName : ind.abbr
        const valDisplay =
          ind.id === 'pa'
            ? `${ind.current}/${ind.diastolic ?? 78}`
            : formatEs(ind.current, ind.decimals)

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
            aria-label={`${label}: ${valDisplay} ${ind.unit}, estado ${meta.label}`}
            className={`vitalis-surface p-4 cursor-pointer flex flex-col justify-between gap-2 ${
              isSelected ? 'vitalis-card-selected' : ''
            }`}
          >
            {/* Fila superior: Forma + Nombre + Estado / Botón '?' */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <LevelShape level={level} size={15} />
                <span className="text-[15px] font-semibold">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium" style={{ color: meta.colorVar }}>
                  {meta.label}
                </span>
                {isAstro && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenInfo(ind.id)
                    }}
                    aria-label={`¿Qué mide ${ind.astroName}?`}
                    className="w-7 h-7 rounded-full border text-[14px] font-mono font-semibold flex items-center justify-center cursor-pointer transition hover:opacity-80"
                    style={{
                      borderColor: 'var(--line)',
                      background: 'var(--pill-bg)',
                      color: 'var(--text)',
                    }}
                  >
                    ?
                  </button>
                )}
              </div>
            </div>

            {/* Fila central: Valor tabular grande + Unidad + Rango individual */}
            <div className="flex items-baseline justify-between gap-2 my-1">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono tabular-nums text-[36px] sm:text-[40px] font-semibold leading-none tracking-tight">
                  {valDisplay}
                </span>
                <span className="text-[15px] font-medium" style={{ color: 'var(--text2)' }}>
                  {ind.unit}
                </span>
              </div>
              <span className="font-mono tabular-nums text-[14px]" style={{ color: 'var(--text2)' }}>
                {ind.rangeText}
              </span>
            </div>

            {/* Fila inferior: Subtítulo clínico o explicación llana en modo Astronauta */}
            <div className="text-[14px] truncate" style={{ color: 'var(--text2)' }}>
              {isAstro ? ind.plainDesc : ind.clinicalName}
            </div>
          </article>
        )
      })}
    </section>
  )
}
