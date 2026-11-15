import type { AlertLogEntry, AnalysisReport, Checkin, HistoryResponse, Scenario, SpaceWeather, Stats } from './types'

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')
export const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws'

async function request<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(API_URL + path, body === undefined ? undefined : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new ApiError(path, res.status)
  return res.json() as Promise<T>
}

class ApiError extends Error {
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
  analyze: (minutes: number) => request<AnalysisReport>('/api/analysis', { minutes }),
  // 404 means no report has been made yet, which is not an error.
  latestAnalysis: () =>
    request<AnalysisReport>('/api/analysis/latest').catch((e) => {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }),
}
