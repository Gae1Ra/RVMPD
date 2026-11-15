import React from 'react'
import type { AiQuery, Indicator, Mission, Role } from '../types'
import { getIndicatorLevel } from '../constants'

interface AiDecisionSupportProps {
  role: Role
  indicators: Indicator[]
  aiQuery: AiQuery
  onAiQueryChange: (query: AiQuery) => void
  missions: Mission[]
  onCompleteNextMission: () => void
  onOpenMissionsModal: () => void
}

export const AiDecisionSupport: React.FC<AiDecisionSupportProps> = ({
  role,
  indicators,
  aiQuery,
  onAiQueryChange,
  missions,
  onCompleteNextMission,
  onOpenMissionsModal,
}) => {
  const maxLevel = Math.max(...indicators.map(getIndicatorLevel))
  const fc = indicators.find((i) => i.id === 'fc') || indicators[0]
  const spo2 = indicators.find((i) => i.id === 'spo2') || indicators[1]
  const hrv = indicators.find((i) => i.id === 'hrv') || indicators[5]

  // Observación e Hipótesis para Médico
  let obs = ''
  let hyp = ''

  if (maxLevel >= 2) {
    obs = `Elevación simultánea de FC (${fc.current} lpm) y FR con descenso de SpO₂ (${spo2.current} %) y HRV (${hrv.current} ms) fuera del rango individual de A-01.`
    hyp = `Respuesta autonómica aguda o sobrecarga tras actividad; se recomienda reposo inmediato y reevaluación en 5 minutos.`
  } else if (aiQuery === 'resumen24h') {
    obs = `En las últimas 24 horas los 6 parámetros simulados se mantuvieron dentro de sus franjas individuales en más del 96 % de las muestras.`
    hyp = `Estabilidad hemodinámica y buena recuperación nocturna en cabina; sin alertas pendientes.`
  } else if (aiQuery === 'tendencia') {
    obs = `Variabilidad cardíaca en ${hrv.current} ms (rango 40–70 ms) y frecuencia cardíaca basal estable en ${fc.current} lpm.`
    hyp = `Balance autonómico conservado sin signos tempranos de fatiga acumulada.`
  } else if (aiQuery === 'protocolo') {
    obs = `Umbrales individuales activos para los 6 sensores simulados con actualización cada 1 segundo.`
    hyp = `En caso de superar advertencia, el protocolo local indica pausar esfuerzo físico y notificar al equipo médico.`
  } else {
    obs = `Los 6 signos vitales permanecen dentro del rango individual de A-01 (FC ${fc.current} lpm, SpO₂ ${spo2.current} %, HRV ${hrv.current} ms).`
    hyp = `Estado basal estable en cabina; herramienta de apoyo sobre datos simulados sin diagnóstico clínico.`
  }

  // Texto para Astronauta
  const astroGuidance =
    maxLevel >= 2
      ? 'Tus pulsaciones y respiración están altas. Detén el ejercicio, descansa sentado y avisa al equipo médico.'
      : 'Tus signos vitales están dentro de tu rango habitual. Puedes continuar con tus rutinas diarias con normalidad.'

  // Siguiente misión pendiente respetando regla de seguridad
  const nextMission = missions.find((m) => !m.done && !(maxLevel >= 2 && m.isExercise))

  return (
    <div className="lg:col-span-5 vitalis-surface p-4 flex flex-col justify-between gap-3">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <h2 className="text-[16px] font-semibold">IA Local · Apoyo a la decisión</h2>
          <span
            className="font-mono text-[14px] px-2.5 py-0.5 rounded-lg border"
            style={{
              background: 'var(--pill-bg)',
              borderColor: 'var(--line)',
              color: 'var(--text2)',
            }}
          >
            A bordo
          </span>
        </div>

        {role === 'medico' ? (
          /* Contenido IA para Rol Médico */
          <div className="space-y-2.5 text-[15px]">
            <p className="leading-relaxed">
              <strong>Observación:</strong> {obs}
            </p>
            <p className="leading-relaxed" style={{ color: 'var(--text2)' }}>
              <strong>Hipótesis:</strong> {hyp}
            </p>
          </div>
        ) : (
          /* Contenido IA para Rol Astronauta */
          <div className="space-y-3 text-[15px]">
            <p className="leading-relaxed">{astroGuidance}</p>

            {/* Píldora de Siguiente Acción / Misión Diaria */}
            <div
              className="p-3 rounded-xl border flex items-center justify-between gap-2"
              style={{ background: 'var(--pill-bg)', borderColor: 'var(--line)' }}
            >
              <div>
                <div className="text-[14px] font-medium" style={{ color: 'var(--text2)' }}>
                  Siguiente acción
                </div>
                <div className="text-[15px] font-semibold">
                  {nextMission
                    ? `${nextMission.title} · +${nextMission.xp} XP`
                    : 'Rutinas disponibles completadas hoy'}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {nextMission && (
                  <button
                    onClick={onCompleteNextMission}
                    className="px-3 py-1.5 rounded-[10px] text-[14px] font-semibold text-white cursor-pointer transition hover:opacity-90"
                    style={{ background: 'var(--accent)' }}
                  >
                    Hecho
                  </button>
                )}
                <button
                  onClick={onOpenMissionsModal}
                  className="px-2.5 py-1.5 rounded-[10px] text-[14px] font-medium border cursor-pointer transition hover:opacity-90"
                  style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
                >
                  Ver 5
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botones de Consulta Rápida (Rol Médico) */}
      {role === 'medico' && (
        <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: 'var(--line)' }}>
          <button
            onClick={() => onAiQueryChange('resumen24h')}
            className="px-3 py-1.5 rounded-[10px] text-[14px] font-medium border transition cursor-pointer"
            style={{
              background: aiQuery === 'resumen24h' ? 'var(--pill-active)' : 'var(--pill-bg)',
              borderColor: 'var(--line)',
              color: 'var(--text)',
            }}
          >
            Resumen 24h
          </button>
          <button
            onClick={() => onAiQueryChange('tendencia')}
            className="px-3 py-1.5 rounded-[10px] text-[14px] font-medium border transition cursor-pointer"
            style={{
              background: aiQuery === 'tendencia' ? 'var(--pill-active)' : 'var(--pill-bg)',
              borderColor: 'var(--line)',
              color: 'var(--text)',
            }}
          >
            Evaluar tendencia
          </button>
          <button
            onClick={() => onAiQueryChange('protocolo')}
            className="px-3 py-1.5 rounded-[10px] text-[14px] font-medium border transition cursor-pointer"
            style={{
              background: aiQuery === 'protocolo' ? 'var(--pill-active)' : 'var(--pill-bg)',
              borderColor: 'var(--line)',
              color: 'var(--text)',
            }}
          >
            Protocolo activo
          </button>
        </div>
      )}
    </div>
  )
}
