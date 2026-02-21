// app/api/surf-intensity/route.ts
// Surf intensity lookups are cached for 3 hours with SWR.
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getPacificDayRange } from "@/lib/utils";
import { computeRepresentativeSurfFt } from "@/lib/forecast/surfIntensity";

type GridIntensityRow = {
  grid_id: number;
  avg_surf_max_ft: number | null;
};

type GridForecastRow = {
  grid_id: number;
  surf_height_max_ft: number | null;
};

type RepresentativeForecastRow = {
  grid_id: number;
  timestamp: string;
  primary_swell_height_ft: number | null;
  primary_swell_period_s: number | null;
  secondary_swell_height_ft: number | null;
  secondary_swell_period_s: number | null;
  tertiary_swell_height_ft: number | null;
  tertiary_swell_period_s: number | null;
  wind_speed_mph: number | null;
  surf_height_min_ft: number | null;
  surf_height_max_ft: number | null;
};

type BeachGridRow = {
  id: string | number;
  grid_id: number | null;
};

const debug = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(...args);
  }
};

// Cache beach-grid mapping in memory (refreshed every 6 hours)
let beachGridMapCache: Map<number, string[]> | null = null;
let beachGridMapCacheTime = 0;
const BEACH_GRID_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const mode = searchParams.get("mode") ?? "daily";

    if (!dateParam) {
      return NextResponse.json(
        { success: false, error: "Date parameter is required" },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json(
        { success: false, error: "Invalid date format (expected YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const beachMap = await loadBeachGridMap();
    debug("Surf intensity beach map loaded", { gridPoints: beachMap.size });

    if (mode === "representative") {
      const [year, month, day] = dateParam.split("-").map((v) => Number(v));
      // Anchor at noon UTC so Pacific date extraction stays on the intended day.
      const anchor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
      const { start: dayStart, end: dayEnd } = getPacificDayRange(anchor);

      const forecastRows = await fetchRepresentativeForecastRows(
        dayStart.toISOString(),
        dayEnd.toISOString(),
      );
      debug("Surf intensity representative forecast rows fetched", {
        rows: forecastRows.length,
      });

      const representativeRows = pickRepresentativeGridIntensity(forecastRows);
      debug("Surf intensity representative rows computed", {
        gridPoints: representativeRows.length,
      });

      const intensityMap = mapGridValuesToBeaches(representativeRows, beachMap);
      debug("Surf intensity mapped from representative forecast", {
        beaches: Object.keys(intensityMap).length,
      });

      const response = NextResponse.json({
        success: true,
        data: intensityMap,
        source: "grid_forecast_representative",
      });
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=10800, stale-while-revalidate=21600",
      );
      return response;
    }

    const dailyRows = await fetchDailyGridIntensity(dateParam);
    debug("Surf intensity daily rows fetched", { rows: dailyRows?.length ?? 0 });

    if (dailyRows && dailyRows.length > 0) {
      const intensityMap = mapGridValuesToBeaches(dailyRows, beachMap);
      debug("Surf intensity mapped from daily_grid_surf_intensity", {
        beaches: Object.keys(intensityMap).length,
      });
      const response = NextResponse.json({
        success: true,
        data: intensityMap,
        source: "daily_grid_table",
      });
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=10800, stale-while-revalidate=21600"
      );
      return response;
    }

    debug("No daily surf intensity rows; falling back to forecast aggregation");
    const [year, month, day] = dateParam.split("-").map((v) => Number(v));
    const startWindow = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endWindow = new Date(
      Date.UTC(year, month - 1, day, 23, 59, 59, 999)
    );

    const forecastRows = await fetchGridForecastRows(
      startWindow.toISOString(),
      endWindow.toISOString()
    );
    debug("Surf intensity forecast rows fetched", { rows: forecastRows.length });

    const aggregated = aggregateForecastRows(forecastRows);
    debug("Surf intensity aggregated forecast rows", {
      gridPoints: aggregated.length,
    });

    const fallbackIntensity = mapGridValuesToBeaches(aggregated, beachMap);
    debug("Surf intensity mapped from forecast fallback", {
      beaches: Object.keys(fallbackIntensity).length,
    });

    const response = NextResponse.json({
      success: true,
      data: fallbackIntensity,
      source: "grid_forecast_fallback",
    });

    response.headers.set(
      "Cache-Control",
      "public, s-maxage=10800, stale-while-revalidate=21600"
    );

    return response;
  } catch (error) {
    console.error("Error fetching surf intensity:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function loadBeachGridMap(): Promise<Map<number, string[]>> {
  const now = Date.now();
  if (
    beachGridMapCache &&
    now - beachGridMapCacheTime < BEACH_GRID_CACHE_TTL
  ) {
    debug("Using cached beach-grid map");
    return beachGridMapCache;
  }

  debug("Refreshing beach-grid map from database");
  const map = new Map<number, string[]>();

  // Fetch all beaches with pagination (Supabase limits to 1000 per request)
  const PAGE_SIZE = 1000;
  let allData: BeachGridRow[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("beaches")
      .select("id, grid_id")
      .not("grid_id", "is", null)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error("Failed to load beaches for grid mapping:", error);
      return beachGridMapCache ?? map;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allData = allData.concat(data as BeachGridRow[]);
      hasMore = data.length === PAGE_SIZE;
      page++;
    }
  }

  for (const row of allData) {
    if (row.grid_id == null) continue;
    if (!map.has(row.grid_id)) {
      map.set(row.grid_id, []);
    }
    map.get(row.grid_id)!.push(String(row.id));
  }

  beachGridMapCache = map;
  beachGridMapCacheTime = now;

  debug("Loaded beach-grid map", { beaches: allData.length });
  return map;
}

async function fetchDailyGridIntensity(date: string) {
  const { data, error } = await supabase
    .from("daily_grid_surf_intensity")
    .select("grid_id, avg_surf_max_ft")
    .eq("date", date)
    .order("grid_id", { ascending: true });

  if (error) {
    console.warn("Failed to fetch daily grid intensity, will fallback", error);
    return null;
  }

  return data as GridIntensityRow[] | null;
}

async function fetchGridForecastRows(startIso: string, endIso: string) {
  const { data, error } = await supabase
    .from("grid_forecast_data")
    .select("grid_id, surf_height_max_ft")
    .gte("timestamp", startIso)
    .lte("timestamp", endIso);

  if (error) {
    console.error("Failed to fetch grid forecast rows:", error);
    return [];
  }

  return data as GridForecastRow[];
}

async function fetchRepresentativeForecastRows(startIso: string, endIso: string) {
  const { data, error } = await supabase
    .from("grid_forecast_data")
    .select(
      [
        "grid_id",
        "timestamp",
        "primary_swell_height_ft",
        "primary_swell_period_s",
        "secondary_swell_height_ft",
        "secondary_swell_period_s",
        "tertiary_swell_height_ft",
        "tertiary_swell_period_s",
        "wind_speed_mph",
        "surf_height_min_ft",
        "surf_height_max_ft",
      ].join(", "),
    )
    .gte("timestamp", startIso)
    .lt("timestamp", endIso)
    .order("timestamp", { ascending: true });

  if (error) {
    console.error("Failed to fetch representative grid forecast rows:", error);
    return [];
  }

  return data as RepresentativeForecastRow[];
}

function aggregateForecastRows(rows: GridForecastRow[]): GridIntensityRow[] {
  const totals = new Map<number, { sum: number; count: number }>();

  for (const row of rows) {
    if (row.grid_id == null) continue;
    const value =
      row.surf_height_max_ft != null ? Number(row.surf_height_max_ft) : null;
    if (value == null || Number.isNaN(value)) continue;

    if (!totals.has(row.grid_id)) {
      totals.set(row.grid_id, { sum: 0, count: 0 });
    }
    const bucket = totals.get(row.grid_id)!;
    bucket.sum += value;
    bucket.count += 1;
  }

  return Array.from(totals.entries()).map(([grid_id, bucket]) => ({
    grid_id,
    avg_surf_max_ft: bucket.count > 0 ? bucket.sum / bucket.count : null,
  }));
}

function pickRepresentativeGridIntensity(
  rows: RepresentativeForecastRow[],
): GridIntensityRow[] {
  const targetHour = 12;
  const pacificHourFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    hour12: false,
  });

  const best = new Map<number, { row: RepresentativeForecastRow; diff: number }>();

  for (const row of rows) {
    if (row.grid_id == null) continue;
    const rawHour = Number.parseInt(
      pacificHourFormatter.format(new Date(row.timestamp)),
      10,
    );
    const hour = Number.isFinite(rawHour) ? ((rawHour % 24) + 24) % 24 : 0;
    const diff = Math.abs(hour - targetHour);
    const wrappedDiff = diff > 12 ? 24 - diff : diff;
    const prev = best.get(row.grid_id);
    if (!prev || wrappedDiff < prev.diff) {
      best.set(row.grid_id, { row, diff: wrappedDiff });
    }
  }

  const result: GridIntensityRow[] = [];
  for (const [grid_id, entry] of best.entries()) {
    const row = entry.row;
    const intensity =
      computeRepresentativeSurfFt({
        timestamp: row.timestamp,
        swell: {
          primary: {
            height: row.primary_swell_height_ft,
            period: row.primary_swell_period_s,
            direction: null,
          },
          secondary: {
            height: row.secondary_swell_height_ft,
            period: row.secondary_swell_period_s,
            direction: null,
          },
          tertiary: {
            height: row.tertiary_swell_height_ft,
            period: row.tertiary_swell_period_s,
            direction: null,
          },
        },
        surf: {
          heightMin: row.surf_height_min_ft,
          heightMax: row.surf_height_max_ft,
          waveEnergy: null,
        },
        conditions: {
          waterTemp: null,
          tideLevel: null,
          windSpeed: row.wind_speed_mph,
          windGust: null,
          windDirection: null,
          airTemp: null,
          pressure: null,
          weather: null,
        },
      }) ?? null;
    result.push({ grid_id, avg_surf_max_ft: intensity });
  }
  return result;
}

function mapGridValuesToBeaches(
  rows: GridIntensityRow[] | null,
  beachMap: Map<number, string[]>
): Record<string, number> {
  const result: Record<string, number> = {};
  if (!rows) return result;

  for (const row of rows) {
    if (row.grid_id == null) continue;
    if (row.avg_surf_max_ft == null) continue;

    const beaches = beachMap.get(row.grid_id);
    if (!beaches || beaches.length === 0) continue;

    for (const beachId of beaches) {
      result[beachId] = Number(row.avg_surf_max_ft);
    }
  }

  return result;
}
