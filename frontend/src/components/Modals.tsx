import React from 'react'
import type { Indicator, Mission } from '../types'
import { useT } from '../i18n'

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
  const { t, tf } = useT()
  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notify-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div className="vitalis-glass w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 id="notify-modal-title" className="text-[17px] font-bold">
            {t.notify.title}
          </h3>
          <button
            onClick={onClose}
            aria-label={t.notify.close}
            className="w-9 h-9 rounded-lg border flex items-center justify-center cursor-pointer transition hover:opacity-80"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            ✕
          </button>
        </div>
        <p className="text-[15px]" style={{ color: 'var(--text-muted)' }}>
          {t.notify.body}
        </p>
        <div
          className="p-3 rounded-xl border font-mono text-[14px] tabular-nums"
          style={{ background: 'var(--surface-data)', borderColor: 'var(--border)' }}
        >
          {tf(t.notify.profile, { n: readiness })}
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[12px] text-[14px] font-medium border cursor-pointer transition hover:bg-[var(--surface-hover)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            {t.notify.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-[12px] text-[14px] font-semibold cursor-pointer transition hover:opacity-90"
            style={{ background: 'var(--danger)', color: 'var(--on-accent)' }}
          >
            {t.notify.confirm}
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
  const { t, tf } = useT()
  if (!isOpen) return null

  const getRank = (xpVal: number) => {
    if (xpVal >= 600) return t.missions.ranks.comandante
    if (xpVal >= 400) return t.missions.ranks.piloto
    if (xpVal >= 200) return t.missions.ranks.especialista
    return t.missions.ranks.cadete
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
      <div className="vitalis-glass w-full max-w-lg p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 id="missions-modal-title" className="text-[17px] font-bold">
              {t.missions.modalTitle}
            </h3>
            <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
              {t.missions.postponeNote}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t.notify.close}
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
            <strong>{t.missions.safety}</strong>
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
                  <div className={`text-[15px] font-medium ${m.done ? 'line-through opacity-70' : ''}`}>
                    {m.title}
                  </div>
                  <div className="font-mono text-[14px]" style={{ color: 'var(--text-muted)' }}>
                    {locked ? t.missions.paused : `+${m.xp} XP`}
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
                  {m.done ? t.missions.done : t.missions.complete}
                </button>
              </div>
            )
          })}
        </div>

        <div
          className="flex items-center justify-between pt-2 border-t text-[14px] font-mono"
          style={{ borderColor: 'var(--border)' }}
        >
          <span>{tf(t.missions.level, { rank: getRank(xp), xp: currentLevelXp })}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[12px] font-sans font-semibold cursor-pointer transition hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            {t.missions.ready}
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

export const IndicatorInfoModal: React.FC<IndicatorInfoModalProps> = ({ indicator, onClose }) => {
  const { t } = useT()
  if (!indicator) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div className="vitalis-glass w-full max-w-md p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 id="info-modal-title" className="text-[17px] font-bold">
            {indicator.astroName} ({indicator.rangeText} {indicator.unit})
          </h3>
          <button
            onClick={onClose}
            aria-label={t.notify.close}
            className="w-9 h-9 rounded-lg border flex items-center justify-center cursor-pointer transition hover:opacity-80"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            ✕
          </button>
        </div>
        <div className="space-y-2.5 text-[15px]">
          <p>
            <strong>{t.info.what}</strong> {indicator.whatMeasures}
          </p>
          <p>
            <strong>{t.info.when}</strong> {indicator.whenNotify}
          </p>
        </div>
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[12px] text-[14px] font-semibold cursor-pointer transition hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            {t.info.understood}
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
