import { STATUS_WORD } from '../meta'
import type { Status } from '../types'

export type Tone = Status | 'none'

// A different shape per status so meaning never depends on colour alone.
export function StatusIcon({ tone, size = 16 }: { tone: Tone; size?: number }) {
  return (
    <svg className={`tone-${tone}`} width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {tone === 'green' && (
        <>
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4.8 8.2l2.2 2.2 4.2-4.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </>
      )}
      {tone === 'amber' && (
        <>
          <path d="M8 1.5L15 14H1z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8 6v4M8 11.6v.4" stroke="currentColor" strokeWidth="1.8" />
        </>
      )}
      {tone === 'red' && (
        <>
          <path d="M8 1L15 8L8 15L1 8z" fill="currentColor" />
          <path d="M8 4.6v4M8 10.2v.4" stroke="#0A0E14" strokeWidth="1.8" />
        </>
      )}
      {tone === 'none' && <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 2" />}
    </svg>
  )
}

export function StatusBadge({ tone, label }: { tone: Tone; label?: string }) {
  return (
    <span className={`status-badge tone-${tone}`}>
      <StatusIcon tone={tone} />
      <span>{label ?? (tone === 'none' ? 'Sensor check' : STATUS_WORD[tone])}</span>
    </span>
  )
}
