// app/api/beaches/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase, FEATURE_COLUMNS } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Build select with common columns + feature flags
    const baseCols = 'id, Name, COUNTY, LATITUDE, LONGITUDE'
    const featureCols = FEATURE_COLUMNS.join(', ')
    const selectCols = `${baseCols}, ${featureCols}`

    const { data, error } = await supabase
      .from('beaches')
      .select(selectCols)
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

    // Local boolean coercion similar to client utils
    const toBool = (v: any): boolean => {
      if (v === null || v === undefined) return false
      if (typeof v === 'boolean') return v
      if (typeof v === 'number') return v !== 0
      if (typeof v === 'string') {
        const s = v.trim().toLowerCase()
        return ['y','yes','true','t','1'].includes(s)
      }
      return false
    }

    const beaches = data.map((beach: any) => {
      const features: Record<string, boolean> = {}
      for (const key of FEATURE_COLUMNS as readonly string[]) {
        features[key] = toBool(beach[key])
      }
      return {
        id: beach.id,
        name: beach.Name,
        county: beach.COUNTY,
        latitude: beach.LATITUDE,
        longitude: beach.LONGITUDE,
        features,
      }
    })

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
