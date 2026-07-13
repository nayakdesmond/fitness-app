'use client'

import { useState } from 'react'
import type { WeightUnit } from '@/lib/utils'

export interface OnboardingValues {
  weight_unit: WeightUnit
  starting_weight: number
  goal_weight: number
  daily_calorie_target: number
  daily_protein_target: number
}

interface Props {
  initial?: Partial<OnboardingValues>
  saving?: boolean
  onFinish: (values: OnboardingValues) => void
}

export default function OnboardingWizard({ initial, saving = false, onFinish }: Props) {
  const [step, setStep] = useState(0)
  const [unit, setUnit] = useState<WeightUnit>(initial?.weight_unit || 'lbs')
  const [currentWeight, setCurrentWeight] = useState(initial?.starting_weight?.toString() || '')
  const [goalWeight, setGoalWeight] = useState(initial?.goal_weight?.toString() || '')
  const [calories, setCalories] = useState(initial?.daily_calorie_target?.toString() || '')
  const [protein, setProtein] = useState(initial?.daily_protein_target?.toString() || '')

  const cw = parseFloat(currentWeight)
  const gw = parseFloat(goalWeight)
  const step1Valid = cw > 0 && gw > 0
  const step2Valid = parseInt(calories) > 0 && parseInt(protein) > 0

  // Rough starting points a user can adjust: 12 kcal/lb of bodyweight for a
  // cut, ~1 g protein per lb. Converted to kg where needed.
  const suggest = () => {
    const lbs = unit === 'kg' ? cw * 2.20462 : cw
    setCalories(String(Math.round((lbs * 12) / 10) * 10))
    setProtein(String(Math.round(lbs)))
  }

  const finish = () => {
    if (!step1Valid || !step2Valid) return
    onFinish({
      weight_unit: unit,
      starting_weight: cw,
      goal_weight: gw,
      daily_calorie_target: parseInt(calories),
      daily_protein_target: parseInt(protein),
    })
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <p className="font-display uppercase tracking-wide text-neutral-500 text-sm mb-6">Train with Dara</p>
      <div className="mb-6">
        <h1 className="text-3xl font-display uppercase tracking-wide text-white mb-1">
          {step === 0 ? 'Welcome 👋' : 'Daily targets'}
        </h1>
        <p className="text-neutral-400">
          {step === 0
            ? "Let's set up your goals — this takes 20 seconds."
            : 'Set the daily numbers you want to hit.'}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mb-6">
        {[0, 1].map(i => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-white' : 'bg-neutral-700'}`}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-neutral-200 mb-2">Weight unit</label>
            <div className="grid grid-cols-2 gap-2">
              {(['lbs', 'kg'] as const).map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`py-2.5 rounded-lg font-semibold transition border ${
                    unit === u
                      ? 'bg-white border-white text-black'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {u === 'lbs' ? 'Pounds (lbs)' : 'Kilograms (kg)'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-200 mb-2">
              Current weight ({unit})
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={currentWeight}
              onChange={e => setCurrentWeight(e.target.value)}
              placeholder="0.0"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white focus:border-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-200 mb-2">
              Goal weight ({unit})
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={goalWeight}
              onChange={e => setGoalWeight(e.target.value)}
              placeholder="0.0"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white focus:border-white focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setStep(1)}
            disabled={!step1Valid}
            className="w-full bg-white hover:bg-neutral-200 disabled:bg-neutral-700 disabled:text-neutral-500 text-black font-bold py-3 rounded-lg transition"
          >
            Next
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-neutral-200 mb-2">Daily calorie target</label>
            <input
              type="number"
              inputMode="numeric"
              value={calories}
              onChange={e => setCalories(e.target.value)}
              placeholder="e.g. 2000"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white focus:border-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-200 mb-2">Daily protein target (g)</label>
            <input
              type="number"
              inputMode="numeric"
              value={protein}
              onChange={e => setProtein(e.target.value)}
              placeholder="e.g. 170"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white focus:border-white focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={suggest}
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2.5 rounded-lg text-sm transition border border-neutral-700"
          >
            ✨ Suggest from my weight
          </button>
          <p className="text-xs text-neutral-500 -mt-2">
            A rough cut starting point (~12 cal &amp; 1 g protein per lb). Adjust to taste.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-3 rounded-lg transition border border-neutral-700"
            >
              Back
            </button>
            <button
              type="button"
              onClick={finish}
              disabled={!step2Valid || saving}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-neutral-700 disabled:text-neutral-500 text-white font-bold py-3 rounded-lg transition"
            >
              {saving ? 'Saving…' : 'Finish'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
