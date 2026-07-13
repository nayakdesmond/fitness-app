'use client'

import RestTimerBar from './RestTimerBar'
import type { WeightUnit } from '@/lib/utils'

export interface Exercise {
  id: string
  name: string
  target_reps?: number
  display_order: number
}

export interface WorkoutSet {
  id?: string
  exercise_id: string
  exercise_name: string
  set_number: number
  reps?: number
  weight?: number
  rpe?: number
  notes?: string
}

export interface WorkoutSession {
  id: string
  template_id: string
  template_name: string
  date: string
  completed: boolean
  sets: WorkoutSet[]
}

export interface PrevSet {
  set_number: number
  reps?: number
  weight?: number
  rpe?: number
}

interface Props {
  session: WorkoutSession
  exercises: Exercise[]
  prevSets: Record<string, PrevSet[]>
  weightUnit: WeightUnit
  onSaveSet: (exerciseId: string, setNumber: number, data: Record<string, number>) => void
  onComplete: () => void
  onClose: () => void
}

export default function ActiveSessionView({
  session,
  exercises,
  prevSets,
  weightUnit,
  onSaveSet,
  onComplete,
  onClose,
}: Props) {
  const unitShort = weightUnit === 'kg' ? 'kg' : 'lb'

  return (
    <div className="max-w-2xl mx-auto px-4 pb-40 space-y-5">
      <div className="flex justify-between items-center pt-2">
        <div>
          <p className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
            In Progress
          </p>
          <h1 className="text-2xl font-display uppercase tracking-wide text-white">{session.template_name}</h1>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition text-lg"
          aria-label="Close workout"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {exercises.map((exercise) => {
          const lastSets = prevSets[exercise.id]
          return (
            <div key={exercise.id} className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
              <h3 className="font-bold text-lg text-white">{exercise.name}</h3>

              {/* Progressive overload hint */}
              {lastSets && lastSets.length > 0 ? (
                <p className="text-sm text-neutral-300 mt-1 mb-4">
                  Last time:{' '}
                  <span className="font-semibold">
                    {lastSets
                      .filter(s => s.reps || s.weight)
                      .map(s => `${s.weight ?? '–'} ${unitShort} × ${s.reps ?? '–'}`)
                      .join(' · ') || 'logged, no data'}
                  </span>
                  {' '}— try to beat it 💪
                </p>
              ) : (
                <p className="text-sm text-neutral-500 mt-1 mb-4">First time logging this — set your baseline</p>
              )}

              <div className="space-y-3">
                {[1, 2, 3].map((setNum) => (
                  <div key={setNum} className="flex items-center gap-3">
                    <div className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-neutral-800 border border-neutral-700">
                      <span className="text-sm font-bold text-neutral-300">{setNum}</span>
                    </div>

                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">
                          Reps
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder={String(lastSets?.find(s => s.set_number === setNum)?.reps ?? 0)}
                          defaultValue={session.sets.find(s => s.exercise_id === exercise.id && s.set_number === setNum)?.reps || ''}
                          onChange={(e) => {
                            const val = e.target.value
                            if (val) onSaveSet(exercise.id, setNum, { reps: parseInt(val) })
                          }}
                          className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-2 py-2.5 text-center text-base font-bold text-white placeholder-neutral-600 focus:border-white focus:outline-none focus:ring-1 focus:ring-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">
                          {weightUnit === 'kg' ? 'Kg' : 'Lbs'}
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder={String(lastSets?.find(s => s.set_number === setNum)?.weight ?? 0)}
                          defaultValue={session.sets.find(s => s.exercise_id === exercise.id && s.set_number === setNum)?.weight || ''}
                          onChange={(e) => {
                            const val = e.target.value
                            if (val) onSaveSet(exercise.id, setNum, { weight: parseFloat(val) })
                          }}
                          className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-2 py-2.5 text-center text-base font-bold text-white placeholder-neutral-600 focus:border-white focus:outline-none focus:ring-1 focus:ring-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1">
                          RPE
                        </label>
                        <select
                          defaultValue={session.sets.find(s => s.exercise_id === exercise.id && s.set_number === setNum)?.rpe || ''}
                          onChange={(e) => {
                            const val = e.target.value
                            if (val) onSaveSet(exercise.id, setNum, { rpe: parseInt(val) })
                          }}
                          className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-1 py-2.5 text-center text-base font-bold text-white focus:border-white focus:outline-none focus:ring-1 focus:ring-white"
                        >
                          <option value="">-</option>
                          {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={onComplete}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-base py-3.5 rounded-xl transition shadow-lg shadow-green-900/30"
      >
        ✓ Complete Workout
      </button>

      <RestTimerBar />
    </div>
  )
}
