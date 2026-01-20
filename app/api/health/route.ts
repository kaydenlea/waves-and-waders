// app/api/health/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const response = NextResponse.json({
    success: true,
    message: 'Surf Report API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
  response.headers.set("Cache-Control", "no-store");
  return response;
}
