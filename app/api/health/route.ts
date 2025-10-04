// app/api/health/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Surf Report API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
}