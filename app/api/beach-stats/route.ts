import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getBeachStatsBatch } from "@/lib/beachStats";
import { normalizeHour } from "@/lib/beachStatsShared";
import {
  getCachedBatch,
  setCachedBatch,
} from "@/lib/cache/beachStatsSnapshotStore";

const parseDate = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids = Array.isArray(body?.beachIds) ? body.beachIds : [];
    if (!ids.length) {
      return NextResponse.json(
        { success: false, error: "beachIds array required" },
        { status: 400 }
      );
    }
    const targetDate = parseDate(body?.date);
    const targetHour =
      typeof body?.hour === "number" && Number.isFinite(body.hour)
        ? body.hour
        : null;
    const dateKey =
      targetDate instanceof Date
        ? targetDate.toISOString().split("T")[0]
        : "today";
    const hourKey =
      typeof targetHour === "number"
        ? normalizeHour(targetHour)
        : targetDate instanceof Date
        ? "midday"
        : "now";
    const cached =
      body?.force !== true
        ? getCachedBatch(
            ids.map((id: string | number) => String(id)),
            { dateKey, hourKey }
          )
        : null;
    const effectiveData =
      cached ??
      (await getBeachStatsBatch(ids, {
        targetDate,
        targetHour,
      }));
    if (!cached) {
      setCachedBatch(
        ids.map((id: string | number) => String(id)),
        { dateKey, hourKey },
        effectiveData
      );
    }
    const payload = JSON.stringify({ success: true, data: effectiveData });
    const etag = crypto.createHash("sha1").update(payload).digest("base64url");

    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, statusText: "Not Modified" });
    }

    const response = new NextResponse(payload, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=1800, stale-while-revalidate=3600"
    );
    response.headers.set("ETag", etag);
    return response;
  } catch (error) {
    console.error("Failed to load beach stats batch", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
