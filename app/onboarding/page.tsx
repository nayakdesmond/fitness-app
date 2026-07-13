'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/components/Toast'
import OnboardingWizard, { type OnboardingValues } from '@/components/OnboardingWizard'

export default function Onboarding() {
  const router = useRouter()
  const toast = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [initial, setInitial] = useState<Partial<OnboardingValues>>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const client = createClient()
      const { data: { user: authUser } } = await client.auth.getUser()

      if (!authUser) {
        router.push('/auth/login')
        return
      }
      setUser(authUser)

      // Pre-fill if a settings row already exists (e.g. revisiting)
      const { data } = await client
        .from('user_settings')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      if (data) setInitial(data)
      setLoading(false)
    }

    load()
  }, [router])

  const handleFinish = async (values: OnboardingValues) => {
    if (!user || saving) return
    setSaving(true)
    try {
      const client = createClient()
      const { error } = await client
        .from('user_settings')
        .upsert([{ id: user.id, ...values }], { onConflict: 'id' })

      if (error) throw error
      router.push('/')
    } catch (error) {
      console.error('Error saving onboarding:', error)
      toast('error', 'Could not save your goals. Please try again.')
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-neutral-400">Loading...</div>
  }

  return <OnboardingWizard initial={initial} saving={saving} onFinish={handleFinish} />
}
