// app/api/forecast/[beachId]/current/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchCurrentConditions } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ beachId: string }> }
) {
  try {
    const { beachId: rawBeachId } = await context.params;
    const beachId = Number(rawBeachId);

    if (isNaN(beachId)) {
      return NextResponse.json(
        { success: false, error: "Invalid beach ID" },
        { status: 400 }
      );
    }

    const current = await fetchCurrentConditions(String(beachId));

    if (!current) {
      return NextResponse.json(
        { success: false, error: "No current forecast data found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: current,
    });
  } catch (error) {
    console.error("Error fetching current forecast:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
