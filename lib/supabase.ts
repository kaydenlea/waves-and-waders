// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// ----------------------------
// Beach types
// ----------------------------
export interface Beach {
  id: string
  Name: string
  COUNTY: string
  LATITUDE: number
  LONGITUDE: number
}

// Add a richer type just for detail views
export interface BeachWithFeatures extends Beach {
  id: string; // Change this too
  Name: string;
  FISHING: boolean | null
  RESTROOMS: boolean | null
  PARKING: boolean | null
  DOG_FRIEND: boolean | null
  SNDY_BEACH: boolean | null
  LIFEGUARD: boolean | null
  // add more flags here later as booleans
}

const FEATURE_COLUMNS = [
  "FISHING",
  "RESTROOMS",
  "PARKING",
  "DOG_FRIEND",
  "SNDY_BEACH",
  "LIFEGUARD",
] as const

// Raw row for details query (before coercion)
type BeachDetailsRow = Beach & {
  [K in typeof FEATURE_COLUMNS[number]]: boolean | number | string | null
}

// Coerce common DB encodings (Y/Yes/1/true) → boolean
const toBool = (v: any): boolean => {
  if (v === null || v === undefined) return false
  if (typeof v === "boolean") return v
  if (typeof v === "number") return v !== 0
  if (typeof v === "string") {
    const s = v.trim().toLowerCase()
    return ["y", "yes", "true", "t", "1"].includes(s)
  }
  return false
}

// ----------------------------
// Forecast / conditions types
// ----------------------------
export interface SupabaseForecastData {
  id?: number
  beach_id: number
  timestamp: string
  // Swell data (feet/seconds) - NOW INCLUDING TERTIARY
  primary_swell_height_ft: number | null
  primary_swell_period_s: number | null
  primary_swell_direction: number | null
  secondary_swell_height_ft: number | null
  secondary_swell_period_s: number | null
  secondary_swell_direction: number | null
  tertiary_swell_height_ft: number | null // NEW: Tertiary swell height
  tertiary_swell_period_s: number | null  // NEW: Tertiary swell period
  tertiary_swell_direction: number | null // NEW: Tertiary swell direction
  // Surf data (feet/kilojoules) - UPDATED ENERGY UNITS
  surf_height_min_ft: number | null
  surf_height_max_ft: number | null
  wave_energy_kj: number | null // CHANGED: Now in kilojoules instead of foot-pounds
  // Water conditions (fahrenheit/feet)
  water_temp_f: number | null
  tide_level_ft: number | null // NOTE: Now includes +2.4ft adjustment from Python script
  // Wind data (mph/degrees)
  wind_speed_mph: number | null
  wind_gust_mph: number | null
  wind_direction_deg: number | null
  // Weather (fahrenheit/inHg)
  temperature: number | null // Air temp in fahrenheit
  weather: number | null // Weather code
  pressure_inhg: number | null
}

export interface ForecastData {
  timestamp: string
  swell: {
    primary: {
      height: number | null // feet
      period: number | null // seconds
      direction: number | null // degrees
    }
    secondary: {
      height: number | null // feet
      period: number | null // seconds
      direction: number | null // degrees
    }
    tertiary: { // NEW: Tertiary swell data
      height: number | null // feet
      period: number | null // seconds
      direction: number | null // degrees
    }
  }
  surf: {
    heightMin: number | null // feet
    heightMax: number | null // feet
    waveEnergy: number | null // kilojoules (updated from foot-pounds)
  }
  conditions: {
    waterTemp: number | null // fahrenheit
    tideLevel: number | null // feet (includes +2.4ft adjustment)
    windSpeed: number | null // mph
    windGust: number | null // mph
    windDirection: number | null // degrees
    airTemp: number | null // fahrenheit
    pressure: number | null // inHg
    weather: number | null // weather code
  }
}

export interface DailyConditions {
  id?: number
  county: string
  date: string
  moon_phase: number | null
  sunrise: string | null
  sunset: string | null
}

