'use client'

import { useState } from 'react'

export interface FoodHit {
  name: string
  brand?: string
  kcalPer100g: number
  proteinPer100g: number
}

// Searches go through our own /api/food-search route, which proxies
// Open Food Facts server-side (avoids CORS, adds required User-Agent).
async function searchFoods(query: string): Promise<FoodHit[]> {
  const res = await fetch(`/api/food-search?q=${encodeURIComponent(query.trim())}`)
  if (!res.ok) throw new Error(`Food search unavailable (${res.status})`)
  const data = (await res.json()) as { hits?: FoodHit[] }
  return data.hits || []
}

interface Props {
  onAdd: (calories: number, protein: number, label: string) => void
}

export default function FoodSearch({ onAdd }: Props) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<FoodHit[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [failed, setFailed] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [grams, setGrams] = useState('100')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || searching) return
    setSearching(true)
    setFailed(false)
    setSelected(null)
    try {
      setHits(await searchFoods(query))
    } catch {
      setHits(null)
      setFailed(true)
    } finally {
      setSearching(false)
    }
  }

  const addSelected = () => {
    if (selected === null || !hits) return
    const hit = hits[selected]
    const g = parseFloat(grams)
    if (!g || g <= 0) return
    onAdd(
      Math.round((hit.kcalPer100g * g) / 100),
      Math.round((hit.proteinPer100g * g) / 100),
      hit.name
    )
    setSelected(null)
    setGrams('100')
  }

  return (
    <div className="bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
      <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide mb-3">
        Food Search
      </p>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. greek yogurt"
          className="flex-1 bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2.5 text-base text-white placeholder-neutral-500 focus:border-white focus:outline-none"
        />
        <button
          type="submit"
          disabled={searching}
          className="bg-white hover:bg-neutral-200 disabled:bg-neutral-600 text-black font-semibold px-4 py-2 rounded-lg text-sm transition"
        >
          {searching ? '…' : 'Search'}
        </button>
      </form>

      {failed && (
        <p className="text-sm text-red-300 mt-3">
          Food search is unavailable right now — try again in a minute, or log totals manually below.
        </p>
      )}

      {hits && hits.length === 0 && (
        <p className="text-sm text-neutral-400 mt-3">No foods found — try a simpler search term.</p>
      )}

      {hits && hits.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {hits.map((hit, i) => (
            <div key={i}>
              <button
                onClick={() => setSelected(selected === i ? null : i)}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left transition border ${
                  selected === i
                    ? 'bg-neutral-700 border-white'
                    : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700'
                }`}
              >
                <span className="min-w-0 mr-2">
                  <span className="block text-sm font-semibold text-white truncate">{hit.name}</span>
                  {hit.brand && <span className="block text-xs text-neutral-400 truncate">{hit.brand}</span>}
                </span>
                <span className="text-xs text-neutral-300 shrink-0 text-right">
                  {hit.kcalPer100g} cal · {hit.proteinPer100g}g
                  <span className="block text-[10px] text-neutral-500">per 100g</span>
                </span>
              </button>

              {selected === i && (
                <div className="flex items-center gap-2 bg-neutral-800 rounded-lg px-3 py-2.5 mt-1 border border-neutral-700">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                    className="w-20 bg-neutral-700 border border-neutral-600 rounded-lg px-2 py-1.5 text-center text-sm font-bold text-white focus:border-white focus:outline-none"
                    aria-label="Amount in grams"
                  />
                  <span className="text-sm text-neutral-400">g =</span>
                  <span className="text-sm font-bold text-white flex-1">
                    {Math.round((hit.kcalPer100g * (parseFloat(grams) || 0)) / 100)} cal ·{' '}
                    {Math.round((hit.proteinPer100g * (parseFloat(grams) || 0)) / 100)}g protein
                  </span>
                  <button
                    onClick={addSelected}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-1.5 rounded-lg text-sm transition"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
