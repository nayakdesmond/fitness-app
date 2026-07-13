"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Navigation() {
  const pathname = usePathname()

  // Hide nav on auth and onboarding pages
  if (pathname?.startsWith("/auth") || pathname === "/onboarding") {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 flex justify-around p-3">
      <Link href="/" className={`text-2xl ${pathname === "/" ? "opacity-100" : "opacity-50"}`}>📊</Link>
      <Link href="/workouts" className={`text-2xl ${pathname === "/workouts" ? "opacity-100" : "opacity-50"}`}>🏋️</Link>
      <Link href="/cardio" className={`text-2xl ${pathname === "/cardio" ? "opacity-100" : "opacity-50"}`}>🏃</Link>
      <Link href="/nutrition" className={`text-2xl ${pathname === "/nutrition" ? "opacity-100" : "opacity-50"}`}>🍎</Link>
      <Link href="/checkins" className={`text-2xl ${pathname === "/checkins" ? "opacity-100" : "opacity-50"}`}>⚖️</Link>
      <Link href="/settings" className={`text-2xl ${pathname === "/settings" ? "opacity-100" : "opacity-50"}`}>⚙️</Link>
    </nav>
  )
}