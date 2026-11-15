import React, { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api'
import type { Checkin } from '../types'
import { useT } from '../i18n'

const MOODS = [1, 2, 3, 4, 5] as const

interface CheckInPanelProps {
  onToast: (msg: string) => void
}

export const CheckInPanel: React.FC<CheckInPanelProps> = ({ onToast }) => {
  const { t, tf } = useT()
  const [mood, setMood] = useState(3)
  const [sleep, setSleep] = useState('7')
  const [note, setNote] = useState('')
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [busy, setBusy] = useState(false)

  const reload = () => {
    api.checkins().then(setCheckins).catch(() => setCheckins([]))
  }

  useEffect(() => {
    reload()
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const hours = Number(sleep)
    if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
      onToast(t.checkin.badSleep)
      return
    }
    setBusy(true)
    try {
      await api.postCheckin(mood, hours, note.trim())
      setNote('')
      reload()
      onToast(t.checkin.saved)
    } catch {
      onToast(t.checkin.fail)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="vitalis-surface p-4 flex flex-col gap-3" aria-label={t.checkin.title}>
      <h2 className="text-[16px] font-semibold">{t.checkin.title}</h2>
      <form onSubmit={submit} className="space-y-3">
        <fieldset>
          <legend className="text-[13px] mb-1.5" style={{ color: 'var(--text-muted)' }}>
            {t.checkin.mood}
          </legend>
          <div className="flex gap-1.5">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mood === m}
                onClick={() => setMood(m)}
                className="touch-target w-11 h-11 rounded-[10px] text-[14px] font-mono font-semibold border cursor-pointer"
                style={{
                  background: mood === m ? 'var(--accent)' : 'var(--pill-bg)',
                  borderColor: 'var(--border)',
                  color: mood === m ? 'var(--on-accent)' : 'var(--text)',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="block text-[13px]" style={{ color: 'var(--text-muted)' }}>
          {t.checkin.sleep}
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={sleep}
            onChange={(e) => setSleep(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-[12px] text-[14px] border bg-transparent font-mono"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </label>
        <label className="block text-[13px]" style={{ color: 'var(--text-muted)' }}>
          {t.checkin.note}
          <input
            type="text"
            maxLength={280}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-[12px] text-[14px] border bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded-[12px] text-[14px] font-semibold cursor-pointer disabled:opacity-60"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          {t.checkin.save}
        </button>
      </form>
      {checkins[0] && (
        <p className="text-[13px] font-mono" style={{ color: 'var(--text-muted)' }}>
          {tf(t.checkin.last, { mood: checkins[0].mood, sleep: checkins[0].sleep_hours })}
          {checkins[0].note ? ` · ${checkins[0].note}` : ''}
        </p>
      )}
    </section>
  )
}
