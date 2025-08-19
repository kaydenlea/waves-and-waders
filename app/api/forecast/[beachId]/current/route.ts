// app/api/forecast/[beachId]/current/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase, formatTimestamp } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { beachId: string } }
) {
  try {
    const beachId = parseInt(params.beachId)
    
    if (isNaN(beachId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid beach ID' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('forecast_data')
      .select('*')
      .eq('beach_id', beachId)
      .gte('timestamp', now)
      .order('timestamp', { ascending: true })
      .limit(1)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch forecast' },
        { status: 500 }
      )
    }

    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No current forecast data found' },
        { status: 404 }
      )
    }

    const forecast = data[0]
    
    return NextResponse.json({
      success: true,
      data: {
        beachId: forecast.beach_id,
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
      }
    })
  } catch (error) {
    console.error('Error fetching current forecast:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}