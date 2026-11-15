import { useEffect, useState } from 'react'
import { api } from '../api'
import type { AnalysisReport, Likelihood } from '../types'
import { StatusIcon, type Tone } from './Status'

const PERIODS = [
  { minutes: 15, label: '15 min' },
  { minutes: 60, label: '1 hour' },
  { minutes: 360, label: '6 hours' },
  { minutes: 1440, label: '24 hours' },
]

const LIKELIHOOD: Record<Likelihood, { tone: Tone; word: string }> = {
  low: { tone: 'green', word: 'Low' },
  medium: { tone: 'amber', word: 'Medium' },
  high: { tone: 'red', word: 'High' },
}

function Report({ report }: { report: AnalysisReport }) {
  const source = report.engine === 'llm' ? `AI model${report.model ? ` (${report.model})` : ''}` : 'On-board engine'
  return (
    <div className="insights-report">
      <p>{report.summary}</p>
      {report.findings.length === 0 ? (
        <p className="insight-calm">
          <StatusIcon tone="green" /> Nothing unusual found
        </p>
      ) : (
        <ul className="findings">
          {report.findings.map((f) => {
            const l = LIKELIHOOD[f.likelihood]
            return (
              <li key={f.condition} className="finding">
                <div className="finding-head">
                  <h3>{f.condition}</h3>
                  <span className={`chip likelihood tone-${l.tone}`}>
                    <StatusIcon tone={l.tone} size={14} /> {l.word} likelihood
                  </span>
                </div>
                <ul className="evidence">
                  {f.evidence.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
                <p className="finding-action">
                  <strong>What to do:</strong> {f.action}
                </p>
              </li>
            )
          })}
        </ul>
      )}
      {report.facts.length > 0 && (
        <div>
          <h4>Facts from your data</h4>
          <ul className="evidence">
            {report.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="muted insights-foot">
        Ran {new Date(report.t).toLocaleString()} on the last {report.window_minutes} min, using{' '}
        {report.data_points.toLocaleString()} data points. Source: {source}. {report.disclaimer}
      </p>
    </div>
  )
}

export function Insights() {
  const [minutes, setMinutes] = useState(60)
  const [report, setReport] = useState<AnalysisReport | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .latestAnalysis()
      .then((r) => !cancelled && setReport(r))
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoaded(true))
    return () => {
      cancelled = true
    }
  }, [])

  const analyze = async () => {
    setBusy(true)
    try {
      setReport(await api.analyze(minutes))
      setError(false)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card" aria-label="Health insights" aria-busy={busy}>
      <h2>Health insights</h2>
      <div className="insights-controls">
        <label>
          <span className="muted">Period </span>
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} disabled={busy}>
            {PERIODS.map((p) => (
              <option key={p.minutes} value={p.minutes}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-primary" onClick={analyze} disabled={busy}>
          {busy ? 'Analyzing…' : 'Analyze my data'}
        </button>
      </div>
      {error && (
        <p className="insights-error" role="alert">
          Could not reach the analysis service. Check the connection and try again.{' '}
          <button type="button" className="btn" onClick={analyze} disabled={busy}>
            Retry
          </button>
        </p>
      )}
      {report ? (
        <Report report={report} />
      ) : (
        loaded && !error && <p className="muted">No report yet. Choose a period and run your first analysis.</p>
      )}
      {!loaded && !error && <p className="muted">Loading…</p>}
    </section>
  )
}
