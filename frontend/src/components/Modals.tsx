import React from 'react'
import type { Indicator, Mission } from '../types'

interface NotifyModalProps {
  isOpen: boolean
  readiness: number
  onClose: () => void
  onConfirm: () => void
}

export const NotifyModal: React.FC<NotifyModalProps> = ({
  isOpen,
  readiness,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notify-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="vitalis-glass w-full max-w-md p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 id="notify-modal-title" className="text-[17px] font-bold">
            Aviso al Equipo Médico
          </h3>
          <button
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="w-9 h-9 rounded-lg border flex items-center justify-center cursor-pointer transition hover:opacity-80"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            ✕
          </button>
        </div>
        <p className="text-[15px]" style={{ color: 'var(--text-muted)' }}>
          Se enviará la instantánea actual de los 6 signos vitales y el registro de eventos al médico de vuelo mediante el enlace local a bordo.
        </p>
        <div
          className="p-3 rounded-xl border font-mono text-[14px] tabular-nums"
          style={{ background: 'var(--surface-data)', borderColor: 'var(--border)' }}
        >
          Perfil: A-01 · Día 42 · Preparación: <strong>{readiness}</strong>/100
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[12px] text-[14px] font-medium border cursor-pointer transition hover:bg-[var(--surface-hover)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-[12px] text-[14px] font-semibold cursor-pointer transition hover:opacity-90"
            style={{ background: 'var(--danger)', color: 'var(--on-accent)' }}
          >
            Confirmar envío
          </button>
        </div>
      </div>
    </div>
  )
}

interface MissionsModalProps {
  isOpen: boolean
  isSafetyActive: boolean
  missions: Mission[]
  xp: number
  onToggleMission: (id: string) => void
  onClose: () => void
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  isOpen,
  isSafetyActive,
  missions,
  xp,
  onToggleMission,
  onClose,
}) => {
  if (!isOpen) return null

  // 200 XP por nivel: Cadete -> Especialista -> Piloto -> Comandante
  const getRank = (xpVal: number) => {
    if (xpVal >= 600) return 'Comandante'
    if (xpVal >= 400) return 'Piloto'
    if (xpVal >= 200) return 'Especialista'
    return 'Cadete'
  }

  const currentLevelXp = xp % 200

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="missions-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="vitalis-glass w-full max-w-lg p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 id="missions-modal-title" className="text-[17px] font-bold">
              Rutinas diarias · A-01
            </h3>
            <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
              Posponer una rutina nunca resta progreso.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="w-9 h-9 rounded-lg border flex items-center justify-center cursor-pointer transition hover:opacity-80"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            ✕
          </button>
        </div>

        {isSafetyActive && (
          <div
            className="p-3 rounded-xl border text-[14px]"
            style={{
              background: 'var(--danger-bg)',
              borderColor: 'var(--danger)',
              color: 'var(--text)',
            }}
          >
            <strong>Seguridad activa:</strong> El ejercicio de resistencia está pausado hasta que tus signos vuelvan a tu rango habitual.
          </div>
        )}

        <div className="space-y-2">
          {missions.map((m) => {
            const locked = isSafetyActive && m.isExercise
            return (
              <div
                key={m.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                  locked ? 'opacity-50' : ''
                }`}
                style={{ background: 'var(--surface-data)', borderColor: 'var(--border)' }}
              >
                <div>
                  <div
                    className={`text-[15px] font-medium ${
                      m.done ? 'line-through opacity-70' : ''
                    }`}
                  >
                    {m.title}
                  </div>
                  <div className="font-mono text-[14px]" style={{ color: 'var(--text-muted)' }}>
                    {locked ? 'Pausado por seguridad' : `+${m.xp} XP`}
                  </div>
                </div>
                <button
                  disabled={locked}
                  onClick={() => onToggleMission(m.id)}
                  className="px-3 py-1.5 rounded-[12px] text-[14px] font-semibold border cursor-pointer transition hover:opacity-90 disabled:cursor-not-allowed"
                  style={{
                    background: m.done ? 'var(--accent)' : 'transparent',
                    borderColor: m.done ? 'var(--accent)' : 'var(--border)',
                    color: m.done ? 'var(--on-accent)' : 'var(--text)',
                  }}
                >
                  {m.done ? 'Completada' : 'Completar'}
                </button>
              </div>
            )
          })}
        </div>

        <div
          className="flex items-center justify-between pt-2 border-t text-[14px] font-mono"
          style={{ borderColor: 'var(--border)' }}
        >
          <span>
            Nivel: {getRank(xp)} · {currentLevelXp} / 200 XP
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[12px] font-sans font-semibold cursor-pointer transition hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}

interface IndicatorInfoModalProps {
  indicator: Indicator | null
  onClose: () => void
}

export const IndicatorInfoModal: React.FC<IndicatorInfoModalProps> = ({
  indicator,
  onClose,
}) => {
  if (!indicator) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="vitalis-glass w-full max-w-md p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 id="info-modal-title" className="text-[17px] font-bold">
            {indicator.astroName} ({indicator.rangeText} {indicator.unit})
          </h3>
          <button
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="w-9 h-9 rounded-lg border flex items-center justify-center cursor-pointer transition hover:opacity-80"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            ✕
          </button>
        </div>
        <div className="space-y-2.5 text-[15px]">
          <p>
            <strong>¿Qué mide?</strong> {indicator.whatMeasures}
          </p>
          <p>
            <strong>¿Cuándo avisar?</strong> {indicator.whenNotify}
          </p>
        </div>
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[12px] text-[14px] font-semibold cursor-pointer transition hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

interface ToastProps {
  message: string | null
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 vitalis-glass px-4 py-3 text-[14px] font-medium border-l-4 shadow-lg animate-in fade-in"
      style={{ borderLeftColor: 'var(--accent)' }}
    >
      {message}
    </div>
  )
}
