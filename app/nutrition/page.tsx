'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { getDateString, formatDate } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import FoodSearch from '@/components/nutrition/FoodSearch'

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
  const toast = useToast()
  const [logs, setLogs] = useState<NutritionLog[]>([])
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

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

        const { data: settingsData } = await client
          .from('user_settings')
          .select('daily_calorie_target, daily_protein_target')
          .eq('id', authUser.id)
          .single()

        if (settingsData) {
          setSettings(settingsData)
        }

        const { data } = await client
          .from('nutrition_logs')
          .select('*')
          .eq('user_id', authUser.id)
          .order('date', { ascending: false })
          .limit(14)

        setLogs(data || [])
      } catch (error) {
        console.error('Error loading nutrition:', error)
        toast('error', 'Could not load your nutrition logs.')
      } finally {
        setLoading(false)
      }
    }

    loadNutrition()
  }, [router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const client = createClient()
      const today = getDateString()

      const { data, error } = await client
        .from('nutrition_logs')
        .upsert([{
          user_id: user.id,
          date: today,
          calories: parseInt(calories) || 0,
          protein: parseInt(protein) || 0
        }])
        .select()

      if (error) throw error
      if (data) {
        const updatedLogs = logs.filter(l => l.date !== today)
        setLogs([data[0], ...updatedLogs])
        setCalories('')
        setProtein('')
      }
    } catch (error) {
      console.error('Error saving nutrition:', error)
      toast('error', 'Could not save your nutrition entry.')
    }
  }

  const addFood = async (cals: number, prot: number, label: string) => {
    if (!user) return

    try {
      const client = createClient()
      const today = getDateString()
      const current = logs.find(l => l.date === today)

      const { data, error } = await client
        .from('nutrition_logs')
        .upsert([{
          user_id: user.id,
          date: today,
          calories: (current?.calories || 0) + cals,
          protein: (current?.protein || 0) + prot
        }])
        .select()

      if (error) throw error
      if (data) {
        setLogs([data[0], ...logs.filter(l => l.date !== today)])
        toast('success', `Added ${label} — ${cals} cal, ${prot}g protein`)
      }
    } catch (error) {
      console.error('Error adding food:', error)
      toast('error', 'Could not add the food to your log.')
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-neutral-400">Loading...</div>
  }

  const todayLog = logs.find(l => l.date === getDateString())

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 space-y-4">
      <h1 className="text-2xl font-display uppercase tracking-wide text-white pt-2">Nutrition</h1>

      {/* Today&apos;s Progress */}
      {todayLog && settings && (
        <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-4">Today&apos;s Progress</p>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <p className="text-sm font-semibold text-neutral-300">Calories</p>
                <p className="text-lg font-bold text-white">
                  {todayLog.calories}
                  <span className="text-sm font-semibold text-neutral-400"> / {settings.daily_calorie_target}</span>
                </p>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-2.5">
                <div
                  className="bg-blue-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${Math.min((todayLog.calories / settings.daily_calorie_target) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-2">
                <p className="text-sm font-semibold text-neutral-300">Protein</p>
                <p className="text-lg font-bold text-white">
                  {todayLog.protein}
                  <span className="text-sm font-semibold text-neutral-400"> / {settings.daily_protein_target}g</span>
                </p>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-2.5">
                <div
                  className="bg-red-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${Math.min((todayLog.protein / settings.daily_protein_target) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Food search — adds to today's totals */}
      <FoodSearch onAdd={addFood} />

      {/* Input Form */}
      <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
        <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-4">Log Today&apos;s Totals</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">
                Calories
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="0"
                className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2.5 text-center text-lg font-bold text-white placeholder-neutral-600 focus:border-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">
                Protein (g)
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="0"
                className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2.5 text-center text-lg font-bold text-white placeholder-neutral-600 focus:border-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-white hover:bg-neutral-200 text-black font-bold py-2.5 rounded-lg transition"
          >
            Log
          </button>
        </form>
      </div>

      {/* History */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide pt-2">History</p>
        {logs.length === 0 ? (
          <p className="text-neutral-400 text-center py-8">No logs yet — log today&apos;s totals above</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800 flex items-center justify-between">
              <p className="text-sm font-semibold text-neutral-400">{formatDate(log.date)}</p>
              <div className="flex gap-6">
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">Cals</p>
                  <p className="text-lg font-bold text-white">{log.calories}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">Protein</p>
                  <p className="text-lg font-bold text-white">{log.protein}<span className="text-sm text-neutral-400">g</span></p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
