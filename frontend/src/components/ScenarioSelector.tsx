import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { MOCK_SCENARIOS } from '../mock'
import type { Scenario } from '../types'
import { useT } from '../i18n'

interface ScenarioSelectorProps {
  current: string
  onSelect: (id: string) => Promise<void>
}

const DEMO_IDS = ['solar_particle_event', 'hypoxia', 'loose_electrode', 'fatigue'] as const

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({ current, onSelect }) => {
  const { t } = useT()
  const [scenarios, setScenarios] = useState<Scenario[]>(MOCK_SCENARIOS)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.scenarios().then(setScenarios).catch(() => setScenarios(MOCK_SCENARIOS))
  }, [])

  const choose = async (id: string) => {
    setBusy(true)
    try {
      await onSelect(id)
      setError('')
    } catch {
      setError(t.scenarios.fail)
    } finally {
      setBusy(false)
    }
  }

  const visible = scenarios.filter((s) => s.id === 'nominal' || (DEMO_IDS as readonly string[]).includes(s.id))

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((s) => (
        <button
          key={s.id}
          type="button"
          disabled={busy}
          title={s.description}
          onClick={() => choose(s.id)}
          className="touch-target px-3 py-2 rounded-[10px] text-[12px] font-medium border transition cursor-pointer disabled:opacity-60"
          style={{
            background: current === s.id ? 'var(--accent)' : 'var(--pill-bg)',
            borderColor: current === s.id ? 'var(--accent)' : 'var(--border)',
            color: current === s.id ? 'var(--on-accent)' : 'var(--text)',
          }}
        >
          {s.name}
        </button>
      ))}
      {error && (
        <span className="text-[12px]" style={{ color: 'var(--danger)' }} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
