// lib/api.ts
// Client-side API wrappers to reduce Supabase egress
// These functions call Next.js API routes instead of Supabase directly

import type { ForecastData, TidePoint, DailyConditions } from './supabase'

/**
 * Fetch beach forecast data via API route (cached)
 * Replaces direct calls to fetchBeachForecast from @/lib/supabase
 */
export async function fetchBeachForecastAPI(
  beachId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ForecastData[]> {
  const params = new URLSearchParams({ beachId })
  if (startDate) params.append('startDate', startDate.toISOString())
  if (endDate) params.append('endDate', endDate.toISOString())

  const res = await fetch(`/api/forecast?${params.toString()}`)

  if (!res.ok) {
    throw new Error(`Failed to fetch forecast: ${res.status}`)
  }

  const json = await res.json()

  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch forecast')
  }

  return json.data as ForecastData[]
}

/**
 * Fetch beach tide data via API route (cached)
 * Replaces direct calls to fetchBeachTides from @/lib/supabase
 */
export async function fetchBeachTidesAPI(
  beachId: string,
  startDate?: Date,
  endDate?: Date
): Promise<TidePoint[]> {
  const params = new URLSearchParams({ beachId })
  if (startDate) params.append('startDate', startDate.toISOString())
  if (endDate) params.append('endDate', endDate.toISOString())

  const res = await fetch(`/api/tides?${params.toString()}`)

  if (!res.ok) {
    throw new Error(`Failed to fetch tides: ${res.status}`)
  }

  const json = await res.json()

  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch tides')
  }

  return json.data as TidePoint[]
}

/**
 * Fetch daily conditions (sunrise, sunset, moon phase) via API route (cached)
 * Replaces direct calls to fetchDailyConditions from @/lib/supabase
 */
export async function fetchDailyConditionsAPI(
  county: string,
  date?: Date
): Promise<DailyConditions | null> {
  const params = new URLSearchParams({ county })
  if (date) params.append('date', date.toISOString())

  const res = await fetch(`/api/daily-conditions?${params.toString()}`)

  if (!res.ok) {
    throw new Error(`Failed to fetch daily conditions: ${res.status}`)
  }

  const json = await res.json()

  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch daily conditions')
  }

  return json.data as DailyConditions | null
}

/**
 * Fetch surf intensity for a specific date via API route (cached)
 * Replaces direct Supabase queries for daily_grid_surf_intensity
 */
export async function fetchSurfIntensityAPI(
  date: Date
): Promise<Record<string, number>> {
  const dateStr = date.toISOString().split('T')[0]
  const res = await fetch(`/api/surf-intensity?date=${dateStr}`)

  if (!res.ok) {
    throw new Error(`Failed to fetch surf intensity: ${res.status}`)
  }

  const json = await res.json()

  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch surf intensity')
  }

  return json.data as Record<string, number>
}
