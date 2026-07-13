'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatDateFull, getDateString, type WeightUnit } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import WeightTrendChart, { computeTrend } from '@/components/checkins/WeightTrendChart'

interface UserSettings {
  daily_calorie_target: number
  daily_protein_target: number
  starting_weight: number
  goal_weight?: number
  weight_unit?: WeightUnit
}

interface TodayWorkout {
  id: string
  template_id: string
  name: string
  completed: boolean
}

interface NutritionLog {
  calories: number
  protein: number
}

interface WeightPoint {
  date: string
  weight: number
}

export default function Dashboard() {
  const router = useRouter()
  const toast = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [todayWorkout, setTodayWorkout] = useState<TodayWorkout | null>(null)
  const [todayNutrition, setTodayNutrition] = useState<NutritionLog>({ calories: 0, protein: 0 })
  const [weights, setWeights] = useState<WeightPoint[]>([]) // ascending by date
  const [weightInput, setWeightInput] = useState('')
  const [savingWeight, setSavingWeight] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const client = createClient()
        const { data: { user: authUser } } = await client.auth.getUser()

        if (!authUser) {
          router.push('/auth/login')
          return
        }

        setUserId(authUser.id)

        const { data: settingsData } = await client
          .from('user_settings')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (settingsData) setSettings(settingsData)

        const today = getDateString()
        const { data: sessionsData } = await client
          .from('workout_sessions')
          .select(`
            id,
            template_id,
            completed,
            workout_templates:template_id(name)
          `)
          .eq('user_id', authUser.id)
          .eq('date', today)
          .single()

        if (sessionsData) {
          setTodayWorkout({
            id: sessionsData.id,
            template_id: sessionsData.template_id,
            name: (sessionsData.workout_templates as unknown as { name?: string } | null)?.name || 'Workout',
            completed: sessionsData.completed
          })
        }

        const { data: nutritionData } = await client
          .from('nutrition_logs')
          .select('calories, protein')
          .eq('user_id', authUser.id)
          .eq('date', today)
          .single()

        if (nutritionData) setTodayNutrition(nutritionData)

        // Recent daily weights for the trend (most recent 60 days)
        const { data: weightData } = await client
          .from('daily_weights')
          .select('date, weight')
          .eq('user_id', authUser.id)
          .order('date', { ascending: false })
          .limit(60)

        if (weightData && weightData.length > 0) {
          setWeights([...weightData].reverse())
        }
      } catch (error) {
        console.error('Error loading dashboard:', error)
        toast('error', 'Could not load your dashboard.')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router, toast])

  const logWeight = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !weightInput || savingWeight) return

    setSavingWeight(true)
    try {
      const client = createClient()
      const today = getDateString()
      const value = parseFloat(weightInput)

      const { error } = await client
        .from('daily_weights')
        .upsert(
          [{ user_id: userId, date: today, weight: value }],
          { onConflict: 'user_id,date' }
        )

      if (error) throw error
      setWeights(prev => {
        const rest = prev.filter(w => w.date !== today)
        return [...rest, { date: today, weight: value }]
      })
      setWeightInput('')
      toast('success', "Logged today's weight")
    } catch (error) {
      console.error('Error logging weight:', error)
      toast('error', 'Could not save your weight.')
    } finally {
      setSavingWeight(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading...</div>
  }

  const unit = settings?.weight_unit || 'lbs'

  const calorieProgress = settings
    ? Math.round((todayNutrition.calories / settings.daily_calorie_target) * 100)
    : 0
  const proteinProgress = settings
    ? Math.round((todayNutrition.protein / settings.daily_protein_target) * 100)
    : 0

  const latestWeight = weights.length > 0 ? weights[weights.length - 1].weight : null
  const trend = computeTrend(weights)
  const latestTrend = trend.length > 0 ? Math.round(trend[trend.length - 1] * 10) / 10 : null
  const today = getDateString()
  const loggedToday = weights.some(w => w.date === today)

  const startingWeight = settings?.starting_weight ?? 0
  // Progress uses the smoothed trend, not a noisy single day
  const weightLost = latestTrend !== null && startingWeight ? startingWeight - latestTrend : null
  const goalWeight = settings?.goal_weight
  const goalProgress = goalWeight && latestTrend !== null && startingWeight > goalWeight
    ? Math.min(Math.max(((startingWeight - latestTrend) / (startingWeight - goalWeight)) * 100, 0), 100)
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 space-y-5">
      {/* Header */}
      <div className="pt-2">
        <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider mb-1">
          {formatDateFull(getDateString())}
        </p>
        <h1 className="text-3xl font-bold text-white">Today</h1>
      </div>

      {/* Today&apos;s Workout */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Today&apos;s Workout
        </p>
        {todayWorkout ? (
          <div className="space-y-3">
            <p className="text-xl font-bold text-white">{todayWorkout.name}</p>
            <button
              onClick={() => router.push(`/workouts?session=${todayWorkout.id}`)}
              className={`w-full py-3 rounded-xl font-bold transition ${
                todayWorkout.completed
                  ? 'bg-green-900/60 text-green-300 border border-green-800'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-900/30'
              }`}
            >
              {todayWorkout.completed ? '✓ Completed' : 'Log Workout'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-slate-400">No workout logged today</p>
            <button
              onClick={() => router.push('/workouts')}
              className="w-full py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-lg shadow-blue-900/30"
            >
              Start a Workout
            </button>
          </div>
        )}
      </div>

      {/* Quick daily weigh-in */}
      <form onSubmit={logWeight} className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
          {loggedToday ? "Today's Weight — logged, tap to update" : "Log Today's Weight"}
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder={latestWeight !== null ? String(latestWeight) : unit}
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-center text-lg font-bold text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={savingWeight}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold px-6 rounded-lg transition"
          >
            {savingWeight ? '…' : 'Save'}
          </button>
        </div>
      </form>

      {/* Weight & Progress */}
      {latestWeight !== null && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Current Weight
            </p>
            <p className="text-3xl font-bold text-white">
              {latestWeight}
              <span className="text-sm font-semibold text-slate-400 ml-1">{unit}</span>
            </p>
            {latestTrend !== null && (
              <p className="text-xs text-slate-400 mt-1">trend {latestTrend} {unit}</p>
            )}
          </div>
          <div className="bg-gradient-to-br from-green-900/50 to-slate-900 rounded-2xl p-4 border border-green-800/40">
            <p className="text-[11px] font-semibold text-green-300 uppercase tracking-wide mb-1.5">
              Progress
            </p>
            <p className="text-3xl font-bold text-green-400">
              {weightLost !== null ? Math.abs(weightLost).toFixed(1) : '—'}
              <span className="text-sm font-semibold text-green-300/70 ml-1">{unit}</span>
            </p>
            <p className="text-xs text-green-300/70 mt-1">
              {weightLost !== null && weightLost >= 0 ? 'lost' : 'gained'}
              {goalProgress !== null && ` · ${Math.round(goalProgress)}% to goal`}
            </p>
          </div>
        </div>
      )}

      {/* Nutrition */}
      {settings && (
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-4">
            Today&apos;s Nutrition
          </p>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <p className="text-sm font-semibold text-slate-300">Calories</p>
                <p className="text-lg font-bold text-white">
                  {todayNutrition.calories}
                  <span className="text-sm font-semibold text-slate-400"> / {settings.daily_calorie_target}</span>
                </p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5">
                <div
                  className="bg-blue-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${Math.min(calorieProgress, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">{calorieProgress}% of target</p>
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-2">
                <p className="text-sm font-semibold text-slate-300">Protein</p>
                <p className="text-lg font-bold text-white">
                  {todayNutrition.protein}
                  <span className="text-sm font-semibold text-slate-400"> / {settings.daily_protein_target}g</span>
                </p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5">
                <div
                  className="bg-red-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${Math.min(proteinProgress, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">{proteinProgress}% of target</p>
            </div>
          </div>
        </div>
      )}

      {/* Weight Trend */}
      {weights.length > 1 && (
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
          <div className="flex justify-between items-baseline mb-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              Weight Trend
            </p>
            <button onClick={() => router.push('/checkins')} className="text-xs text-blue-400 font-semibold">
              View all →
            </button>
          </div>
          <WeightTrendChart points={weights} unit={unit} height={80} showAxes={false} interactive={false} />
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => router.push('/nutrition')}
          className="bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-sm font-bold transition border border-slate-700"
        >
          🍎 Log Nutrition
        </button>
        <button
          onClick={() => router.push('/checkins')}
          className="bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-sm font-bold transition border border-slate-700"
        >
          ⚖️ Weight Log
        </button>
      </div>
    </div>
  )
}
