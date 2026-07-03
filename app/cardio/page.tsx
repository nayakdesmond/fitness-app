'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getDateString, formatDate } from '@/lib/utils'

interface CardioSession {
  id: string
  date: string
  type: string
  duration_mins: number
  distance_km?: number
  calories?: number
  notes?: string
}

export default function Cardio() {
  const router = useRouter()
  const [sessions, setSessions] = useState<CardioSession[]>([])
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState('running')
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [calories, setCalories] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

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
      } finally {
        setLoading(false)
      }
    }

    loadCardio()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !duration) return

    try {
      const client = createClient()
      const { data } = await client
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
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-4">
      <h1 className="text-2xl font-bold">Cardio</h1>

      {/* Form */}
      {showForm && (
        <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-3">
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
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
            <label className="block text-sm font-semibold text-slate-200 mb-2">Duration (minutes)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Distance (km)</label>
              <input
                type="number"
                step="0.1"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Calories</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did you feel?"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
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
          + Log Cardio
        </button>
      )}

      {/* Sessions List */}
      <div className="space-y-3">
        {sessions.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No cardio sessions yet</p>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold capitalize">{session.type}</h3>
                <p className="text-sm text-slate-400">{formatDate(session.date)}</p>
              </div>
              <div className="text-sm text-slate-400 space-y-1">
                <p>Duration: {session.duration_mins} min</p>
                {session.distance_km && <p>Distance: {session.distance_km} km</p>}
                {session.calories && <p>Calories: {session.calories}</p>}
                {session.notes && <p>Notes: {session.notes}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}