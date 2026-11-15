import React from 'react'
import type { Level } from '../types'
import { getLevelMeta } from '../constants'

interface LevelShapeProps {
  level: Level
  size?: number
  className?: string
}

export const LevelShape: React.FC<LevelShapeProps> = ({ level, size = 16, className = '' }) => {
  const meta = getLevelMeta(level)

  switch (meta.shape) {
    case 'square':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill={meta.colorVar}
          className={`shrink-0 ${className}`}
          aria-hidden="true"
        >
          <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
        </svg>
      )
    case 'triangle':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill={meta.colorVar}
          className={`shrink-0 ${className}`}
          aria-hidden="true"
        >
          <polygon points="8,2 14.5,13.5 1.5,13.5" />
        </svg>
      )
    case 'diamond':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill={meta.colorVar}
          className={`shrink-0 ${className}`}
          aria-hidden="true"
        >
          <polygon points="8,1.5 14.5,8 8,14.5 1.5,8" />
        </svg>
      )
    case 'circle':
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 16 16"
          fill={meta.colorVar}
          className={`shrink-0 ${className}`}
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="5.5" />
        </svg>
      )
  }
}
