import { useEffect, useRef, useState } from 'react'
import type { WaveBuffers, WaveChannel } from '../ringBuffer'

const FS = 250
const WINDOW_SECONDS = 6
const WINDOW = FS * WINDOW_SECONDS
const FRAME_SAMPLES = 50
const TARGET_LAG = 2 * FRAME_SAMPLES // playback trails the newest sample so 5 Hz bursts scroll smoothly

const CHANNELS: { id: WaveChannel; label: string; name: string }[] = [
  { id: 'ecg', label: 'ECG', name: 'Electrocardiogram' },
  { id: 'ppg', label: 'Pulse', name: 'Pulse wave' },
  { id: 'resp', label: 'Breathing', name: 'Breathing wave' },
]

export function Oscilloscope({ waves }: { waves: WaveBuffers }) {
  const [channel, setChannel] = useState<WaveChannel>('ecg')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const channelRef = useRef(channel)
  channelRef.current = channel

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const style = getComputedStyle(document.documentElement)
    const trace = style.getPropertyValue('--trace').trim()
    const grid = style.getPropertyValue('--line').trim()

    let width = 0
    let height = 0
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    let playhead = 0
    let lastTime = performance.now()
    let lo = -0.5
    let hi = 1.5
    let raf = 0

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      const dt = Math.min((now - lastTime) / 1000, 0.25)
      lastTime = now

      ctx.clearRect(0, 0, width, height)
      ctx.strokeStyle = grid
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 1; i < 4; i++) {
        const y = Math.round((height * i) / 4) + 0.5
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
      }
      for (let s = 1; s < WINDOW_SECONDS; s++) {
        const x = Math.round((width * s) / WINDOW_SECONDS) + 0.5
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
      }
      ctx.stroke()

      const buf = waves[channelRef.current]
      if (buf.total === 0) return

      playhead += dt * FS
      if (buf.total - playhead > TARGET_LAG + FRAME_SAMPLES) playhead = buf.total - TARGET_LAG
      if (playhead > buf.total) playhead = buf.total
      const end = Math.floor(playhead)
      const start = end - WINDOW

      if (channelRef.current === 'ecg') {
        let min = Infinity
        let max = -Infinity
        for (let i = Math.max(start, 0); i < end; i++) {
          const v = buf.at(i)
          if (v < min) min = v
          if (v > max) max = v
        }
        // An empty window leaves min/max infinite, which would poison the scale for good
        if (min <= max) {
          const pad = Math.max((max - min) * 0.15, 0.1)
          lo += (min - pad - lo) * 0.05
          hi += (max + pad - hi) * 0.05
        }
      } else {
        lo = -0.05
        hi = 1.05
      }
      const y = (v: number) => height - ((v - lo) / (hi - lo)) * height

      ctx.strokeStyle = trace
      ctx.lineWidth = 1.75
      ctx.lineJoin = 'round'
      ctx.beginPath()
      let started = false
      for (let x = 0; x < width; x++) {
        const i0 = Math.floor(start + (x / width) * WINDOW)
        const i1 = Math.max(i0 + 1, Math.floor(start + ((x + 1) / width) * WINDOW))
        if (i0 < 0) continue
        let min = Infinity
        let max = -Infinity
        for (let i = i0; i < i1 && i < end; i++) {
          const v = buf.at(i)
          if (v < min) min = v
          if (v > max) max = v
        }
        if (min === Infinity) continue
        if (!started) {
          ctx.moveTo(x, y(min))
          started = true
        }
        ctx.lineTo(x, y(min))
        ctx.lineTo(x, y(max))
      }
      ctx.stroke()
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [waves])

  const current = CHANNELS.find((c) => c.id === channel)!
  return (
    <section className="card scope" aria-label="Live waveform">
      <div className="scope-head">
        <h2>Live signal</h2>
        <div className="segmented" role="group" aria-label="Waveform channel">
          {CHANNELS.map((c) => (
            <button key={c.id} type="button" aria-pressed={channel === c.id} onClick={() => setChannel(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <canvas ref={canvasRef} className="scope-canvas" role="img" aria-label={`${current.name}, last ${WINDOW_SECONDS} seconds`} />
      <p className="muted scope-foot">Last {WINDOW_SECONDS} seconds</p>
    </section>
  )
}
