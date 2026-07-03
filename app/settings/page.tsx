'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface UserSettings {
  starting_weight: number
  goal_weight?: number
  daily_calorie_target: number
  daily_protein_target: number
}

export default function Settings() {
  const router = useRouter()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [edited, setEdited] = useState<Partial<UserSettings>>({})
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const client = createClient()
        const { data: { user: authUser } } = await client.auth.getUser()
        
        if (!authUser) {
          router.push('/auth/login')
          return
        }

        setUser(authUser)

        const { data } = await client
          .from('user_settings')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (data) {
          setSettings(data)
          setEdited(data)
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [router])

  const handleSave = async () => {
    if (!user || !edited) return

    try {
      const client = createClient()
      await client
        .from('user_settings')
        .update(edited)
        .eq('id', user.id)

      setSettings(edited as UserSettings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  const handleLogout = async () => {
    const client = createClient()
    await client.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      {saved && (
        <div className="bg-green-900 border border-green-700 rounded-lg p-3 text-green-200">
          ✓ Settings saved
        </div>
      )}

      {/* Goals */}
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-4">
        <h2 className="font-semibold">Goals</h2>

        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">
            Starting Weight (lbs)
          </label>
          <input
            type="number"
            step="0.1"
            value={edited.starting_weight || ''}
            onChange={(e) => setEdited({ ...edited, starting_weight: parseFloat(e.target.value) })}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">
            Goal Weight (lbs)
          </label>
          <input
            type="number"
            step="0.1"
            value={edited.goal_weight || ''}
            onChange={(e) => setEdited({ ...edited, goal_weight: parseFloat(e.target.value) })}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Daily Targets */}
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-4">
        <h2 className="font-semibold">Daily Targets</h2>

        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">
            Calorie Target
          </label>
          <input
            type="number"
            value={edited.daily_calorie_target || ''}
            onChange={(e) => setEdited({ ...edited, daily_calorie_target: parseInt(e.target.value) })}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">
            Protein Target (g)
          </label>
          <input
            type="number"
            value={edited.daily_protein_target || ''}
            onChange={(e) => setEdited({ ...edited, daily_protein_target: parseInt(e.target.value) })}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
      >
        Save Settings
      </button>

      {/* Account */}
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-3">
        <h2 className="font-semibold">Account</h2>
        <p className="text-sm text-slate-400">{user?.email}</p>
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}