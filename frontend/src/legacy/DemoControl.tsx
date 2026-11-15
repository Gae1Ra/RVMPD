import { useEffect, useState } from 'react'
import { api } from '../api'
import { MOCK_SCENARIOS } from '../mock'
import type { Scenario } from '../types'

interface Props {
  current: string
  onSelect: (id: string) => Promise<void>
}

export function DemoControl({ current, onSelect }: Props) {
  const [scenarios, setScenarios] = useState<Scenario[]>(MOCK_SCENARIOS)
  const [error, setError] = useState('')

  useEffect(() => {
    api.scenarios().then(setScenarios).catch(() => setScenarios(MOCK_SCENARIOS))
  }, [])

  const choose = async (id: string) => {
    try {
      await onSelect(id)
      setError('')
    } catch {
      setError('Could not switch scenario. The backend is not reachable.')
    }
  }

  const active = scenarios.find((s) => s.id === current)
  return (
    <section className="demo" aria-label="Demo control">
      <h2>Demo control</h2>
      <p className="muted">For judges only. This is not part of the astronaut interface.</p>
      <div className="scenarios" role="group" aria-label="Scenario">
        {scenarios.map((s) => (
          <button key={s.id} type="button" aria-pressed={s.id === current} onClick={() => choose(s.id)}>
            {s.name}
          </button>
        ))}
      </div>
      {active && <p className="muted">{active.description}</p>}
      {error && <p className="demo-error" role="alert">{error}</p>}
    </section>
  )
}
