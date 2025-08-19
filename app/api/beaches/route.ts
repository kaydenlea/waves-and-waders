// app/api/beaches/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('beaches')
      .select('id, Name, COUNTY, LATITUDE, LONGITUDE')
      .not('LATITUDE', 'is', null)
      .not('LONGITUDE', 'is', null)
      .order('Name')

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch beaches' },
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
    console.error('Error fetching beaches:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}