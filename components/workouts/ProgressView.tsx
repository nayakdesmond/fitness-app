'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatDate, type WeightUnit } from '@/lib/utils'
import { useToast } from '@/components/Toast'

interface TrendPoint {
  date: string
  best: number
  e1rm: number
}

interface ExerciseTrend {
  id: string
  name: string
  points: TrendPoint[]
}

type Metric = 'best' | 'e1rm'

// Epley estimated one-rep max; a 1-rep set is already a true 1RM
const epley = (weight: number, reps: number | null) =>
  reps && reps > 1 ? weight * (1 + reps / 30) : weight

function buildTrends(
  rows: Array<{
    exercise_id: string
    weight: number | null
    reps: number | null
    exercises: { name?: string } | null
    workout_sessions: { date: string } | null
  }>
): ExerciseTrend[] {
  const byExercise = new Map<string, { name: string; byDate: Map<string, { best: number; e1rm: number }> }>()

  for (const r of rows) {
    const date = r.workout_sessions?.date
    if (!date || !r.weight) continue
    let ex = byExercise.get(r.exercise_id)
    if (!ex) {
      ex = { name: r.exercises?.name || 'Exercise', byDate: new Map() }
      byExercise.set(r.exercise_id, ex)
    }
    const day = ex.byDate.get(date) || { best: 0, e1rm: 0 }
    day.best = Math.max(day.best, r.weight)
    day.e1rm = Math.max(day.e1rm, epley(r.weight, r.reps))
    ex.byDate.set(date, day)
  }

  return [...byExercise.entries()]
    .map(([id, ex]) => ({
      id,
      name: ex.name,
      points: [...ex.byDate.entries()]
        .map(([date, v]) => ({ date, best: v.best, e1rm: Math.round(v.e1rm * 10) / 10 }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    }))
    // Most recently trained first
    .sort((a, b) =>
      b.points[b.points.length - 1].date.localeCompare(a.points[a.points.length - 1].date)
    )
}

export function TrendChart({ points, unit }: { points: Array<{ date: string; value: number }>; unit: string }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const W = 320
  const H = 150
  const padL = 34
  const padR = 10
  const padT = 20
  const padB = 22

  const values = points.map(p => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const x = (i: number) =>
    points.length === 1 ? W / 2 : padL + (i / (points.length - 1)) * (W - padL - padR)
  const y = (v: number) => padT + (1 - (v - min) / range) * (H - padT - padB)

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ')

  const maxIdx = values.indexOf(max)
  const lastIdx = points.length - 1

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
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

  return (
    <div className="relative">
      {hoverIdx !== null && (
        <div
          className="absolute -top-1 z-10 -translate-x-1/2 bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1 text-xs whitespace-nowrap pointer-events-none shadow-lg"
          style={{ left: `${(x(hoverIdx) / W) * 100}%` }}
        >
          <span className="text-slate-400">{formatDate(points[hoverIdx].date)} · </span>
          <span className="font-bold text-white">{points[hoverIdx].value} {unit}</span>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto touch-none"
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={() => setHoverIdx(null)}
      >
        {/* Recessive grid: min / mid / max, deduped when the range is flat or tiny */}
        {[...new Map([min, (min + max) / 2, max].map(v => [Math.round(v), v])).values()].map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#1e293b" strokeWidth="1" />
            <text x={padL - 5} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#64748b">
              {Math.round(v)}
            </text>
          </g>
        ))}

        {/* Crosshair */}
        {hoverIdx !== null && (
          <line
            x1={x(hoverIdx)}
            x2={x(hoverIdx)}
            y1={padT - 6}
            y2={H - padB}
            stroke="#475569"
            strokeWidth="1"
          />
        )}

        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.value)}
            r={i === hoverIdx ? 5 : i === lastIdx ? 4 : 2.5}
            fill="#3b82f6"
            stroke="#0f172a"
            strokeWidth="2"
          />
        ))}

        {/* Selective direct labels: peak and latest only */}
        {[...new Set([maxIdx, lastIdx])].map(i =>
          i === hoverIdx ? null : (
            <text
              key={i}
              x={x(i)}
              y={y(points[i].value) - 8}
              textAnchor={i === lastIdx && points.length > 1 ? 'end' : 'middle'}
              fontSize="10"
              fontWeight="bold"
              fill="#cbd5e1"
            >
              {points[i].value}
            </text>
          )
        )}

        {/* X-axis: first and last date */}
        <text x={padL} y={H - 6} fontSize="9" fill="#64748b">
          {formatDate(points[0].date)}
        </text>
        {points.length > 1 && (
          <text x={W - padR} y={H - 6} textAnchor="end" fontSize="9" fill="#64748b">
            {formatDate(points[lastIdx].date)}
          </text>
        )}
      </svg>
    </div>
  )
}

