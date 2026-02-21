// lib/api.ts
// Client-side API wrappers to reduce Supabase egress
// These functions call Next.js API routes instead of Supabase directly

import type {
  ForecastData,
  TidePoint,
  DailyConditions,
} from "./supabase";
import type { BeachStatsSnapshot } from "./beachStatsShared";

export type ApiBeachRecord = {
  id: string | number;
  name?: string;
  Name?: string;
  county?: string;
  COUNTY?: string;
  latitude?: number;
  LATITUDE?: number;
  longitude?: number;
  LONGITUDE?: number;
  grid_id?: number | null;
  features?: Record<string, boolean>;
};

/**
 * Fetch beach forecast data via API route (cached)
 * Replaces direct calls to fetchBeachForecast from @/lib/supabase
 */
const normalizeBaseUrl = (value?: string | null): string | null => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `https://${value}`;
};

let cachedServerBaseUrl: string | null = null;
const getServerBaseUrl = () => {
  if (cachedServerBaseUrl) {
    return cachedServerBaseUrl;
  }

  const candidateEnv = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
    process.env.VERCEL_URL,
    process.env.NEXT_PUBLIC_APP_BASE_URL,
    process.env.APP_BASE_URL,
    process.env.URL,
    process.env.HOST,
  ];

  for (const value of candidateEnv) {
    const normalized = normalizeBaseUrl(value);
    if (normalized) {
      cachedServerBaseUrl = normalized.replace(/\/+$/, "");
      return cachedServerBaseUrl;
    }
  }

  const port = Number.parseInt(
    process.env.PORT ?? process.env.NEXT_PUBLIC_PORT ?? "",
    10
  );
  cachedServerBaseUrl = `http://127.0.0.1:${
    Number.isFinite(port) ? port : 3000
  }`;
  return cachedServerBaseUrl;
};

function resolveApiUrl(pathname: string) {
  if (/^https?:\/\//i.test(pathname)) {
    return pathname;
  }

  if (typeof window !== "undefined") {
    return pathname;
  }

  const base = getServerBaseUrl();

  try {
    return new URL(pathname, base).toString();
  } catch (error) {
    const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
    const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
    console.warn("resolveApiUrl fallback", { pathname, base, error });
    return `${normalizedBase}${normalizedPath}`;
  }
}

export async function fetchBeachForecastAPI(
  beachId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ForecastData[]> {
  const params = new URLSearchParams({ beachId });
  if (startDate) params.append("startDate", startDate.toISOString());
  if (endDate) params.append("endDate", endDate.toISOString());

  const res = await fetch(resolveApiUrl(`/api/forecast?${params.toString()}`));

  if (!res.ok) {
    throw new Error(`Failed to fetch forecast: ${res.status}`);
  }

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || "Failed to fetch forecast");
  }

  return json.data as ForecastData[];
}

/**
 * Fetch beach tide data via API route (cached)
 * Replaces direct calls to fetchBeachTides from @/lib/supabase
 */
export async function fetchBeachTidesAPI(
  beachId: string,
  startDate?: Date,
  endDate?: Date
): Promise<TidePoint[]> {
  const params = new URLSearchParams({ beachId });
  if (startDate) params.append("startDate", startDate.toISOString());
  if (endDate) params.append("endDate", endDate.toISOString());

  const res = await fetch(resolveApiUrl(`/api/tides?${params.toString()}`));

  if (!res.ok) {
    throw new Error(`Failed to fetch tides: ${res.status}`);
  }

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || "Failed to fetch tides");
  }

  return json.data as TidePoint[];
}

/**
 * Fetch daily conditions (sunrise, sunset, moon phase) via API route (cached)
 * Replaces direct calls to fetchDailyConditions from @/lib/supabase
 */
export async function fetchDailyConditionsAPI(
  county: string,
  date?: Date
): Promise<DailyConditions | null> {
  const params = new URLSearchParams({ county });
  if (date) params.append("date", date.toISOString());

  const res = await fetch(
    resolveApiUrl(`/api/daily-conditions?${params.toString()}`)
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch daily conditions: ${res.status}`);
  }

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || "Failed to fetch daily conditions");
  }

  return json.data as DailyConditions | null;
}

/**
 * Fetch surf intensity for a specific date via API route (cached)
 * Replaces direct Supabase queries for daily_grid_surf_intensity
 */
export async function fetchSurfIntensityAPI(
  date: Date,
  options?: { mode?: "daily" | "representative" }
): Promise<Record<string, number>> {
  const dateStr = date.toISOString().split("T")[0];
  const params = new URLSearchParams({ date: dateStr });
  if (options?.mode === "representative") {
    params.set("mode", "representative");
  }
  const res = await fetch(resolveApiUrl(`/api/surf-intensity?${params.toString()}`));

  if (!res.ok) {
    throw new Error(`Failed to fetch surf intensity: ${res.status}`);
  }

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || "Failed to fetch surf intensity");
  }

  return json.data as Record<string, number>;
}

export async function fetchAllBeachesAPI(): Promise<ApiBeachRecord[]> {
  const res = await fetch(resolveApiUrl("/api/beaches"), {
    next: { revalidate: 21600 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch beaches: ${res.status}`);
  }

  const json = await res.json();

  if (!json.success || !Array.isArray(json.data)) {
    throw new Error(json.error || "Failed to fetch beaches");
  }

  return json.data as ApiBeachRecord[];
}

