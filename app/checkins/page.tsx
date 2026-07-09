'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getWeekStartDateString, formatDate } from '@/lib/utils'

interface WeeklyCheckin {
  id: string
  week_start_date: string
  weight: number
  waist?: number
  sleep_quality?: number
  notes?: string
}

interface UserSettings {
  starting_weight: number
}

export default function Checkins() {
  const router = useRouter()
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([])
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [sleepQuality, setSleepQuality] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const loadCheckins = async () => {
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
          .select('starting_weight')
          .eq('id', authUser.id)
          .single()

        if (settingsData) {
          setSettings(settingsData)
        }

        const { data } = await client
          .from('weekly_checkins')
          .select('*')
          .eq('user_id', authUser.id)
          .order('week_start_date', { ascending: false })

        setCheckins(data || [])
      } catch (error) {
        console.error('Error loading checkins:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCheckins()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !weight) return

    try {
      const client = createClient()
      const weekStart = getWeekStartDateString()

      const { data } = await client
        .from('weekly_checkins')
        .upsert([{
          user_id: user.id,
          week_start_date: weekStart,
          weight: parseFloat(weight),
          waist: waist ? parseFloat(waist) : null,
          sleep_quality: sleepQuality ? parseInt(sleepQuality) : null,
          notes: notes || null
        }])
        .select()

      if (data) {
        const updatedCheckins = checkins.filter(c => c.week_start_date !== weekStart)
        setCheckins([data[0], ...updatedCheckins])
        setWeight('')
        setWaist('')
        setSleepQuality('')
        setNotes('')
        setShowForm(false)
      }
    } catch (error) {
      console.error('Error saving checkin:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading...</div>
  }

  const totalLost = settings && checkins.length > 0
    ? (settings.starting_weight - checkins[0].weight).toFixed(1)
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 space-y-4">
      <h1 className="text-2xl font-bold text-white pt-2">Weekly Check-ins</h1>

      {/* Total progress banner */}
      {totalLost && parseFloat(totalLost) !== 0 && (
        <div className="bg-gradient-to-r from-green-900/60 to-slate-900 rounded-2xl p-4 border border-green-800/50 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-green-300 uppercase tracking-wide">Total Progress</p>
            <p className="text-3xl font-bold text-white">
              {Math.abs(parseFloat(totalLost))}
              <span className="text-base font-semibold text-slate-300 ml-1.5">
                lbs {parseFloat(totalLost) > 0 ? 'lost' : 'gained'}
              </span>
            </p>
          </div>
          <span className="text-3xl">{parseFloat(totalLost) > 0 ? '🔥' : '📈'}</span>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Weight (lbs)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0.0"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-center text-lg font-bold text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Waist (inches)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                placeholder="0.0"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-center text-lg font-bold text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Sleep Quality (1-10)
            </label>
            <select
              value={sleepQuality}
              onChange={(e) => setSleepQuality(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-base font-semibold text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select...</option>
              {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did the week go?"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-base text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition"
            >
              Save
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-lg transition border border-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3.5 rounded-xl transition border border-slate-700"
        >
          + New Check-in
        </button>
      )}

      {/* Checkins List */}
      <div className="space-y-3">
        {checkins.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No check-ins yet — log your first weigh-in above</p>
        ) : (
          checkins.map((checkin, index) => {
            const prevCheckin = checkins[index + 1]
            const weightChange = prevCheckin ? (checkin.weight - prevCheckin.weight).toFixed(1) : null
            const waistChange = prevCheckin && checkin.waist && prevCheckin.waist
              ? (checkin.waist - prevCheckin.waist).toFixed(1)
              : null

            return (
              <div key={checkin.id} className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
                <p className="text-sm font-bold text-white mb-3">
                  Week of {formatDate(checkin.week_start_date)}
                </p>

                <div className="flex gap-6 mb-1">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Weight</p>
                    <p className="text-xl font-bold text-white">
                      {checkin.weight}
                      <span className="text-sm font-semibold text-slate-400 ml-1">lbs</span>
                      {weightChange && parseFloat(weightChange) !== 0 && (
                        <span className={`text-sm font-bold ml-2 ${parseFloat(weightChange) < 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {parseFloat(weightChange) < 0 ? '↓' : '↑'} {Math.abs(parseFloat(weightChange))}
                        </span>
                      )}
                    </p>
                  </div>

                  {checkin.waist && (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Waist</p>
                      <p className="text-xl font-bold text-white">
                        {checkin.waist}
                        <span className="text-sm font-semibold text-slate-400 ml-1">in</span>
                        {waistChange && parseFloat(waistChange) !== 0 && (
                          <span className={`text-sm font-bold ml-2 ${parseFloat(waistChange) < 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {parseFloat(waistChange) < 0 ? '↓' : '↑'} {Math.abs(parseFloat(waistChange))}
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {checkin.sleep_quality && (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Sleep</p>
                      <p className="text-xl font-bold text-white">
                        {checkin.sleep_quality}<span className="text-sm font-semibold text-slate-400">/10</span>
                      </p>
                    </div>
                  )}
                </div>

                {checkin.notes && (
                  <p className="text-sm text-slate-300 mt-3 pt-3 border-t border-slate-800">{checkin.notes}</p>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
