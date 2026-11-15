import React, { useEffect, useState } from 'react'
import { api } from '../api'
import type { AnalysisReport } from '../types'
import { useT } from '../i18n'

interface AnalysisPanelProps {
  onToast: (msg: string) => void
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ onToast }) => {
  const { t } = useT()
  const [minutes, setMinutes] = useState(60)
  const [report, setReport] = useState<AnalysisReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const PERIODS = [
    { minutes: 15, label: t.analysis.periods.m15 },
    { minutes: 60, label: t.analysis.periods.h1 },
    { minutes: 360, label: t.analysis.periods.h6 },
    { minutes: 1440, label: t.analysis.periods.h24 },
  ]

  useEffect(() => {
    let cancelled = false
    api
      .latestAnalysis()
      .then((r) => {
        if (!cancelled) setReport(r)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const analyze = async () => {
    setBusy(true)
    try {
      setReport(await api.analyze(minutes))
      setError(false)
      onToast(t.analysis.done)
    } catch {
      setError(true)
      onToast(t.analysis.fail)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="vitalis-surface p-4 flex flex-col gap-3" aria-label={t.analysis.title} aria-busy={busy}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[16px] font-semibold">{t.analysis.title}</h2>
        <div className="flex items-center gap-2">
          <select
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            disabled={busy}
            className="touch-target px-2 py-2 rounded-[10px] text-[13px] border bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            {PERIODS.map((p) => (
              <option key={p.minutes} value={p.minutes}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={analyze}
            disabled={busy}
            className="touch-target px-3.5 py-2 rounded-[12px] text-[14px] font-semibold cursor-pointer disabled:opacity-60"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            {busy ? t.analysis.analyzing : t.analysis.button}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[14px]" style={{ color: 'var(--danger)' }} role="alert">
          {t.analysis.error}
        </p>
      )}

      {report ? (
        <div className="space-y-2 text-[14px]">
          <p className="leading-relaxed">{report.summary}</p>
          {report.findings.map((f) => (
            <div
              key={f.condition}
              className="p-3 rounded-xl border space-y-1"
              style={{ background: 'var(--surface-data)', borderColor: 'var(--border)' }}
            >
              <div className="font-semibold flex flex-wrap items-center justify-between gap-2">
                <span>{f.condition}</span>
                <span className="font-mono text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {f.likelihood}
                </span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5" style={{ color: 'var(--text-muted)' }}>
                {f.evidence.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
              <p>
                <strong>{t.analysis.whatToDo}</strong> {f.action}
              </p>
            </div>
          ))}
          {report.facts.length > 0 && (
            <ul className="list-disc pl-4 space-y-0.5" style={{ color: 'var(--text-muted)' }}>
              {report.facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
          <p className="text-[12px] font-mono" style={{ color: 'var(--text-muted)' }}>
            {report.disclaimer} · {report.engine}
            {report.model ? ` (${report.model})` : ''} · {report.data_points}
          </p>
        </div>
      ) : (
        !error && (
          <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
            {t.analysis.empty}
          </p>
        )
      )}
    </section>
  )
}