export async function fetchBeachStatsBatchAPI(
  beachIds: Array<string | number>,
  options?: { date?: Date; hour?: number | null }
): Promise<Record<string, BeachStatsSnapshot | null>> {
  if (!Array.isArray(beachIds) || beachIds.length === 0) {
    return {};
  }

  const payload: {
    beachIds: Array<string | number>;
    date?: string;
    hour?: number;
  } = {
    beachIds,
  };

  if (options?.date instanceof Date && !Number.isNaN(options.date.getTime())) {
    payload.date = options.date.toISOString();
  }
  if (typeof options?.hour === "number" && Number.isFinite(options.hour)) {
    payload.hour = options.hour;
  }

  const res = await fetch(resolveApiUrl("/api/beach-stats"), {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch beach stats: ${res.status}`);
  }

  const json = await res.json();

  if (!json.success || typeof json.data !== "object" || json.data === null) {
    throw new Error(json.error || "Failed to fetch beach stats");
  }

  return json.data as Record<string, BeachStatsSnapshot | null>;
}

export type ViewportBeachesStatsPayload = Record<
  string | number,
  BeachStatsSnapshot | null
>;

export type ViewportBeachesResponse =
  | ApiBeachRecord[]
  | {
      beaches: ApiBeachRecord[];
      stats: ViewportBeachesStatsPayload | null;
    };

export type BoundsRequest = {
  south: number;
  west: number;
  north: number;
  east: number;
  crossesAntimeridian?: boolean;
  limit?: number;
  filters?: string[];
  favoriteIds?: Array<string | number>;
  includeStats?: boolean;
  statsLimit?: number;
  statsDate?: Date | null;
  statsHour?: number | null;
};

export async function fetchBeachesInBoundsAPI(
  bounds: BoundsRequest,
  signal?: AbortSignal
): Promise<ViewportBeachesResponse> {
  const params = new URLSearchParams({
    south: bounds.south.toString(),
    west: bounds.west.toString(),
    north: bounds.north.toString(),
    east: bounds.east.toString(),
  });
  if (bounds.crossesAntimeridian) {
    params.set("crosses", "true");
  }
  if (typeof bounds.limit === "number" && Number.isFinite(bounds.limit)) {
    params.set("limit", Math.max(1, bounds.limit).toString());
  }
  if (Array.isArray(bounds.filters) && bounds.filters.length) {
    bounds.filters.forEach((filterKey) => {
      if (!filterKey) return;
      const normalized = String(filterKey).trim().toUpperCase();
      if (normalized) {
        params.append("filter", normalized);
      }
    });
  }
  if (Array.isArray(bounds.favoriteIds) && bounds.favoriteIds.length) {
    bounds.favoriteIds.forEach((id) => {
      if (id == null) return;
      params.append("favoriteId", String(id));
    });
  }
  if (bounds.includeStats) {
    params.set("includeStats", "1");
    if (
      typeof bounds.statsLimit === "number" &&
      Number.isFinite(bounds.statsLimit)
    ) {
      params.set("statsLimit", Math.max(1, bounds.statsLimit).toString());
    }
    if (bounds.statsDate instanceof Date && !Number.isNaN(bounds.statsDate.getTime())) {
      params.set("date", bounds.statsDate.toISOString());
    }
    if (
      typeof bounds.statsHour === "number" &&
      Number.isFinite(bounds.statsHour)
    ) {
      params.set("hour", bounds.statsHour.toString());
    }
  }

  const res = await fetch(
    resolveApiUrl(`/api/beaches/viewport?${params.toString()}`),
    { signal }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch viewport beaches: ${res.status}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to fetch viewport beaches");
  }
  if (bounds.includeStats) {
    const payload = json.data as unknown;
    if (
      !payload ||
      typeof payload !== "object" ||
      !Array.isArray((payload as { beaches?: unknown }).beaches)
    ) {
      throw new Error("Malformed viewport beaches response");
    }
    const payloadObj = payload as {
      beaches: ApiBeachRecord[];
      stats?: ViewportBeachesStatsPayload | null;
    };
    return {
      beaches: payloadObj.beaches,
      stats:
        payloadObj.stats && typeof payloadObj.stats === "object"
          ? (payloadObj.stats as ViewportBeachesStatsPayload | null)
          : null,
    };
  }
  if (!Array.isArray(json.data)) {
    throw new Error(json.error || "Failed to fetch viewport beaches");
  }

  return json.data as ApiBeachRecord[];
}

export async function fetchCurrentConditionsAPI(
  beachId: string
): Promise<ForecastData | null> {
  if (!beachId) {
    throw new Error("Beach ID required");
  }

  const res = await fetch(
    resolveApiUrl(`/api/forecast/${encodeURIComponent(beachId)}/current`)
  );

  if (!res.ok) {
    if (res.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch current conditions: ${res.status}`);
  }

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || "Failed to fetch current conditions");
  }

  return json.data as ForecastData;
}
