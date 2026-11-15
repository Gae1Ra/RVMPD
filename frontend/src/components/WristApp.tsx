import React, { useState } from 'react'
import type { AiQuery, Indicator, IndicatorId, Level, Mission } from '../types'
import { formatEs, getIndicatorLevel, getLevelMeta } from '../constants'
import { LevelShape } from './LevelShape'

interface WristAppProps {
  indicators: Indicator[]
  globalLevel: Level
  readiness: number
  dataAgeSeconds: number
  missionClock: string
  missions: Mission[]
  onCompleteNextMission: () => void
  onToggleMission: (id: string) => void
  onNotifyTeam: () => void
  isOffline?: boolean
}

type WristScreen = 'estado' | 'signos' | 'detalle' | 'avisar' | 'rutina' | 'asistente'
type WristPreset = 'square' | 'round' | 'full'

export const WristApp: React.FC<WristAppProps> = ({
  indicators,
  globalLevel,
  readiness,
  dataAgeSeconds,
  missionClock,
  missions,
  onCompleteNextMission,
  onNotifyTeam,
  isOffline = false,
}) => {
  const [screen, setScreen] = useState<WristScreen>('estado')
  const [selectedIndId, setSelectedIndId] = useState<IndicatorId>('fc')
  const [preset, setPreset] = useState<WristPreset>('square')
  const [notifyConfirmed, setNotifyConfirmed] = useState(false)
  const [aiQuery, setAiQuery] = useState<AiQuery>('default')
  const [dismissedAlertLevel, setDismissedAlertLevel] = useState<number>(-1)

  const meta = getLevelMeta(globalLevel)
  const isSafetyActive = globalLevel >= 2

  // Find the vital sign with highest deviation/level
  const highestVital = [...indicators].sort(
    (a, b) => getIndicatorLevel(b) - getIndicatorLevel(a)
  )[0]
  const highestLevel = getIndicatorLevel(highestVital)

  const selectedInd = indicators.find((i) => i.id === selectedIndId) || indicators[0]

  // Siguiente rutina
  const nextMission = missions.find((m) => !m.done && !(isSafetyActive && m.isExercise))

  // AI text for wrist (short 1-2 sentences)
  const getWristAiText = () => {
    if (globalLevel >= 2) {
      return 'Pulsaciones y respiración elevadas. Descansa sentado y avisa al equipo médico.'
    }
    if (aiQuery === 'resumen24h') {
      return 'Más del 96 % de tus lecturas en rango individual en 24h. Sin alertas.'
    }
    if (aiQuery === 'tendencia') {
      return 'Variabilidad y ritmo basal equilibrados. Buena reserva de recuperación.'
    }
    if (aiQuery === 'protocolo') {
      return 'Umbrales personales activos. Si sube a advertencia, pausa el esfuerzo.'
    }
    return 'Tus signos vitales están en rango habitual. Puedes continuar tus tareas con normalidad.'
  }

  // Fullscreen alert trigger for level >= 2 unless dismissed
  const showFullscreenAlert = globalLevel >= 2 && dismissedAlertLevel !== globalLevel

  const handleOpenDetail = (id: IndicatorId) => {
    setSelectedIndId(id)
    setScreen('detalle')
  }

  const handleNotifyConfirm = () => {
    onNotifyTeam()
    setNotifyConfirmed(true)
    setTimeout(() => {
      setNotifyConfirmed(false)
      setScreen('estado')
    }, 2500)
  }

  const renderContent = () => {
    switch (screen) {
      /* ====================================================================
         1. ESTADO (INICIO)
         ==================================================================== */
      case 'estado':
        return (
          <div className="flex flex-col h-full justify-between p-4 text-center">
            {/* Cabecera del reloj */}
            <div className="flex items-center justify-between text-[13px] font-mono text-[var(--text-muted)] pt-1">
              <span>{missionClock.slice(-8)}</span>
              <span>A-01</span>
            </div>

            {/* Estado principal glanceable */}
            <div className="my-auto space-y-2 flex flex-col items-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center border-2 shadow-lg"
                style={{
                  borderColor: meta.colorVar,
                  background: meta.bgVar,
                }}
              >
                <LevelShape level={globalLevel} size={28} />
              </div>
              <div className="text-[20px] font-bold tracking-tight" style={{ color: meta.colorVar }}>
                {meta.globalTitle}
              </div>
              <div className="text-[14px] font-mono text-[var(--text-muted)]">
                Preparación{' '}
                <span className="text-[24px] font-bold text-[var(--text)]">{readiness}</span>
                /100
              </div>

              {/* Indicador más relevante */}
              <button
                onClick={() => handleOpenDetail(highestVital.id)}
                className="w-full mt-2 p-2.5 rounded-xl border flex items-center justify-between min-h-[44px] cursor-pointer"
                style={{ background: 'var(--surface-data)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-2">
                  <LevelShape level={highestLevel} size={14} />
                  <span className="text-[14px] font-medium">{highestVital.astroName}</span>
                </div>
                <span className="font-mono tabular-nums text-[15px] font-semibold">
                  {highestVital.id === 'pa'
                    ? `${highestVital.current}/${highestVital.diastolic ?? 78}`
                    : formatEs(highestVital.current, highestVital.decimals)}{' '}
                  {highestVital.unit}
                </span>
              </button>
            </div>

            {/* Antigüedad del dato */}
            <div className="text-[12px] font-mono text-[var(--text-muted)]">
              hace {dataAgeSeconds} s · Simulado
            </div>
          </div>
        )

      /* ====================================================================
         2. SIGNOS VITALES
         ==================================================================== */
      case 'signos':
        return (
          <div className="flex flex-col h-full p-3">
            <div className="text-[15px] font-bold mb-2 px-1 flex items-center justify-between">
              <span>Signos Vitales</span>
              <span className="text-[12px] font-mono text-[var(--text-muted)]">6 signos</span>
            </div>
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
              {indicators.map((ind) => {
                const lvl = getIndicatorLevel(ind)
                const valStr =
                  ind.id === 'pa'
                    ? `${ind.current}/${ind.diastolic ?? 78}`
                    : formatEs(ind.current, ind.decimals)
                return (
                  <button
                    key={ind.id}
                    onClick={() => handleOpenDetail(ind.id)}
                    className="w-full p-2.5 rounded-xl border flex items-center justify-between min-h-[46px] cursor-pointer text-left transition hover:bg-[var(--surface-hover)]"
                    style={{ background: 'var(--surface-data)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-center gap-2">
                      <LevelShape level={lvl} size={14} />
                      <span className="text-[14px] font-medium">{ind.abbr}</span>
                    </div>
                    <div className="font-mono tabular-nums text-[15px] font-semibold">
                      {valStr} <span className="text-[12px] font-normal text-[var(--text-muted)]">{ind.unit}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )

      /* ====================================================================
         3. DETALLE DE SIGNO
         ==================================================================== */
      case 'detalle': {
        const lvl = getIndicatorLevel(selectedInd)
        const valStr =
          selectedInd.id === 'pa'
            ? `${selectedInd.current}/${selectedInd.diastolic ?? 78}`
            : formatEs(selectedInd.current, selectedInd.decimals)
        const pctInRange = Math.min(
          100,
          Math.max(
            0,
            ((selectedInd.current - selectedInd.chartMin) /
              (selectedInd.chartMax - selectedInd.chartMin)) *
              100
          )
        )

        return (
          <div className="flex flex-col h-full p-3 justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setScreen('signos')}
                  className="text-[13px] text-[var(--accent)] font-medium flex items-center gap-1 min-h-[44px]"
                >
                  ← Volver
                </button>
                <div className="flex items-center gap-1.5">
                  <LevelShape level={lvl} size={14} />
                  <span className="text-[13px] font-semibold">{selectedInd.astroName}</span>
                </div>
              </div>

              {/* Valor grande */}
              <div className="text-center py-2">
                <div className="font-metric tabular-nums tracking-tight">
                  {valStr}
                </div>
                <div className="text-[13px] font-medium text-[var(--text-muted)] mt-0.5">
                  {selectedInd.unit} · Rango {selectedInd.rangeText}
                </div>
              </div>

              {/* Mini barra de posición en rango */}
              <div className="w-full bg-[var(--pill-bg)] h-3 rounded-full overflow-hidden border border-[var(--border)] relative">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${pctInRange}%`,
                    background: lvl > 0 ? getLevelMeta(lvl).colorVar : 'var(--accent)',
                  }}
                />
              </div>

              {/* Cuándo avisar */}
              <div
                className="p-2.5 rounded-xl border text-[13px] leading-snug mt-2"
                style={{ background: 'var(--surface-data)', borderColor: 'var(--border)' }}
              >
                <strong className="block text-[12px] uppercase text-[var(--text-muted)] mb-0.5">
                  ¿Cuándo avisar?
                </strong>
                {selectedInd.whenNotify}
              </div>
            </div>

            <button
              onClick={() => setScreen('avisar')}
              className="w-full py-2.5 rounded-xl text-[14px] font-semibold cursor-pointer min-h-[44px] mt-2 transition hover:opacity-90"
              style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              Avisar sobre {selectedInd.abbr}
            </button>
          </div>
        )
      }

      /* ====================================================================
         4. AVISAR AL EQUIPO MÉDICO
         ==================================================================== */
      case 'avisar':
        return (
          <div className="flex flex-col h-full p-4 justify-between text-center">
            <div className="text-[16px] font-bold">Aviso al Equipo Médico</div>

            {notifyConfirmed ? (
              <div className="my-auto space-y-2 animate-in fade-in">
                <div
                  className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-[24px]"
                  style={{ background: 'var(--glow-blue)', color: 'var(--accent)' }}
                >
                  ✓
                </div>
                <div className="text-[16px] font-bold" style={{ color: 'var(--accent)' }}>
                  Aviso Enviado
                </div>
                <p className="text-[13px] text-[var(--text-muted)]">
                  Telemetría transmitida por el enlace local a bordo.
                </p>
              </div>
            ) : (
              <div className="my-auto space-y-3">
                <div
                  className="p-3 rounded-xl border font-mono text-[13px]"
                  style={{ background: 'var(--surface-data)', borderColor: 'var(--border)' }}
                >
                  A-01 · Día 42 · MET {missionClock.slice(-8)}
                  <br />
                  Preparación: <strong>{readiness}</strong>/100
                </div>
                <p className="text-[13px] text-[var(--text-muted)]">
                  ¿Confirmas el envío inmediato de tu telemetría al médico de vuelo?
                </p>
              </div>
            )}

            {!notifyConfirmed && (
              <div className="space-y-2">
                <button
                  onClick={handleNotifyConfirm}
                  className="w-full py-3 rounded-xl text-[15px] font-bold cursor-pointer min-h-[44px] shadow-lg transition hover:opacity-90"
                  style={{ background: 'var(--danger)', color: 'var(--on-accent)' }}
                >
                  Confirmar Aviso
                </button>
                <button
                  onClick={() => setScreen('estado')}
                  className="w-full py-2 rounded-xl text-[14px] font-medium border min-h-[44px] cursor-pointer"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )

      /* ====================================================================
         5. RUTINA DIARIA
         ==================================================================== */
      case 'rutina':
        return (
          <div className="flex flex-col h-full p-3 justify-between">
            <div>
              <div className="text-[15px] font-bold mb-1">Rutinas Diarias</div>
              <div className="text-[12px] text-[var(--text-muted)] mb-2 font-mono">
                XP actual: {missions.filter((m) => m.done).reduce((acc, m) => acc + m.xp, 30)} XP
              </div>

              {isSafetyActive && (
                <div
                  className="p-2 rounded-xl border text-[12px] mb-2 leading-tight"
                  style={{
                    background: 'var(--danger-bg)',
                    borderColor: 'var(--danger)',
                    color: 'var(--text)',
                  }}
                >
                  <strong>Seguridad:</strong> Ejercicio pausado hasta normalizar signos.
                </div>
              )}

              {nextMission ? (
                <div
                  className="p-3 rounded-xl border text-center space-y-2"
                  style={{ background: 'var(--surface-data)', borderColor: 'var(--border)' }}
                >
                  <div className="text-[12px] text-[var(--text-muted)] uppercase font-semibold">
                    Siguiente rutina
                  </div>
                  <div className="text-[16px] font-bold">{nextMission.title}</div>
                  <div className="text-[14px] font-mono text-[var(--accent)] font-semibold">
                    +{nextMission.xp} XP
                  </div>
                  <button
                    onClick={onCompleteNextMission}
                    className="w-full py-2.5 rounded-xl text-[14px] font-bold cursor-pointer min-h-[44px] transition hover:opacity-90"
                    style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
                  >
                    Marcar Completada
                  </button>
                </div>
              ) : (
                <div className="p-4 text-center text-[14px] text-[var(--text-muted)]">
                  Todas las rutinas de hoy han sido completadas.
                </div>
              )}
            </div>

            <div className="text-[12px] text-[var(--text-muted)] text-center">
              Posponer una rutina nunca resta progreso.
            </div>
          </div>
        )

      /* ====================================================================
         6. ASISTENTE IA
         ==================================================================== */
      case 'asistente':
        return (
          <div className="flex flex-col h-full p-3 justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[15px] font-bold">Asistente IA</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)]">
                  A bordo
                </span>
              </div>

              {/* Frase de respuesta del asistente */}
              <div
                className="p-3 rounded-xl border text-[14px] leading-relaxed mb-3"
                style={{ background: 'var(--surface-data)', borderColor: 'var(--border)' }}
              >
                {getWristAiText()}
              </div>

              {/* Consultas rápidas táctiles */}
              <div className="space-y-1.5">
                <button
                  onClick={() => setAiQuery('resumen24h')}
                  className="w-full p-2 rounded-lg border text-[13px] font-medium text-left min-h-[40px] cursor-pointer"
                  style={{
                    background: aiQuery === 'resumen24h' ? 'var(--accent)' : 'var(--pill-bg)',
                    borderColor: 'var(--border)',
                    color: aiQuery === 'resumen24h' ? 'var(--on-accent)' : 'var(--text)',
                  }}
                >
                  • Resumen 24h
                </button>
                <button
                  onClick={() => setAiQuery('tendencia')}
                  className="w-full p-2 rounded-lg border text-[13px] font-medium text-left min-h-[40px] cursor-pointer"
                  style={{
                    background: aiQuery === 'tendencia' ? 'var(--accent)' : 'var(--pill-bg)',
                    borderColor: 'var(--border)',
                    color: aiQuery === 'tendencia' ? 'var(--on-accent)' : 'var(--text)',
                  }}
                >
                  • Evaluar tendencia
                </button>
                <button
                  onClick={() => setAiQuery('protocolo')}
                  className="w-full p-2 rounded-lg border text-[13px] font-medium text-left min-h-[40px] cursor-pointer"
                  style={{
                    background: aiQuery === 'protocolo' ? 'var(--accent)' : 'var(--pill-bg)',
                    borderColor: 'var(--border)',
                    color: aiQuery === 'protocolo' ? 'var(--on-accent)' : 'var(--text)',
                  }}
                >
                  • Protocolo activo
                </button>
              </div>
            </div>

            <div className="text-[11px] text-center text-[var(--text-muted)]">
              Apoyo a la decisión · No diagnóstica
            </div>
          </div>
        )
    }
  }

  return (
    <div className="wrist-wrapper">
      {/* Selector de Presets de Hardware de Muñeca */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-[13px] font-mono text-[var(--text-muted)]">Formato reloj:</span>
        <div
          className="p-1 rounded-xl flex items-center gap-1 border"
          style={{ background: 'var(--pill-bg)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => setPreset('square')}
            className="px-2.5 py-1 rounded-lg text-[12px] font-medium transition cursor-pointer"
            style={{
              background: preset === 'square' ? 'var(--accent)' : 'transparent',
              color: preset === 'square' ? 'var(--on-accent)' : 'var(--text)',
            }}
          >
            Cuadrado (410×502)
          </button>
          <button
            onClick={() => setPreset('round')}
            className="px-2.5 py-1 rounded-lg text-[12px] font-medium transition cursor-pointer"
            style={{
              background: preset === 'round' ? 'var(--accent)' : 'transparent',
              color: preset === 'round' ? 'var(--on-accent)' : 'var(--text)',
            }}
          >
            Redondo (454×454)
          </button>
          <button
            onClick={() => setPreset('full')}
            className="px-2.5 py-1 rounded-lg text-[12px] font-medium transition cursor-pointer"
            style={{
              background: preset === 'full' ? 'var(--accent)' : 'transparent',
              color: preset === 'full' ? 'var(--on-accent)' : 'var(--text)',
            }}
          >
            Adaptable
          </button>
        </div>
      </div>

      {/* Contenedor del reloj con hardware frame */}
      <div
        className={
          preset === 'square'
            ? 'wrist-frame-square'
            : preset === 'round'
            ? 'wrist-frame-round'
            : 'w-full max-w-[440px] h-[520px] rounded-[36px] border border-[var(--border)] shadow-2xl relative overflow-hidden bg-[var(--bg)]'
        }
      >
        {/* Banda superior de enlace caído si desconectado */}
        {isOffline && (
          <div
            className="w-full text-center py-1 text-[12px] font-medium font-mono z-40"
            style={{ background: 'var(--danger)', color: 'var(--on-accent)' }}
          >
            Sin enlace · último dato hace {dataAgeSeconds} s
          </div>
        )}

        {/* Pantalla completa de alerta en escalamiento crítico */}
        {showFullscreenAlert && (
          <div
            className="absolute inset-0 z-50 flex flex-col justify-between p-5 text-center"
            style={{ background: 'var(--danger)', color: 'var(--on-accent)' }}
          >
            <div className="space-y-3 my-auto">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 flex items-center justify-center">
                <LevelShape level={globalLevel} size={36} />
              </div>
              <div className="text-[26px] font-extrabold uppercase tracking-tight">
                {meta.globalTitle}
              </div>
              <p className="text-[15px] font-medium leading-snug">
                Pulsaciones o respiración fuera del rango habitual. Haz una pausa inmediata.
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setDismissedAlertLevel(globalLevel)
                  setScreen('avisar')
                }}
                className="w-full py-3 rounded-xl bg-white text-black text-[16px] font-bold cursor-pointer min-h-[46px] shadow-lg"
              >
                Avisar al Médico Ahora
              </button>
              <button
                onClick={() => setDismissedAlertLevel(globalLevel)}
                className="w-full py-2 rounded-xl text-[13px] text-white/80 cursor-pointer"
              >
                Ignorar aviso
              </button>
            </div>
          </div>
        )}

        {/* Pantalla activa */}
        <div className="h-[calc(100%-54px)] overflow-hidden">{renderContent()}</div>

        {/* Barra inferior de navegación del reloj (≥ 44px touch targets) */}
        <nav
          className="h-[54px] border-t flex items-center justify-around px-2 z-30"
          style={{ background: 'var(--surface-solid)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => setScreen('estado')}
            aria-label="Estado"
            className="p-2 text-[12px] font-medium cursor-pointer min-w-[44px] min-h-[44px] flex flex-col items-center justify-center"
            style={{ color: screen === 'estado' ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <span className="text-[16px]">●</span>
            <span className="text-[10px]">Estado</span>
          </button>
          <button
            onClick={() => setScreen('signos')}
            aria-label="Signos"
            className="p-2 text-[12px] font-medium cursor-pointer min-w-[44px] min-h-[44px] flex flex-col items-center justify-center"
            style={{ color: screen === 'signos' ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <span className="text-[16px]">☵</span>
            <span className="text-[10px]">Signos</span>
          </button>
          <button
            onClick={() => setScreen('avisar')}
            aria-label="Avisar"
            className="p-2 text-[12px] font-medium cursor-pointer min-w-[44px] min-h-[44px] flex flex-col items-center justify-center"
            style={{ color: screen === 'avisar' ? 'var(--danger)' : 'var(--text-muted)' }}
          >
            <span className="text-[16px]">▲</span>
            <span className="text-[10px]">Avisar</span>
          </button>
          <button
            onClick={() => setScreen('rutina')}
            aria-label="Rutina"
            className="p-2 text-[12px] font-medium cursor-pointer min-w-[44px] min-h-[44px] flex flex-col items-center justify-center"
            style={{ color: screen === 'rutina' ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <span className="text-[16px]">★</span>
            <span className="text-[10px]">Rutina</span>
          </button>
          <button
            onClick={() => setScreen('asistente')}
            aria-label="Asistente"
            className="p-2 text-[12px] font-medium cursor-pointer min-w-[44px] min-h-[44px] flex flex-col items-center justify-center"
            style={{ color: screen === 'asistente' ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <span className="text-[16px]">✦</span>
            <span className="text-[10px]">IA</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
