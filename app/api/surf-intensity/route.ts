// app/api/surf-intensity/route.ts
// Surf intensity lookups are cached for 3 hours with SWR.
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

type GridIntensityRow = {
  grid_id: number
  avg_surf_max_ft: number | null
}

type GridForecastRow = {
  grid_id: number
  surf_height_max_ft: number | null
}

type BeachGridRow = {
  id: string | number
  grid_id: number | null
}

// Cache beach→grid mapping in memory (refreshed every 6 hours)
let beachGridMapCache: Map<number, string[]> | null = null;
let beachGridMapCacheTime = 0;
const BEACH_GRID_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    console.log('🌊 Surf intensity API called with date:', dateParam)

    if (!dateParam) {
      return NextResponse.json(
        { success: false, error: 'Date parameter is required' },
        { status: 400 }
      )
    }

    const beachMap = await loadBeachGridMap()
    console.log('🏖️  Beach map loaded:', beachMap.size, 'grid points')

    const dailyRows = await fetchDailyGridIntensity(dateParam)
    console.log('📊 Daily grid rows fetched:', dailyRows?.length ?? 0)

    if (dailyRows && dailyRows.length > 0) {
      const intensityMap = mapGridValuesToBeaches(dailyRows, beachMap)
      console.log('✅ Using daily_grid_table, mapped to', Object.keys(intensityMap).length, 'beaches')
      const response = NextResponse.json({
        success: true,
        data: intensityMap,
        source: 'daily_grid_table'
      })
      response.headers.set(
        'Cache-Control',
        'public, s-maxage=10800, stale-while-revalidate=21600'
      )
      return response
    }

    console.log('⚠️  No daily data found, trying forecast fallback...')
    const date = new Date(dateParam)
    const startWindow = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0))
    const endWindow = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999))

    console.log('📅 Fetching forecast data from', startWindow.toISOString(), 'to', endWindow.toISOString())

    const forecastRows = await fetchGridForecastRows(
      startWindow.toISOString(),
      endWindow.toISOString()
    )
    console.log('📈 Forecast rows fetched:', forecastRows.length)

    const aggregated = aggregateForecastRows(forecastRows)
    console.log('🔢 Aggregated to', aggregated.length, 'grid points')

    const fallbackIntensity = mapGridValuesToBeaches(aggregated, beachMap)
    console.log('✅ Using grid_forecast_fallback, mapped to', Object.keys(fallbackIntensity).length, 'beaches')

    const response = NextResponse.json({
      success: true,
      data: fallbackIntensity,
      source: 'grid_forecast_fallback'
    })

    response.headers.set(
      'Cache-Control',
      'public, s-maxage=10800, stale-while-revalidate=21600'
    )

    return response
  } catch (error) {
    console.error('❌ Error fetching surf intensity:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function loadBeachGridMap(): Promise<Map<number, string[]>> {
  // Check if we have a valid cached map
  const now = Date.now();
  if (beachGridMapCache && (now - beachGridMapCacheTime) < BEACH_GRID_CACHE_TTL) {
    console.log('Using cached beach→grid map');
    return beachGridMapCache;
  }

  console.log('Refreshing beach→grid map from database');
  const map = new Map<number, string[]>()

  // Fetch all beaches with pagination (Supabase limits to 1000 per request)
  const PAGE_SIZE = 1000
  let allData: BeachGridRow[] = []
  let page = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('beaches')
      .select('id, grid_id')
      .not('grid_id', 'is', null)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (error) {
      console.error('Failed to load beaches for grid mapping:', error)
      return beachGridMapCache ?? map
    }

    if (!data || data.length === 0) {
      hasMore = false
    } else {
      allData = allData.concat(data)
      hasMore = data.length === PAGE_SIZE
      page++
    }
  }

  for (const row of allData) {
    if (row.grid_id == null) continue
    if (!map.has(row.grid_id)) {
      map.set(row.grid_id, [])
    }
    map.get(row.grid_id)!.push(String(row.id))
  }

  // Update cache
  beachGridMapCache = map;
  beachGridMapCacheTime = now;

  console.log(`Loaded beach→grid map: ${allData.length} beaches with grid_id`)
  return map
}

async function fetchDailyGridIntensity(date: string) {
  const { data, error } = await supabase
    .from('daily_grid_surf_intensity')
    .select('grid_id, avg_surf_max_ft')
    .eq('date', date)
    .order('grid_id', { ascending: true })

  if (error) {
    console.warn('Failed to fetch daily grid intensity, will fallback', error)
    return null
  }

  return data as GridIntensityRow[] | null
}

async function fetchGridForecastRows(startIso: string, endIso: string) {
  const { data, error } = await supabase
    .from('grid_forecast_data')
    .select('grid_id, surf_height_max_ft')
    .gte('timestamp', startIso)
    .lte('timestamp', endIso)

  if (error) {
    console.error('Failed to fetch grid forecast rows:', error)
    return []
  }

  return data as GridForecastRow[]
}

function aggregateForecastRows(
  rows: GridForecastRow[]
): GridIntensityRow[] {
  const totals = new Map<number, { sum: number; count: number }>()

  for (const row of rows) {
    if (row.grid_id == null) continue
    const value =
      row.surf_height_max_ft != null
        ? Number(row.surf_height_max_ft)
        : null
    if (value == null || Number.isNaN(value)) continue

    if (!totals.has(row.grid_id)) {
      totals.set(row.grid_id, { sum: 0, count: 0 })
    }
    const bucket = totals.get(row.grid_id)!
    bucket.sum += value
    bucket.count += 1
  }

  return Array.from(totals.entries()).map(([grid_id, bucket]) => ({
    grid_id,
    avg_surf_max_ft:
      bucket.count > 0 ? bucket.sum / bucket.count : null
  }))
}

function mapGridValuesToBeaches(
  rows: GridIntensityRow[] | null,
  beachMap: Map<number, string[]>
): Record<string, number> {
  const result: Record<string, number> = {}
  if (!rows) return result

  for (const row of rows) {
    if (row.grid_id == null) continue
    if (row.avg_surf_max_ft == null) continue

    const beaches = beachMap.get(row.grid_id)
    if (!beaches || beaches.length === 0) continue

    for (const beachId of beaches) {
      result[beachId] = Number(row.avg_surf_max_ft)
    }
  }

  return result
}
