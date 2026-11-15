import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AiQuery,
  IndicatorId,
  Mission,
  Role,
  SeriesPoint,
  Surface,
  TimeRange,
} from './types'
import {
  INITIAL_MISSIONS,
  INDICATOR_METRIC,
  formatMissionClock,
  getIndicatorLevel,
} from './constants'
import { useT } from './i18n'
import { localizeAlerts, localizeIndicators, localizeMissions } from './i18n/localize'
import { Header } from './components/Header'
import { StatusBar } from './components/StatusBar'
import { EmergencyPanel } from './components/EmergencyPanel'
import { VitalsGrid } from './components/VitalsGrid'
import { EvolutionChart } from './components/EvolutionChart'
import { AiDecisionSupport } from './components/AiDecisionSupport'
import { Footer } from './components/Footer'
import { IndicatorInfoModal, MissionsModal, NotifyModal, Toast } from './components/Modals'
import { WristApp } from './components/WristApp'
import { CheckInPanel } from './components/CheckInPanel'
import { SpaceWeatherPanel } from './components/SpaceWeatherPanel'
import { AnalysisPanel } from './components/AnalysisPanel'
import { MedicalAiPanel } from './components/MedicalAiPanel'
import { useTelemetry } from './hooks/useTelemetry'
import { useVoice } from './hooks/useVoice'
import {
  applyFrameToIndicators,
  cloneInitialIndicators,
  globalStatusToLevel,
  historyToSeries,
  snapshotPrevEvent,
} from './mapTelemetry'
import { api } from './api'

function emptySeries(): Record<IndicatorId, Record<TimeRange, SeriesPoint[]>> {
  const ids: IndicatorId[] = ['fc', 'spo2', 'pa', 'fr', 'temp', 'hrv']
  const result = {} as Record<IndicatorId, Record<TimeRange, SeriesPoint[]>>
  for (const id of ids) {
    result[id] = { vivo: [], '24h': [], '7d': [] }
  }
  return result
}

