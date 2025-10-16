// app/api/tides/route.ts
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

    const data = await fetchBeachTides(beachId, start, end)

    const response = NextResponse.json({
      success: true,
      data
    })

    // Cache for 1 hour (tide data is predictable and changes slowly)
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200')

    return response
  } catch (error: any) {
    console.error('Error fetching tides:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
