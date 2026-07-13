'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import type { WeightUnit } from '@/lib/utils'

interface UserSettings {
  starting_weight: number
  goal_weight?: number
  daily_calorie_target: number
  daily_protein_target: number
  weight_unit?: WeightUnit
}

export default function Settings() {
  const router = useRouter()
  const toast = useToast()
  const [edited, setEdited] = useState<Partial<UserSettings>>({})
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [user, setUser] = useState<User | null>(null)

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
          setEdited(data)
        }
      } catch (error) {
        console.error('Error loading settings:', error)
        toast('error', 'Could not load your settings.')
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [router, toast])

  const handleSave = async () => {
    if (!user || !edited) return

    try {
      const client = createClient()
      const { error } = await client
        .from('user_settings')
        .update(edited)
        .eq('id', user.id)

      if (error) throw error
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Error saving settings:', error)
      toast('error', 'Could not save your settings.')
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
      <h1 className="text-2xl font-display uppercase tracking-wide text-white">Settings</h1>

      {saved && (
        <div className="bg-green-900 border border-green-700 rounded-lg p-3 text-green-200">
          ✓ Settings saved
        </div>
      )}

      {/* Units */}
      <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800 space-y-4">
        <h2 className="font-semibold">Units</h2>
        <div>
          <label className="block text-sm font-semibold text-neutral-200 mb-2">
            Weight Unit
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['lbs', 'kg'] as const).map(unit => (
              <button
                key={unit}
                onClick={() => setEdited({ ...edited, weight_unit: unit })}
                className={`py-2.5 rounded-lg font-semibold transition border ${
                  (edited.weight_unit || 'lbs') === unit
                    ? 'bg-white border-white text-black'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {unit === 'lbs' ? 'Pounds (lbs)' : 'Kilograms (kg)'}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            Display label only — existing entries are not converted.
          </p>
        </div>
      </div>

      {/* Goals */}
      <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800 space-y-4">
        <h2 className="font-semibold">Goals</h2>

        <div>
          <label className="block text-sm font-semibold text-neutral-200 mb-2">
            Starting Weight ({edited.weight_unit || 'lbs'})
          </label>
          <input
            type="number"
            step="0.1"
            value={edited.starting_weight || ''}
            onChange={(e) => setEdited({ ...edited, starting_weight: parseFloat(e.target.value) })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white focus:border-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-200 mb-2">
            Goal Weight ({edited.weight_unit || 'lbs'})
          </label>
          <input
            type="number"
            step="0.1"
            value={edited.goal_weight || ''}
            onChange={(e) => setEdited({ ...edited, goal_weight: parseFloat(e.target.value) })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white focus:border-white focus:outline-none"
          />
        </div>
      </div>

      {/* Daily Targets */}
      <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800 space-y-4">
        <h2 className="font-semibold">Daily Targets</h2>

        <div>
          <label className="block text-sm font-semibold text-neutral-200 mb-2">
            Calorie Target
          </label>
          <input
            type="number"
            value={edited.daily_calorie_target || ''}
            onChange={(e) => setEdited({ ...edited, daily_calorie_target: parseInt(e.target.value) })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white focus:border-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-200 mb-2">
            Protein Target (g)
          </label>
          <input
            type="number"
            value={edited.daily_protein_target || ''}
            onChange={(e) => setEdited({ ...edited, daily_protein_target: parseInt(e.target.value) })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white focus:border-white focus:outline-none"
          />
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full bg-white hover:bg-neutral-200 text-black font-semibold py-3 rounded-lg transition"
      >
        Save Settings
      </button>

      {/* Account */}
      <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800 space-y-3">
        <h2 className="font-semibold">Account</h2>
        <p className="text-sm text-neutral-400">{user?.email}</p>
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