import React, { useRef, useState } from 'react'
import type { Indicator, Role, SeriesPoint, TimeRange } from '../types'
import { formatEs } from '../constants'

interface EvolutionChartProps {
  indicator: Indicator
  role: Role
  timeRange: TimeRange
  points: SeriesPoint[]
  onTimeRangeChange: (range: TimeRange) => void
}

export const EvolutionChart: React.FC<EvolutionChartProps> = ({
  indicator,
  role,
  timeRange,
  points,
  onTimeRangeChange,
}) => {
  const [scrubIndex, setScrubIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const titleLabel = role === 'astronauta' ? indicator.astroName : indicator.abbr

  const W = 640
  const H = 205
  const padL = 42
  const padR = 14
  const padT = 14
  const padB = 26
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const minV = indicator.chartMin
  const maxV = indicator.chartMax

  const toY = (v: number) => padT + plotH - ((v - minV) / (maxV - minV)) * plotH
  const toX = (idx: number) => padL + (idx / Math.max(1, points.length - 1)) * plotW

  // Coordenadas de la franja (rango individual con azul de acento)
  const refTopY = toY(indicator.ref[1])
  const refBotY = toY(indicator.ref[0])
  const refH = Math.max(4, refBotY - refTopY)

  // Coordenadas de la serie
  const coords = points.map((p, idx) => ({
    x: toX(idx),
    y: toY(p.val),
    ...p,
  }))

  const lineD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
  const areaD = coords.length > 0
    ? `${lineD} L ${coords[coords.length - 1].x.toFixed(1)} ${(padT + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
    : ''

  // Porcentaje dentro del rango individual
  const inRangeCount = points.filter((p) => p.val >= indicator.ref[0] && p.val <= indicator.ref[1]).length
  const pctInRange = points.length > 0 ? Math.round((inRangeCount / points.length) * 100) : 100

  // Líneas guía horizontales
  const midV = Number(((minV + maxV) / 2).toFixed(indicator.decimals))
  const yTicks = [maxV, midV, minV]

  // Punto activo
  const activeIdx = scrubIndex !== null && scrubIndex < coords.length ? scrubIndex : coords.length - 1
  const activePt = coords[activeIdx] || { x: padL, y: padT + plotH / 2, val: indicator.base, label: 'Ahora' }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || coords.length === 0) return
    const rect = svgRef.current.getBoundingClientRect()
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setScrubIndex(Math.round(relX * (coords.length - 1)))
  }

  const handleKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (coords.length === 0) return
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const cur = scrubIndex === null ? coords.length - 1 : scrubIndex
      setScrubIndex(Math.max(0, cur - 1))
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      const cur = scrubIndex === null ? coords.length - 1 : scrubIndex
      setScrubIndex(Math.min(coords.length - 1, cur + 1))
    }
  }

  return (
    <div className="lg:col-span-7 vitalis-surface p-4 flex flex-col justify-between gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[16px] font-semibold">
            Evolución · <span style={{ color: 'var(--accent)' }}>{titleLabel}</span>
          </h2>
          <div className="flex items-center gap-2 text-[14px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: 'var(--accent)' }}
              aria-hidden="true"
            />
            <span>
              Rango individual ({indicator.rangeText} {indicator.unit})
            </span>
          </div>
        </div>

        {/* Selector de Periodo: Vivo | 24h | 7d (Página 9: Tabs con acento activo) */}
        <div
          role="tablist"
          aria-label="Rango temporal de evolución"
          className="p-1 rounded-[11px] flex items-center gap-1 border"
          style={{ background: 'var(--pill-bg)', borderColor: 'var(--border)' }}
        >
          {(['vivo', '24h', '7d'] as TimeRange[]).map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={timeRange === r}
              onClick={() => {
                setScrubIndex(null)
                onTimeRangeChange(r)
              }}
              className="px-3 py-1 rounded-[9px] text-[14px] font-medium transition cursor-pointer"
              style={{
                background: timeRange === r ? 'var(--accent)' : 'transparent',
                color: timeRange === r ? 'var(--on-accent)' : 'var(--text)',
              }}
            >
              {r === '7d' ? '7 días' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Lienzo Interactivo SVG */}
      <div className="relative w-full h-[205px] select-none">
        <svg
          ref={svgRef}
          tabIndex={0}
          role="img"
          aria-label="Gráfica de evolución temporal. Usa las flechas izquierda y derecha para explorar los valores."
          viewBox={`0 0 ${W} ${H}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setScrubIndex(null)}
          onKeyDown={handleKeyDown}
          className="w-full h-full rounded-xl overflow-visible cursor-crosshair"
        >
          <defs>
            <linearGradient id="vitalisAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Líneas guía horizontales */}
          {yTicks.map((tv, idx) => {
            const ty = toY(tv)
            return (
              <g key={idx}>
                <line
                  x1={padL}
                  y1={ty}
                  x2={W - padR}
                  y2={ty}
                  stroke="var(--border)"
                  strokeWidth="1"
                />
                <text
                  x={padL - 8}
                  y={ty + 4}
                  textAnchor="end"
                  fill="var(--text-muted)"
                  fontFamily="IBM Plex Mono"
                  fontSize="12"
                >
                  {formatEs(tv, indicator.decimals)}
                </text>
              </g>
            )
          })}

          {/* Franja = Rango Individual con glow-blue (4 colores: negro, blanco, rojo y azul) */}
          <rect
            x={padL}
            y={refTopY}
            width={plotW}
            height={refH}
            fill="var(--glow-blue)"
            rx={4}
          />
          <line
            x1={padL}
            y1={refTopY}
            x2={W - padR}
            y2={refTopY}
            stroke="var(--accent)"
            strokeOpacity={0.35}
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <line
            x1={padL}
            y1={refBotY}
            x2={W - padR}
            y2={refBotY}
            stroke="var(--accent)"
            strokeOpacity={0.35}
            strokeDasharray="4 4"
            strokeWidth="1"
          />

          {/* Área y Línea de Serie (Azul de acento) */}
          {areaD && <path d={areaD} fill="url(#vitalisAreaGrad)" />}
          {lineD && (
            <path
              d={lineD}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Marcadores de Evento (Rojo danger - Página 6) */}
          {coords
            .filter((c) => c.isEvent)
            .map((c, i) => (
              <polygon
                key={i}
                points={`${c.x},${c.y - 6} ${c.x + 6},${c.y} ${c.x},${c.y + 6} ${c.x - 6},${c.y}`}
                fill="var(--danger)"
              />
            ))}

          {/* Cursor vertical y punto activo */}
          {activePt && (
            <>
              <line
                x1={activePt.x}
                y1={padT}
                x2={activePt.x}
                y2={padT + plotH}
                stroke="var(--accent)"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              <circle
                cx={activePt.x}
                cy={activePt.y}
                r="4.5"
                fill="var(--bg)"
                stroke="var(--accent)"
                strokeWidth="2.2"
              />
            </>
          )}

          {/* Etiquetas de eje X */}
          {coords.length > 0 && (
            <>
              <text
                x={padL}
                y={H - 5}
                textAnchor="start"
                fill="var(--text-muted)"
                fontFamily="IBM Plex Mono"
                fontSize="12"
              >
                {coords[0].label}
              </text>
              <text
                x={padL + plotW / 2}
                y={H - 5}
                textAnchor="middle"
                fill="var(--text-muted)"
                fontFamily="IBM Plex Mono"
                fontSize="12"
              >
                {coords[Math.floor(coords.length / 2)]?.label}
              </text>
              <text
                x={W - padR}
                y={H - 5}
                textAnchor="end"
                fill="var(--text-muted)"
                fontFamily="IBM Plex Mono"
                fontSize="12"
              >
                {coords[coords.length - 1].label}
              </text>
            </>
          )}
        </svg>

        {/* Tooltip flotante de inspección */}
        {scrubIndex !== null && activePt && (
          <div
            className="pointer-events-none absolute top-2 right-2 px-3 py-1.5 rounded-[10px] border text-[14px] font-mono tabular-nums"
            style={{
              background: 'var(--surface-solid)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text)',
            }}
          >
            {activePt.label} · {formatEs(activePt.val, indicator.decimals)} {indicator.unit}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[14px]" style={{ color: 'var(--text-muted)' }}>
        <span>Dentro de tu rango individual el {pctInRange} % del periodo seleccionado.</span>
        <span className="font-mono text-[14px]">Teclado: ← → para explorar</span>
      </div>
    </div>
  )
}
