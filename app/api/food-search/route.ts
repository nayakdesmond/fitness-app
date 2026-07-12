import { NextResponse, type NextRequest } from 'next/server'

// Server-side proxy for Open Food Facts search: avoids browser CORS issues
// (OFF error pages omit CORS headers) and lets us send the descriptive
// User-Agent their API etiquette requires.

interface OffProduct {
  product_name?: string
  brands?: string
  nutriments?: {
    'energy-kcal_100g'?: number
    proteins_100g?: number
  }
}

export interface FoodHit {
  name: string
  brand?: string
  kcalPer100g: number
  proteinPer100g: number
}

const FIELDS = 'product_name,brands,nutriments'
const USER_AGENT = 'FitnessTracker/0.1 (personal fitness app; nayakdesmond@gmail.com)'

function toHits(products: OffProduct[]): FoodHit[] {
  return products
    .filter(p => p.product_name && p.nutriments?.['energy-kcal_100g'] != null)
    .map(p => ({
      name: p.product_name!,
      brand: p.brands?.split(',')[0]?.trim() || undefined,
      kcalPer100g: Math.round(p.nutriments!['energy-kcal_100g']!),
      proteinPer100g: Math.round((p.nutriments!.proteins_100g ?? 0) * 10) / 10,
    }))
}

async function tryFetch(url: string): Promise<OffProduct[] | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data.hits || data.products || []) as OffProduct[]
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 })
  }

  const encoded = encodeURIComponent(q)

  // OFF's search cluster degrades one replica at a time, so a failed request
  // often succeeds on retry. Two rounds across both endpoints.
  const urls = [
    `https://search.openfoodfacts.org/search?q=${encoded}&page_size=8&fields=${FIELDS}`,
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=8&fields=${FIELDS}`,
  ]

  for (let attempt = 0; attempt < 2; attempt++) {
    for (const url of urls) {
      const products = await tryFetch(url)
      if (products !== null) {
        return NextResponse.json({ hits: toHits(products) })
      }
    }
  }

  return NextResponse.json({ error: 'Food search unavailable' }, { status: 503 })
}
