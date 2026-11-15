import { intlTag, type Locale } from './languages'

/** Locale-aware number format via Intl (es/fr use decimal comma; en uses period). */
export function formatNumber(val: number, decimals = 0, locale: Locale = 'es'): string {
  return new Intl.NumberFormat(intlTag(locale), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val)
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''))
}
