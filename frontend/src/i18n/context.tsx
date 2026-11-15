import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { en } from './en'
import { es, type Dictionary, type Locale } from './es'
import { fill, formatNumber } from './format'

const STORAGE_KEY = 'vitalis-locale'
const dictionaries: Record<Locale, Dictionary> = { es, en }

interface I18nValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Dictionary
  formatNumber: (val: number, decimals?: number) => string
  tf: (template: string, vars: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nValue | null>(null)

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'es') return stored
  } catch {
    /* ignore */
  }
  return 'es'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof window === 'undefined' ? 'es' : readStoredLocale(),
  )

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: dictionaries[locale],
      formatNumber: (val, decimals = 0) => formatNumber(val, decimals, locale),
      tf: fill,
    }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used within I18nProvider')
  return ctx
}

export function LangSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useT()
  return (
    <div
      role="group"
      aria-label={t.lang.selector}
      className={`p-1 rounded-[12px] flex items-center gap-0.5 border ${className}`}
      style={{ background: 'var(--pill-bg)', borderColor: 'var(--border)' }}
    >
      <button
        type="button"
        onClick={() => setLocale('es')}
        className="touch-target px-3 py-2 rounded-[8px] text-[13px] font-medium cursor-pointer transition"
        style={{
          background: locale === 'es' ? 'var(--accent)' : 'transparent',
          color: locale === 'es' ? 'var(--on-accent)' : 'var(--text)',
        }}
      >
        {t.lang.es}
      </button>
      <button
        type="button"
        onClick={() => setLocale('en')}
        className="touch-target px-3 py-2 rounded-[8px] text-[13px] font-medium cursor-pointer transition"
        style={{
          background: locale === 'en' ? 'var(--accent)' : 'transparent',
          color: locale === 'en' ? 'var(--on-accent)' : 'var(--text)',
        }}
      >
        {t.lang.en}
      </button>
    </div>
  )
}
