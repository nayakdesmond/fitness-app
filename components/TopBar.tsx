"use client"

import { usePathname } from "next/navigation"
import Wordmark from "./Wordmark"
import { useOffline } from "./OfflineProvider"

export default function TopBar() {
  const pathname = usePathname()
  const { online, pending } = useOffline()

  // Hide on auth and onboarding — those screens carry their own branding
  if (pathname?.startsWith("/auth") || pathname === "/onboarding") {
    return null
  }

  return (
    <header className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur border-b border-neutral-800">
      <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-center relative">
        <Wordmark className="text-lg text-white" />
        {(!online || pending > 0) && (
          <span
            className={`absolute right-4 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
              online
                ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
                : 'text-neutral-400 border-neutral-700 bg-neutral-800'
            }`}
          >
            {online ? `Syncing ${pending}` : `Offline${pending > 0 ? ` · ${pending}` : ''}`}
          </span>
        )}
      </div>
    </header>
  )
}
