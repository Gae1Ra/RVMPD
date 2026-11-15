import { useState } from 'react'

const TASKS = ['Morning vitals check', '30 min resistance exercise', 'Hydration: 2 L', 'Log your sleep']
const STORAGE_KEY = 'vitalis.tasks'
const KEEP_DAYS = 60

type Days = Record<string, boolean[]>

const dayKey = (d: Date) => d.toLocaleDateString('en-CA') // local YYYY-MM-DD

function load(): Days {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Days) : {}
  } catch {
    return {}
  }
}

function save(days: Days) {
  try {
    const keep = Object.keys(days).sort().slice(-KEEP_DAYS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(keep.map((k) => [k, days[k]]))))
  } catch {
    // storage may be blocked; progress then lasts only for this session
  }
}

const isComplete = (done?: boolean[]) => !!done && done.length === TASKS.length && done.every(Boolean)

function streak(days: Days) {
  const cursor = new Date()
  // Today still being in progress must not break a streak that ran through yesterday.
  if (!isComplete(days[dayKey(cursor)])) cursor.setDate(cursor.getDate() - 1)
  let count = 0
  while (isComplete(days[dayKey(cursor)])) {
    count++
    cursor.setDate(cursor.getDate() - 1)
  }
  return count
}

export function Tasks() {
  const [days, setDays] = useState<Days>(load)
  const today = dayKey(new Date())
  const done = days[today] ?? TASKS.map(() => false)
  const count = done.filter(Boolean).length
  const streakDays = streak(days)

  const toggle = (i: number) => {
    const next = { ...days, [today]: done.map((d, j) => (j === i ? !d : d)) }
    setDays(next)
    save(next)
  }

  return (
    <section className="card" aria-label="Today's tasks">
      <div className="tasks-head">
        <h2>Today's tasks</h2>
        <span className="num muted">
          {streakDays} day streak
        </span>
      </div>
      <ul className="tasks">
        {TASKS.map((task, i) => (
          <li key={task}>
            <label className="task">
              <input type="checkbox" checked={done[i]} onChange={() => toggle(i)} />
              <span>{task}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={TASKS.length} aria-valuenow={count} aria-label="Tasks done today">
        <div className="progress-fill" style={{ width: `${(count / TASKS.length) * 100}%` }} />
      </div>
      <p className="muted num">
        {count} of {TASKS.length} done
      </p>
    </section>
  )
}
