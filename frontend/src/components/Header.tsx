import React from 'react'
import type { Role, Surface } from '../types'
import type { LinkMode } from '../hooks/useTelemetry'
import type { VoiceProviderLabel } from '../voice/service'
import type { DataSourceMode } from './WatchDemoApp'
import { ScenarioSelector } from './ScenarioSelector'
import { LangSwitcher, useT } from '../i18n'

interface HeaderProps {
  role: Role
  onRoleChange: (role: Role) => void
  surface: Surface
  onSurfaceChange: (surface: Surface) => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  missionClock: string
  linkMode?: LinkMode
  scenarioId: string
  onSetScenario: (id: string) => Promise<void>
  dataSource: DataSourceMode
  onDataSourceChange: (mode: DataSourceMode) => void
  voiceMuted?: boolean
  voiceVolume?: number
  voiceProvider?: VoiceProviderLabel
  onToggleMute?: () => void
  onVolumeChange?: (v: number) => void
}

export const Header: React.FC<HeaderProps> = ({
  role,
  onRoleChange,
  surface,
  onSurfaceChange,
  theme,
  onToggleTheme,
  missionClock,
  linkMode = 'connecting',
  scenarioId,
  onSetScenario,
  dataSource,
  onDataSourceChange,
  voiceMuted = false,
  voiceVolume = 0.85,
  voiceProvider = 'unknown',
  onToggleMute,
  onVolumeChange,
}) => {
  const { t } = useT()
  const linkLabel =
    linkMode === 'live' ? t.link.live : linkMode === 'demo' ? t.link.demo : t.link.connecting
  const voiceStatus =
    voiceMuted || voiceProvider === 'muted'
      ? t.voice.statusMuted
      : voiceProvider === 'elevenlabs'
        ? t.voice.statusEleven
        : t.voice.statusBrowser
  const watchMode = dataSource === 'galaxy_watch'

  return (
    <header className="vitalis-glass px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center border shrink-0 overflow-hidden"
          style={{ borderColor: 'var(--border)', background: 'var(--pill-bg)' }}
          aria-hidden="true"
        >
          <img
            src="/assets/vitalis-logo.svg"
            alt={t.brand.logoAlt}
            className="w-7 h-7 object-contain"
            onError={(e) => {
              ;(e.target as HTMLElement).style.display = 'none'
            }}
          />
        </div>
        <div className="flex items-center gap-2 text-[16px] font-bold tracking-tight min-w-0">
          <span className="tracking-wide">{t.brand.name}</span>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <span className="font-mono text-[14px] truncate" style={{ color: 'var(--text-muted)' }}>
            {t.brand.crewDay}
          </span>
        </div>
      </div>

      <div
        role="tablist"
        aria-label={t.dataSource.label}
        className="p-1 rounded-[12px] flex items-center gap-1 border w-full sm:w-auto"
        style={{ background: 'var(--pill-bg)', borderColor: 'var(--border)' }}
      >
        <button
          role="tab"
          aria-selected={!watchMode}
          onClick={() => onDataSourceChange('simulator')}
          className="touch-target flex-1 sm:flex-none px-3 py-2 rounded-[10px] text-[13px] font-semibold transition cursor-pointer"
          style={{
            background: !watchMode ? 'var(--accent)' : 'transparent',
            color: !watchMode ? 'var(--on-accent)' : 'var(--text)',
          }}
        >
          {t.dataSource.simulator}
        </button>
        <button
          role="tab"
          aria-selected={watchMode}
          onClick={() => onDataSourceChange('galaxy_watch')}
          className="touch-target flex-1 sm:flex-none px-3 py-2 rounded-[10px] text-[13px] font-semibold transition cursor-pointer"
          style={{
            background: watchMode ? 'var(--accent)' : 'transparent',
            color: watchMode ? 'var(--on-accent)' : 'var(--text)',
          }}
        >
          {t.dataSource.galaxyWatch}
        </button>
      </div>

      {!watchMode && (
        <div
          role="tablist"
          aria-label={t.roles.tablist}
          className="p-1 rounded-[12px] flex items-center gap-1 border w-full sm:w-auto"
          style={{ background: 'var(--pill-bg)', borderColor: 'var(--border)' }}
        >
          <button
            role="tab"
            aria-selected={role === 'medico'}
            onClick={() => onRoleChange('medico')}
            className="touch-target flex-1 sm:flex-none px-4 py-2 rounded-[10px] text-[14px] font-semibold transition cursor-pointer"
            style={{
              background: role === 'medico' ? 'var(--accent)' : 'transparent',
              color: role === 'medico' ? 'var(--on-accent)' : 'var(--text)',
            }}
          >
            {t.roles.medico}
          </button>
          <button
            role="tab"
            aria-selected={role === 'astronauta'}
            onClick={() => onRoleChange('astronauta')}
            className="touch-target flex-1 sm:flex-none px-4 py-2 rounded-[10px] text-[14px] font-semibold transition cursor-pointer"
            style={{
              background: role === 'astronauta' ? 'var(--accent)' : 'transparent',
              color: role === 'astronauta' ? 'var(--on-accent)' : 'var(--text)',
            }}
          >
            {t.roles.astronauta}
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
        <div className="font-mono tabular-nums text-[14px] flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
          <span className="font-label text-[12px]">{linkLabel}</span>
          <span>·</span>
          <span className="font-data" style={{ color: 'var(--text)' }}>
            {missionClock}
          </span>
        </div>

        {!watchMode && <ScenarioSelector current={scenarioId} onSelect={onSetScenario} />}

        <LangSwitcher />

        {onToggleMute && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-[12px] border"
            style={{ background: 'var(--pill-bg)', borderColor: 'var(--border)' }}
          >
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={voiceMuted ? t.voice.unmute : t.voice.mute}
              title={voiceMuted ? t.voice.unmute : t.voice.mute}
              className="touch-target w-9 h-9 rounded-[8px] flex items-center justify-center cursor-pointer"
              style={{ color: 'var(--text)' }}
            >
              {voiceMuted ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path strokeLinecap="round" d="M23 9l-6 6M17 9l6 6" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path strokeLinecap="round" d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                </svg>
              )}
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
                className="w-16 accent-[var(--accent)]"
                disabled={voiceMuted}
              />
            )}
            <span className="font-mono text-[11px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
              {voiceStatus}
            </span>
          </div>
        )}

        {!watchMode && (
          <div
            className="p-1 rounded-[12px] flex items-center gap-0.5 border"
            style={{ background: 'var(--pill-bg)', borderColor: 'var(--border)' }}
            title={t.surfaces.title}
          >
            <button
              onClick={() => onSurfaceChange('panel')}
              className="touch-target px-3 py-2 rounded-[8px] text-[13px] font-medium cursor-pointer transition"
              style={{
                background: surface === 'panel' ? 'var(--accent)' : 'transparent',
                color: surface === 'panel' ? 'var(--on-accent)' : 'var(--text)',
              }}
            >
              {t.surfaces.panel}
            </button>
            <button
              onClick={() => onSurfaceChange('wrist')}
              className="touch-target px-3 py-2 rounded-[8px] text-[13px] font-medium cursor-pointer transition"
              style={{
                background: surface === 'wrist' ? 'var(--accent)' : 'transparent',
                color: surface === 'wrist' ? 'var(--on-accent)' : 'var(--text)',
              }}
            >
              {t.surfaces.wrist}
            </button>
          </div>
        )}

        <button
          onClick={onToggleTheme}
          aria-label={t.theme.toggle}
          title={t.theme.title}
          className="touch-target w-11 h-11 rounded-[12px] border flex items-center justify-center transition cursor-pointer hover:bg-[var(--surface-hover)]"
          style={{
            background: 'var(--pill-bg)',
            borderColor: 'var(--border)',
            color: 'var(--text)',
          }}
        >
          {theme === 'dark' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="4" />
              <path
                strokeLinecap="round"
                d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  )
}
