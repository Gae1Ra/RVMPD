import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AiQuery,
  Indicator,
  IndicatorId,
  Level,
  Mission,
  Role,
  SeriesPoint,
  SimPhase,
  Surface,
  TimeRange,
} from './types'
import {
  INITIAL_INDICATORS,
  INITIAL_MISSIONS,
  formatEs,
  formatMissionClock,
  getIndicatorLevel,
} from './constants'
import { Header } from './components/Header'
import { StatusBar } from './components/StatusBar'
import { EmergencyPanel } from './components/EmergencyPanel'
import { VitalsGrid } from './components/VitalsGrid'
import { EvolutionChart } from './components/EvolutionChart'
import { AiDecisionSupport } from './components/AiDecisionSupport'
import { Footer } from './components/Footer'
import { IndicatorInfoModal, MissionsModal, NotifyModal, Toast } from './components/Modals'
import { WristApp } from './components/WristApp'

// Generador inicial de series temporales
function generateInitialSeries(): Record<IndicatorId, Record<TimeRange, SeriesPoint[]>> {
  const result = {} as Record<IndicatorId, Record<TimeRange, SeriesPoint[]>>

  INITIAL_INDICATORS.forEach((ind) => {
    const span = (ind.ref[1] - ind.ref[0]) * 0.35

    const makePoints = (count: number, includeEventMarker: boolean) => {
      const arr: SeriesPoint[] = []
      for (let i = 0; i < count; i++) {
        const wave = Math.sin(i * 0.38) * span * 0.65 + (Math.random() - 0.5) * span * 0.5
        const val = Number((ind.base + wave).toFixed(ind.decimals))
        arr.push({
          val,
          label: '',
          isEvent: includeEventMarker && i === Math.floor(count * 0.65),
        })
      }
      return arr
    }

    const vivo = makePoints(45, false)
    vivo.forEach((pt, idx) => {
      const secAgo = 44 - idx
      pt.label = secAgo === 0 ? 'Ahora' : `-${secAgo} s`
    })

    const h24 = makePoints(25, true)
    h24.forEach((pt, idx) => {
      const hr = idx % 24
      pt.label = `${String(hr).padStart(2, '0')}:00`
    })

    const d7 = makePoints(14, false)
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    d7.forEach((pt, idx) => {
      pt.label = `${days[Math.floor(idx / 2) % 7]} ${idx % 2 === 0 ? 'AM' : 'PM'}`
    })

    result[ind.id] = { vivo, '24h': h24, '7d': d7 }
  })

  return result
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [role, setRole] = useState<Role>('medico')
  const [surface, setSurface] = useState<Surface>('panel')
  const [indicators, setIndicators] = useState<Indicator[]>(INITIAL_INDICATORS)
  const [selectedId, setSelectedId] = useState<IndicatorId>('fc')
  const [timeRange, setTimeRange] = useState<TimeRange>('vivo')
  const [simPhase, setSimPhase] = useState<SimPhase>('off')
  const [simTick, setSimTick] = useState(0)
  const [missionSeconds, setMissionSeconds] = useState(42 * 86400 + 14 * 3600 + 22 * 60 + 8)
  const [dataAgeSeconds, setDataAgeSeconds] = useState(1)
  const [aiQuery, setAiQuery] = useState<AiQuery>('default')
  const [interventions, setInterventions] = useState<string[]>([])
  const [xp, setXp] = useState(30)
  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS)
  const [series, setSeries] = useState(generateInitialSeries)

  // Modals state
  const [isNotifyOpen, setIsNotifyOpen] = useState(false)
  const [isMissionsOpen, setIsMissionsOpen] = useState(false)
  const [infoModalId, setInfoModalId] = useState<IndicatorId | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const toastTimerRef = useRef<number | null>(null)

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null)
    }, 3200)
  }, [])

  // Nivel global y preparación
  const levels = indicators.map(getIndicatorLevel)
  const globalLevel = (Math.max(...levels) as number) as Level
  const sumOfLevels = (levels as number[]).reduce((acc: number, l: number) => acc + l, 0)
  const readiness = Math.max(8, 86 - 7 * sumOfLevels)

  // Manejo de tema claro/oscuro
  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (next === 'light') {
      document.body.classList.add('theme-light')
    } else {
      document.body.classList.remove('theme-light')
    }
  }

  // Cerrar modales con tecla Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNotifyOpen(false)
        setIsMissionsOpen(false)
        setInfoModalId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Simulación: establecer objetivos según factor
  const applySimTargets = (f: number, currentList: Indicator[]): Indicator[] => {
    return currentList.map((ind) => {
      const next = { ...ind }
      if (ind.id === 'fc') next.current = Math.round(72 + f * 54) // 126
      if (ind.id === 'spo2') next.current = Math.round(98 - f * 7) // 91
      if (ind.id === 'pa') {
        next.current = Math.round(118 + f * 26) // 144
        next.diastolic = Math.round(78 + f * 14) // 92
      }
      if (ind.id === 'fr') next.current = Math.round(15 + f * 10) // 25
      if (ind.id === 'temp') next.current = Number((36.8 + f * 1.1).toFixed(1)) // 37.9
      if (ind.id === 'hrv') next.current = Math.round(54 - f * 34) // 20
      return next
    })
  }

  // Ciclo manual de simulación
  const handleCycleSim = () => {
    if (simPhase === 'off') {
      // Guardar instantánea previa para tabla Antes / Ahora
      setIndicators((prev) =>
        prev.map((ind) => ({
          ...ind,
          prevEvent: ind.current,
          prevDiastolic: ind.diastolic,
        }))
      )
      setSimPhase('rising')
      setSimTick(1)
      setIndicators((prev) => applySimTargets(0.85, prev))
      showToast('Evento crítico simulado activo')
    } else if (simPhase === 'rising') {
      setSimPhase('recovering')
      setSimTick(1)
      showToast('Iniciando fase de recuperación')
    } else {
      setSimPhase('off')
      setSimTick(0)
      setIndicators((prev) =>
        prev.map((ind) => ({
          ...ind,
          current: ind.base,
          diastolic: ind.id === 'pa' ? 78 : undefined,
        }))
      )
      showToast('Valores restaurados a rango nominal')
    }
  }

  // Motor de simulación en vivo cada 1 segundo (Sección 5.4)
  useEffect(() => {
    const timer = window.setInterval(() => {
      setMissionSeconds((sec) => sec + 1)
      setDataAgeSeconds(1)

      let currentIndicatorsSnapshot: Indicator[] = []

      setSimPhase((phase) => {
        if (phase === 'rising') {
          setSimTick((tick) => {
            const nextTick = tick + 1
            const factor = Math.min(1, nextTick / 8)
            setIndicators((prev) => {
              const updated = applySimTargets(factor, prev)
              currentIndicatorsSnapshot = updated
              return updated
            })
            if (nextTick >= 18) {
              return 0
            }
            return nextTick
          })
          return simTick >= 18 ? 'recovering' : 'rising'
        }

        if (phase === 'recovering') {
          setSimTick((tick) => {
            const nextTick = tick + 1
            const factor = Math.max(0, 1 - nextTick / 10)
            setIndicators((prev) => {
              const updated = applySimTargets(factor, prev)
              currentIndicatorsSnapshot = updated
              return updated
            })
            if (factor <= 0.02) {
              return 0
            }
            return nextTick
          })
          return simTick >= 10 ? 'off' : 'recovering'
        }

        // Variación fisiológica suave en reposo (dentro de ref individual)
        setIndicators((prev) => {
          const updated = prev.map((ind) => {
            const jitter = (Math.random() - 0.5) * (ind.decimals === 1 ? 0.14 : 1.4)
            const next = ind.base + jitter
            const clamped = Math.max(ind.ref[0], Math.min(ind.ref[1], next))
            return {
              ...ind,
              current: Number(clamped.toFixed(ind.decimals)),
              diastolic: ind.id === 'pa' ? Math.round(78 + (Math.random() - 0.5) * 2) : undefined,
            }
          })
          currentIndicatorsSnapshot = updated
          return updated
        })

        return 'off'
      })

      // Actualizar series temporales en vivo
      setSeries((prevSeries) => {
        const nextSeries = { ...prevSeries }
        const nowLabel = formatMissionClock(missionSeconds + 1).slice(-8)

        indicators.forEach((ind) => {
          const currentVal =
            currentIndicatorsSnapshot.find((i) => i.id === ind.id)?.current ?? ind.current
          const currentVivo = [...(prevSeries[ind.id]?.vivo || [])]
          currentVivo.push({
            val: currentVal,
            label: nowLabel,
            isEvent: simPhase === 'rising' && simTick === 1,
          })
          if (currentVivo.length > 60) currentVivo.shift()
          nextSeries[ind.id] = {
            ...nextSeries[ind.id],
            vivo: currentVivo,
          }
        })

        return nextSeries
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [simPhase, simTick, missionSeconds, indicators])

  // Registro de intervenciones con hora de misión
  const handleLogIntervention = (text: string) => {
    const stamp = formatMissionClock(missionSeconds)
    setInterventions((prev) => [`${stamp} · ${text}`, ...prev])
    showToast('Intervención registrada con marca de tiempo')
  }

  // Rutinas diarias
  const handleCompleteNextMission = () => {
    const isSafety = globalLevel >= 2
    const next = missions.find((m) => !m.done && !(isSafety && m.isExercise))
    if (!next) return
    setMissions((prev) =>
      prev.map((m) => (m.id === next.id ? { ...m, done: true } : m))
    )
    setXp((prev) => prev + next.xp)
    showToast(`Rutina completada (+${next.xp} XP)`)
  }

  const handleToggleMission = (id: string) => {
    setMissions((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const nextDone = !m.done
          setXp((curr) => curr + (nextDone ? m.xp : -m.xp))
          return { ...m, done: nextDone }
        }
        return m
      })
    )
  }

  // Exportación CSV (Sección 8.10)
  const handleExportCsv = () => {
    const ind = indicators.find((i) => i.id === selectedId) || indicators[0]
    const rows = series[ind.id]?.[timeRange] || []
    let csv = `Tiempo,Parametro,Valor,Unidad,Rango_Individual,Origen\n`
    rows.forEach((r) => {
      csv += `"${r.label}","${ind.abbr}","${formatEs(r.val, ind.decimals)}","${ind.unit}","${ind.rangeText}","Simulado"\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `VITALIS_A01_${ind.id}_${timeRange}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast(`CSV exportado (${ind.abbr} · ${timeRange})`)
  }

  const handleConfirmNotify = () => {
    setIsNotifyOpen(false)
    showToast('Aviso enviado al equipo médico a bordo')
  }

  const selectedIndicator = indicators.find((i) => i.id === selectedId) || indicators[0]
  const currentChartPoints = series[selectedId]?.[timeRange] || []
  const isEmergencyActive = simPhase !== 'off' || globalLevel >= 2

  return (
    <div className="min-h-screen">
      {/* Contenedor Principal (máx. 1280 px, sin barra lateral) */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-4 min-h-screen">
        {/* 1. Barra Superior Minimalista */}
        <Header
          role={role}
          onRoleChange={setRole}
          surface={surface}
          onSurfaceChange={setSurface}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          missionClock={formatMissionClock(missionSeconds)}
          simPhase={simPhase}
          onCycleSim={handleCycleSim}
        />

        {surface === 'panel' ? (
          <>
            {/* 2. Franja de Estado Unificada */}
            <StatusBar
              globalLevel={globalLevel}
              readiness={readiness}
              dataAgeSeconds={dataAgeSeconds}
              onExportCsv={handleExportCsv}
              onOpenNotifyModal={() => setIsNotifyOpen(true)}
            />

            {/* 3. Panel de Emergencia (visible con evento activo o nivel >= 2) */}
            {isEmergencyActive && (
              <EmergencyPanel
                role={role}
                simPhase={simPhase}
                indicators={indicators}
                interventions={interventions}
                onLogIntervention={handleLogIntervention}
                onOpenNotifyModal={() => setIsNotifyOpen(true)}
              />
            )}

            {/* 4. Matriz 3x2 de 6 Signos Vitales */}
            <VitalsGrid
              indicators={indicators}
              selectedId={selectedId}
              role={role}
              onSelect={setSelectedId}
              onOpenInfo={setInfoModalId}
            />

            {/* 5. Sección Inferior de 2 Columnas (7 + 5 cols) */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1">
              <EvolutionChart
                indicator={selectedIndicator}
                role={role}
                timeRange={timeRange}
                points={currentChartPoints}
                onTimeRangeChange={setTimeRange}
              />

              <AiDecisionSupport
                role={role}
                indicators={indicators}
                aiQuery={aiQuery}
                onAiQueryChange={setAiQuery}
                missions={missions}
                onCompleteNextMission={handleCompleteNextMission}
                onOpenMissionsModal={() => setIsMissionsOpen(true)}
              />
            </section>
          </>
        ) : (
          /* Superficie 2: UI de Muñeca (Astronaut Wrist Device) */
          <WristApp
            indicators={indicators}
            globalLevel={globalLevel}
            readiness={readiness}
            dataAgeSeconds={dataAgeSeconds}
            missionClock={formatMissionClock(missionSeconds)}
            missions={missions}
            onCompleteNextMission={handleCompleteNextMission}
            onToggleMission={handleToggleMission}
            onNotifyTeam={handleConfirmNotify}
          />
        )}

        {/* 6. Pie Permanente de Transparencia */}
        <Footer />
      </div>

      {/* Modales */}
      <NotifyModal
        isOpen={isNotifyOpen}
        readiness={readiness}
        onClose={() => setIsNotifyOpen(false)}
        onConfirm={handleConfirmNotify}
      />

      <MissionsModal
        isOpen={isMissionsOpen}
        isSafetyActive={globalLevel >= 2}
        missions={missions}
        xp={xp}
        onToggleMission={handleToggleMission}
        onClose={() => setIsMissionsOpen(false)}
      />

      <IndicatorInfoModal
        indicator={indicators.find((i) => i.id === infoModalId) || null}
        onClose={() => setInfoModalId(null)}
      />

      {/* Toast de confirmación silenciosa (3.2 s) */}
      <Toast message={toastMessage} />
    </div>
  )
}
