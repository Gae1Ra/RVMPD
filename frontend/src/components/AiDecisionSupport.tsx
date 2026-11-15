import React from 'react'
import type { AiQuery, Indicator, Mission, Role } from '../types'
import { getIndicatorLevel } from '../constants'
import { useT } from '../i18n'

interface AiDecisionSupportProps {
  role: Role
  indicators: Indicator[]
  aiQuery: AiQuery
  onAiQueryChange: (query: AiQuery) => void
  missions: Mission[]
  onCompleteNextMission: () => void
  onOpenMissionsModal: () => void
}

export const AiDecisionSupport: React.FC<AiDecisionSupportProps> = ({
  role,
  indicators,
  aiQuery,
  onAiQueryChange,
  missions,
  onCompleteNextMission,
  onOpenMissionsModal,
}) => {
  const { t, tf } = useT()
  const maxLevel = Math.max(...indicators.map(getIndicatorLevel))
  const fc = indicators.find((i) => i.id === 'fc') || indicators[0]
  const spo2 = indicators.find((i) => i.id === 'spo2') || indicators[1]
  const hrv = indicators.find((i) => i.id === 'hrv') || indicators[5]
  const vars = { fc: fc.current, spo2: spo2.current, hrv: hrv.current }

  let obs = ''
  let hyp = ''

  if (maxLevel >= 2) {
    obs = tf(t.ai.alertObs, vars)
    hyp = t.ai.alertHyp
  } else if (aiQuery === 'resumen24h') {
    obs = t.ai.summary24Obs
    hyp = t.ai.summary24Hyp
  } else if (aiQuery === 'tendencia') {
    obs = tf(t.ai.trendObs, vars)
    hyp = t.ai.trendHyp
  } else if (aiQuery === 'protocolo') {
    obs = t.ai.protocolObs
    hyp = t.ai.protocolHyp
  } else {
    obs = tf(t.ai.defaultObs, vars)
    hyp = t.ai.defaultHyp
  }

  const astroGuidance = maxLevel >= 2 ? t.ai.astroAlert : t.ai.astroOk
  const nextMission = missions.find((m) => !m.done && !(maxLevel >= 2 && m.isExercise))

  return (
    <div className="lg:col-span-5 vitalis-surface p-4 flex flex-col justify-between gap-3">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <h2 className="text-[16px] font-semibold">{t.ai.title}</h2>
          <span
            className="font-label text-[12px] px-2.5 py-0.5 rounded-lg border"
            style={{
              background: 'var(--pill-bg)',
              borderColor: 'var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            {t.ai.onboard}
          </span>
        </div>

        {role === 'medico' ? (
          <div className="space-y-2.5 text-[15px]">
            <p className="font-secondary leading-relaxed">
              <strong className="font-semibold text-[var(--text)]">{t.ai.observation}</strong> {obs}
            </p>
            <p className="font-secondary leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              <strong className="font-semibold text-[var(--text)]">{t.ai.hypothesis}</strong> {hyp}
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-[15px]">
            <p className="font-secondary leading-relaxed">{astroGuidance}</p>

            <div
              className="p-3 rounded-xl border flex items-center justify-between gap-2"
              style={{ background: 'var(--surface-data)', borderColor: 'var(--border)' }}
            >
              <div>
                <div className="font-label text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {t.ai.nextAction}
                </div>
                <div className="text-[15px] font-semibold">
                  {nextMission
                    ? `${nextMission.title} · +${nextMission.xp} XP`
                    : t.ai.missionsDone}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {nextMission && (
                  <button
                    onClick={onCompleteNextMission}
                    className="px-3.5 py-1.5 rounded-[12px] text-[14px] font-semibold cursor-pointer transition hover:opacity-90"
                    style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
                  >
                    {tf(t.ai.startXp, { n: nextMission.xp })}
                  </button>
                )}
                <button
                  onClick={onOpenMissionsModal}
                  className="px-2.5 py-1.5 rounded-[12px] text-[14px] font-medium border cursor-pointer transition hover:bg-[var(--surface-hover)]"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {t.ai.view5}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {role === 'medico' && (
        <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => onAiQueryChange('resumen24h')}
            className="px-3 py-1.5 rounded-[12px] text-[14px] font-medium border transition cursor-pointer"
            style={{
              background: aiQuery === 'resumen24h' ? 'var(--accent)' : 'var(--pill-bg)',
              borderColor: 'var(--border)',
              color: aiQuery === 'resumen24h' ? 'var(--on-accent)' : 'var(--text)',
            }}
          >
            {t.ai.summary24h}
          </button>
          <button
            onClick={() => onAiQueryChange('tendencia')}
            className="px-3 py-1.5 rounded-[12px] text-[14px] font-medium border transition cursor-pointer"
            style={{
              background: aiQuery === 'tendencia' ? 'var(--accent)' : 'var(--pill-bg)',
              borderColor: 'var(--border)',
              color: aiQuery === 'tendencia' ? 'var(--on-accent)' : 'var(--text)',
            }}
          >
            {t.ai.trend}
          </button>
          <button
            onClick={() => onAiQueryChange('protocolo')}
            className="px-3 py-1.5 rounded-[12px] text-[14px] font-medium border transition cursor-pointer"
            style={{
              background: aiQuery === 'protocolo' ? 'var(--accent)' : 'var(--pill-bg)',
              borderColor: 'var(--border)',
              color: aiQuery === 'protocolo' ? 'var(--on-accent)' : 'var(--text)',
            }}
          >
            {t.ai.protocol}
          </button>
        </div>
      )}
    </div>
  )
}
