// app/api/beaches/surf-intensity/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    if (!dateParam) {
      return NextResponse.json(
        { success: false, error: 'Date parameter is required' },
        { status: 400 }
      )
    }

    // Parse the date and get the start and end of that day
    const targetDate = new Date(dateParam)
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format' },
        { status: 400 }
      )
    }

    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    console.log('Fetching surf data for date range:', {
      requestedDate: dateParam,
      parsedDate: targetDate.toISOString(),
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
      startLocal: startOfDay.toLocaleString(),
      endLocal: endOfDay.toLocaleString()
    });

    // Fetch forecast data for all beaches for the given date
    const { data, error } = await supabase
      .from('forecast_data')
      .select('beach_id, surf_height_max_ft, timestamp')
      .gte('timestamp', startOfDay.toISOString())
      .lte('timestamp', endOfDay.toISOString())

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch surf data' },
        { status: 500 }
      )
    }

    console.log('Fetched records:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('Sample record:', data[0]);
    }

    // Calculate average surf height for each beach for that day
    // Support both numeric and UUID beach IDs
    const beachSurfData: Record<string, { total: number; count: number; max: number }> = {}

    data.forEach((record: any) => {
      const beachId = String(record.beach_id)
      const surfHeight = record.surf_height_max_ft || 0

      if (!beachSurfData[beachId]) {
        beachSurfData[beachId] = { total: 0, count: 0, max: 0 }
      }

      beachSurfData[beachId].total += surfHeight
      beachSurfData[beachId].count += 1
      beachSurfData[beachId].max = Math.max(beachSurfData[beachId].max, surfHeight)
    })

    // Use maximum surf height for each beach
    const surfIntensity: Record<string, number> = {}
    Object.keys(beachSurfData).forEach((beachId) => {
      const data = beachSurfData[beachId]
      surfIntensity[beachId] = data.max
    })

    console.log('Calculated surf intensity for', Object.keys(surfIntensity).length, 'beaches');
    console.log('Sample intensities:', Object.entries(surfIntensity).slice(0, 5));
    const firstKey = Object.keys(surfIntensity)[0];
    console.log('First beach ID in surf intensity:', firstKey, 'type:', typeof firstKey);

    return NextResponse.json({
      success: true,
      data: surfIntensity
    })
  } catch (error) {
    console.error('Error fetching surf intensity:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
