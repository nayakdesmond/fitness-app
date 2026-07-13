"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase"

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const client = createClient()
      const { error: loginError } = await client.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) {
        setError(loginError.message)
      } else {
        router.push("/")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-lg p-8 w-full max-w-md">
        <h1 className="text-4xl font-display uppercase tracking-wide text-white leading-none mb-2">Train with Dara</h1>
        <p className="text-neutral-400 uppercase tracking-widest text-sm mb-8">Hustle for the muscle</p>
        
        {error && <div className="bg-red-500 text-white p-3 rounded mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-white mb-2">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-white"
              required
            />
          </div>
          <div>
            <label className="block text-white mb-2">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-white"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-neutral-200 disabled:bg-neutral-600 text-black font-bold py-2 rounded transition"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-neutral-400 mt-6">
          Don&apos;t have an account? <Link href="/auth/signup" className="text-neutral-300 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}