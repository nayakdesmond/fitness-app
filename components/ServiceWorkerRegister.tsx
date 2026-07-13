'use client'

import { useEffect } from 'react'

// Registers the service worker in production only. In dev, a SW would fight
// with HMR/websockets, so we skip it there.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('Service worker registration failed', err)
      })
    }

    if (document.readyState === 'complete') onLoad()
    else window.addEventListener('load', onLoad)

    return () => window.removeEventListener('load', onLoad)
  }, [])

  return null
}
