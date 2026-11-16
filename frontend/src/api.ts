import type {
  AlertLogEntry,
  AnalysisReport,
  Checkin,
  FrameIngest,
  HistoryResponse,
  MedicalAiRequest,
  MedicalAiStatus,
  MedicalInsight,
  Scenario,
  SpaceWeather,
  Stats,
} from './types'

export type IngestStatus = FrameIngest & {
  mapped?: Record<string, number | null>
  note?: string
}

// Empty default uses the Vite proxy (/api, /ws → localhost:8000). Override with VITE_API_URL.
export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export const WS_URL = (() => {
  if (API_URL) return API_URL.replace(/^http/, 'ws') + '/ws'
  if (typeof window === 'undefined') return 'ws://localhost:5173/ws'
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/ws`
})()

async function request<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(API_URL + path, body === undefined ? undefined : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new ApiError(path, res.status)
  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(path: string, readonly status: number) {
    super(`${path} returned ${status}`)
  }
}

export const api = {
  scenarios: () => request<Scenario[]>('/api/scenarios'),
  setScenario: (id: string) => request<{ ok: boolean; scenario: string }>('/api/scenario', { id }),
  checkins: () => request<Checkin[]>('/api/checkins'),
  postCheckin: (mood: number, sleep_hours: number, note: string) =>
    request<Checkin>('/api/checkin', { mood, sleep_hours, note }),
  spaceWeather: () => request<SpaceWeather>('/api/spaceweather'),
  history: (metric: string, minutes: number) =>
    request<HistoryResponse>(`/api/history?metric=${encodeURIComponent(metric)}&minutes=${minutes}`),
  alertLog: (limit: number) => request<AlertLogEntry[]>(`/api/alerts/log?limit=${limit}`),
  stats: () => request<Stats>('/api/stats'),
  analyze: (minutes: number, lang: 'en' | 'es' | 'fr' = 'en') =>
    request<AnalysisReport>('/api/analysis', { minutes, lang }),
  ttsStatus: () =>
    request<{ provider: string; configured: boolean; chars_used: number; chars_cap: number }>(
      '/api/tts/status',
    ),
  latestAnalysis: () =>
    request<AnalysisReport>('/api/analysis/latest').catch((e) => {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }),
  medicalAiStatus: () => request<MedicalAiStatus>('/api/medical-ai/status'),
  medicalInsight: (body?: MedicalAiRequest) =>
    request<MedicalInsight>('/api/medical-ai/insight', body ?? {}),
  ingestWatchStatus: () => request<IngestStatus>('/api/ingest/watch/status'),
}
