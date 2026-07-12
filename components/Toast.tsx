'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'

type ToastKind = 'error' | 'success'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

const ToastContext = createContext<(kind: ToastKind, message: string) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const showToast = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++
    setToasts(prev => [...prev, { id, kind, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed top-4 left-0 right-0 z-50 px-4 space-y-2 pointer-events-none">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`max-w-2xl mx-auto rounded-xl px-4 py-3 text-sm font-semibold shadow-lg border pointer-events-auto ${
                toast.kind === 'error'
                  ? 'bg-red-950 border-red-800 text-red-200'
                  : 'bg-green-950 border-green-800 text-green-200'
              }`}
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            >
              {toast.kind === 'error' ? '⚠️ ' : '✓ '}
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
