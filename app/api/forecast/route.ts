// app/api/forecast/route.ts
// Returns beach forecast windows and is cached for 3 hours via Cache-Control.
import { NextRequest, NextResponse } from 'next/server'
import { fetchBeachForecast } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const beachId = searchParams.get('beachId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!beachId) {
      return NextResponse.json(
        { success: false, error: 'beachId parameter is required' },
        { status: 400 }
      )
    }

    const start = startDate ? new Date(startDate) : undefined
    const end = endDate ? new Date(endDate) : undefined

    const data = await fetchBeachForecast(beachId, start, end)

    const response = NextResponse.json({
      success: true,
      data
    })

    // Cache for 3 hours (forecast data updates every ~3 hours)
    response.headers.set('Cache-Control', 'public, s-maxage=10800, stale-while-revalidate=21600')

    return response
  } catch (error: unknown) {
    console.error('Error fetching forecast:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
