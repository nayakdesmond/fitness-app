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

        // Load settings
        const { data: settingsData } = await client
          .from('user_settings')
          .select('starting_weight')
          .eq('id', authUser.id)
          .single()

        if (settingsData) {
          setSettings(settingsData)
        }

        // Load checkins
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
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-4">
      <h1 className="text-2xl font-bold">Weekly Check-ins</h1>

      {/* Form */}
      {showForm && (
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-3">
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Weight (lbs)</label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Waist (inches)</label>
            <input
              type="number"
              step="0.1"
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Sleep Quality (1-10)</label>
            <select
              value={sleepQuality}
              onChange={(e) => setSleepQuality(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select...</option>
              {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did the week go?"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
            >
              Save
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-lg transition"
        >
          + New Check-in
        </button>
      )}

      {/* Checkins List */}
      <div className="space-y-3">
        {checkins.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No check-ins yet</p>
        ) : (
          checkins.map((checkin, index) => {
            const prevCheckin = checkins[index + 1]
            const weightChange = prevCheckin ? (checkin.weight - prevCheckin.weight).toFixed(1) : null
            const waistChange = prevCheckin && checkin.waist && prevCheckin.waist 
              ? (checkin.waist - prevCheckin.waist).toFixed(1)
              : null

            return (
              <div key={checkin.id} className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold">Week of {formatDate(checkin.week_start_date)}</h3>
                  {settings && (
                    <p className="text-sm text-slate-400">
                      {(173 - checkin.weight).toFixed(1)} lbs lost
                    </p>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Weight</span>
                    <span className="font-semibold">
                      {checkin.weight} lbs
                      {weightChange && (
                        <span className={parseFloat(weightChange) < 0 ? 'text-green-400 ml-2' : 'text-red-400 ml-2'}>
                          {parseFloat(weightChange) < 0 ? '↓' : '↑'} {Math.abs(parseFloat(weightChange))}
                        </span>
                      )}
                    </span>
                  </div>

                  {checkin.waist && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Waist</span>
                      <span className="font-semibold">
                        {checkin.waist} in
                        {waistChange && (
                          <span className={parseFloat(waistChange) < 0 ? 'text-green-400 ml-2' : 'text-red-400 ml-2'}>
                            {parseFloat(waistChange) < 0 ? '↓' : '↑'} {Math.abs(parseFloat(waistChange))}
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {checkin.sleep_quality && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sleep</span>
                      <span className="font-semibold">{checkin.sleep_quality}/10</span>
                    </div>
                  )}

                  {checkin.notes && (
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <p className="text-slate-400 text-xs mb-1">Notes:</p>
                      <p>{checkin.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}