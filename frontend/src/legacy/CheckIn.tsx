import { useState, type FormEvent } from 'react'
import { api } from '../api'
import type { Checkin } from '../types'

const MOODS = ['Very low', 'Low', 'Okay', 'Good', 'Great']

interface Props {
  checkins: Checkin[]
  onSaved: () => void
}

export function CheckIn({ checkins, onSaved }: Props) {
  const [mood, setMood] = useState(3)
  const [sleep, setSleep] = useState('7')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const hours = Number(sleep)
    if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
      setMessage('Enter sleep hours between 0 and 24.')
      return
    }
    setBusy(true)
    try {
      await api.postCheckin(mood, hours, note.trim())
      setNote('')
      setMessage('Check-in saved.')
      onSaved()
    } catch {
      setMessage('Could not save. The backend is not reachable.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card" aria-label="Daily check-in">
      <h2>Daily check-in</h2>
      <form onSubmit={submit}>
        <fieldset className="mood">
          <legend>How is your mood?</legend>
          <div className="mood-row">
            {MOODS.map((label, i) => (
              <button
                key={label}
                type="button"
                className="mood-btn num"
                aria-pressed={mood === i + 1}
                aria-label={`${i + 1}, ${label}`}
                onClick={() => setMood(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mood-scale muted" aria-hidden="true">
            <span>Very low</span>
            <span>Great</span>
          </div>
        </fieldset>
        <label className="field">
          <span>Hours of sleep</span>
          <input className="num" type="number" inputMode="decimal" min="0" max="24" step="0.5" value={sleep} onChange={(e) => setSleep(e.target.value)} />
        </label>
        <label className="field">
          <span>Note (optional)</span>
          <input type="text" maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Save check-in
        </button>
        <p className="muted form-message" role="status">
          {message}
        </p>
      </form>
      {checkins.length > 0 && (
        <>
          <h3>Recent check-ins</h3>
          <ul className="checkins">
            {checkins.slice(0, 3).map((c) => (
              <li key={c.id}>
                <span className="num">{new Date(c.t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                <span className="num">
                  Mood {c.mood} of 5 · {c.sleep_hours} h sleep
                </span>
                {c.note && <span className="muted">{c.note}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
