// app/api/surf-intensity/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    if (!dateParam) {
      return NextResponse.json(
        { success: false, error: 'Date parameter is required' },
        { status: 400 }
      )
    }

    const PAGE_SIZE = 1000

    // Fetch from daily_beach_surf_intensity table
    const fetchDailyRows = async () => {
      const rows: any[] = []
      let page = 0

      while (true) {
        const from = page * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        const { data, error } = await supabase
          .from('daily_beach_surf_intensity')
          .select('beach_id, avg_surf_max_ft')
          .eq('date', dateParam)
          .order('beach_id', { ascending: true })
          .range(from, to)

        if (error) {
          return { data: rows, error }
        }

        if (!data || data.length === 0) {
          break
        }

        rows.push(...data)

        if (data.length < PAGE_SIZE) {
          break
        }

        page += 1
      }

      return { data: rows, error: null }
    }

    const { data: dailyData, error } = await fetchDailyRows()

    if (!error && Array.isArray(dailyData) && dailyData.length > 0) {
      // Convert to map format
      const intensityMap: Record<string, number> = {}
      dailyData.forEach((row: any) => {
        const avg = row?.avg_surf_max_ft
        if (avg != null && !Number.isNaN(Number(avg))) {
          intensityMap[String(row.beach_id)] = Number(avg)
        }
      })

      const response = NextResponse.json({
        success: true,
        data: intensityMap,
        source: 'daily_table'
      })

      // Cache for 1 hour (surf data doesn't change that frequently)
      response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200')

      return response
    }

    // Fallback to forecast_data if daily table has no data
    const date = new Date(dateParam)
    const startWindow = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0))
    const endWindow = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999))

    const fetchForecastRows = async () => {
      const rows: any[] = []
      let page = 0

      while (true) {
        const from = page * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        const { data, error } = await supabase
          .from('forecast_data')
          .select('beach_id, surf_height_max_ft')
          .gte('timestamp', startWindow.toISOString())
          .lte('timestamp', endWindow.toISOString())
          .order('beach_id', { ascending: true })
          .range(from, to)

        if (error) {
          return { data: rows, error }
        }

        if (!data || data.length === 0) {
          break
        }

        rows.push(...data)

        if (data.length < PAGE_SIZE) {
          break
        }

        page += 1
      }

      return { data: rows, error: null }
    }

    const { data: rawData, error: queryError } = await fetchForecastRows()

    if (queryError || !rawData) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch surf intensity data' },
        { status: 500 }
      )
    }

    // Aggregate forecast data by beach
    const beachMaxValues: Record<string, number[]> = {}
    rawData.forEach((record: any) => {
      const beachId = String(record.beach_id)
      const surfHeight = record.surf_height_max_ft
      if (surfHeight != null && !Number.isNaN(Number(surfHeight))) {
        if (!beachMaxValues[beachId]) {
          beachMaxValues[beachId] = []
        }
        beachMaxValues[beachId].push(Number(surfHeight))
      }
    })

    const fallbackIntensity: Record<string, number> = {}
    Object.keys(beachMaxValues).forEach((beach) => {
      const maxes = beachMaxValues[beach]
      if (maxes.length > 0) {
        fallbackIntensity[beach] =
          maxes.reduce((sum, val) => sum + val, 0) / maxes.length
      }
    })

    const response = NextResponse.json({
      success: true,
      data: fallbackIntensity,
      source: 'forecast_fallback'
    })

    // Cache for 1 hour
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200')

    return response
  } catch (error) {
    console.error('Error fetching surf intensity:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