export default function App() {
  const { frame, mode, history, setScenario, disconnected } = useTelemetry()
  const { t, tf, formatNumber, locale } = useT()
  const voice = useVoice(locale, t.voice.normalized)
  const { speakAlertBatch, speakNormalized, speakAnalysis } = voice

  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [role, setRole] = useState<Role>('medico')
  const [surface, setSurface] = useState<Surface>('panel')
  const [indicators, setIndicators] = useState(cloneInitialIndicators)
  const [selectedId, setSelectedId] = useState<IndicatorId>('fc')
  const [timeRange, setTimeRange] = useState<TimeRange>('vivo')
  const [missionSeconds, setMissionSeconds] = useState(42 * 86400 + 14 * 3600 + 22 * 60 + 8)
  const [dataAgeSeconds, setDataAgeSeconds] = useState(1)
  const [aiQuery, setAiQuery] = useState<AiQuery>('default')
  const [interventions, setInterventions] = useState<string[]>([])
  const [xp, setXp] = useState(30)
  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS)
  const [series, setSeries] = useState(emptySeries)
  const [scenarioId, setScenarioId] = useState('nominal')

  const localizedIndicators = localizeIndicators(indicators, t)
  const localizedMissions = localizeMissions(missions, t)

  const [isNotifyOpen, setIsNotifyOpen] = useState(false)
  const [isMissionsOpen, setIsMissionsOpen] = useState(false)
  const [infoModalId, setInfoModalId] = useState<IndicatorId | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const toastTimerRef = useRef<number | null>(null)
  const lastFrameAtRef = useRef<number>(Date.now())
  const prevScenarioRef = useRef('nominal')
  const prevSnapshotTaken = useRef(false)
  const spokenAlertIdsRef = useRef<Set<string>>(new Set())
  const hadAlertRef = useRef(false)

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null)
    }, 3200)
  }, [])

  // Apply live / demo frames to indicator cards and mission clock.
  useEffect(() => {
    if (!frame) return
    lastFrameAtRef.current = Date.now()
    setDataAgeSeconds(0)
    setMissionSeconds(Math.floor(frame.t))
    setScenarioId(frame.scenario)

    if (frame.scenario !== 'nominal' && prevScenarioRef.current === 'nominal' && !prevSnapshotTaken.current) {
      setIndicators((prev) => applyFrameToIndicators(frame, snapshotPrevEvent(prev)))
      prevSnapshotTaken.current = true
    } else {
      setIndicators((prev) => applyFrameToIndicators(frame, prev))
    }
    if (frame.scenario === 'nominal') prevSnapshotTaken.current = false
    prevScenarioRef.current = frame.scenario

    setSeries((prev) => {
      const next = { ...prev }
      const ids: IndicatorId[] = ['fc', 'spo2', 'pa', 'fr', 'temp', 'hrv']
      for (const id of ids) {
        const key = INDICATOR_METRIC[id]
        const values = history[key] ?? []
        const decimals = id === 'temp' ? 1 : 0
        next[id] = {
          ...next[id],
          vivo: historyToSeries(values, Math.floor(frame.t), decimals),
        }
      }
      return next
    })

    // Auto-speak only newly seen amber/red alerts (not every telemetry tick).
    const actionable = (frame.alerts ?? []).filter((a) => a.level === 'amber' || a.level === 'red')
    const fresh = actionable.filter((a) => !spokenAlertIdsRef.current.has(a.id))
    if (fresh.length > 0) {
      for (const a of fresh) spokenAlertIdsRef.current.add(a.id)
      hadAlertRef.current = true
      speakAlertBatch(localizeAlerts(fresh, locale))
    }
    // Drop ids that are no longer active so a re-fire later can speak again (anti-repeat still applies).
    const activeIds = new Set(actionable.map((a) => a.id))
    for (const id of [...spokenAlertIdsRef.current]) {
      if (!activeIds.has(id)) spokenAlertIdsRef.current.delete(id)
    }
    if (frame.global.status === 'green' && hadAlertRef.current && actionable.length === 0) {
      hadAlertRef.current = false
      speakNormalized()
    }
  }, [frame, history, locale, speakAlertBatch, speakNormalized])

  // Age of last frame for StatusBar / wrist offline banner.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setDataAgeSeconds(Math.max(0, Math.floor((Date.now() - lastFrameAtRef.current) / 1000)))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  // Load 24h / 7d history from REST when the range changes (falls back to empty if offline).
  useEffect(() => {
    if (timeRange === 'vivo') return
    const minutes = timeRange === '24h' ? 1440 : 10080
    const metric = INDICATOR_METRIC[selectedId]
    let cancelled = false
    api
      .history(metric, Math.min(minutes, 1440))
      .then((res) => {
        if (cancelled) return
        const points: SeriesPoint[] = res.points.map((p) => {
          const d = new Date(p.t)
          const label =
            timeRange === '24h'
              ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
              : `${d.getMonth() + 1}/${d.getDate()}`
          return { val: p.value, label, isEvent: p.status === 'red' || p.status === 'amber' }
        })
        setSeries((prev) => ({
          ...prev,
          [selectedId]: { ...prev[selectedId], [timeRange]: points },
        }))
      })
      .catch(() => {
        /* keep previous / empty series when backend is down */
      })
    return () => {
      cancelled = true
    }
  }, [timeRange, selectedId])

  const levels = indicators.map(getIndicatorLevel)
  const globalLevel = frame
    ? globalStatusToLevel(frame.global.status)
    : ((Math.max(0, ...levels) as number) as 0 | 1 | 2 | 3)
  const sumOfLevels = (levels as number[]).reduce((acc: number, l: number) => acc + l, 0)
  const readiness = Math.max(8, 86 - 7 * sumOfLevels)
  const isEmergencyActive = (frame?.scenario !== 'nominal' && !!frame) || globalLevel >= 2 || (frame?.alerts.length ?? 0) > 0

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (next === 'light') document.body.classList.add('theme-light')
    else document.body.classList.remove('theme-light')
  }

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

  const handleSetScenario = async (id: string) => {
    await setScenario(id)
    showToast(tf(t.scenarios.toast, { id }))
  }

  const handleLogIntervention = (text: string) => {
    const stamp = formatMissionClock(missionSeconds)
    setInterventions((prev) => [`${stamp} · ${text}`, ...prev])
    showToast(t.toast.intervention)
  }

  const handleCompleteNextMission = () => {
    const isSafety = globalLevel >= 2
    const next = localizedMissions.find((m) => !m.done && !(isSafety && m.isExercise))
    if (!next) return
    setMissions((prev) => prev.map((m) => (m.id === next.id ? { ...m, done: true } : m)))
    setXp((prev) => prev + next.xp)
    showToast(tf(t.toast.missionDone, { n: next.xp }))
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
      }),
    )
  }

  const handleExportCsv = () => {
    const ind = localizedIndicators.find((i) => i.id === selectedId) || localizedIndicators[0]
    const rows = series[ind.id]?.[timeRange] || []
    let csv = `Tiempo,Parametro,Valor,Unidad,Rango_Individual,Origen\n`
    const origin = mode === 'live' ? 'Backend' : 'Simulado'
    rows.forEach((r) => {
      csv += `"${r.label}","${ind.abbr}","${formatNumber(r.val, ind.decimals)}","${ind.unit}","${ind.rangeText}","${origin}"\n`
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
    showToast(tf(t.toast.csv, { abbr: ind.abbr, range: timeRange }))
  }

  const handleConfirmNotify = () => {
    setIsNotifyOpen(false)
    showToast(t.toast.notifySent)
  }

  const selectedIndicator = localizedIndicators.find((i) => i.id === selectedId) || localizedIndicators[0]
  const currentChartPoints = series[selectedId]?.[timeRange] || []

  // Map scenario to a SimPhase-like label for EmergencyPanel.
  const simPhase =
    frame?.scenario && frame.scenario !== 'nominal'
      ? globalLevel >= 3
        ? 'rising'
        : 'recovering'
      : 'off'

  const voiceStatusLabel =
    voice.muted || voice.provider === 'muted'
      ? t.voice.statusMuted
      : voice.provider === 'elevenlabs'
        ? t.voice.statusEleven
        : t.voice.statusBrowser

  return (
    <div className="min-h-screen app-shell">
      <div className="app-frame max-w-[1280px] mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-4 min-h-screen">
        {!voice.unlocked && (
          <div
            role="status"
            className="vitalis-glass px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[13px]"
            style={{ borderColor: 'var(--border)' }}
          >
            <span style={{ color: 'var(--text-muted)' }}>{t.voice.unlockBanner}</span>
            <button
              type="button"
              onClick={voice.unlock}
              className="touch-target px-3 py-1.5 rounded-[10px] text-[13px] font-semibold cursor-pointer"
              style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              {t.voice.unlockAction}
            </button>
          </div>
        )}

        <Header
          role={role}
          onRoleChange={setRole}
          surface={surface}
          onSurfaceChange={setSurface}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          missionClock={formatMissionClock(missionSeconds)}
          linkMode={mode}
          scenarioId={scenarioId}
          onSetScenario={handleSetScenario}
          voiceMuted={voice.muted}
          voiceVolume={voice.volume}
          voiceProvider={voice.provider}
          onToggleMute={voice.toggleMute}
          onVolumeChange={voice.setVolume}
        />

        {surface === 'panel' ? (
          <>
            <StatusBar
              globalLevel={globalLevel}
              readiness={readiness}
              dataAgeSeconds={dataAgeSeconds}
              onExportCsv={handleExportCsv}
              onOpenNotifyModal={() => setIsNotifyOpen(true)}
              sqi={frame?.global.sqi}
              confidence={frame?.global.confidence}
              linkMode={mode}
            />

            {isEmergencyActive && (
              <EmergencyPanel
                role={role}
                simPhase={simPhase}
                indicators={localizedIndicators}
                interventions={interventions}
                onLogIntervention={handleLogIntervention}
                onOpenNotifyModal={() => setIsNotifyOpen(true)}
                alerts={localizeAlerts(frame?.alerts ?? [], locale)}
              />
            )}

            <VitalsGrid
              indicators={localizedIndicators}
              selectedId={selectedId}
              role={role}
              onSelect={setSelectedId}
              onOpenInfo={setInfoModalId}
            />

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
                indicators={localizedIndicators}
                aiQuery={aiQuery}
                onAiQueryChange={setAiQuery}
                missions={localizedMissions}
                onCompleteNextMission={handleCompleteNextMission}
                onOpenMissionsModal={() => setIsMissionsOpen(true)}
              />
            </section>

            <MedicalAiPanel frame={frame} onToast={showToast} />

            <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5 panel-secondary-grid">
              <CheckInPanel onToast={showToast} />
              <SpaceWeatherPanel />
              <AnalysisPanel
                onToast={showToast}
                onAnalyzed={(report) => speakAnalysis(report, locale)}
              />
            </section>
          </>
        ) : (
          <WristApp
            indicators={localizedIndicators}
            globalLevel={globalLevel}
            readiness={readiness}
            dataAgeSeconds={dataAgeSeconds}
            missionClock={formatMissionClock(missionSeconds)}
            missions={localizedMissions}
            onCompleteNextMission={handleCompleteNextMission}
            onToggleMission={handleToggleMission}
            onNotifyTeam={handleConfirmNotify}
            isOffline={disconnected && mode !== 'connecting'}
            linkLive={mode === 'live'}
            voiceMuted={voice.muted}
            voiceVolume={voice.volume}
            voiceStatusLabel={voiceStatusLabel}
            onToggleMute={voice.toggleMute}
            onVolumeChange={voice.setVolume}
          />
        )}

        <Footer linkMode={mode} />
      </div>

      <NotifyModal
        isOpen={isNotifyOpen}
        readiness={readiness}
        onClose={() => setIsNotifyOpen(false)}
        onConfirm={handleConfirmNotify}
      />

      <MissionsModal
        isOpen={isMissionsOpen}
        isSafetyActive={globalLevel >= 2}
        missions={localizedMissions}
        xp={xp}
        onToggleMission={handleToggleMission}
        onClose={() => setIsMissionsOpen(false)}
      />

      <IndicatorInfoModal
        indicator={localizedIndicators.find((i) => i.id === infoModalId) || null}
        onClose={() => setInfoModalId(null)}
      />

      <Toast message={toastMessage} />
    </div>
  )
}
