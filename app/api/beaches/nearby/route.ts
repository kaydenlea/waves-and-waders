import { NextRequest, NextResponse } from "next/server";
import { supabase, FEATURE_COLUMNS } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type BeachRow = {
  id: string;
  Name: string;
  COUNTY: string;
  LATITUDE: number;
  LONGITUDE: number;
  grid_id?: number | string | null;
} & Record<(typeof FEATURE_COLUMNS)[number], boolean | number | string | null>;

const parseNumber = (value: string | null, name: string) => {
  if (value == null) {
    throw new Error(`Missing ${name}`);
  }
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num)) {
    throw new Error(`Invalid ${name}`);
  }
  return num;
};

const buildSelectColumns = () => {
  const baseCols = [
    "id",
    "Name",
    "COUNTY",
    "LATITUDE",
    "LONGITUDE",
    "grid_id",
  ].join(", ");
  const featureCols = FEATURE_COLUMNS.join(", ");
  return `${baseCols}, ${featureCols}`;
};

const mapRowToBeach = (row: BeachRow) => {
  const features: Record<string, boolean> = {};
  for (const key of FEATURE_COLUMNS) {
    features[key] = Boolean(row[key]);
  }
  return {
    id: row.id,
    name: row.Name,
    county: row.COUNTY,
    latitude: row.LATITUDE,
    longitude: row.LONGITUDE,
    grid_id:
      typeof row.grid_id === "number"
        ? row.grid_id
        : row.grid_id != null && !Number.isNaN(Number(row.grid_id))
        ? Number(row.grid_id)
        : null,
    features,
  };
};

// Calculate approximate distance in degrees (good enough for sorting)
const distanceSquared = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) => {
  const cosLat = Math.cos((lat1 * Math.PI) / 180);
  const dLat = lat2 - lat1;
  const dLng = (lng2 - lng1) * cosLat;
  return dLat * dLat + dLng * dLng;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseNumber(searchParams.get("lat"), "lat");
    const lng = parseNumber(searchParams.get("lng"), "lng");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 30;

    // Query beaches within a reasonable bounding box first to limit the dataset
    // ~1 degree ≈ 111km, so ±2 degrees gives us ~444km radius
    const boxSize = 2;
    const south = lat - boxSize;
    const north = lat + boxSize;
    const west = lng - boxSize;
    const east = lng + boxSize;

    const selectCols = buildSelectColumns();

    const { data, error } = await supabase
      .from("beaches_optimized")
      .select(selectCols)
      .gte("LATITUDE", south)
      .lte("LATITUDE", north)
      .gte("LONGITUDE", west)
      .lte("LONGITUDE", east)
      .or("INLND_AREA.is.null,INLND_AREA.neq.Yes")
      .limit(500); // Get more than needed, then sort by distance

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch beaches" },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: true,
        beaches: [],
        bounds: null,
      });
    }

    // Sort by distance and take the closest ones
    const beachesWithDistance = (data as unknown as BeachRow[])
      .map((row) => ({
        row,
        dist: distanceSquared(lat, lng, row.LATITUDE, row.LONGITUDE),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, limit);

    const beaches = beachesWithDistance.map((entry) => mapRowToBeach(entry.row));

    // Calculate bounds for the nearest beaches
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const beach of beaches) {
      if (beach.latitude < minLat) minLat = beach.latitude;
      if (beach.latitude > maxLat) maxLat = beach.latitude;
      if (beach.longitude < minLng) minLng = beach.longitude;
      if (beach.longitude > maxLng) maxLng = beach.longitude;
    }

    const bounds =
      beaches.length > 0
        ? {
            south: minLat,
            north: maxLat,
            west: minLng,
            east: maxLng,
          }
        : null;

    return NextResponse.json({
      success: true,
      beaches,
      bounds,
      userLocation: { lat, lng },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
