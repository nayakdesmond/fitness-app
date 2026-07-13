import { NextResponse, type NextRequest } from 'next/server'

// Food search via USDA FoodData Central. We moved off Open Food Facts because
// OFF blocks/throttles datacenter IPs (works from a phone, 503s from Vercel).
// FDC is reliable from cloud hosts. Works out of the box with DEMO_KEY; set
// USDA_API_KEY in the environment for a higher rate limit (free key from
// https://fdc.nal.usda.gov/api-key-signup.html).

export interface FoodHit {
  name: string
  brand?: string
  kcalPer100g: number
  proteinPer100g: number
}

interface FdcNutrient {
  nutrientNumber?: string
  nutrientName?: string
  unitName?: string
  value?: number
}

interface FdcFood {
  description?: string
  brandName?: string
  brandOwner?: string
  dataType?: string
  foodNutrients?: FdcNutrient[]
}

// Nothing real exceeds pure fat (~900 kcal/100g); above that is a bad entry.
const MAX_KCAL_PER_100G = 900

const API = 'https://api.nal.usda.gov/fdc/v1/foods/search'

// FDC nutrient numbers: 208 = Energy (kcal), 203 = Protein. Amounts are per 100 g.
function nutrient(food: FdcFood, number: string): number | undefined {
  const n = food.foodNutrients?.find(
    x => x.nutrientNumber === number && (number !== '208' || x.unitName === 'KCAL')
  )
  return n?.value
}

// Branded descriptions come back SHOUTING — gently title-case those. Only
// capitalize after a start/space/hyphen/slash so possessives stay "Joe's".
function tidy(s: string): string {
  return s === s.toUpperCase()
    ? s.toLowerCase().replace(/(^|[\s\-/])(\p{L})/gu, (_, p, c) => p + c.toUpperCase())
    : s
}

function toHits(foods: FdcFood[]): FoodHit[] {
  // Keep FDC's own relevance order; just drop entries with missing or
  // physically-impossible energy values (bad branded data).
  const hits: FoodHit[] = []
  for (const f of foods) {
    const kcal = nutrient(f, '208')
    if (!f.description || kcal == null || kcal > MAX_KCAL_PER_100G) continue
    const brand = f.brandName || f.brandOwner
    hits.push({
      name: tidy(f.description),
      brand: brand ? tidy(brand) : undefined,
      kcalPer100g: Math.round(kcal),
      proteinPer100g: Math.round((nutrient(f, '203') ?? 0) * 10) / 10,
    })
  }
  return hits.slice(0, 8)
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 })
  }

  const key = process.env.USDA_API_KEY || 'DEMO_KEY'
  const url =
    `${API}?api_key=${key}&query=${encodeURIComponent(q)}` +
    `&pageSize=12&dataType=${encodeURIComponent('Branded,Foundation,SR Legacy')}`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) {
      return NextResponse.json({ error: 'Food search unavailable' }, { status: 503 })
    }
    const data = (await res.json()) as { foods?: FdcFood[] }
    return NextResponse.json({ hits: toHits(data.foods ?? []) })
  } catch {
    return NextResponse.json({ error: 'Food search unavailable' }, { status: 503 })
  }
}
