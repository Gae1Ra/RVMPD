import React, { useState } from 'react'
import type { Indicator, Role, SimPhase } from '../types'
import { formatEs, getIndicatorLevel, getLevelMeta } from '../constants'

interface EmergencyPanelProps {
  role: Role
  simPhase: SimPhase
  indicators: Indicator[]
  interventions: string[]
  onLogIntervention: (text: string) => void
  onOpenNotifyModal: () => void
}

export const EmergencyPanel: React.FC<EmergencyPanelProps> = ({
  role,
  simPhase,
  indicators,
  interventions,
  onLogIntervention,
  onOpenNotifyModal,
}) => {
  const [inputText, setInputText] = useState('')

  const handleAddIntervention = () => {
    if (!inputText.trim()) return
    onLogIntervention(inputText.trim())
    setInputText('')
  }

  const phaseBadgeText =
    simPhase === 'recovering' ? 'Fase: Recuperación guiada' : 'Fase: Elevación aguda'

  return (
    <section
      className="vitalis-glass p-4 border-l-4"
      style={{ borderLeftColor: 'var(--red)' }}
      aria-live="assertive"
    >
      {role === 'medico' ? (
        /* Vista Médico de Emergencia */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-[2px]"
                style={{ background: 'var(--red)' }}
                aria-hidden="true"
              />
              <h2 className="text-[16px] font-bold uppercase tracking-wider" style={{ color: 'var(--red)' }}>
                Evento Fisiológico Activo · Comparativa Previo vs. Ahora
              </h2>
            </div>
            <span
              className="font-mono text-[14px] px-2.5 py-0.5 rounded-lg"
              style={{ background: 'var(--red-bg)', color: 'var(--red)' }}
            >
              {phaseBadgeText}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Tabla Antes del evento vs. Ahora */}
            <div className="lg:col-span-7 overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--line)' }}>
              <table className="w-full text-left border-collapse text-[14px]">
                <thead>
                  <tr
                    className="border-b"
                    style={{
                      borderColor: 'var(--line)',
                      background: 'var(--pill-bg)',
                      color: 'var(--text2)',
                    }}
                  >
                    <th className="py-2 px-3 font-medium">Parámetro</th>
                    <th className="py-2 px-3 font-medium font-mono">Previo</th>
                    <th className="py-2 px-3 font-medium font-mono">Actual</th>
                    <th className="py-2 px-3 font-medium font-mono">Cambio</th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums divide-y" style={{ borderColor: 'var(--line)' }}>
                  {indicators.map((ind) => {
                    const prevStr =
                      ind.id === 'pa'
                        ? `${ind.prevEvent}/${ind.prevDiastolic ?? 78}`
                        : formatEs(ind.prevEvent, ind.decimals)
                    const currStr =
                      ind.id === 'pa'
                        ? `${ind.current}/${ind.diastolic ?? 78}`
                        : formatEs(ind.current, ind.decimals)
                    const diff = Number((ind.current - ind.prevEvent).toFixed(ind.decimals))
                    const diffSign =
                      diff > 0 ? `+${formatEs(diff, ind.decimals)}` : formatEs(diff, ind.decimals)
                    const lvl = getIndicatorLevel(ind)
                    const color = lvl > 0 ? getLevelMeta(lvl).colorVar : 'var(--text2)'

                    return (
                      <tr key={ind.id}>
                        <td className="py-1.5 px-3 font-sans font-medium">{ind.abbr}</td>
                        <td className="py-1.5 px-3" style={{ color: 'var(--text2)' }}>
                          {prevStr} {ind.unit}
                        </td>
                        <td className="py-1.5 px-3 font-semibold">
                          {currStr} {ind.unit}
                        </td>
                        <td className="py-1.5 px-3 font-semibold" style={{ color }}>
                          {diffSign}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Acción Recomendada + Registro de Intervenciones */}
            <div
              className="lg:col-span-5 flex flex-col justify-between gap-3 p-3.5 rounded-xl border"
              style={{ borderColor: 'var(--line)', background: 'var(--pill-bg)' }}
            >
              <div>
                <div className="text-[14px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text2)' }}>
                  Acción recomendada (Protocolo A bordo)
                </div>
                <p className="text-[14px]">
                  Suspender actividad física, verificar hidratación y repetir medición de signos en 5 minutos.
                </p>
              </div>

              {/* Registro de Intervención con Hora de Misión */}
              <div className="pt-2 border-t" style={{ borderColor: 'var(--line)' }}>
                <label
                  htmlFor="intervention-input"
                  className="block text-[14px] font-medium mb-1.5"
                  style={{ color: 'var(--text2)' }}
                >
                  Registrar intervención médica
                </label>
                <div className="flex gap-2">
                  <input
                    id="intervention-input"
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddIntervention()
                    }}
                    placeholder="Ej. Reposo sentado + 300 ml agua"
                    className="flex-1 px-3 py-2 rounded-[10px] text-[14px] border bg-transparent"
                    style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
                  />
                  <button
                    onClick={handleAddIntervention}
                    className="px-3.5 py-2 rounded-[10px] text-[14px] font-semibold text-white cursor-pointer shrink-0"
                    style={{ background: 'var(--accent)' }}
                  >
                    Registrar
                  </button>
                </div>
                <ul
                  className="mt-2 space-y-1 text-[14px] font-mono tabular-nums max-h-20 overflow-y-auto"
                  style={{ color: 'var(--text2)' }}
                >
                  {interventions.map((item, idx) => (
                    <li key={idx}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Vista Astronauta Simplificada de Emergencia */
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="inline-block w-3.5 h-3.5 rounded-[2px] shrink-0"
              style={{ background: 'var(--red)' }}
              aria-hidden="true"
            />
            <div>
              <div className="text-[16px] font-bold">Haz una pausa y descansa ahora</div>
              <p className="text-[14px]" style={{ color: 'var(--text2)' }}>
                Tus pulsaciones y respiración subieron fuera de tu rango habitual. Siéntate, respira despacio y avisa al equipo médico.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenNotifyModal}
            className="px-4 py-2.5 rounded-[11px] text-[14px] font-semibold text-white cursor-pointer"
            style={{ background: 'var(--red)' }}
          >
            Avisar ahora
          </button>
        </div>
      )}
    </section>
  )
}
