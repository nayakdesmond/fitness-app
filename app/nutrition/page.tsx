'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getDateString, formatDate } from '@/lib/utils'

interface NutritionLog {
  id: string
  date: string
  calories: number
  protein: number
}

interface UserSettings {
  daily_calorie_target: number
  daily_protein_target: number
}

export default function Nutrition() {
  const router = useRouter()
  const [logs, setLogs] = useState<NutritionLog[]>([])
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const loadNutrition = async () => {
      try {
        const client = createClient()
        const { data: { user: authUser } } = await client.auth.getUser()
        
        if (!authUser) {
          router.push('/auth/login')
          return
        }

        setUser(authUser)

        // Load settings
        const { data: settingsData } = await client
          .from('user_settings')
          .select('daily_calorie_target, daily_protein_target')
          .eq('id', authUser.id)
          .single()

        if (settingsData) {
          setSettings(settingsData)
        }

        // Load logs
        const { data } = await client
          .from('nutrition_logs')
          .select('*')
          .eq('user_id', authUser.id)
          .order('date', { ascending: false })
          .limit(14)

        setLogs(data || [])
      } catch (error) {
        console.error('Error loading nutrition:', error)
      } finally {
        setLoading(false)
      }
    }

    loadNutrition()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const client = createClient()
      const today = getDateString()

      const { data } = await client
        .from('nutrition_logs')
        .upsert([{
          user_id: user.id,
          date: today,
          calories: parseInt(calories) || 0,
          protein: parseInt(protein) || 0
        }])
        .select()

      if (data) {
        const updatedLogs = logs.filter(l => l.date !== today)
        setLogs([data[0], ...updatedLogs])
        setCalories('')
        setProtein('')
      }
    } catch (error) {
      console.error('Error saving nutrition:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  const todayLog = logs.find(l => l.date === getDateString())

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-4">
      <h1 className="text-2xl font-bold">Nutrition</h1>

      {/* Today's Log */}
      {todayLog && settings && (
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
          <h2 className="font-semibold mb-4">Today</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <p className="text-sm text-slate-400">Calories</p>
                <p className="text-sm font-semibold">{todayLog.calories} / {settings.daily_calorie_target}</p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min((todayLog.calories / settings.daily_calorie_target) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <p className="text-sm text-slate-400">Protein</p>
                <p className="text-sm font-semibold">{todayLog.protein} / {settings.daily_protein_target}g</p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full"
                  style={{ width: `${Math.min((todayLog.protein / settings.daily_protein_target) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <h2 className="font-semibold mb-4">Log Nutrition</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Calories
            </label>
            <input
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="0"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Protein (g)
            </label>
            <input
              type="number"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              placeholder="0"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
          >
            Log
          </button>
        </form>
      </div>

      {/* History */}
      <div className="space-y-3">
        <h2 className="font-semibold">History</h2>
        {logs.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No logs yet</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <p className="text-sm text-slate-400 mb-2">{formatDate(log.date)}</p>
              <div className="flex justify-between text-sm">
                <span>Calories: {log.calories}</span>
                <span>Protein: {log.protein}g</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}