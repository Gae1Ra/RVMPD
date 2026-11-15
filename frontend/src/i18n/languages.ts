/**
 * Single registry for UI / voice / analysis languages.
 * To add a language: append here, add `<code>.ts` Dictionary, backend
 * `app/languages.py` entry, and `ELEVENLABS_VOICE_ID_<CODE>` in `.env.example`.
 */

export const LANGUAGES = [
  {
    code: 'es',
    label: 'ES',
    htmlLang: 'es',
    intl: 'es-ES',
    speech: 'es-ES',
    voiceEnv: 'ELEVENLABS_VOICE_ID_ES',
    name: 'Spanish',
  },
  {
    code: 'en',
    label: 'EN',
    htmlLang: 'en',
    intl: 'en-US',
    speech: 'en-US',
    voiceEnv: 'ELEVENLABS_VOICE_ID_EN',
    name: 'English',
  },
  {
    code: 'fr',
    label: 'FR',
    htmlLang: 'fr',
    intl: 'fr-FR',
    speech: 'fr-FR',
    voiceEnv: 'ELEVENLABS_VOICE_ID_FR',
    name: 'French',
  },
] as const

export type Locale = (typeof LANGUAGES)[number]['code']

export const LOCALE_CODES: readonly Locale[] = LANGUAGES.map((l) => l.code)

const byCode = Object.fromEntries(LANGUAGES.map((l) => [l.code, l])) as Record<
  Locale,
  (typeof LANGUAGES)[number]
>

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'es' || value === 'en' || value === 'fr'
}

export function languageMeta(code: Locale) {
  return byCode[code]
}

export function intlTag(code: Locale): string {
  return byCode[code].intl
}

export function speechTag(code: Locale): string {
  return byCode[code].speech
}

export const DEFAULT_LOCALE: Locale = 'es'
