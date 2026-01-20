// app/api/daily-conditions/route.ts
// Daily sunrise/sunset/moon data changes slowly; cached for 12h.
import { NextRequest, NextResponse } from 'next/server'
import { fetchDailyConditions } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const county = searchParams.get('county')
    const date = searchParams.get('date')

    if (!county) {
      return NextResponse.json(
        { success: false, error: 'county parameter is required' },
        { status: 400 }
      )
    }

    const dateObj = date ? new Date(date) : undefined
    if (date && dateObj && Number.isNaN(dateObj.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date' },
        { status: 400 }
      )
    }

    const data = await fetchDailyConditions(county, dateObj)

    const response = NextResponse.json({
      success: true,
      data
    })

    // Cache for 12 hours (daily conditions update nightly)
    response.headers.set('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=86400')

    return response
  } catch (error: unknown) {
    console.error('Error fetching daily conditions:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
