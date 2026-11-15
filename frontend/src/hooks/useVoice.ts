import { useCallback, useEffect, useState } from 'react'
import type { Alert, AnalysisReport } from '../types'
import type { Locale } from '../i18n'
import {
  cancel,
  getVoiceProvider,
  getVoiceSettings,
  refreshTtsStatus,
  setMuted,
  setVolume,
  speak,
  subscribeVoice,
  toggleMute,
  unlockVoice,
  type VoiceProviderLabel,
} from '../voice/service'

const ALERT_ANTI_MS = 60_000

export interface UseVoiceResult {
  muted: boolean
  volume: number
  unlocked: boolean
  provider: VoiceProviderLabel
  setMuted: (v: boolean) => void
  setVolume: (v: number) => void
  toggleMute: () => void
  unlock: () => void
  cancel: () => void
  speakAlertBatch: (alerts: Alert[]) => void
  speakAnalysis: (report: AnalysisReport, lang: Locale) => void
  speakNormalized: () => void
}

export function useVoice(locale: Locale, normalizedPhrase: string): UseVoiceResult {
  const [snap, setSnap] = useState(() => ({
    ...getVoiceSettings(),
    provider: getVoiceProvider(),
  }))

  useEffect(
    () =>
      subscribeVoice(() => {
        setSnap({ ...getVoiceSettings(), provider: getVoiceProvider() })
      }),
    [],
  )

  useEffect(() => {
    void refreshTtsStatus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'm' && e.key !== 'M') return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement | null)?.isContentEditable) return
      e.preventDefault()
      toggleMute()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const speakAlertBatch = useCallback(
    (alerts: Alert[]) => {
      const actionable = alerts.filter((a) => a.level === 'amber' || a.level === 'red')
      if (actionable.length === 0) return
      const reds = actionable.filter((a) => a.level === 'red')
      const ambers = actionable.filter((a) => a.level === 'amber')
      for (const alert of [...reds, ...ambers]) {
        const step = alert.guidance?.[0] ?? ''
        const text = step ? `${alert.title}. ${step}` : alert.title
        speak({
          text,
          lang: locale,
          priority: alert.level === 'red' ? 'high' : 'normal',
          key: `alert:${alert.id}`,
          antiRepeatMs: ALERT_ANTI_MS,
        })
      }
    },
    [locale],
  )

  const speakAnalysis = useCallback((report: AnalysisReport, lang: Locale) => {
    const parts: string[] = []
    if (report.summary) parts.push(report.summary)
    const top = report.findings?.[0]
    if (top?.condition) parts.push(top.condition)
    const text = parts.join(' ').trim()
    if (!text) return
    speak({
      text,
      lang,
      priority: 'normal',
      key: `analysis:${report.id ?? report.t ?? text.slice(0, 40)}`,
      antiRepeatMs: ALERT_ANTI_MS,
    })
  }, [])

  const speakNormalized = useCallback(() => {
    speak({
      text: normalizedPhrase,
      lang: locale,
      priority: 'normal',
      key: 'normalized',
      antiRepeatMs: ALERT_ANTI_MS,
    })
  }, [locale, normalizedPhrase])

  return {
    muted: snap.muted,
    volume: snap.volume,
    unlocked: snap.unlocked,
    provider: snap.provider,
    setMuted,
    setVolume,
    toggleMute,
    unlock: unlockVoice,
    cancel,
    speakAlertBatch,
    speakAnalysis,
    speakNormalized,
  }
}
