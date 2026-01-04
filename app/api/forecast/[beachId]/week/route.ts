// app/api/forecast/[beachId]/week/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { formatTimestamp, fetchBeachForecast } from '@/lib/supabase'

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

    const now = new Date()
    const sevenDaysLater = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000))

    const forecastsRaw = await fetchBeachForecast(
      String(beachId),
      now,
      sevenDaysLater
    )

    const ftToMeters = (ft: number | null) =>
      ft == null ? null : ft * 0.3048
    const fToC = (f: number | null) =>
      f == null ? null : ((f - 32) * 5) / 9
    const mphToKph = (mph: number | null) =>
      mph == null ? null : mph * 1.60934
    const inHgToHpa = (inhg: number | null) =>
      inhg == null ? null : inhg * 33.8639

    const forecasts = forecastsRaw.map((forecast) => ({
      timestamp: formatTimestamp(forecast.timestamp),
      swell: {
        primary: {
          height: ftToMeters(forecast.swell.primary.height),
          period: forecast.swell.primary.period,
          direction: forecast.swell.primary.direction
        },
        secondary: {
          height: ftToMeters(forecast.swell.secondary.height),
          period: forecast.swell.secondary.period,
          direction: forecast.swell.secondary.direction
        }
      },
      surf: {
        heightMin: ftToMeters(forecast.surf.heightMin),
        heightMax: ftToMeters(forecast.surf.heightMax),
        waveEnergy:
          forecast.surf.waveEnergy != null
            ? forecast.surf.waveEnergy * 1000
            : null
      },
      conditions: {
        waterTemp: fToC(forecast.conditions.waterTemp),
        tideLevel: ftToMeters(forecast.conditions.tideLevel),
        windSpeed: mphToKph(forecast.conditions.windSpeed),
        windGust: mphToKph(forecast.conditions.windGust),
        windDirection: forecast.conditions.windDirection,
        airTemp: forecast.conditions.weather,
        pressure: inHgToHpa(forecast.conditions.pressure ?? null)
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
