import React, { useState } from 'react'
import type { Alert, Indicator, Role, SimPhase } from '../types'
import { getIndicatorLevel } from '../constants'
import { useT } from '../i18n'
import { localizedLevelMeta } from '../i18n/localize'

interface EmergencyPanelProps {
  role: Role
  simPhase: SimPhase
  indicators: Indicator[]
  interventions: string[]
  onLogIntervention: (text: string) => void
  onOpenNotifyModal: () => void
  alerts?: Alert[]
}

export const EmergencyPanel: React.FC<EmergencyPanelProps> = ({
  role,
  simPhase,
  indicators,
  interventions,
  onLogIntervention,
  onOpenNotifyModal,
  alerts = [],
}) => {
  const { t, formatNumber } = useT()
  const [inputText, setInputText] = useState('')

  const handleAddIntervention = () => {
    if (!inputText.trim()) return
    onLogIntervention(inputText.trim())
    setInputText('')
  }

  const phaseBadgeText =
    simPhase === 'recovering' ? t.emergency.phaseRecovering : t.emergency.phaseRising

  return (
    <section
      className="vitalis-glass p-4 border-l-4"
      style={{ borderLeftColor: 'var(--danger)' }}
      aria-live="assertive"
    >
      {role === 'medico' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-[2px]"
                style={{ background: 'var(--danger)' }}
                aria-hidden="true"
              />
              <h2 className="text-[16px] font-bold uppercase tracking-wider" style={{ color: 'var(--danger)' }}>
                {t.emergency.title}
              </h2>
            </div>
            <span
              className="font-mono text-[14px] px-2.5 py-0.5 rounded-lg"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
            >
              {phaseBadgeText}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
              <table className="w-full text-left border-collapse text-[14px]">
                <thead>
                  <tr
                    className="border-b"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--pill-bg)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <th className="py-2 px-3 font-medium">{t.emergency.param}</th>
                    <th className="py-2 px-3 font-medium font-mono">{t.emergency.prev}</th>
                    <th className="py-2 px-3 font-medium font-mono">{t.emergency.current}</th>
                    <th className="py-2 px-3 font-medium font-mono">{t.emergency.change}</th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums divide-y" style={{ borderColor: 'var(--border)' }}>
                  {indicators.map((ind) => {
                    const prevStr =
                      ind.id === 'pa' && ind.prevDiastolic !== undefined
                        ? `${ind.prevEvent}/${ind.prevDiastolic}`
                        : formatNumber(ind.prevEvent, ind.decimals)
                    const currStr =
                      ind.id === 'pa' && ind.diastolic !== undefined
                        ? `${ind.current}/${ind.diastolic}`
                        : formatNumber(ind.current, ind.decimals)
                    const diff = Number((ind.current - ind.prevEvent).toFixed(ind.decimals))
                    const diffSign =
                      diff > 0
                        ? `+${formatNumber(diff, ind.decimals)}`
                        : formatNumber(diff, ind.decimals)
                    const lvl = getIndicatorLevel(ind)
                    const color = lvl > 0 ? localizedLevelMeta(lvl, t).colorVar : 'var(--text-muted)'

                    return (
                      <tr key={ind.id}>
                        <td className="py-1.5 px-3 font-sans font-medium">{ind.abbr}</td>
                        <td className="py-1.5 px-3" style={{ color: 'var(--text-muted)' }}>
                          {prevStr} {ind.unit}
                        </td>
                        <td className="py-1.5 px-3 font-semibold">
                          {currStr} {ind.unit}
                        </td>
                        <td className="py-1.5 px-3 font-semibold" style={{ color }}>
                          {diffSign}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div
              className="lg:col-span-5 flex flex-col justify-between gap-3 p-3.5 rounded-xl border"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-data)' }}
            >
              <div>
                <div className="font-label text-[12px] mb-1" style={{ color: 'var(--text-muted)' }}>
                  {t.emergency.recommended}
                </div>
                {alerts[0] ? (
                  <div className="space-y-2">
                    <p className="text-[14px] font-semibold">{alerts[0].title}</p>
                    <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {alerts[0].explanation}
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-[14px] leading-relaxed">
                      {alerts[0].guidance.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    <span
                      className="inline-block font-mono text-[12px] px-2 py-0.5 rounded-lg"
                      style={{ background: 'var(--pill-bg)', color: 'var(--text-muted)' }}
                    >
                      {alerts[0].origin === 'artifact'
                        ? t.emergency.originArtifact
                        : t.emergency.originPhysio}
                    </span>
                  </div>
                ) : (
                  <p className="text-[14px] leading-relaxed">{t.emergency.defaultAction}</p>
                )}
              </div>

              <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <label
                  htmlFor="intervention-input"
                  className="block text-[14px] font-medium mb-1.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {t.emergency.logLabel}
                </label>
                <div className="flex gap-2">
                  <input
                    id="intervention-input"
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddIntervention()
                    }}
                    placeholder={t.emergency.logPlaceholder}
                    className="flex-1 px-3 py-2 rounded-[12px] text-[14px] border bg-transparent"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                  <button
                    onClick={handleAddIntervention}
                    className="px-3.5 py-2 rounded-[12px] text-[14px] font-semibold cursor-pointer shrink-0 transition hover:opacity-90"
                    style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
                  >
                    {t.emergency.logButton}
                  </button>
                </div>
                <ul
                  className="mt-2 space-y-1 text-[14px] font-mono tabular-nums max-h-20 overflow-y-auto"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {interventions.map((item, idx) => (
                    <li key={idx}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="inline-block w-3.5 h-3.5 rounded-[2px] shrink-0"
              style={{ background: 'var(--danger)' }}
              aria-hidden="true"
            />
            <div>
              <div className="text-[16px] font-bold">
                {alerts[0]?.title ?? t.emergency.astroFallbackTitle}
              </div>
              <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
                {alerts[0]?.explanation ?? t.emergency.astroFallbackBody}
              </p>
              {alerts[0]?.guidance && alerts[0].guidance.length > 0 && (
                <ol className="list-decimal pl-4 mt-2 space-y-1 text-[14px]">
                  {alerts[0].guidance.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              )}
            </div>
          </div>
          <button
            onClick={onOpenNotifyModal}
            className="px-4 py-2.5 rounded-[12px] text-[14px] font-semibold cursor-pointer transition hover:opacity-90 shadow-lg"
            style={{ background: 'var(--danger)', color: 'var(--on-accent)' }}
          >
            {t.emergency.notifyNow}
          </button>
        </div>
      )}
    </section>
  )
}