export default function ProgressView({ userId, weightUnit }: { userId: string; weightUnit: WeightUnit }) {
  const toast = useToast()
  const [trends, setTrends] = useState<ExerciseTrend[]>([])
  const [metric, setMetric] = useState<Metric>('best')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const client = createClient()
        const { data, error } = await client
          .from('workout_sets')
          .select(`
            exercise_id,
            weight,
            reps,
            exercises(name),
            workout_sessions!inner(user_id, date)
          `)
          .eq('workout_sessions.user_id', userId)
          .not('weight', 'is', null)

        if (error) throw error
        setTrends(buildTrends((data || []) as unknown as Parameters<typeof buildTrends>[0]))
      } catch (error) {
        console.error('Error loading progress:', error)
        toast('error', 'Could not load your progress data.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [userId, toast])

  const unit = weightUnit

  const cards = useMemo(
    () =>
      trends.map(t => ({
        ...t,
        chartPoints: t.points.map(p => ({ date: p.date, value: metric === 'best' ? p.best : p.e1rm })),
      })),
    [trends, metric]
  )

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading...</div>
  }

  if (trends.length === 0) {
    return (
      <p className="text-slate-400 text-center py-8">
        No logged sets with weight yet — finish a workout and your strength trends will show up here.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {/* Metric filter — one row above the charts */}
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ['best', 'Best Set'],
            ['e1rm', 'Est. 1RM'],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`py-2 rounded-lg text-sm font-semibold transition border ${
              metric === m
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {cards.map(t => {
        const latest = t.chartPoints[t.chartPoints.length - 1].value
        const best = Math.max(...t.chartPoints.map(p => p.value))
        return (
          <div key={t.id} className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <div className="flex justify-between items-baseline mb-1">
              <h3 className="font-bold text-lg text-white">{t.name}</h3>
              <p className="text-xs text-slate-500">{t.points.length} session{t.points.length === 1 ? '' : 's'}</p>
            </div>
            <p className="text-sm text-slate-400 mb-3">
              Latest <span className="font-bold text-slate-200">{latest} {unit}</span>
              {' · '}All-time best <span className="font-bold text-slate-200">{best} {unit}</span>
            </p>
            <TrendChart points={t.chartPoints} unit={unit} />
            <details className="mt-2">
              <summary className="text-xs text-slate-500 cursor-pointer select-none">View data</summary>
              <table className="w-full mt-2 text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="py-1 font-semibold">Date</th>
                    <th className="py-1 font-semibold text-right">Best set ({unit})</th>
                    <th className="py-1 font-semibold text-right">Est. 1RM ({unit})</th>
                  </tr>
                </thead>
                <tbody>
                  {[...t.points].reverse().map(p => (
                    <tr key={p.date} className="border-t border-slate-800 text-slate-300">
                      <td className="py-1">{formatDate(p.date)}</td>
                      <td className="py-1 text-right font-semibold">{p.best}</td>
                      <td className="py-1 text-right font-semibold">{p.e1rm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
        )
      })}
    </div>
  )
}
