'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatDate, getDateString, getWeekStartDateString } from '@/lib/utils'

interface UserSettings {
  daily_calorie_target: number
  daily_protein_target: number
  starting_weight: number
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

        // Load latest weight
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
    return <div className="text-center py-8">Loading...</div>
  }

  const calorieProgress = settings 
    ? Math.round((todayNutrition.calories / settings.daily_calorie_target) * 100)
    : 0
  const proteinProgress = settings
    ? Math.round((todayNutrition.protein / settings.daily_protein_target) * 100)
    : 0

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-1">Today</h1>
<p className="text-slate-400">{formatDate(getDateString(new Date()))}</p>
      </div>

      {/* Today's Workout */}
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <h2 className="text-sm font-semibold text-slate-400 mb-3">TODAY'S WORKOUT</h2>
        {todayWorkout ? (
          <div className="space-y-3">
            <p className="text-lg font-semibold">{todayWorkout.name}</p>
            <button
              onClick={() => router.push(`/workouts?session=${todayWorkout.id}`)}
              className={`w-full py-2 rounded-lg font-semibold transition ${
                todayWorkout.completed
                  ? 'bg-green-900 text-green-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {todayWorkout.completed ? '✓ Completed' : 'Log Workout'}
            </button>
          </div>
        ) : (
          <p className="text-slate-400">No workout scheduled for today</p>
        )}
      </div>

      {/* Weight & Metrics */}
      {latestWeight && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 mb-2">CURRENT WEIGHT</p>
            <p className="text-2xl font-bold">{latestWeight} lbs</p>
            <p className="text-xs text-slate-400 mt-1">from 173 lbs</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
            <p className="text-xs font-semibold text-slate-400 mb-2">PROGRESS</p>
            <p className="text-2xl font-bold text-green-400">{(173 - latestWeight).toFixed(1)} lbs</p>
            <p className="text-xs text-slate-400 mt-1">lost</p>
          </div>
        </div>
      )}

      {/* Nutrition */}
      {settings && (
        <div className="space-y-3">
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-semibold text-slate-400">CALORIES</p>
              <p className="text-sm font-semibold">{todayNutrition.calories} / {settings.daily_calorie_target}</p>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition"
                style={{ width: `${Math.min(calorieProgress, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">{calorieProgress}% of target</p>
          </div>

          <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-semibold text-slate-400">PROTEIN</p>
              <p className="text-sm font-semibold">{todayNutrition.protein} / {settings.daily_protein_target}g</p>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full transition"
                style={{ width: `${Math.min(proteinProgress, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">{proteinProgress}% of target</p>
          </div>
        </div>
      )}

      {/* Weekly Weight Trend */}
      {weeklyWeights.length > 1 && (
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
          <h2 className="text-sm font-semibold text-slate-400 mb-4">WEIGHT TREND (8 weeks)</h2>
          <div className="space-y-2">
            {weeklyWeights.map((w, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{w.date}</span>
                <span className="font-semibold">{w.weight} lbs</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => router.push('/nutrition')}
          className="bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm font-semibold transition"
        >
          Log Nutrition
        </button>
        <button
          onClick={() => router.push('/checkins')}
          className="bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm font-semibold transition"
        >
          Weekly Check-in
        </button>
      </div>
    </div>
  )
}