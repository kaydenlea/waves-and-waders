// app/api/search/beaches/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Search query (q) is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('beaches')
      .select('id, Name, COUNTY, LATITUDE, LONGITUDE')
      .ilike('Name', `%${query}%`)
      .not('LATITUDE', 'is', null)
      .not('LONGITUDE', 'is', null)
      .limit(20)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to search beaches' },
        { status: 500 }
      )
    }

    const beaches = data.map(beach => ({
      id: beach.id,
      name: beach.Name,
      county: beach.COUNTY,
      latitude: beach.LATITUDE,
      longitude: beach.LONGITUDE
    }))

    return NextResponse.json({
      success: true,
      data: beaches
    })
  } catch (error) {
    console.error('Error searching beaches:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}