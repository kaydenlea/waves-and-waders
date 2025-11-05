// app/api/surf/best/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase, formatTimestamp } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const now = new Date().toISOString()

    const { data: gridRows, error } = await supabase
      .from('grid_forecast_data')
      .select('grid_id, surf_height_max_ft, wave_energy_kj, wind_speed_mph, timestamp')
      .gte('timestamp', now)
      .not('wave_energy_kj', 'is', null)
      .order('wave_energy_kj', { ascending: false })
      .limit(limit * 3)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch best surf conditions' },
        { status: 500 }
      )
    }

    if (!gridRows || gridRows.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    const uniqueGridIds = Array.from(
      new Set(gridRows.map(row => row.grid_id))
    )

    const { data: beachesData, error: beachesError } = await supabase
      .from('beaches')
      .select('id, Name, COUNTY, grid_id')
      .in('grid_id', uniqueGridIds)

    if (beachesError) {
      console.error('Supabase error:', beachesError)
      return NextResponse.json(
        { success: false, error: 'Failed to resolve beaches for surf data' },
        { status: 500 }
      )
    }

    const beachesByGrid = new Map<number, { id: number; Name: string; COUNTY: string }[]>()
    for (const beach of beachesData ?? []) {
      if (beach.grid_id == null) continue
      if (!beachesByGrid.has(beach.grid_id)) {
        beachesByGrid.set(beach.grid_id, [])
      }
      beachesByGrid.get(beach.grid_id)!.push({
        id: beach.id,
        Name: beach.Name,
        COUNTY: beach.COUNTY
      })
    }

    const ftToMeters = (ft: number | null) =>
      ft == null ? null : ft * 0.3048
    const mphToKph = (mph: number | null) =>
      mph == null ? null : mph * 1.60934

    const bestSpots: {
      beachId: number
      beachName: string
      county: string
      surfHeight: number | null
      waveEnergy: number | null
      windSpeed: number | null
      timestamp: string
    }[] = []

    for (const row of gridRows ?? []) {
      const mappedBeaches = beachesByGrid.get(row.grid_id)
      if (!mappedBeaches || mappedBeaches.length === 0) {
        continue
      }

      for (const beach of mappedBeaches) {
        bestSpots.push({
          beachId: beach.id,
          beachName: beach.Name,
          county: beach.COUNTY,
          surfHeight: ftToMeters(row.surf_height_max_ft),
          waveEnergy:
            row.wave_energy_kj != null ? row.wave_energy_kj * 1000 : null,
          windSpeed: mphToKph(row.wind_speed_mph),
          timestamp: formatTimestamp(row.timestamp)
        })
        if (bestSpots.length >= limit) {
          break
        }
      }
      if (bestSpots.length >= limit) {
        break
      }
    }

    return NextResponse.json({
      success: true,
      data: bestSpots.slice(0, limit)
    })
  } catch (error) {
    console.error('Error fetching best surf conditions:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
