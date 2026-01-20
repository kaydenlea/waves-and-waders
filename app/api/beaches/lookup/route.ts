import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = (searchParams.get('search') ?? '').trim()
  const includeDetails = process.env.NODE_ENV !== "production";

  if (!search) {
    return NextResponse.json(
      { success: false, error: 'Missing search parameter' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .rpc('find_beach_smart', { search_term: search })
    .limit(1)
    .single()

  if (error) {
    console.warn('find_beach_smart failed in lookup route:', error?.message ?? error)
    const fallback = await supabase
      .from('beaches')
      .select('id, Name, LATITUDE, LONGITUDE, COUNTY, grid_id')
      .eq('id', search)
      .maybeSingle()

    if (fallback.error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch beach',
          ...(includeDetails ? { details: fallback.error.message } : {}),
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: fallback.data ?? null })
  }

  return NextResponse.json({ success: true, data: data ?? null })
}
