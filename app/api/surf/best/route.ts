// app/api/surf/best/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase, formatTimestamp } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('forecast_data')
      .select(`
        beach_id,
        surf_height_max_m,
        wave_energy_joules,
        wind_speed_kph,
        timestamp,
        beaches!inner(Name, COUNTY)
      `)
      .gte('timestamp', now)
      .not('wave_energy_joules', 'is', null)
      .order('wave_energy_joules', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch best surf conditions' },
        { status: 500 }
      )
    }

    const bestSpots = data.map(spot => ({
      beachId: spot.beach_id,
      beachName: spot.beaches.Name,
      county: spot.beaches.COUNTY,
      surfHeight: spot.surf_height_max_m,
      waveEnergy: spot.wave_energy_joules,
      windSpeed: spot.wind_speed_kph,
      timestamp: formatTimestamp(spot.timestamp)
    }))

    return NextResponse.json({
      success: true,
      data: bestSpots
    })
  } catch (error) {
    console.error('Error fetching best surf conditions:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}