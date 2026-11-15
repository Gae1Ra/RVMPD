/** Spoken diagnostics: ElevenLabs via /api/tts, browser speechSynthesis fallback. */

import { API_URL } from '../api'
import { speechTag, type Locale } from '../i18n/languages'

export type VoiceLang = Locale
export type SpeakPriority = 'normal' | 'high'

export type VoiceProviderLabel = 'elevenlabs' | 'browser' | 'muted' | 'unknown'

export interface SpeakOptions {
  text: string
  lang: VoiceLang
  priority?: SpeakPriority
  /** Dedup key; same key is suppressed for antiRepeatMs */
  key?: string
  antiRepeatMs?: number
}

export interface VoiceSettings {
  muted: boolean
  volume: number // 0..1
  unlocked: boolean
}

type QueueItem = SpeakOptions & { resolve: () => void }

const MUTE_KEY = 'vitalis-voice-muted'
const VOLUME_KEY = 'vitalis-voice-volume'
const UNLOCK_KEY = 'vitalis-voice-unlocked'

let muted = readBool(MUTE_KEY, false)
let volume = readNumber(VOLUME_KEY, 0.85)
let unlocked = readBool(UNLOCK_KEY, false)

let queue: QueueItem[] = []
let playing = false
let currentAudio: HTMLAudioElement | null = null
let cancelled = false
const lastSpokenAt = new Map<string, number>()
let provider: VoiceProviderLabel = 'unknown'
const listeners = new Set<() => void>()

function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key)
    if (v === '1') return true
    if (v === '0') return false
  } catch {
    /* ignore */
  }
  return fallback
}

function readNumber(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key)
    if (v != null) {
      const n = Number(v)
      if (!Number.isNaN(n)) return Math.min(1, Math.max(0, n))
    }
  } catch {
    /* ignore */
  }
  return fallback
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

function notify() {
  for (const fn of listeners) fn()
}

export function subscribeVoice(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getVoiceSettings(): VoiceSettings {
  return { muted, volume, unlocked }
}

export function getVoiceProvider(): VoiceProviderLabel {
  if (muted) return 'muted'
  return provider
}

export function setMuted(next: boolean) {
  muted = next
  write(MUTE_KEY, next ? '1' : '0')
  if (next) cancel()
  notify()
}

export function toggleMute() {
  setMuted(!muted)
}

export function setVolume(next: number) {
  volume = Math.min(1, Math.max(0, next))
  write(VOLUME_KEY, String(volume))
  if (currentAudio) currentAudio.volume = volume
  notify()
}

/** Call after a user gesture so autoplay is allowed. */
export function unlockVoice() {
  unlocked = true
  write(UNLOCK_KEY, '1')
  // Warm speechSynthesis / Audio context with a no-op utterance if available.
  try {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance('')
      u.volume = 0
      window.speechSynthesis.speak(u)
      window.speechSynthesis.cancel()
    }
  } catch {
    /* ignore */
  }
  notify()
}

export function cancel() {
  cancelled = true
  queue = []
  try {
    currentAudio?.pause()
  } catch {
    /* ignore */
  }
  currentAudio = null
  try {
    window.speechSynthesis?.cancel()
  } catch {
    /* ignore */
  }
  playing = false
  cancelled = false
}

export function speak(opts: SpeakOptions): void {
  const text = (opts.text || '').trim()
  if (!text || muted || !unlocked) return

  const key = opts.key
  const anti = opts.antiRepeatMs ?? 0
  if (key && anti > 0) {
    const last = lastSpokenAt.get(key) ?? 0
    if (Date.now() - last < anti) return
  }

  if (opts.priority === 'high') {
    // Red interrupts: clear queue and stop current playback.
    queue = []
    try {
      currentAudio?.pause()
    } catch {
      /* ignore */
    }
    currentAudio = null
    try {
      window.speechSynthesis?.cancel()
    } catch {
      /* ignore */
    }
    playing = false
  }

  queue.push({
    ...opts,
    text,
    priority: opts.priority ?? 'normal',
    resolve: () => undefined,
  })
  void pump()
}

async function pump() {
  if (playing || muted || !unlocked) return
  const item = queue.shift()
  if (!item) return
  playing = true
  cancelled = false

  if (item.key) lastSpokenAt.set(item.key, Date.now())

  try {
    const ok = await playElevenLabs(item.text, item.lang)
    if (!ok && !cancelled && !muted) {
      await playBrowser(item.text, item.lang)
    }
  } catch {
    try {
      if (!cancelled && !muted) await playBrowser(item.text, item.lang)
    } catch {
      /* never surface */
    }
  } finally {
    playing = false
    currentAudio = null
    void pump()
  }
}

async function playElevenLabs(text: string, lang: VoiceLang): Promise<boolean> {
  try {
    const res = await fetch(API_URL + '/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 500), lang }),
    })
    if (res.status === 503) {
      provider = 'browser'
      notify()
      return false
    }
    if (!res.ok) {
      provider = 'browser'
      notify()
      return false
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    currentAudio = audio
    audio.volume = volume
    provider = 'elevenlabs'
    notify()
    await new Promise<void>((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(url)
        resolve()
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        resolve()
      }
      const p = audio.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          URL.revokeObjectURL(url)
          resolve()
        })
      }
    })
    return true
  } catch {
    provider = 'browser'
    notify()
    return false
  }
}

function pickBrowserVoice(langTag: string): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !window.speechSynthesis) return undefined
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return undefined
  const normalized = langTag.toLowerCase().replace('_', '-')
  const exact = voices.find((v) => v.lang.toLowerCase().replace('_', '-') === normalized)
  if (exact) return exact
  const prefix = normalized.slice(0, 2)
  return voices.find((v) => v.lang.toLowerCase().startsWith(prefix))
}

function playBrowser(text: string, lang: VoiceLang): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve()
      return
    }
    provider = 'browser'
    notify()
    const u = new SpeechSynthesisUtterance(text.slice(0, 500))
    const tag = speechTag(lang)
    u.lang = tag
    const voice = pickBrowserVoice(tag)
    if (voice) u.voice = voice
    u.volume = volume
    u.onend = () => resolve()
    u.onerror = () => resolve()
    try {
      window.speechSynthesis.speak(u)
    } catch {
      resolve()
    }
  })
}

/** Refresh provider hint from backend status (no throw). */
export async function refreshTtsStatus(): Promise<void> {
  if (muted) {
    provider = 'muted'
    notify()
    return
  }
  try {
    const res = await fetch(API_URL + '/api/tts/status')
    if (!res.ok) {
      provider = 'browser'
      notify()
      return
    }
    const data = (await res.json()) as { provider?: string; configured?: boolean }
    provider = data.provider === 'elevenlabs' && data.configured ? 'elevenlabs' : 'browser'
    notify()
  } catch {
    provider = 'browser'
    notify()
  }
}