// ----------------------------
// Transform helpers
// ----------------------------
export function transformToComponentFormat(data: SupabaseForecastData[]): ForecastData[] {
  return data.map(row => ({
    timestamp: row.timestamp,
    swell: {
      primary: {
        height: row.primary_swell_height_ft,
        period: row.primary_swell_period_s,
        direction: row.primary_swell_direction,
      },
      secondary: {
        height: row.secondary_swell_height_ft,
        period: row.secondary_swell_period_s,
        direction: row.secondary_swell_direction,
      },
      tertiary: { // NEW: Tertiary swell transformation
        height: row.tertiary_swell_height_ft,
        period: row.tertiary_swell_period_s,
        direction: row.tertiary_swell_direction,
      },
    },
    surf: {
      heightMin: row.surf_height_min_ft,
      heightMax: row.surf_height_max_ft,
      waveEnergy: row.wave_energy_kj, // UPDATED: Now in kilojoules
    },
    conditions: {
      waterTemp: row.water_temp_f,
      tideLevel: row.tide_level_ft, // NOTE: Includes +2.4ft adjustment from Python script
      windSpeed: row.wind_speed_mph,
      windGust: row.wind_gust_mph,
      windDirection: row.wind_direction_deg,
      airTemp: row.temperature,
      pressure: row.pressure_inhg,
      weather: row.weather,
    },
  }))
}

// ----------------------------
// Queries
// ----------------------------
export async function fetchBeachDetails(id: number): Promise<BeachWithFeatures | null> {
  const columns = ["id", "Name", "LATITUDE", "LONGITUDE", "COUNTY", ...FEATURE_COLUMNS].join(", ")
  const { data, error } = await supabase
    .from("beaches")
    .select(columns)
    .eq("id", id)
    .maybeSingle()
    .returns<BeachDetailsRow>() // <-- typed single row

  if (error) {
    console.error("Error fetching beach details:", error)
    return null
  }
  if (!data) return null

  // Coerce feature fields to booleans
  const coerced: BeachWithFeatures = {
    id: data.id,
    Name: data.Name,
    LATITUDE: data.LATITUDE,
    LONGITUDE: data.LONGITUDE,
    COUNTY: data.COUNTY,
    FISHING: toBool((data as any).FISHING),
    RESTROOMS: toBool((data as any).RESTROOMS),
    PARKING: toBool((data as any).PARKING),
    DOG_FRIEND: toBool((data as any).DOG_FRIEND),
    SNDY_BEACH: toBool((data as any).SNDY_BEACH),
    LIFEGUARD: toBool((data as any).LIFEGUARD),
  }
  return coerced
}

export async function fetchAllBeaches(): Promise<Beach[]> {
  const { data, error } = await supabase
    .from('beaches')
    .select('id, Name, LATITUDE, LONGITUDE, COUNTY')
    .order('Name')
    .returns<Beach[]>() // <-- typed array

  if (error) {
    console.error('Error fetching beaches:', error)
    throw new Error(`Database error: ${error.message}`)
  }

  return (data || []).filter(
    (beach) =>
      beach.LATITUDE != null &&
      beach.LONGITUDE != null &&
      !isNaN(beach.LATITUDE) &&
      !isNaN(beach.LONGITUDE)
  )
}

export async function fetchBeachForecast(
  beachId: string, 
  startDate?: Date,
  endDate?: Date
): Promise<ForecastData[]> {
  let query = supabase
    .from('forecast_data')
    .select('*') // This will now include the new tertiary swell columns
    .eq('beach_id', beachId)
    .order('timestamp', { ascending: true })
    .returns<SupabaseForecastData[]>() // <-- typed array

  if (startDate) {
    query = query.gte('timestamp', startDate.toISOString())
  }
  if (endDate) {
    query = query.lte('timestamp', endDate.toISOString())
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching forecast data:', error)
    throw new Error(`Database error: ${error.message}`)
  }

  return transformToComponentFormat(data || [])
}

export async function fetchCurrentConditions(beachId: number): Promise<ForecastData | null> {
  const { data, error } = await supabase
    .from('forecast_data')
    .select('*') // This will now include the new tertiary swell columns
    .eq('beach_id', beachId)
    .order('timestamp', { ascending: false })
    .maybeSingle() // <-- one row
    .returns<SupabaseForecastData>() // <-- typed single row

  if (error) {
    console.error('Error fetching current conditions:', error)
    return null
  }
  if (!data) return null

  return transformToComponentFormat([data])[0] ?? null
}

