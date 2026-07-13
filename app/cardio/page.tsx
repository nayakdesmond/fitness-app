'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { getDateString, formatDate } from '@/lib/utils'
import { useToast } from '@/components/Toast'

interface CardioSession {
  id: string
  date: string
  type: string
  duration_mins: number
  distance_km?: number
  calories?: number
  notes?: string
}

const CARDIO_ICONS: Record<string, string> = {
  running: '🏃',
  walking: '🚶',
  cycling: '🚴',
  rowing: '🚣',
  swimming: '🏊',
  elliptical: '⚙️',
  other: '💪'
}

export default function Cardio() {
  const router = useRouter()
  const toast = useToast()
  const [sessions, setSessions] = useState<CardioSession[]>([])
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState('running')
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [calories, setCalories] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const loadCardio = async () => {
      try {
        const client = createClient()
        const { data: { user: authUser } } = await client.auth.getUser()

        if (!authUser) {
          router.push('/auth/login')
          return
        }

        setUser(authUser)

        const { data } = await client
          .from('cardio_sessions')
          .select('*')
          .eq('user_id', authUser.id)
          .order('date', { ascending: false })
          .limit(14)

        setSessions(data || [])
      } catch (error) {
        console.error('Error loading cardio:', error)
        toast('error', 'Could not load your cardio sessions.')
      } finally {
        setLoading(false)
      }
    }

    loadCardio()
  }, [router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !duration) return

    try {
      const client = createClient()
      const { data, error } = await client
        .from('cardio_sessions')
        .insert([{
          user_id: user.id,
          date: getDateString(),
          type,
          duration_mins: parseInt(duration),
          distance_km: distance ? parseFloat(distance) : null,
          calories: calories ? parseInt(calories) : null,
          notes: notes || null
        }])
        .select()

      if (error) throw error
      if (data) {
        setSessions([data[0], ...sessions])
        setDuration('')
        setDistance('')
        setCalories('')
        setNotes('')
        setShowForm(false)
      }
    } catch (error) {
      console.error('Error adding cardio:', error)
      toast('error', 'Could not save your cardio session.')
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-neutral-400">Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 space-y-4">
      <h1 className="text-2xl font-display uppercase tracking-wide text-white pt-2">Cardio</h1>

      {/* Form */}
      {showForm && (
        <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2.5 text-base font-semibold text-white focus:border-white focus:outline-none"
            >
              <option value="running">Running</option>
              <option value="walking">Walking</option>
              <option value="cycling">Cycling</option>
              <option value="rowing">Rowing</option>
              <option value="swimming">Swimming</option>
              <option value="elliptical">Elliptical</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">
              Duration (minutes)
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="0"
              className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2.5 text-base font-bold text-white placeholder-neutral-600 focus:border-white focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">
                Distance (km)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="0.0"
                className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2.5 text-base font-bold text-white placeholder-neutral-600 focus:border-white focus:outline-none"
              />
            </div>
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
                className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2.5 text-base font-bold text-white placeholder-neutral-600 focus:border-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-1.5">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did you feel?"
              className="w-full bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2.5 text-base text-white placeholder-neutral-500 focus:border-white focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-white hover:bg-neutral-200 text-black font-bold py-2.5 rounded-lg transition"
            >
              Save
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-2.5 rounded-lg transition border border-neutral-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-3.5 rounded-xl transition border border-neutral-700"
        >
          + Log Cardio
        </button>
      )}

      {/* Sessions List */}
      <div className="space-y-3">
        {sessions.length === 0 ? (
          <p className="text-neutral-400 text-center py-8">No cardio sessions yet — log your first one above</p>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg text-white capitalize flex items-center gap-2">
                  <span>{CARDIO_ICONS[session.type] || '💪'}</span>
                  {session.type}
                </h3>
                <p className="text-sm font-semibold text-neutral-400">{formatDate(session.date)}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">Time</p>
                  <p className="text-xl font-bold text-white">{session.duration_mins}<span className="text-sm font-semibold text-neutral-400 ml-1">min</span></p>
                </div>
                {session.distance_km && (
                  <div>
                    <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">Distance</p>
                    <p className="text-xl font-bold text-white">{session.distance_km}<span className="text-sm font-semibold text-neutral-400 ml-1">km</span></p>
                  </div>
                )}
                {session.calories && (
                  <div>
                    <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">Burned</p>
                    <p className="text-xl font-bold text-white">{session.calories}<span className="text-sm font-semibold text-neutral-400 ml-1">cal</span></p>
                  </div>
                )}
              </div>
              {session.notes && (
                <p className="text-sm text-neutral-300 mt-3 pt-3 border-t border-neutral-800">{session.notes}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
