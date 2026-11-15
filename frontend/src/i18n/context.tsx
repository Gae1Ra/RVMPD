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
import { es, type Dictionary } from './es'
import { fr } from './fr'
import { fill, formatNumber } from './format'
import {
  DEFAULT_LOCALE,
  isLocale,
  LANGUAGES,
  type Locale,
} from './languages'

const STORAGE_KEY = 'vitalis-locale'
const dictionaries: Record<Locale, Dictionary> = { es, en, fr }

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
    if (isLocale(stored)) return stored
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof window === 'undefined' ? DEFAULT_LOCALE : readStoredLocale(),
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
      {LANGUAGES.map((lang) => {
        const active = locale === lang.code
        const label =
          lang.code === 'es' ? t.lang.es : lang.code === 'en' ? t.lang.en : t.lang.fr
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLocale(lang.code)}
            className="touch-target px-3 py-2 rounded-[8px] text-[13px] font-medium cursor-pointer transition"
            style={{
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--on-accent)' : 'var(--text)',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
