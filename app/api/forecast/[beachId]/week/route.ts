// app/api/forecast/[beachId]/week/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase, formatTimestamp } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    const beachId = parseInt(params.beachId)
    
    if (isNaN(beachId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid beach ID' },
        { status: 400 }
      )
    }

    const now = new Date()
    const sevenDaysLater = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000))

    const { data, error } = await supabase
      .from('forecast_data')
      .select('*')
      .eq('beach_id', beachId)
      .gte('timestamp', now.toISOString())
      .lte('timestamp', sevenDaysLater.toISOString())
      .order('timestamp', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch forecast' },
        { status: 500 }
      )
    }

    const forecasts = data.map(forecast => ({
      timestamp: formatTimestamp(forecast.timestamp),
      swell: {
        primary: {
          height: forecast.primary_swell_height_m,
          period: forecast.primary_swell_period_s,
          direction: forecast.primary_swell_direction
        },
        secondary: {
          height: forecast.secondary_swell_height_m,
          period: forecast.secondary_swell_period_s,
          direction: forecast.secondary_swell_direction
        }
      },
      surf: {
        heightMin: forecast.surf_height_min_m,
        heightMax: forecast.surf_height_max_m,
        waveEnergy: forecast.wave_energy_joules
      },
      conditions: {
        waterTemp: forecast.water_temp_c,
        tideLevel: forecast.tide_level_m,
        windSpeed: forecast.wind_speed_kph,
        windGust: forecast.wind_gust_kph,
        windDirection: forecast.wind_direction_deg,
        airTemp: forecast.weather,
        pressure: forecast.pressure_hpa
      }
    }))

    return NextResponse.json({
      success: true,
      data: {
        beachId: beachId,
        forecasts
      }
    })
  } catch (error) {
    console.error('Error fetching week forecast:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
