'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatDate, formatDateFull, getDateString } from '@/lib/utils'

interface UserSettings {
  daily_calorie_target: number
  daily_protein_target: number
  starting_weight: number
  goal_weight?: number
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

function WeightSparkline({ weights }: { weights: number[] }) {
  if (weights.length < 2) return null

  const w = 300
  const h = 60
  const pad = 6
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = max - min || 1

  const points = weights.map((weight, i) => {
    const x = pad + (i / (weights.length - 1)) * (w - pad * 2)
    const y = pad + (1 - (weight - min) / range) * (h - pad * 2)
    return { x, y }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16" preserveAspectRatio="none">
      <path d={areaPath} fill="rgb(34 197 94 / 0.15)" />
      <path d={linePath} fill="none" stroke="rgb(74 222 128)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.5} fill="rgb(74 222 128)" />
      ))}
    </svg>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [todayWorkout, setTodayWorkout] = useState<TodayWorkout | null>(null)
  const [todayNutrition, setTodayNutrition] = useState<NutritionLog>({ calories: 0, protein: 0 })
  const [latestWeight, setLatestWeight] = useState<number | null>(null)
  const [weeklyWeights, setWeeklyWeights] = useState<Array<{ date: string; weight: number }>>([])
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

        setUser(authUser)

        // Load user settings
        const { data: settingsData } = await client
          .from('user_settings')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (settingsData) {
          setSettings(settingsData)
        }

        // Load today's workout
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
            name: (sessionsData as any).workout_templates?.name || 'Workout',
            completed: sessionsData.completed
          })
        }

        // Load today's nutrition
        const { data: nutritionData } = await client
          .from('nutrition_logs')
          .select('calories, protein')
          .eq('user_id', authUser.id)
          .eq('date', today)
          .single()

        if (nutritionData) {
          setTodayNutrition(nutritionData)
        }

        // Load latest weights (8 weeks)
        const { data: checkinsData } = await client
          .from('weekly_checkins')
          .select('weight, week_start_date')
          .eq('user_id', authUser.id)
          .order('week_start_date', { ascending: false })
          .limit(8)

        if (checkinsData && checkinsData.length > 0) {
          setLatestWeight(checkinsData[0].weight)
          setWeeklyWeights(checkinsData.reverse().map(c => ({
            date: formatDate(c.week_start_date),
            weight: c.weight
          })))
        }

      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router])

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading...</div>
  }

  const calorieProgress = settings
    ? Math.round((todayNutrition.calories / settings.daily_calorie_target) * 100)
    : 0
  const proteinProgress = settings
    ? Math.round((todayNutrition.protein / settings.daily_protein_target) * 100)
    : 0

  const startingWeight = settings?.starting_weight ?? 0
  const weightLost = latestWeight !== null && startingWeight
    ? (startingWeight - latestWeight)
    : null
  const goalWeight = settings?.goal_weight
  const goalProgress = goalWeight && latestWeight !== null && startingWeight > goalWeight
    ? Math.min(Math.max(((startingWeight - latestWeight) / (startingWeight - goalWeight)) * 100, 0), 100)
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

      {/* Today's Workout */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Today's Workout
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

      {/* Weight & Progress */}
      {latestWeight !== null && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Current Weight
            </p>
            <p className="text-3xl font-bold text-white">
              {latestWeight}
              <span className="text-sm font-semibold text-slate-400 ml-1">lbs</span>
            </p>
            {startingWeight > 0 && (
              <p className="text-xs text-slate-400 mt-1">from {startingWeight} lbs</p>
            )}
          </div>
          <div className="bg-gradient-to-br from-green-900/50 to-slate-900 rounded-2xl p-4 border border-green-800/40">
            <p className="text-[11px] font-semibold text-green-300 uppercase tracking-wide mb-1.5">
              Progress
            </p>
            <p className="text-3xl font-bold text-green-400">
              {weightLost !== null ? Math.abs(weightLost).toFixed(1) : '—'}
              <span className="text-sm font-semibold text-green-300/70 ml-1">lbs</span>
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
            Today's Nutrition
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

      {/* Weekly Weight Trend */}
      {weeklyWeights.length > 1 && (
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
          <div className="flex justify-between items-baseline mb-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              Weight Trend
            </p>
            <p className="text-xs text-slate-500">
              {weeklyWeights[0].date} – {weeklyWeights[weeklyWeights.length - 1].date}
            </p>
          </div>

          <WeightSparkline weights={weeklyWeights.map(w => w.weight)} />

          <div className="flex justify-between mt-2">
            <p className="text-sm font-bold text-slate-300">
              {weeklyWeights[0].weight} <span className="text-xs font-semibold text-slate-500">lbs</span>
            </p>
            <p className="text-sm font-bold text-green-400">
              {weeklyWeights[weeklyWeights.length - 1].weight} <span className="text-xs font-semibold text-green-500/70">lbs</span>
            </p>
          </div>
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
          ⚖️ Weekly Check-in
        </button>
      </div>
    </div>
  )
}
