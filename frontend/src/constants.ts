import type { Indicator, Level, LevelMeta, Mission } from './types'

export const INITIAL_INDICATORS: Indicator[] = [
  {
    id: 'fc',
    abbr: 'FC',
    astroName: 'Frecuencia cardíaca',
    clinicalName: 'Frecuencia Cardíaca',
    unit: 'lpm',
    decimals: 0,
    base: 72,
    current: 72,
    prevEvent: 72,
    ref: [60, 80],
    warn: [50, 100],
    crit: [40, 120],
    rangeText: '60–80',
    chartMin: 40,
    chartMax: 140,
    plainDesc: 'Latidos por minuto en reposo dentro de tu margen habitual.',
    whatMeasures: 'Mide cuántas veces late tu corazón cada minuto.',
    whenNotify: 'Avisa si supera 100 lpm en reposo o sientes palpitaciones o mareo.',
  },
  {
    id: 'spo2',
    abbr: 'SpO₂',
    astroName: 'Oxígeno en sangre',
    clinicalName: 'Saturación de Oxígeno',
    unit: '%',
    decimals: 0,
    base: 98,
    current: 98,
    prevEvent: 98,
    ref: [95, 100],
    warn: [92, 100],
    crit: [88, 100],
    rangeText: '95–100',
    chartMin: 85,
    chartMax: 100,
    plainDesc: 'Transporte de oxígeno estable en sangre.',
    whatMeasures: 'Indica el porcentaje de oxígeno que transportan tus glóbulos rojos.',
    whenNotify: 'Avisa de inmediato si baja de 92 % o notas falta de aire.',
  },
  {
    id: 'pa',
    abbr: 'PA',
    astroName: 'Presión arterial',
    clinicalName: 'Presión Arterial (sistólica)',
    unit: 'mmHg',
    decimals: 0,
    base: 118,
    current: 118,
    diastolic: 78,
    prevEvent: 118,
    prevDiastolic: 78,
    ref: [110, 125],
    warn: [100, 138],
    crit: [90, 155],
    rangeText: '110–125',
    chartMin: 85,
    chartMax: 165,
    plainDesc: 'Tensión sistólica y diastólica equilibradas.',
    whatMeasures: 'Mide la fuerza con la que circula la sangre por tus arterias.',
    whenNotify: 'Avisa si sube por encima de 138 mmHg o baja de 100 mmHg con debilidad.',
  },
  {
    id: 'fr',
    abbr: 'FR',
    astroName: 'Respiración',
    clinicalName: 'Frecuencia Respiratoria',
    unit: 'rpm',
    decimals: 0,
    base: 15,
    current: 15,
    prevEvent: 15,
    ref: [12, 18],
    warn: [10, 22],
    crit: [8, 28],
    rangeText: '12–18',
    chartMin: 6,
    chartMax: 32,
    plainDesc: 'Ritmo respiratorio pausado y regular.',
    whatMeasures: 'Cuenta cuántas respiraciones completas realizas por minuto.',
    whenNotify: 'Avisa si supera 22 rpm sin haber hecho esfuerzo físico.',
  },
  {
    id: 'temp',
    abbr: 'Temp.',
    astroName: 'Temperatura',
    clinicalName: 'Temperatura Corporal',
    unit: '°C',
    decimals: 1,
    base: 36.8,
    current: 36.8,
    prevEvent: 36.8,
    ref: [36.2, 37.2],
    warn: [35.8, 37.8],
    crit: [35.0, 38.5],
    rangeText: '36,2–37,2',
    chartMin: 34.8,
    chartMax: 39.0,
    plainDesc: 'Termorregulación basal estable en cabina.',
    whatMeasures: 'Mide la temperatura interna de tu cuerpo en grados Celsius.',
    whenNotify: 'Avisa si alcanza 37,8 °C o más, o si sientes escalofríos.',
  },
  {
    id: 'hrv',
    abbr: 'HRV',
    astroName: 'Variabilidad',
    clinicalName: 'Variabilidad Cardíaca',
    unit: 'ms',
    decimals: 0,
    base: 54,
    current: 54,
    prevEvent: 54,
    ref: [40, 70],
    warn: [28, 85],
    crit: [18, 100],
    rangeText: '40–70',
    chartMin: 10,
    chartMax: 100,
    plainDesc: 'Buena reserva de recuperación y descanso.',
    whatMeasures: 'Mide la variación en milisegundos entre cada latido; refleja recuperación.',
    whenNotify: 'Avisa si cae por debajo de 28 ms junto con cansancio intenso.',
  },
]

export const INITIAL_MISSIONS: Mission[] = [
  { id: 'water', title: 'Beber un vaso de agua', xp: 10, done: false, isExercise: false },
  { id: 'breath', title: 'Respiración guiada (4 ciclos)', xp: 20, done: false, isExercise: false },
  { id: 'react', title: 'Prueba de reacción (3 intentos)', xp: 25, done: false, isExercise: false },
  { id: 'exercise', title: 'Ejercicio de resistencia', xp: 40, done: false, isExercise: true },
  { id: 'rest', title: 'Rutina de descanso', xp: 20, done: false, isExercise: false },
]

export function formatEs(val: number, decimals = 0): string {
  return Number(val).toFixed(decimals).replace('.', ',')
}

export function formatMissionClock(totalSeconds: number): string {
  const d = Math.floor(totalSeconds / 86400)
  const h = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0')
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const s = String(totalSeconds % 60).padStart(2, '0')
  return `T+ ${d}d ${h}:${m}:${s}`
}

export function getIndicatorLevel(ind: Indicator): Level {
  const v = ind.current
  if (v < ind.crit[0] || v > ind.crit[1]) return 3 // Crítico
  if (v < ind.warn[0] || v > ind.warn[1]) return 2 // Advertencia
  if (v < ind.ref[0] || v > ind.ref[1]) return 1 // Observación
  return 0 // Normal
}

export function getLevelMeta(level: Level): LevelMeta {
  switch (level) {
    case 3:
      return {
        level: 3,
        label: 'CRÍTICO',
        globalTitle: 'Avisa ahora',
        colorVar: 'var(--danger)',
        bgVar: 'var(--danger)',
        shape: 'square',
        isFilled: true,
      }
    case 2:
      return {
        level: 2,
        label: 'ADVERTENCIA',
        globalTitle: 'Haz una pausa',
        colorVar: 'var(--danger)',
        bgVar: 'var(--danger-bg)',
        shape: 'triangle',
        isFilled: false,
      }
    case 1:
      return {
        level: 1,
        label: 'OBSERVACIÓN',
        globalTitle: 'En observación',
        colorVar: 'var(--status-watch)',
        bgVar: 'var(--surface-data)',
        shape: 'diamond',
        isFilled: false,
      }
    default:
      return {
        level: 0,
        label: 'NORMAL',
        globalTitle: 'Todo en orden',
        colorVar: 'var(--accent)',
        bgVar: 'var(--glow-blue)',
        shape: 'circle',
        isFilled: false,
      }
  }
}
