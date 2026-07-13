'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { getDateString, formatDate, type WeightUnit } from '@/lib/utils'
import { useToast } from '@/components/Toast'
import WeightTrendChart, { computeTrend } from '@/components/checkins/WeightTrendChart'

interface DailyWeight {
  id: string
  date: string
  weight: number
}

interface UserSettings {
  starting_weight: number
  weight_unit?: WeightUnit
}

export default function Checkins() {
  const router = useRouter()
  const toast = useToast()
  const [entries, setEntries] = useState<DailyWeight[]>([]) // newest first
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const load = async () => {
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
          .select('starting_weight, weight_unit')
          .eq('id', authUser.id)
          .single()

        if (settingsData) setSettings(settingsData)

        const { data } = await client
          .from('daily_weights')
          .select('*')
          .eq('user_id', authUser.id)
          .order('date', { ascending: false })

        setEntries(data || [])
      } catch (error) {
        console.error('Error loading weights:', error)
        toast('error', 'Could not load your weight history.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !weight || saving) return

    setSaving(true)
    try {
      const client = createClient()
      const today = getDateString()

      const { data, error } = await client
        .from('daily_weights')
        .upsert(
          [{ user_id: user.id, date: today, weight: parseFloat(weight) }],
          { onConflict: 'user_id,date' }
        )
        .select()

      if (error) throw error
      if (data) {
        setEntries([data[0], ...entries.filter(en => en.date !== today)])
        setWeight('')
        toast('success', "Logged today's weight")
      }
    } catch (error) {
      console.error('Error saving weight:', error)
      toast('error', 'Could not save your weight.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading...</div>
  }

  const unit = settings?.weight_unit || 'lbs'
  const today = getDateString()
  const loggedToday = entries.some(en => en.date === today)

  // Ascending for the chart + trend
  const ascending = [...entries].reverse()
  const trend = computeTrend(ascending.map(en => ({ date: en.date, weight: en.weight })))
  const latestTrend = trend.length > 0 ? Math.round(trend[trend.length - 1] * 10) / 10 : null

  const totalChange =
    settings && latestTrend !== null ? settings.starting_weight - latestTrend : null

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 space-y-4">
      <h1 className="text-2xl font-bold text-white pt-2">Weight</h1>

      {/* Quick daily weigh-in */}
      <form onSubmit={handleSubmit} className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
          {loggedToday ? "Update Today's Weight" : "Log Today's Weight"}
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={unit}
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-center text-lg font-bold text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
            required
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold px-6 rounded-lg transition"
          >
            {saving ? '…' : loggedToday ? 'Update' : 'Save'}
          </button>
        </div>
      </form>

      {/* Trend summary + chart */}
      {ascending.length > 0 && (
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
          <div className="flex justify-between items-baseline mb-3">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Trend Weight</p>
              <p className="text-3xl font-bold text-white">
                {latestTrend}
                <span className="text-base font-semibold text-slate-400 ml-1">{unit}</span>
              </p>
            </div>
            {totalChange !== null && Math.abs(totalChange) >= 0.1 && (
              <div className="text-right">
                <p className="text-[11px] font-semibold text-green-300 uppercase tracking-wide">
                  Total {totalChange > 0 ? 'Lost' : 'Gained'}
                </p>
                <p className="text-2xl font-bold text-green-400">
                  {Math.abs(totalChange).toFixed(1)}
                  <span className="text-sm font-semibold text-green-300/70 ml-1">{unit}</span>
                </p>
              </div>
            )}
          </div>

          <WeightTrendChart
            points={ascending.map(en => ({ date: en.date, weight: en.weight }))}
            unit={unit}
          />
          <p className="text-[11px] text-slate-500 mt-1.5 text-center">
            Faint dots are daily weigh-ins · the line is a smoothed 7-day trend
          </p>
        </div>
      )}

      {/* Entry list */}
      <div className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No weigh-ins yet — log your weight above</p>
        ) : (
          entries.map((en, index) => {
            const prev = entries[index + 1] // older
            const change = prev ? Number((en.weight - prev.weight).toFixed(1)) : null
            return (
              <div
                key={en.id}
                className="bg-slate-900 rounded-xl px-4 py-3 border border-slate-800 flex items-center justify-between"
              >
                <p className="text-sm font-semibold text-slate-300">
                  {en.date === today ? 'Today' : formatDate(en.date)}
                </p>
                <p className="text-lg font-bold text-white">
                  {en.weight}
                  <span className="text-sm font-semibold text-slate-400 ml-1">{unit}</span>
                  {change !== null && change !== 0 && (
                    <span className={`text-sm font-bold ml-2 ${change < 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {change < 0 ? '↓' : '↑'} {Math.abs(change)}
                    </span>
                  )}
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
