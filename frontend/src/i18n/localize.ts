import type { Alert, AnalysisReport, Indicator, IndicatorId, Level, Mission } from '../types'
import type { Dictionary } from './es'
import type { Locale } from './languages'
import { translateBackendPhrase, untranslatedBackendPhrase } from './alertPhrases'
import { getLevelMeta } from '../constants'

function vitalCopy(t: Dictionary, id: IndicatorId) {
  return t.vitals[id]
}

export function localizeIndicator(ind: Indicator, t: Dictionary): Indicator {
  const copy = vitalCopy(t, ind.id)
  return {
    ...ind,
    abbr: copy.abbr,
    astroName: copy.astroName,
    clinicalName: copy.clinicalName,
    unit: copy.unit,
    rangeText: copy.rangeText,
    plainDesc: copy.plainDesc,
    whatMeasures: copy.whatMeasures,
    whenNotify: copy.whenNotify,
  }
}

export function localizeIndicators(list: Indicator[], t: Dictionary): Indicator[] {
  return list.map((ind) => localizeIndicator(ind, t))
}

export function localizeMissionTitle(id: string, t: Dictionary): string {
  const key = id as keyof Dictionary['missions']
  const val = t.missions[key]
  return typeof val === 'string' ? val : id
}

export function localizeMissions(list: Mission[], t: Dictionary): Mission[] {
  return list.map((m) => ({ ...m, title: localizeMissionTitle(m.id, t) }))
}

export function levelLabels(t: Dictionary, level: Level) {
  return t.levels[level]
}

export function localizedLevelMeta(level: Level, t: Dictionary) {
  return getLevelMeta(level, t.levels[level])
}

/** Map fixed English alert title / explanation / steps for ES or FR. */
export function localizeAlert(alert: Alert, locale: Locale): Alert {
  if (locale === 'en') return alert
  return {
    ...alert,
    title: translateBackendPhrase(alert.title, locale),
    explanation: translateBackendPhrase(alert.explanation, locale),
    guidance: (alert.guidance ?? []).map((step) => translateBackendPhrase(step, locale)),
  }
}

export function localizeAlerts(list: Alert[], locale: Locale): Alert[] {
  return list.map((a) => localizeAlert(a, locale))
}

/**
 * Localize known fixed fields on an analysis report (conditions, disclaimer).
 * Dynamic evidence / facts / summary templates stay English when unmapped.
 */
export function localizeAnalysisReport(report: AnalysisReport, locale: Locale): AnalysisReport {
  if (locale === 'en') return report
  return {
    ...report,
    summary: translateBackendPhrase(report.summary, locale),
    disclaimer: report.disclaimer
      ? translateBackendPhrase(report.disclaimer, locale)
      : report.disclaimer,
    findings: (report.findings ?? []).map((f) => ({
      ...f,
      condition: translateBackendPhrase(f.condition, locale),
      action: translateBackendPhrase(f.action, locale),
      evidence: (f.evidence ?? []).map((e) => translateBackendPhrase(e, locale)),
    })),
    facts: (report.facts ?? []).map((fact) => translateBackendPhrase(fact, locale)),
  }
}

/** Collect backend-origin strings that still display in English for a locale. */
export function collectUntranslatedAlertStrings(alerts: Alert[], locale: Locale): string[] {
  if (locale === 'en') return []
  const leftover: string[] = []
  const seen = new Set<string>()
  const push = (text: string) => {
    if (!text || seen.has(text)) return
    if (untranslatedBackendPhrase(text, locale)) {
      seen.add(text)
      leftover.push(text)
    }
  }
  for (const a of alerts) {
    push(a.title)
    push(a.explanation)
    for (const step of a.guidance ?? []) push(step)
  }
  return leftover
}
