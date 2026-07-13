"use client"

import { usePathname } from "next/navigation"
import Wordmark from "./Wordmark"

export default function TopBar() {
  const pathname = usePathname()

  // Hide on auth and onboarding — those screens carry their own branding
  if (pathname?.startsWith("/auth") || pathname === "/onboarding") {
    return null
  }

  return (
    <header className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur border-b border-neutral-800">
      <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-center">
        <Wordmark className="text-lg text-white" />
      </div>
    </header>
  )
}
