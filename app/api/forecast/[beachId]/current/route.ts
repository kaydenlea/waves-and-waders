// app/api/forecast/[beachId]/current/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { formatTimestamp, fetchCurrentConditions } from '@/lib/supabase'

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

    const current = await fetchCurrentConditions(String(beachId))

    if (!current) {
      return NextResponse.json(
        { success: false, error: 'No current forecast data found' },
        { status: 404 }
      )
    }

    const ftToMeters = (ft: number | null) =>
      ft == null ? null : ft * 0.3048
    const fToC = (f: number | null) =>
      f == null ? null : ((f - 32) * 5) / 9
    const mphToKph = (mph: number | null) =>
      mph == null ? null : mph * 1.60934
    const inHgToHpa = (inhg: number | null) =>
      inhg == null ? null : inhg * 33.8639

    const swellPrimary = current.swell.primary
    const swellSecondary = current.swell.secondary

    const surf = current.surf
    const conditions = current.conditions
    
    return NextResponse.json({
      success: true,
      data: {
        beachId,
        timestamp: formatTimestamp(current.timestamp),
        swell: {
          primary: {
            height: ftToMeters(swellPrimary.height),
            period: swellPrimary.period,
            direction: swellPrimary.direction
          },
          secondary: {
            height: ftToMeters(swellSecondary.height),
            period: swellSecondary.period,
            direction: swellSecondary.direction
          }
        },
        surf: {
          heightMin: ftToMeters(surf.heightMin),
          heightMax: ftToMeters(surf.heightMax),
          waveEnergy:
            surf.waveEnergy != null ? surf.waveEnergy * 1000 : null
        },
        conditions: {
          waterTemp: fToC(conditions.waterTemp),
          tideLevel: ftToMeters(conditions.tideLevel),
          windSpeed: mphToKph(conditions.windSpeed),
          windGust: mphToKph(conditions.windGust),
          windDirection: conditions.windDirection,
          airTemp: conditions.weather,
          pressure: inHgToHpa(conditions.pressure ?? null)
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
