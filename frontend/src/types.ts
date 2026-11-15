// Types for VITALIS v2 (SPEC.md)
export type IndicatorId = 'fc' | 'spo2' | 'pa' | 'fr' | 'temp' | 'hrv'

export type Level = 0 | 1 | 2 | 3

export type Role = 'medico' | 'astronauta'

export type Surface = 'panel' | 'wrist'

export type TimeRange = 'vivo' | '24h' | '7d'

export type SimPhase = 'off' | 'rising' | 'recovering'

export type AiQuery = 'default' | 'resumen24h' | 'tendencia' | 'protocolo'

export interface Indicator {
  id: IndicatorId
  abbr: string
  astroName: string
  clinicalName: string
  unit: string
  decimals: number
  base: number
  current: number
  diastolic?: number
  prevEvent: number
  prevDiastolic?: number
  ref: [number, number]
  warn: [number, number]
  crit: [number, number]
  rangeText: string
  chartMin: number
  chartMax: number
  plainDesc: string
  whatMeasures: string
  whenNotify: string
  /** From CONTRACT Vital when telemetry is connected */
  baseline?: number
  delta?: number
  sqi?: number
  status?: Status
  /** True when an active alert for this metric has origin === 'artifact' */
  artifact?: boolean
  metricKey?: MetricKey
}

export interface SeriesPoint {
  val: number
  label: string
  isEvent?: boolean
}

export interface Mission {
  id: string
  title: string
  xp: number
  done: boolean
  isExercise: boolean
}

export interface LevelMeta {
  level: Level
  label: string
  globalTitle: string
  colorVar: string
  bgVar: string
  shape: 'circle' | 'diamond' | 'triangle' | 'square'
  isFilled?: boolean
}

// Legacy types (for backward compatibility with existing telemetry API/submodules)
export type Status = 'green' | 'amber' | 'red'
export type MetricKey = 'hr' | 'hrv_rmssd' | 'spo2' | 'temp' | 'resp_rate' | 'bp_sys'

export interface Vital {
  value: number
  unit: string
  baseline: number
  delta: number
  status: Status
  p_adj: number
  sqi: number
}

export interface Wave {
  fs: number
  ecg: number[]
  ppg: number[]
  resp: number[]
}

export interface Radiation {
  dose_rate_usv_h: number
  dose_total_msv: number
  status: Status
}

export interface Global {
  status: Status
  confidence: number
  sqi: number
  link: string
}

export interface Alert {
  id: string
  t: number
  metric: string
  level: Status
  origin: 'physiological' | 'artifact'
  title: string
  explanation: string
  guidance: string[]
}

export interface Frame {
  type: 'frame'
  t: number
  scenario: string
  wave: Wave
  vitals: Record<MetricKey, Vital>
  radiation: Radiation
  global: Global
  alerts: Alert[]
}

export interface Scenario {
  id: string
  name: string
  description: string
}

export interface Checkin {
  id: number | string
  t: string
  mood: number
  sleep_hours: number
  note: string
}

export interface SpaceWeather {
  source: string
  proton_flux_pfu: number
  s_scale: number
  updated: string
}

export interface HistoryPoint {
  t: string
  value: number
  status: Status
}

export interface HistoryResponse {
  metric: string
  points: HistoryPoint[]
}

export interface AlertLogEntry {
  id: number | string
  t: string
  metric: string
  level: Status
  origin: Alert['origin']
  title: string
}

export interface Stats {
  rows: number
  first: string
  last: string
  size_kb: number
}

export type Likelihood = 'low' | 'medium' | 'high'

export interface Finding {
  condition: string
  likelihood: Likelihood
  evidence: string[]
  action: string
}

export interface AnalysisReport {
  id: number
  t: string
  window_minutes: number
  engine: 'local' | 'llm'
  model: string | null
  summary: string
  findings: Finding[]
  facts: string[]
  data_points: number
  disclaimer: string
}

/** Additive medical AI insight (docs/CONTRACT.md appendix + docs/AI_MEDICAL.md). */
export type RiskLevel = 'low' | 'medium' | 'high'
export type MedicalAiProviderId = 'mock' | 'bedrock' | 'disabled'

export interface MedicalInsight {
  risk_level: RiskLevel
  findings: string
  recommended_action: string
  sources: string[]
  provider: MedicalAiProviderId
  model: string | null
  invoked: boolean
  anomaly_detected: boolean
  patient_id: string
  disclaimer: string
}

export interface MedicalAiStatus {
  enabled: boolean
  provider: string
  region: string
  knowledge_base_id_set: boolean
  guardrail_id_set: boolean
  model_arn: string | null
  note: string
}

export interface MedicalAiRequest {
  patient_id?: string
  force?: boolean
  hr?: number
  spo2?: number
  temp?: number
  resp_rate?: number
  hrv_rmssd?: number
  bp_sys?: number
  scenario?: string
  global_status?: Status
  alert_titles?: string[]
}