export async function fetchDailyConditions(
  county: string,
  date?: Date
): Promise<DailyConditions | null> {
  let q = supabase
    .from('daily_county_conditions')
    .select('*')
    .eq('county', county)

  if (date) {
    const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
    q = q.eq('date', dateStr)
  }

  const { data, error } = await q
    .order('date', { ascending: false })
    .maybeSingle()
    .returns<DailyConditions>() // <-- typed single row

  if (error) {
    console.error('Error fetching daily conditions:', error)
    return null
  }

  return data ?? null
}

export async function fetchTodaysForecast(beachId: number): Promise<ForecastData[]> {
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return fetchBeachForecast(beachId, now, tomorrow)
}

export async function fetchWeeklyForecast(beachId: number): Promise<ForecastData[]> {
  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  return fetchBeachForecast(beachId, now, weekFromNow)
}

export async function searchBeaches(searchTerm: string): Promise<Beach[]> {
  const { data, error } = await supabase
    .from('beaches')
    .select('id, Name, LATITUDE, LONGITUDE, COUNTY')
    .or(`Name.ilike.%${searchTerm}%,COUNTY.ilike.%${searchTerm}%`)
    .order('Name')
    .limit(10)
    .returns<Beach[]>() // <-- typed array

  if (error) {
    console.error('Error searching beaches:', error)
    return []
  }

  return data || []
}

// ----------------------------
// UI helper formatters
// ----------------------------
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
  if (min == null || max == null) return 'N/A'
  if (min === max) return `${min.toFixed(1)}ft`
  return `${min.toFixed(1)}-${max.toFixed(1)}ft`
}

export const formatTemperature = (temp: number | null): string => {
  if (temp === null) return 'N/A'
  return `${Math.round(temp)}°F`
}

export const formatWindSpeed = (speed: number | null): string => {
  if (speed === null) return 'N/A'
  return `${Math.round(speed)} mph`
}

export const formatPressure = (pressure: number | null): string => {
  if (pressure === null) return 'N/A'
  return `${pressure.toFixed(2)} inHg`
}

export const formatWaveEnergy = (energy: number | null): string => {
  if (energy === null) return 'N/A'
  return `${Math.round(energy)} kJ`
}

// ----------------------------
export function getForecastSummary(data: ForecastData[]) {
  if (!data || data.length === 0) {
    return {
      avgSurfHeight: 0,
      maxSurfHeight: 0,
      avgWindSpeed: 0,
      maxWindSpeed: 0,
      avgWaterTemp: 0,
      avgWaveEnergy: 0, // NEW: Average wave energy
      maxWaveEnergy: 0, // NEW: Max wave energy
      conditions: 'No data',
    }
  }

  const validSurfHeights = data
    .map(d => d.surf.heightMax)
    .filter((h): h is number => h !== null)

  const validWindSpeeds = data
    .map(d => d.conditions.windSpeed)
    .filter((w): w is number => w !== null)

  const validWaterTemps = data
    .map(d => d.conditions.waterTemp)
    .filter((t): t is number => t !== null)

  const validWaveEnergies = data
    .map(d => d.surf.waveEnergy)
    .filter((e): e is number => e !== null)

  return {
    avgSurfHeight: validSurfHeights.length > 0 
      ? validSurfHeights.reduce((a, b) => a + b, 0) / validSurfHeights.length 
      : 0,
    maxSurfHeight: validSurfHeights.length > 0 
      ? Math.max(...validSurfHeights) 
      : 0,
    avgWindSpeed: validWindSpeeds.length > 0 
      ? validWindSpeeds.reduce((a, b) => a + b, 0) / validWindSpeeds.length 
      : 0,
    maxWindSpeed: validWindSpeeds.length > 0 
      ? Math.max(...validWindSpeeds) 
      : 0,
    avgWaterTemp: validWaterTemps.length > 0 
      ? validWaterTemps.reduce((a, b) => a + b, 0) / validWaterTemps.length 
      : 0,
    avgWaveEnergy: validWaveEnergies.length > 0 
      ? validWaveEnergies.reduce((a, b) => a + b, 0) / validWaveEnergies.length 
      : 0,
    maxWaveEnergy: validWaveEnergies.length > 0 
      ? Math.max(...validWaveEnergies) 
      : 0,
    conditions: validSurfHeights.length > 0 ? 'Good' : 'No data',
  }
}