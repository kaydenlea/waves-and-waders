// app/api/tides/route.ts
// Tide series are cacheable for 6 hours; see Cache-Control below.
import { NextRequest, NextResponse } from 'next/server'
import { fetchBeachTides } from '@/lib/supabase'

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

    if (startDate && start && Number.isNaN(start.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid startDate' },
        { status: 400 }
      )
    }

    if (endDate && end && Number.isNaN(end.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid endDate' },
        { status: 400 }
      )
    }

    const data = await fetchBeachTides(beachId, start, end)

    const response = NextResponse.json({
      success: true,
      data
    })

    // Cache for 6 hours (tide data is predictable and changes slowly)
    response.headers.set('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=43200')

    return response
  } catch (error: unknown) {
    console.error('Error fetching tides:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
