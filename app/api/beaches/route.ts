// app/api/beaches/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase, FEATURE_COLUMNS } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Build select with common columns + feature flags
    const baseCols = 'id, Name, COUNTY, LATITUDE, LONGITUDE'

    if (!FEATURE_COLUMNS || !Array.isArray(FEATURE_COLUMNS)) {
      console.error('FEATURE_COLUMNS is not defined or not an array');
      return NextResponse.json(
        { success: false, error: 'Feature columns configuration error' },
        { status: 500 }
      )
    }

    const featureCols = FEATURE_COLUMNS.join(', ')
    const selectCols = `${baseCols}, ${featureCols}`

    // Fetch all beaches using pagination to bypass the 1000 row limit
    const PAGE_SIZE = 1000
    let allData: any[] = []
    let page = 0
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from('beaches_optimized')
        .select(selectCols)
        .or('INLND_AREA.is.null,INLND_AREA.neq.Yes') // Exclude inland areas
        .order('Name')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (error) {
        console.error('Supabase error:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to fetch beaches', details: error.message },
          { status: 500 }
        )
      }

      if (!data || data.length === 0) {
        hasMore = false
      } else {
        allData = allData.concat(data)
        hasMore = data.length === PAGE_SIZE
        page++
      }
    }

    if (allData.length === 0) {
      console.error('No data returned from Supabase')
      return NextResponse.json(
        { success: false, error: 'No data returned from database' },
        { status: 500 }
      )
    }

    // beaches_optimized view already returns proper booleans, no conversion needed
    const beaches = allData.map((beach: any) => {
      const features: Record<string, boolean> = {}
      for (const key of FEATURE_COLUMNS as readonly string[]) {
        // View already converts to boolean, just assign directly
        features[key] = beach[key] ?? false
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

    console.log('Beaches API returning', beaches.length, 'beaches');
    console.log('Fetched in', page, 'page(s)');
    if (beaches.length > 0) {
      console.log('Sample beach ID:', beaches[0]?.id, 'type:', typeof beaches[0]?.id);
    }

    return NextResponse.json({
      success: true,
      data: beaches
    })
  } catch (error: any) {
    console.error('Error fetching beaches:', error)
    console.error('Error details:', error?.message, error?.stack)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error?.message || String(error) },
      { status: 500 }
    )
  }
}
