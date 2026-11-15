import type { Locale } from './es'

const localeTag: Record<Locale, string> = {
  es: 'es-ES',
  en: 'en-US',
}

/** Locale-aware number format: Spanish uses comma decimals (36,8), English uses period (36.8). */
export function formatNumber(val: number, decimals = 0, locale: Locale = 'es'): string {
  return new Intl.NumberFormat(localeTag[locale], {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val)
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''))
}
