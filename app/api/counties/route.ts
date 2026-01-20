// app/api/counties/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Cache counties in memory (refreshed every 12 hours since this data rarely changes)
let countiesCache: string[] | null = null;
let countiesCacheTime = 0;
const COUNTIES_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

export async function GET(_request: NextRequest) {
  try {
    const now = Date.now();

    // Return from cache if available and fresh
    if (countiesCache && (now - countiesCacheTime) < COUNTIES_CACHE_TTL) {
      const response = NextResponse.json({
        success: true,
        data: countiesCache
      })
      response.headers.set(
        'Cache-Control',
        'public, s-maxage=43200, stale-while-revalidate=86400'
      )
      return response;
    }

    const { data, error } = await supabase
      .from('beaches')
      .select('COUNTY')
      .not('COUNTY', 'is', null)
      .not('LATITUDE', 'is', null)
      .not('LONGITUDE', 'is', null)

    if (error) {
      console.error('Supabase error:', error)
      // Return stale cache if available
      if (countiesCache) {
        const response = NextResponse.json({
          success: true,
          data: countiesCache
        })
        response.headers.set(
          'Cache-Control',
          'public, s-maxage=600, stale-while-revalidate=1800'
        )
        return response;
      }
      return NextResponse.json(
        { success: false, error: 'Failed to fetch counties' },
        { status: 500 }
      )
    }

    const uniqueCounties = [...new Set(data.map(row => row.COUNTY))].sort()

    // Update cache
    countiesCache = uniqueCounties;
    countiesCacheTime = now;

    const response = NextResponse.json({
      success: true,
      data: uniqueCounties
    })

    // Cache counties list for 12 hours (very stable data, rarely changes)
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=43200, stale-while-revalidate=86400'
    )

    return response
  } catch (error) {
    console.error('Error fetching counties:', error)
    // Return stale cache if available
    if (countiesCache) {
      const response = NextResponse.json({
        success: true,
        data: countiesCache
      })
      response.headers.set(
        'Cache-Control',
        'public, s-maxage=600, stale-while-revalidate=1800'
      )
      return response;
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
