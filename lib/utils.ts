// Display preference only — weights are stored as entered, not converted.
export type WeightUnit = 'lbs' | 'kg'

// Fixed: Handle optional date parameters
export function getDateString(date?: Date): string {
  const d = date || new Date()
  return d.toISOString().split('T')[0]
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDateFull(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function getWeekStartDate(date?: Date): Date {
  const d = date ? new Date(date) : new Date()
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.setDate(diff))
}

export function getWeekStartDateString(date?: Date): string {
  return getDateString(getWeekStartDate(date))
}