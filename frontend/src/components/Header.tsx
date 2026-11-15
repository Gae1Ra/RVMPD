import React from 'react'
import type { Role, SimPhase, Surface } from '../types'

interface HeaderProps {
  role: Role
  onRoleChange: (role: Role) => void
  surface: Surface
  onSurfaceChange: (surface: Surface) => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  missionClock: string
  simPhase: SimPhase
  onCycleSim: () => void
}

export const Header: React.FC<HeaderProps> = ({
  role,
  onRoleChange,
  surface,
  onSurfaceChange,
  theme,
  onToggleTheme,
  missionClock,
  simPhase,
  onCycleSim,
}) => {
  const getSimBtnStyle = () => {
    if (simPhase === 'rising') {
      return {
        text: 'Simular recuperación',
        borderColor: 'var(--red)',
        color: 'var(--red)',
      }
    }
    if (simPhase === 'recovering') {
      return {
        text: 'Detener simulación',
        borderColor: 'var(--amber)',
        color: 'var(--amber)',
      }
    }
    return {
      text: 'Simular evento',
      borderColor: 'var(--line)',
      color: 'var(--text)',
    }
  }

  const simBtn = getSimBtnStyle()

  return (
    <header className="vitalis-glass px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      {/* Izquierda: Identidad VITALIS */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center border shrink-0 overflow-hidden"
          style={{ borderColor: 'var(--line)', background: 'var(--pill-bg)' }}
          aria-hidden="true"
        >
          {/* Logo VITALIS */}
          <img
            src="/assets/vitalis-logo.svg"
            alt="VITALIS Logo"
            className="w-6 h-6 object-contain"
            onError={(e) => {
              // fallback if svg fails
              ;(e.target as HTMLElement).style.display = 'none'
            }}
          />
        </div>
        <div className="flex items-center gap-2 text-[15px] sm:text-[16px] font-semibold tracking-tight">
          <span>VITALIS</span>
          <span style={{ color: 'var(--text2)' }}>·</span>
          <span className="font-mono text-[14px] sm:text-[15px]" style={{ color: 'var(--text2)' }}>
            A-01 · DÍA 42
          </span>
        </div>
      </div>

      {/* Centro: Conmutador de Rol (Médico | Astronauta) */}
      <div
        role="tablist"
        aria-label="Selector de rol"
        className="p-1 rounded-[12px] flex items-center gap-1 border"
        style={{ background: 'var(--pill-bg)', borderColor: 'var(--line)' }}
      >
        <button
          role="tab"
          aria-selected={role === 'medico'}
          onClick={() => onRoleChange('medico')}
          className="px-4 py-1.5 rounded-[10px] text-[14px] font-semibold transition cursor-pointer"
          style={{
            background: role === 'medico' ? 'var(--pill-active)' : 'transparent',
            color: 'var(--text)',
          }}
        >
          Médico
        </button>
        <button
          role="tab"
          aria-selected={role === 'astronauta'}
          onClick={() => onRoleChange('astronauta')}
          className="px-4 py-1.5 rounded-[10px] text-[14px] font-semibold transition cursor-pointer"
          style={{
            background: role === 'astronauta' ? 'var(--pill-active)' : 'transparent',
            color: 'var(--text)',
          }}
        >
          Astronauta
        </button>
      </div>

      {/* Derecha: Simulado · Reloj MET, Simular Evento, Selector de Superficie y Tema */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="font-mono tabular-nums text-[14px] flex items-center gap-1.5" style={{ color: 'var(--text2)' }}>
          <span>Simulado</span>
          <span>·</span>
          <span className="font-medium" style={{ color: 'var(--text)' }}>
            {missionClock}
          </span>
        </div>

        {/* Botón Simular Evento (Cicla: Nominal -> Evento Crítico -> Recuperación) */}
        <button
          onClick={onCycleSim}
          className="px-3.5 py-2 rounded-[11px] text-[14px] font-medium border transition cursor-pointer"
          style={{
            background: 'var(--pill-bg)',
            borderColor: simBtn.borderColor,
            color: simBtn.color,
          }}
        >
          {simBtn.text}
        </button>

        {/* Selector de Superficie: Panel | Muñeca */}
        <div
          className="p-1 rounded-[11px] flex items-center gap-0.5 border"
          style={{ background: 'var(--pill-bg)', borderColor: 'var(--line)' }}
          title="Alternar entre Panel Unificado (1280px) y Reloj de Muñeca"
        >
          <button
            onClick={() => onSurfaceChange('panel')}
            className="px-2.5 py-1 rounded-[8px] text-[13px] font-medium cursor-pointer transition"
            style={{
              background: surface === 'panel' ? 'var(--pill-active)' : 'transparent',
              color: 'var(--text)',
            }}
          >
            Panel
          </button>
          <button
            onClick={() => onSurfaceChange('wrist')}
            className="px-2.5 py-1 rounded-[8px] text-[13px] font-medium cursor-pointer transition"
            style={{
              background: surface === 'wrist' ? 'var(--pill-active)' : 'transparent',
              color: 'var(--text)',
            }}
          >
            Muñeca
          </button>
        </div>

        {/* Botón Manual de Tema Claro / Oscuro */}
        <button
          onClick={onToggleTheme}
          aria-label="Cambiar tema claro u oscuro"
          title="Alternar tema oscuro / claro"
          className="w-10 h-10 rounded-[11px] border flex items-center justify-center transition cursor-pointer"
          style={{
            background: 'var(--pill-bg)',
            borderColor: 'var(--line)',
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
