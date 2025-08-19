// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Type definitions for your database
export interface Beach {
  id: number
  Name: string
  COUNTY: string
  LATITUDE: number
  LONGITUDE: number
}

export interface ForecastData {
  id: number
  beach_id: number
  timestamp: string
  primary_swell_height_m: number | null
  primary_swell_period_s: number | null
  primary_swell_direction: number | null
  secondary_swell_height_m: number | null
  secondary_swell_period_s: number | null
  secondary_swell_direction: number | null
  surf_height_min_m: number | null
  surf_height_max_m: number | null
  wave_energy_joules: number | null
  water_temp_c: number | null
  tide_level_m: number | null
  wind_speed_kph: number | null
  wind_gust_kph: number | null
  wind_direction_deg: number | null
  weather: number | null
  pressure_hpa: number | null
}

export interface DailyConditions {
  id: number
  county: string
  date: string
  moon_phase: number | null
  sunrise: string | null
  sunset: string | null
}

// Helper functions
export const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toISOString()
}

export const getWindDirection = (degrees: number | null): string => {
  if (degrees === null || degrees === undefined) return 'N/A'
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(degrees / 22.5) % 16
  return directions[index]
}

export const formatSurfHeight = (min: number | null, max: number | null): string => {
  if (!min || !max) return 'N/A'
  if (min === max) return `${min.toFixed(1)}m`
  return `${min.toFixed(1)}-${max.toFixed(1)}m`
}