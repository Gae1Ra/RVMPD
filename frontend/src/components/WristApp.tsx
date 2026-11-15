import React, { useState } from 'react'
import type { AiQuery, Indicator, IndicatorId, Level, Mission } from '../types'
import { getIndicatorLevel } from '../constants'
import { LevelShape } from './LevelShape'
import { LangSwitcher, useT } from '../i18n'
import { localizedLevelMeta } from '../i18n/localize'

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
  linkLive?: boolean
  voiceMuted?: boolean
  voiceVolume?: number
  voiceStatusLabel?: string
  onToggleMute?: () => void
  onVolumeChange?: (v: number) => void
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
  linkLive = false,
  voiceMuted = false,
  voiceVolume = 0.85,
  voiceStatusLabel,
  onToggleMute,
  onVolumeChange,
}) => {
  const { t, tf, formatNumber } = useT()
  const [screen, setScreen] = useState<WristScreen>('estado')
  const [selectedIndId, setSelectedIndId] = useState<IndicatorId>('fc')
  const [preset, setPreset] = useState<WristPreset>('square')
  const [notifyConfirmed, setNotifyConfirmed] = useState(false)
  const [aiQuery, setAiQuery] = useState<AiQuery>('default')
  const [dismissedAlertLevel, setDismissedAlertLevel] = useState<number>(-1)

  const meta = localizedLevelMeta(globalLevel, t)
  const isSafetyActive = globalLevel >= 2

  const highestVital = [...indicators].sort((a, b) => getIndicatorLevel(b) - getIndicatorLevel(a))[0]
  const highestLevel = getIndicatorLevel(highestVital)
  const selectedInd = indicators.find((i) => i.id === selectedIndId) || indicators[0]
  const nextMission = missions.find((m) => !m.done && !(isSafetyActive && m.isExercise))

  const getWristAiText = () => {
    if (globalLevel >= 2) return t.wrist.aiAlert
    if (aiQuery === 'resumen24h') return t.wrist.aiSummary
    if (aiQuery === 'tendencia') return t.wrist.aiTrend
    if (aiQuery === 'protocolo') return t.wrist.aiProtocol
    return t.wrist.aiDefault
  }

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

  const formatVital = (ind: Indicator) =>
    ind.id === 'pa' && ind.diastolic !== undefined
      ? `${ind.current}/${ind.diastolic}`
      : formatNumber(ind.current, ind.decimals)

  const renderContent = () => {
    switch (screen) {
      case 'estado':
        return (
          <div className="flex flex-col h-full justify-between p-4 text-center">
            <div className="flex items-center justify-between text-[13px] font-mono text-[var(--text-muted)] pt-1">
              <span>{missionClock.slice(-8)}</span>
              <span>A-01</span>
            </div>

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
                {t.wrist.prep}{' '}
                <span className="text-[24px] font-bold text-[var(--text)]">{readiness}</span>
                /100
              </div>

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
                  {formatVital(highestVital)} {highestVital.unit}
                  {highestVital.delta !== undefined && (
                    <span className="text-[12px] font-normal text-[var(--text-muted)] ml-1">
                      {highestVital.delta > 0 ? '+' : ''}
                      {formatNumber(highestVital.delta, highestVital.decimals)}
                    </span>
                  )}
                </span>
              </button>
            </div>

            <div className="text-[12px] font-mono text-[var(--text-muted)]">
              {tf(t.wrist.agoSim, {
                n: dataAgeSeconds,
                source: linkLive ? t.wrist.live : t.wrist.simulated,
              })}
            </div>
          </div>
        )

      case 'signos':
        return (
          <div className="flex flex-col h-full p-3">
            <div className="text-[15px] font-bold mb-2 px-1 flex items-center justify-between">
              <span>{t.wrist.vitalsTitle}</span>
              <span className="text-[12px] font-mono text-[var(--text-muted)]">{t.wrist.sixSigns}</span>
            </div>
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
              {indicators.map((ind) => {
                const lvl = getIndicatorLevel(ind)
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
                      {ind.artifact && (
                        <span className="text-[10px] font-mono" style={{ color: 'var(--status-watch)' }}>
                          {t.wrist.artShort}
                        </span>
                      )}
                    </div>
                    <div className="font-mono tabular-nums text-[15px] font-semibold">
                      {formatVital(ind)}{' '}
                      <span className="text-[12px] font-normal text-[var(--text-muted)]">{ind.unit}</span>
                      {ind.delta !== undefined && (
                        <span className="text-[11px] font-normal text-[var(--text-muted)] ml-1">
                          {ind.delta > 0 ? '+' : ''}
                          {formatNumber(ind.delta, ind.decimals)}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )

      case 'detalle': {
        const lvl = getIndicatorLevel(selectedInd)
        const pctInRange = Math.min(
          100,
          Math.max(
            0,
            ((selectedInd.current - selectedInd.chartMin) /
              (selectedInd.chartMax - selectedInd.chartMin)) *
              100,
          ),
        )

        return (
          <div className="flex flex-col h-full p-3 justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setScreen('signos')}
                  className="text-[13px] text-[var(--accent)] font-medium flex items-center gap-1 min-h-[44px]"
                >
                  {t.wrist.back}
                </button>
                <div className="flex items-center gap-1.5">
                  <LevelShape level={lvl} size={14} />
                  <span className="text-[13px] font-semibold">{selectedInd.astroName}</span>
                </div>
              </div>

              <div className="text-center py-2">
                <div className="font-metric tabular-nums tracking-tight">{formatVital(selectedInd)}</div>
                <div className="text-[13px] font-medium text-[var(--text-muted)] mt-0.5">
                  {selectedInd.unit} · {tf(t.wrist.range, { range: selectedInd.rangeText })}
                  {selectedInd.delta !== undefined && (
                    <>
                      {' '}
                      · Δ {selectedInd.delta > 0 ? '+' : ''}
                      {formatNumber(selectedInd.delta, selectedInd.decimals)}
                    </>
                  )}
                  {selectedInd.sqi !== undefined && <> · SQI {Math.round(selectedInd.sqi * 100)}%</>}
                </div>
                {selectedInd.artifact && (
                  <div className="text-[12px] font-mono mt-1" style={{ color: 'var(--status-watch)' }}>
                    {t.wrist.artifactNote}
                  </div>
                )}
              </div>

              <div className="w-full bg-[var(--pill-bg)] h-3 rounded-full overflow-hidden border border-[var(--border)] relative">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${pctInRange}%`,
                    background: lvl > 0 ? localizedLevelMeta(lvl, t).colorVar : 'var(--accent)',
                  }}
                />
              </div>

              <div
                className="p-2.5 rounded-xl border text-[13px] leading-snug mt-2"
                style={{ background: 'var(--surface-data)', borderColor: 'var(--border)' }}
              >
                <strong className="block text-[12px] uppercase text-[var(--text-muted)] mb-0.5">
                  {t.wrist.whenNotify}
                </strong>
                {selectedInd.whenNotify}
              </div>
            </div>

            <button
              onClick={() => setScreen('avisar')}
              className="w-full py-2.5 rounded-xl text-[14px] font-semibold cursor-pointer min-h-[44px] mt-2 transition hover:opacity-90"
              style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              {tf(t.wrist.notifyAbout, { abbr: selectedInd.abbr })}
            </button>
          </div>
        )
      }

      case 'avisar':
        return (
          <div className="flex flex-col h-full p-4 justify-between text-center">
            <div className="text-[16px] font-bold">{t.wrist.notifyTitle}</div>

            {notifyConfirmed ? (
              <div className="my-auto space-y-2 animate-in fade-in">
                <div
                  className="w-12 h-12 mx-auto rounded-full flex items-center justify-center text-[24px]"
                  style={{ background: 'var(--glow-blue)', color: 'var(--accent)' }}
                >
                  ✓
                </div>
                <div className="text-[16px] font-bold" style={{ color: 'var(--accent)' }}>
                  {t.wrist.sent}
                </div>
                <p className="text-[13px] text-[var(--text-muted)]">{t.wrist.sentBody}</p>
              </div>
            ) : (
              <div className="my-auto space-y-3">
                <div
                  className="p-3 rounded-xl border font-mono text-[13px]"
                  style={{ background: 'var(--surface-data)', borderColor: 'var(--border)' }}
                >
                  {tf(t.wrist.profileLine, { met: missionClock.slice(-8) })}
                  <br />
                  {tf(t.wrist.prepLine, { n: readiness })}
                </div>
                <p className="text-[13px] text-[var(--text-muted)]">{t.wrist.confirmQ}</p>
              </div>
            )}

            {!notifyConfirmed && (
              <div className="space-y-2">
                <button
                  onClick={handleNotifyConfirm}
                  className="w-full py-3 rounded-xl text-[15px] font-bold cursor-pointer min-h-[44px] shadow-lg transition hover:opacity-90"
                  style={{ background: 'var(--danger)', color: 'var(--on-accent)' }}
                >
                  {t.wrist.confirm}
                </button>
                <button
                  onClick={() => setScreen('estado')}
                  className="w-full py-2 rounded-xl text-[14px] font-medium border min-h-[44px] cursor-pointer"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {t.wrist.cancel}
                </button>
              </div>
            )}
          </div>
        )

      case 'rutina':
        return (
          <div className="flex flex-col h-full p-3 justify-between">
            <div>
              <div className="text-[15px] font-bold mb-1">{t.wrist.routines}</div>
              <div className="text-[12px] text-[var(--text-muted)] mb-2 font-mono">
                {tf(t.wrist.xpNow, {
                  n: missions.filter((m) => m.done).reduce((acc, m) => acc + m.xp, 30),
                })}
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
                  <strong>{t.wrist.safety}</strong>
                </div>
              )}

              {nextMission ? (
                <div
                  className="p-3 rounded-xl border text-center space-y-2"
                  style={{ background: 'var(--surface-data)', borderColor: 'var(--border)' }}
                >
                  <div className="text-[12px] text-[var(--text-muted)] uppercase font-semibold">
                    {t.wrist.nextRoutine}
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
                    {t.wrist.markDone}
                  </button>
                </div>
              ) : (
                <div className="p-4 text-center text-[14px] text-[var(--text-muted)]">{t.wrist.allDone}</div>
              )}
            </div>

            <div className="text-[12px] text-[var(--text-muted)] text-center">{t.wrist.postpone}</div>
          </div>
        )

      case 'asistente':
        return (
          <div className="flex flex-col h-full p-3 justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[15px] font-bold">{t.wrist.assistant}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-[var(--border)] text-[var(--text-muted)]">
                  {t.wrist.onboard}
                </span>
              </div>

              <div
                className="p-3 rounded-xl border text-[14px] leading-relaxed mb-3"
                style={{ background: 'var(--surface-data)', borderColor: 'var(--border)' }}
              >
                {getWristAiText()}
              </div>

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
                  {t.wrist.summary24}
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
                  {t.wrist.trend}
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
                  {t.wrist.protocol}
                </button>
              </div>
            </div>

            <div className="text-[11px] text-center text-[var(--text-muted)]">{t.wrist.disclaimer}</div>
          </div>
        )
    }
  }

  return (
    <div className="wrist-wrapper">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-mono text-[var(--text-muted)]">{t.wrist.formatLabel}</span>
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
            {t.wrist.square}
          </button>
          <button
            onClick={() => setPreset('round')}
            className="px-2.5 py-1 rounded-lg text-[12px] font-medium transition cursor-pointer"
            style={{
              background: preset === 'round' ? 'var(--accent)' : 'transparent',
              color: preset === 'round' ? 'var(--on-accent)' : 'var(--text)',
            }}
          >
            {t.wrist.round}
          </button>
          <button
            onClick={() => setPreset('full')}
            className="px-2.5 py-1 rounded-lg text-[12px] font-medium transition cursor-pointer"
            style={{
              background: preset === 'full' ? 'var(--accent)' : 'transparent',
              color: preset === 'full' ? 'var(--on-accent)' : 'var(--text)',
            }}
          >
            {t.wrist.adaptable}
          </button>
        </div>
        <LangSwitcher />
        {onToggleMute && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-xl border"
            style={{ background: 'var(--pill-bg)', borderColor: 'var(--border)' }}
          >
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={voiceMuted ? t.voice.unmute : t.voice.mute}
              title={voiceMuted ? t.voice.unmute : t.voice.mute}
              className="px-2 py-1 text-[12px] font-medium cursor-pointer min-h-[36px]"
              style={{ color: 'var(--text)' }}
            >
              {voiceMuted ? t.voice.unmute : t.voice.mute}
            </button>
            {onVolumeChange && (
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={voiceVolume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                aria-label={t.voice.volume}
                className="w-14 accent-[var(--accent)]"
                disabled={voiceMuted}
              />
            )}
            {voiceStatusLabel && (
              <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                {voiceStatusLabel}
              </span>
            )}
          </div>
        )}
      </div>

      <div
        className={
          preset === 'square'
            ? 'wrist-frame-square'
            : preset === 'round'
              ? 'wrist-frame-round'
              : 'wrist-frame-soft w-full max-w-[440px] h-[520px] rounded-[36px] border border-[var(--border)] shadow-2xl relative overflow-hidden bg-[var(--bg)]'
        }
      >
        {isOffline && (
          <div
            className="wrist-offline-banner w-full text-center py-1 text-[12px] font-medium font-mono shrink-0 z-40"
            style={{ background: 'var(--danger)', color: 'var(--on-accent)' }}
          >
            {tf(t.wrist.offline, { n: dataAgeSeconds })}
          </div>
        )}

        {showFullscreenAlert && (
          <div
            className="absolute inset-0 z-50 flex flex-col justify-between p-5 text-center"
            style={{ background: 'var(--danger)', color: 'var(--on-accent)' }}
          >
            <div className="space-y-3 my-auto">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white/20 flex items-center justify-center">
                <LevelShape level={globalLevel} size={36} />
              </div>
              <div className="text-[26px] font-extrabold uppercase tracking-tight">{meta.globalTitle}</div>
              <p className="text-[15px] font-medium leading-snug">{t.wrist.alertBody}</p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setDismissedAlertLevel(globalLevel)
                  setScreen('avisar')
                }}
                className="w-full py-3 rounded-xl bg-white text-black text-[16px] font-bold cursor-pointer min-h-[46px] shadow-lg"
              >
                {t.wrist.notifyDoctor}
              </button>
              <button
                onClick={() => setDismissedAlertLevel(globalLevel)}
                className="w-full py-2 rounded-xl text-[13px] text-white/80 cursor-pointer"
              >
                {t.wrist.dismiss}
              </button>
            </div>
          </div>
        )}

        <div className="wrist-screen flex-1 min-h-0 overflow-hidden">{renderContent()}</div>

        <nav
          className="wrist-nav h-[54px] shrink-0 border-t flex items-center justify-around px-2 z-30"
          style={{ background: 'var(--surface-solid)', borderColor: 'var(--border)' }}
        >
          {(
            [
              ['estado', t.wrist.navEstado, '●'],
              ['signos', t.wrist.navSignos, '☵'],
              ['avisar', t.wrist.navAvisar, '▲'],
              ['rutina', t.wrist.navRutina, '★'],
              ['asistente', t.wrist.navIa, '✦'],
            ] as const
          ).map(([id, label, icon]) => (
            <button
              key={id}
              onClick={() => setScreen(id)}
              aria-label={label}
              className="p-2 text-[12px] font-medium cursor-pointer min-w-[44px] min-h-[44px] flex flex-col items-center justify-center"
              style={{
                color:
                  screen === id
                    ? id === 'avisar'
                      ? 'var(--danger)'
                      : 'var(--accent)'
                    : 'var(--text-muted)',
              }}
            >
              <span className="text-[16px]">{icon}</span>
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
