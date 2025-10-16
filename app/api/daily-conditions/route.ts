// app/api/daily-conditions/route.ts
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

    const data = await fetchDailyConditions(county, dateObj)

    const response = NextResponse.json({
      success: true,
      data
    })

    // Cache for 6 hours (daily conditions like sunrise/sunset don't change often)
    response.headers.set('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=43200')

    return response
  } catch (error: any) {
    console.error('Error fetching daily conditions:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
