import React, { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Dictionary } from '../i18n/es'
import type { Frame, MedicalInsight, RiskLevel } from '../types'
import { useT } from '../i18n'

interface MedicalAiPanelProps {
  frame: Frame | null
  onToast: (msg: string) => void
}

function riskColor(level: RiskLevel): string {
  if (level === 'high') return 'var(--danger)'
  if (level === 'medium') return 'var(--status-watch)'
  return 'var(--accent)'
}

function providerLabel(kind: string, t: Dictionary): string {
  if (kind === 'flag-off') return t.medicalAi.providerOff
  if (kind === 'offline') return t.medicalAi.providerOffline
  if (kind === 'mock') return t.medicalAi.providerMock
  if (kind === 'bedrock') return t.medicalAi.providerBedrock
  if (!kind) return t.medicalAi.providerUnknown
  return kind
}

export const MedicalAiPanel: React.FC<MedicalAiPanelProps> = ({ frame, onToast }) => {
  const { t } = useT()
  const [insight, setInsight] = useState<MedicalInsight | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [providerKind, setProviderKind] = useState('')
  const lastAutoKey = useRef('')

  useEffect(() => {
    let cancelled = false
    api
      .medicalAiStatus()
      .then((s) => {
        if (!cancelled) setProviderKind(s.enabled ? s.provider : 'flag-off')
      })
      .catch(() => {
        if (!cancelled) setProviderKind('offline')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const requestInsight = useCallback(
    async (force: boolean, silent = false) => {
      setBusy(true)
      try {
        const body = frame
          ? {
              force,
              hr: frame.vitals.hr?.value,
              spo2: frame.vitals.spo2?.value,
              temp: frame.vitals.temp?.value,
              resp_rate: frame.vitals.resp_rate?.value,
              hrv_rmssd: frame.vitals.hrv_rmssd?.value,
              bp_sys: frame.vitals.bp_sys?.value,
              scenario: frame.scenario,
              global_status: frame.global.status,
              alert_titles: frame.alerts
                .filter((a) => a.origin === 'physiological')
                .map((a) => a.title),
            }
          : { force: true }
        const result = await api.medicalInsight(body)
        setInsight(result)
        setError(false)
        if (!silent) {
          onToast(
            result.invoked
              ? t.medicalAi.toastInvoked
              : result.anomaly_detected
                ? t.medicalAi.toastIdle
                : t.medicalAi.toastNominal,
          )
        }
      } catch {
        setError(true)
        if (!silent) onToast(t.medicalAi.fail)
      } finally {
        setBusy(false)
      }
    },
    [frame, onToast, t],
  )

  // Auto-consult once per anomaly signature (scenario + alert ids + global status).
  useEffect(() => {
    if (!frame) return
    const anomalous =
      frame.global.status !== 'green' ||
      frame.alerts.some((a) => a.origin === 'physiological')
    if (!anomalous) return
    const key = `${frame.scenario}|${frame.global.status}|${frame.alerts.map((a) => a.id).join(',')}`
    if (key === lastAutoKey.current) return
    lastAutoKey.current = key
    const timer = window.setTimeout(() => {
      void requestInsight(false, true)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [frame, requestInsight])

  return (
    <section
      className="vitalis-surface p-4 flex flex-col gap-3 medical-ai-panel"
      aria-label={t.medicalAi.title}
      aria-busy={busy}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-[16px] font-semibold truncate">{t.medicalAi.title}</h2>
          <span
            className="font-label text-[11px] px-2 py-0.5 rounded-lg border shrink-0"
            style={{
              background: 'var(--pill-bg)',
              borderColor: 'var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            {providerLabel(providerKind, t)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => requestInsight(false)}
            disabled={busy}
            className="touch-target flex-1 sm:flex-none px-3.5 py-2 rounded-[12px] text-[14px] font-semibold cursor-pointer disabled:opacity-60"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            {busy ? t.medicalAi.consulting : t.medicalAi.consult}
          </button>
          <button
            type="button"
            onClick={() => requestInsight(true)}
            disabled={busy}
            className="touch-target flex-1 sm:flex-none px-3 py-2 rounded-[12px] text-[13px] font-medium border cursor-pointer disabled:opacity-60"
            style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--pill-bg)' }}
            title={t.medicalAi.forceHint}
          >
            {t.medicalAi.force}
          </button>
        </div>
      </div>

      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {t.medicalAi.blurb}
      </p>

      {error && (
        <p className="text-[14px]" style={{ color: 'var(--danger)' }} role="alert">
          {t.medicalAi.error}
        </p>
      )}

      {insight ? (
        <div className="space-y-2.5 text-[14px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-label text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {t.medicalAi.risk}
            </span>
            <span
              className="font-mono text-[13px] font-semibold px-2.5 py-1 rounded-[10px]"
              style={{
                background: 'var(--pill-bg)',
                color: riskColor(insight.risk_level),
                border: '1px solid var(--border)',
              }}
            >
              {t.medicalAi.riskLevels[insight.risk_level]}
            </span>
            {!insight.invoked && (
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {insight.anomaly_detected ? t.medicalAi.notInvokedFlag : t.medicalAi.skippedNominal}
              </span>
            )}
          </div>

          <div
            className="p-3 rounded-xl border space-y-2"
            style={{ background: 'var(--surface-data)', borderColor: 'var(--border)' }}
          >
            <p className="leading-relaxed">
              <strong className="font-semibold">{t.medicalAi.findings}</strong> {insight.findings}
            </p>
            <p className="leading-relaxed">
              <strong className="font-semibold">{t.medicalAi.action}</strong> {insight.recommended_action}
            </p>
            {insight.sources.length > 0 && (
              <div>
                <div className="font-label text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>
                  {t.medicalAi.sources}
                </div>
                <ul
                  className="list-disc pl-4 space-y-0.5 text-[12px] font-mono break-all"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {insight.sources.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p className="text-[12px] font-mono" style={{ color: 'var(--text-muted)' }}>
            {insight.disclaimer}
            {insight.model ? ` · ${insight.model}` : ''}
          </p>
        </div>
      ) : (
        !error && (
          <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
            {t.medicalAi.empty}
          </p>
        )
      )}
    </section>
  )
}
