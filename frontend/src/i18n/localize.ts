import type { Indicator, IndicatorId, Level, Mission } from '../types'
import type { Dictionary } from './es'
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
