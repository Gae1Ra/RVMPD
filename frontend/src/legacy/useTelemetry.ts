import { useCallback, useEffect, useRef, useState } from 'react'
import { api, WS_URL } from './api'
import { METRIC_KEYS } from './meta'
import { createMock, type Mock } from './mock'
import { createWaveBuffers } from './ringBuffer'
import type { Frame, MetricKey } from './types'

export type LinkMode = 'connecting' | 'live' | 'demo'
export type History = Record<MetricKey, number[]>

const HISTORY_POINTS = 120 // one per second, about two minutes
const RETRY_MS = 5000
const MOCK_INTERVAL_MS = 200

const emptyHistory = () => Object.fromEntries(METRIC_KEYS.map((k) => [k, []])) as unknown as History

export function useTelemetry() {
  const [frame, setFrame] = useState<Frame | null>(null)
  const [mode, setMode] = useState<LinkMode>('connecting')
  const [history, setHistory] = useState<History>(emptyHistory)
  // Waveform samples live outside React state so the scope can read them every animation frame.
  const [waves] = useState(createWaveBuffers)
  const mockRef = useRef<Mock | null>(null)
  const modeRef = useRef<LinkMode>('connecting')

  useEffect(() => {
    const mock = createMock()
    mockRef.current = mock
    let socket: WebSocket | null = null
    let retryTimer: number | undefined
    let mockTimer: number | undefined
    let stopped = false
    let lastHistoryAt = 0
    let lastScenario = 'nominal'

    const changeMode = (m: LinkMode) => {
      modeRef.current = m
      setMode(m)
    }

    const handleFrame = (f: Frame) => {
      lastScenario = f.scenario
      waves.ecg.push(f.wave.ecg)
      waves.ppg.push(f.wave.ppg)
      waves.resp.push(f.wave.resp)
      setFrame(f)
      const now = Date.now()
      if (now - lastHistoryAt >= 1000) {
        lastHistoryAt = now
        setHistory((h) => {
          const next = { ...h }
          for (const k of METRIC_KEYS) next[k] = [...h[k], f.vitals[k].value].slice(-HISTORY_POINTS)
          return next
        })
      }
    }

    const startMock = () => {
      if (mockTimer !== undefined) return
      mock.setScenario(lastScenario)
      changeMode('demo')
      mockTimer = window.setInterval(() => handleFrame(mock.next()), MOCK_INTERVAL_MS)
    }

    const stopMock = () => {
      window.clearInterval(mockTimer)
      mockTimer = undefined
    }

    const connect = () => {
      const ws = new WebSocket(WS_URL)
      socket = ws
      ws.onopen = () => {
        stopMock()
        changeMode('live')
      }
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string)
          if (msg.type === 'frame') handleFrame(msg as Frame)
        } catch {
          // ignore a malformed message; the next frame arrives in 200 ms
        }
      }
      ws.onclose = () => {
        if (stopped) return
        startMock()
        retryTimer = window.setTimeout(connect, RETRY_MS)
      }
    }

    connect()
    return () => {
      stopped = true
      window.clearTimeout(retryTimer)
      stopMock()
      socket?.close()
    }
  }, [waves])

  const setScenario = useCallback(async (id: string) => {
    if (modeRef.current === 'live') await api.setScenario(id)
    else mockRef.current?.setScenario(id)
  }, [])

  return { frame, mode, history, waves, setScenario }
}
