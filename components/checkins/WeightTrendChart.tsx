'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/utils'

export interface WeightPoint {
  date: string
  weight: number
}

// Exponential moving average — the smoothing Happy Scale / Libra use.
// alpha ≈ 2/(N+1) for an ~7-entry window. Handles gaps gracefully.
const ALPHA = 0.25

export function computeTrend(points: WeightPoint[]): number[] {
  const trend: number[] = []
  let ema = 0
  points.forEach((p, i) => {
    ema = i === 0 ? p.weight : ALPHA * p.weight + (1 - ALPHA) * ema
    trend.push(ema)
  })
  return trend
}

interface Props {
  points: WeightPoint[] // ascending by date
  unit: string
  height?: number
  showAxes?: boolean
  interactive?: boolean
}

export default function WeightTrendChart({
  points,
  unit,
  height = 160,
  showAxes = true,
  interactive = true,
}: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  if (points.length === 0) return null

  const trend = computeTrend(points)

  const W = 320
  const H = height
  const padL = showAxes ? 34 : 6
  const padR = showAxes ? 12 : 6
  const padT = 18
  const padB = showAxes ? 22 : 8

  const allValues = [...points.map(p => p.weight), ...trend]
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const range = max - min || 1

  const x = (i: number) =>
    points.length === 1 ? W / 2 : padL + (i / (points.length - 1)) * (W - padL - padR)
  const y = (v: number) => padT + (1 - (v - min) / range) * (H - padT - padB)

  const trendPath = trend.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ')
  const lastIdx = points.length - 1

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive) return
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    let nearest = 0
    let best = Infinity
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(x(i) - px)
      if (d < best) {
        best = d
        nearest = i
      }
    }
    setHoverIdx(nearest)
  }

  const gridValues = [...new Map([min, (min + max) / 2, max].map(v => [Math.round(v), v])).values()]

  return (
    <div className="relative">
      {interactive && hoverIdx !== null && (
        <div
          className="absolute -top-1 z-10 -translate-x-1/2 bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1 text-xs whitespace-nowrap pointer-events-none shadow-lg"
          style={{ left: `${(x(hoverIdx) / W) * 100}%` }}
        >
          <span className="text-slate-400">{formatDate(points[hoverIdx].date)} · </span>
          <span className="font-bold text-white">{points[hoverIdx].weight} {unit}</span>
          <span className="text-blue-300"> · trend {Math.round(trend[hoverIdx] * 10) / 10}</span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto touch-none"
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={() => setHoverIdx(null)}
      >
        {showAxes &&
          gridValues.map((v, i) => (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#1e293b" strokeWidth="1" />
              <text x={padL - 5} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#64748b">
                {Math.round(v)}
              </text>
            </g>
          ))}

        {interactive && hoverIdx !== null && (
          <line x1={x(hoverIdx)} x2={x(hoverIdx)} y1={padT - 6} y2={H - padB} stroke="#475569" strokeWidth="1" />
        )}

        {/* Raw daily weigh-ins — faint dots */}
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.weight)} r={i === hoverIdx ? 3.5 : 2} fill="#64748b" opacity={0.7} />
        ))}

        {/* Smoothed trend — the signal */}
        <path d={trendPath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Emphasize latest trend point */}
        <circle cx={x(lastIdx)} cy={y(trend[lastIdx])} r={4} fill="#3b82f6" stroke="#0f172a" strokeWidth="2" />

        {showAxes && (
          <>
            <text x={padL} y={H - 6} fontSize="9" fill="#64748b">
              {formatDate(points[0].date)}
            </text>
            {points.length > 1 && (
              <text x={W - padR} y={H - 6} textAnchor="end" fontSize="9" fill="#64748b">
                {formatDate(points[lastIdx].date)}
              </text>
            )}
          </>
        )}
      </svg>
    </div>
  )
}
