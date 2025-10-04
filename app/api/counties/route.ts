// app/api/counties/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('beaches')
      .select('COUNTY')
      .not('COUNTY', 'is', null)
      .not('LATITUDE', 'is', null)
      .not('LONGITUDE', 'is', null)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch counties' },
        { status: 500 }
      )
    }

    const uniqueCounties = [...new Set(data.map(row => row.COUNTY))].sort()

    return NextResponse.json({
      success: true,
      data: uniqueCounties
    })
  } catch (error) {
    console.error('Error fetching counties:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}