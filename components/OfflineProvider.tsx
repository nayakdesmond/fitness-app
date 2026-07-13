'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { queueCount, subscribe, syncQueue } from '@/lib/offlineQueue'
import { useToast } from '@/components/Toast'

interface OfflineState {
  online: boolean
  pending: number
  syncNow: () => void
}

const OfflineContext = createContext<OfflineState>({ online: true, pending: 0, syncNow: () => {} })

export function useOffline() {
  return useContext(OfflineContext)
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast()
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  )
  const [pending, setPending] = useState(0)
  const syncing = useRef(false)

  const syncNow = useCallback(async () => {
    if (syncing.current || typeof navigator === 'undefined' || !navigator.onLine) return
    syncing.current = true
    try {
      const synced = await syncQueue(createClient())
      if (synced > 0) toast('success', `Synced ${synced} offline ${synced === 1 ? 'change' : 'changes'}`)
    } finally {
      syncing.current = false
    }
  }, [toast])

  useEffect(() => {
    queueCount().then(setPending)
    const unsub = subscribe(setPending)

    const goOnline = () => {
      setOnline(true)
      syncNow()
    }
    const goOffline = () => setOnline(false)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    // Drain anything left from a previous session
    if (navigator.onLine) syncNow()

    return () => {
      unsub()
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [syncNow])

  return (
    <OfflineContext.Provider value={{ online, pending, syncNow }}>
      {children}
    </OfflineContext.Provider>
  )
}
