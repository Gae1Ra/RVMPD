import React from 'react'
import type { Role, Surface } from '../types'
import type { LinkMode } from '../hooks/useTelemetry'
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
}) => {
  const { t } = useT()
  const linkLabel =
    linkMode === 'live' ? t.link.live : linkMode === 'demo' ? t.link.demo : t.link.connecting

  return (
    <header className="vitalis-glass px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
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
        <div className="flex items-center gap-2 text-[16px] font-bold tracking-tight">
          <span className="tracking-wide">{t.brand.name}</span>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <span className="font-mono text-[14px]" style={{ color: 'var(--text-muted)' }}>
            {t.brand.crewDay}
          </span>
        </div>
      </div>

      <div
        role="tablist"
        aria-label={t.roles.tablist}
        className="p-1 rounded-[12px] flex items-center gap-1 border"
        style={{ background: 'var(--pill-bg)', borderColor: 'var(--border)' }}
      >
        <button
          role="tab"
          aria-selected={role === 'medico'}
          onClick={() => onRoleChange('medico')}
          className="px-4 py-1.5 rounded-[10px] text-[14px] font-semibold transition cursor-pointer"
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
          className="px-4 py-1.5 rounded-[10px] text-[14px] font-semibold transition cursor-pointer"
          style={{
            background: role === 'astronauta' ? 'var(--accent)' : 'transparent',
            color: role === 'astronauta' ? 'var(--on-accent)' : 'var(--text)',
          }}
        >
          {t.roles.astronauta}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="font-mono tabular-nums text-[14px] flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
          <span className="font-label text-[12px]">{linkLabel}</span>
          <span>·</span>
          <span className="font-data" style={{ color: 'var(--text)' }}>
            {missionClock}
          </span>
        </div>

        <ScenarioSelector current={scenarioId} onSelect={onSetScenario} />

        <LangSwitcher />

        <div
          className="p-1 rounded-[12px] flex items-center gap-0.5 border"
          style={{ background: 'var(--pill-bg)', borderColor: 'var(--border)' }}
          title={t.surfaces.title}
        >
          <button
            onClick={() => onSurfaceChange('panel')}
            className="px-2.5 py-1 rounded-[8px] text-[13px] font-medium cursor-pointer transition"
            style={{
              background: surface === 'panel' ? 'var(--accent)' : 'transparent',
              color: surface === 'panel' ? 'var(--on-accent)' : 'var(--text)',
            }}
          >
            {t.surfaces.panel}
          </button>
          <button
            onClick={() => onSurfaceChange('wrist')}
            className="px-2.5 py-1 rounded-[8px] text-[13px] font-medium cursor-pointer transition"
            style={{
              background: surface === 'wrist' ? 'var(--accent)' : 'transparent',
              color: surface === 'wrist' ? 'var(--on-accent)' : 'var(--text)',
            }}
          >
            {t.surfaces.wrist}
          </button>
        </div>

        <button
          onClick={onToggleTheme}
          aria-label={t.theme.toggle}
          title={t.theme.title}
          className="w-10 h-10 rounded-[12px] border flex items-center justify-center transition cursor-pointer hover:bg-[var(--surface-hover)]"
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
