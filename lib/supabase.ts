// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

// Utility function to generate URL-friendly slug from beach name
export function generateBeachSlug(beachName: string): string {
  return beachName
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .trim();
}

// Utility function to generate beach URL in format: /beach-name--id
// Uses double dash (--) as separator between slug and ID
export function generateBeachUrl(
  beachName: string,
  beachId: string | number
): string {
  const slug = generateBeachSlug(beachName);
  return `/${slug}--${beachId}`;
}

// Utility function to extract beach ID from URL params
// Supports formats: "beach-name--123" (new), "123" (old), or "beach-slug" (old)
export function extractBeachId(param: string): string {
  // If param contains double dash, extract the ID after it
  if (param.includes("--")) {
    const parts = param.split("--");
    return parts[parts.length - 1];
  }
  // Otherwise, return the param as-is (could be ID or slug for backwards compatibility)
  return param;
}

// Cache for beach slug -> ID mapping (server-side only)
let beachSlugCache: Map<string, string> | null = null;
let beachCacheTimestamp: number = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

async function getBeachSlugCache(): Promise<Map<string, string>> {
  const now = Date.now();

  // Return cached data if still valid
  if (beachSlugCache && now - beachCacheTimestamp < CACHE_DURATION_MS) {
    return beachSlugCache;
  }

  // Rebuild cache
  const { data } = await supabase
    .from("beaches")
    .select("id, Name")
    .limit(10000);

  beachSlugCache = new Map();

  if (data) {
    for (const beach of data) {
      const slug = generateBeachSlug(beach.Name);
      beachSlugCache.set(slug, beach.id);
    }
  }

  beachCacheTimestamp = now;
  return beachSlugCache;
}

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Cache grid lookups to avoid repeated Supabase calls during a single request burst
const beachGridCache = new Map<string, number | null>();

type ForecastFetchCacheEntry = {
  promise: Promise<ForecastData[]>;
  data?: ForecastData[];
  timestamp: number;
};

const FORECAST_FETCH_CACHE_MS = 2 * 60 * 1000; // 2 minutes
const FORECAST_FETCH_CACHE_MAX = 40;
const forecastFetchCache = new Map<string, ForecastFetchCacheEntry>();

function getForecastCacheKey(
  beachId: string,
  startDate?: Date,
  endDate?: Date
): string {
  const trimmed = (beachId ?? "").trim();
  const startKey =
    startDate instanceof Date && Number.isFinite(startDate.getTime())
      ? startDate.getTime()
      : "na";
  const endKey =
    endDate instanceof Date && Number.isFinite(endDate.getTime())
      ? endDate.getTime()
      : "na";
  return `${trimmed}:${startKey}:${endKey}`;
}

function pruneForecastFetchCache() {
  if (forecastFetchCache.size <= FORECAST_FETCH_CACHE_MAX) {
    return;
  }
  const entries = Array.from(forecastFetchCache.entries()).sort(
    (a, b) => a[1].timestamp - b[1].timestamp
  );
  const excess = entries.length - FORECAST_FETCH_CACHE_MAX;
  for (let i = 0; i < excess; i++) {
    forecastFetchCache.delete(entries[i][0]);
  }
}

export async function fetchBeachGridId(
  beachId: string | number
): Promise<number | null> {
  const cacheKey = String(beachId ?? "").trim();
  if (!cacheKey) {
    return null;
  }

  if (beachGridCache.has(cacheKey)) {
    return beachGridCache.get(cacheKey) ?? null;
  }

  const isNumeric = /^\d+$/.test(cacheKey);
  const eqValue = isNumeric ? Number(cacheKey) : cacheKey;

  const { data, error } = await supabase
    .from("beaches")
    .select("grid_id")
    .eq("id", eqValue)
    .maybeSingle();

  if (error) {
    console.warn("Failed to resolve grid_id for beach", {
      beachId,
      error,
    });
    beachGridCache.set(cacheKey, null);
    return null;
  }

  const gridId = (data as { grid_id?: number | null } | null)?.grid_id ?? null;
  beachGridCache.set(cacheKey, gridId);
  return gridId;
}

// ----------------------------
// Beach types
// ----------------------------
export interface Beach {
  id: string;
  Name: string;
  COUNTY: string;
  LATITUDE: number;
  LONGITUDE: number;
  grid_id?: number | null;

  // RESTORED: Optional feature flags that can be populated by fetchBeachDetails
  // Access & Fees
  O_PUBLIC?: boolean | null;
  FEE?: boolean | null;
  PARKING?: boolean | null;
  RSTRCTNS?: boolean | null;
  DSABLDACSS?: boolean | null;

  // Facilities
  RESTROOMS?: boolean | null;
  VISTOR_CTR?: boolean | null;
  DOG_FRIEND?: boolean | null;
  EZ4STROLLE?: boolean | null;
  LIFEGUARD?: boolean | null;
  SHOWERS?: boolean | null;
  FOOD?: boolean | null;
  DRINKWTR?: boolean | null;
  PCNC_AREA?: boolean | null;
  FIREPITS?: boolean | null;
  CAMPGROUND?: boolean | null;
  RV_CMP?: boolean | null;
  BT_FACILIT?: boolean | null;
  BT_FACIL_T?: string | null;
  HAND_LAUNCH?: boolean | null;
  LIGHTHOUSE?: boolean | null;
  PIER?: boolean | null;

  // Beach Types
  SNDY_BEACH?: boolean | null;
  DUNES?: boolean | null;
  RKY_SHORE?: boolean | null;
  UPLAND_BCH?: boolean | null;
  STRM_CRDOR?: boolean | null;
  WETLAND?: boolean | null;
  BLUFF?: boolean | null;
  BAY_LGN_LK?: boolean | null;
  URBN_WFRNT?: boolean | null;
  INLND_AREA?: boolean | null;
  STRS_BEACH?: boolean | null;
  PTH_BEACH?: boolean | null;
  BOARDWLK?: boolean | null;

  // Trails & Paths
  BLFTP_TRLS?: boolean | null;
  BLFTP_PRK?: boolean | null;
  TRAIL_OR_P?: boolean | null;
  BIKE_PATH?: boolean | null;
  EQUEST_TRL?: boolean | null;
  WLDLFE_VWG?: boolean | null;

  // Activities
  SWIMMING?: boolean | null;
  DIVING?: boolean | null;
  SNORKLNG?: boolean | null;
  TIDEPOOL?: boolean | null;
  PLAYGROUND?: boolean | null;
  SPORT_FLDS?: boolean | null;
  VOLLEYBALL?: boolean | null;
  WNDSRF_KIT?: boolean | null;
  KAYAKING?: boolean | null;
  SURFING?: boolean | null;
  FISHING?: boolean | null;
  BOATING?: boolean | null;
}

// Extended beach interface with all available features - now extends Beach
export interface BeachWithFeatures extends Beach {
  // Basic info (now required since Beach interface has them as optional)
  DISTRICT: string | null;
  CountyNum: number | null;
  FeatureTyp: string | null;
  AccessType: string | null;
  BT_FACIL_T: string | null; // Boat facility type (text field)
}

// All feature columns for database queries
export const FEATURE_COLUMNS = [
  // Access & Fees
  "O_PUBLIC",
  "FEE",
  "PARKING",
  "RSTRCTNS",
  "DSABLDACSS",

  // Facilities
  "RESTROOMS",
  "VISTOR_CTR",
  "DOG_FRIEND",
  "EZ4STROLLE",
  "LIFEGUARD",
  "SHOWERS",
  "FOOD",
  "DRINKWTR",
  "PCNC_AREA",
  "FIREPITS",
  "CAMPGROUND",
  "RV_CMP",
  "BT_FACILIT",
  "LIGHTHOUSE",
  "PIER",
  "HAND_LAUNCH",

  // Beach Types
  "SNDY_BEACH",
  "DUNES",
  "RKY_SHORE",
  "UPLAND_BCH",
  "STRM_CRDOR",
  "WETLAND",
  "BLUFF",
  "BAY_LGN_LK",
  "URBN_WFRNT",
  "INLND_AREA",
  "STRS_BEACH",
  "PTH_BEACH",
  "BOARDWLK",

  // Trails & Paths
  "BLFTP_TRLS",
  "BLFTP_PRK",
  "TRAIL_OR_P",
  "BIKE_PATH",
  "EQUEST_TRL",
  "WLDLFE_VWG",

  // Activities
  "SWIMMING",
  "DIVING",
  "SNORKLNG",
  "TIDEPOOL",
  "PLAYGROUND",
  "SPORT_FLDS",
  "VOLLEYBALL",
  "WNDSRF_KIT",
  "KAYAKING",
  "SURFING",
  "FISHING",
  "BOATING",
] as const;

// Organized feature categories for UI display
export const FEATURE_CATEGORIES = {
  access: {
    label: "Access & Fees",
    features: ["O_PUBLIC", "FEE", "PARKING", "DSABLDACSS"] as const,
  },
  facilities: {
    label: "Facilities & Amenities",
    features: [
      "RESTROOMS",
      "VISTOR_CTR",
      "DOG_FRIEND",
      "EZ4STROLLE",
      "LIFEGUARD",
      "SHOWERS",
      "FOOD",
      "DRINKWTR",
      "PCNC_AREA",
      "FIREPITS",
      "CAMPGROUND",
      "RV_CMP",
      "BT_FACILIT",
      "LIGHTHOUSE",
      "PIER",
      "HAND_LAUNCH",
    ] as const,
  },
  beachTypes: {
    label: "Beach Types & Features",
    features: [
      "SNDY_BEACH",
      "DUNES",
      "RKY_SHORE",
      "UPLAND_BCH",
      "STRM_CRDOR",
      "WETLAND",
      "BLUFF",
      "BAY_LGN_LK",
      "URBN_WFRNT",
      "INLND_AREA",
      "STRS_BEACH",
      "PTH_BEACH",
      "BOARDWLK",
    ] as const,
  },
  trails: {
    label: "Trails & Nature",
    features: [
      "BLFTP_TRLS",
      "BLFTP_PRK",
      "TRAIL_OR_P",
      "BIKE_PATH",
      "EQUEST_TRL",
      "WLDLFE_VWG",
    ] as const,
  },
  activities: {
    label: "Activities",
    features: [
      "SWIMMING",
      "DIVING",
      "SNORKLNG",
      "TIDEPOOL",
      "PLAYGROUND",
      "SPORT_FLDS",
      "VOLLEYBALL",
      "WNDSRF_KIT",
      "KAYAKING",
      "SURFING",
      "FISHING",
      "BOATING",
    ] as const,
  },
} as const;

// Raw row for details query (before coercion)
type BeachDetailsRow = Beach & {
  DISTRICT: string | null;
  CountyNum: number | null;
  FeatureTyp: string | null;
  AccessType: string | null;
  BT_FACIL_T: string | null; // Keep this as string since it's a text field
} & {
  [K in (typeof FEATURE_COLUMNS)[number]]: boolean | number | string | null;
};

// Coerce common DB encodings (Y/Yes/1/true) → boolean
const toBool = (v: any): boolean => {
  if (v === null || v === undefined) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return ["y", "yes", "true", "t", "1"].includes(s);
  }
  return false;
};

// Helper to get human-readable feature names
export const getFeatureDisplayName = (featureKey: string): string => {
  const displayNames: Record<string, string> = {
    // Access & Fees
    O_PUBLIC: "Open to Public",
    FEE: "Entry Fee Required",
    PARKING: "Parking Available",
    RSTRCTNS: "Has Restrictions",
    DSABLDACSS: "Disabled Access",

    // Facilities
    RESTROOMS: "Restrooms",
    VISTOR_CTR: "Visitor Center",
    DOG_FRIEND: "Dog Friendly",
    EZ4STROLLE: "Stroller Accessible",
    LIFEGUARD: "Lifeguard on Duty",
    SHOWERS: "Showers",
    FOOD: "Food Available",
    DRINKWTR: "Drinking Water",
    PCNC_AREA: "Picnic Area",
    FIREPITS: "Fire Pits",
    CAMPGROUND: "Campground",
    RV_CMP: "RV Camping",
    BT_FACILIT: "Boat Facilities",
    LIGHTHOUSE: "Lighthouse", // Fixed: was calling toBool incorrectly
    PIER: "Pier",
    HAND_LAUNCH: "Hand Launch Available",

    // Beach Types
    SNDY_BEACH: "Sandy Beach",
    DUNES: "Sand Dunes",
    RKY_SHORE: "Rocky Shore",
    UPLAND_BCH: "Upland Beach",
    STRM_CRDOR: "Stream Corridor",
    WETLAND: "Wetland",
    BLUFF: "Bluff",
    BAY_LGN_LK: "Bay/Lagoon/Lake",
    URBN_WFRNT: "Urban Waterfront",
    INLND_AREA: "Inland Area",
    STRS_BEACH: "Stairs to Beach",
    PTH_BEACH: "Path to Beach",
    BOARDWLK: "Boardwalk",

    // Trails & Paths
    BLFTP_TRLS: "Bluff Top Trails",
    BLFTP_PRK: "Bluff Top Park",
    TRAIL_OR_P: "Trail or Path",
    BIKE_PATH: "Bike Path",
    EQUEST_TRL: "Equestrian Trail",
    WLDLFE_VWG: "Wildlife Viewing",

    // Activities
    SWIMMING: "Swimming",
    DIVING: "Diving",
    SNORKLNG: "Snorkeling",
    TIDEPOOL: "Tide Pooling",
    PLAYGROUND: "Playground",
    SPORT_FLDS: "Sports Fields",
    VOLLEYBALL: "Volleyball",
    WNDSRF_KIT: "Windsurfing/Kiting",
    KAYAKING: "Kayaking",
    SURFING: "Surfing",
    FISHING: "Fishing",
    BOATING: "Boating",
  };

  return displayNames[featureKey] || featureKey;
};

// ----------------------------
// Forecast / conditions types (unchanged)
// ----------------------------
export interface SupabaseForecastData {
  id?: number;
  beach_id?: string;
  grid_id?: number;
  timestamp: string;
  // Swell data (feet/seconds) - NOW INCLUDING TERTIARY
  primary_swell_height_ft: number | null;
  primary_swell_period_s: number | null;
  primary_swell_direction: number | null;
  secondary_swell_height_ft: number | null;
  secondary_swell_period_s: number | null;
  secondary_swell_direction: number | null;
  tertiary_swell_height_ft: number | null; // NEW: Tertiary swell height
  tertiary_swell_period_s: number | null; // NEW: Tertiary swell period
  tertiary_swell_direction: number | null; // NEW: Tertiary swell direction
  // Surf data (feet/kilojoules) - UPDATED ENERGY UNITS
  surf_height_min_ft: number | null;
  surf_height_max_ft: number | null;
  wave_energy_kj: number | null; // CHANGED: Now in kilojoules instead of foot-pounds
  // Water conditions (fahrenheit/feet)
  water_temp_f: number | null;
  tide_level_ft: number | null; // NOTE: Now includes +2.4ft adjustment from Python script
  // Wind data (mph/degrees)
  wind_speed_mph: number | null;
  wind_gust_mph: number | null;
  wind_direction_deg: number | null;
  // Weather (fahrenheit/inHg)
  temperature: number | null; // Air temp in fahrenheit
  weather: number | null; // Weather code
  pressure_inhg: number | null;
}

type SupabaseGridForecastRow = Omit<SupabaseForecastData, "beach_id"> & {
  grid_id: number;
};

export interface ForecastData {
  timestamp: string;
  swell: {
    primary: {
      height: number | null; // feet
      period: number | null; // seconds
      direction: number | null; // degrees
    };
    secondary: {
      height: number | null; // feet
      period: number | null; // seconds
      direction: number | null; // degrees
    };
    tertiary: {
      // NEW: Tertiary swell data
      height: number | null; // feet
      period: number | null; // seconds
      direction: number | null; // degrees
    };
  };
  surf: {
    heightMin: number | null; // feet
    heightMax: number | null; // feet
    waveEnergy: number | null; // kilojoules (updated from foot-pounds)
  };
  conditions: {
    waterTemp: number | null; // fahrenheit
    tideLevel: number | null; // feet (includes +2.4ft adjustment)
    windSpeed: number | null; // mph
    windGust: number | null; // mph
    windDirection: number | null; // degrees
    airTemp: number | null; // fahrenheit
    pressure: number | null; // inHg
    weather: number | null; // weather code
  };
}
// ----------------------------
// Tide types (County-based, 15-minute intervals)
// ----------------------------
export interface CountyTideRow {
  county: string;
  timestamp: string; // timestamptz in DB (ISO string here)
  tide_level_ft: number | null;
  tide_level_m: number | null;
  station_id: string | null;
  station_name: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TidePoint {
  timestamp: string;
  tideLevelFt: number | null;
  tideLevelM: number | null;
}

export interface DailyConditions {
  id?: number;
  county: string;
  date: string;
  moon_phase: number | null;
  sunrise: string | null;
  sunset: string | null;
}

// ----------------------------
// Transform helpers
// ----------------------------

// Helper functions defined once outside the map for better performance
const toF = (c: number | null) => (c == null ? null : (c * 9) / 5 + 32);
const mToFt = (m: number | null) => (m == null ? null : m * 3.28084);
const kphToMph = (kph: number | null) => kph == null ? null : kph * 0.621371;
const hPaToInHg = (hpa: number | null) => hpa == null ? null : hpa * 0.02953;

export function transformToComponentFormat(
  data: SupabaseForecastData[]
): ForecastData[] {
  return data.map((row) => {
    const anyRow: any = row as any;

    const waterTempF = row.water_temp_f ?? toF(anyRow.water_temp_c ?? null);
    const tideFt = row.tide_level_ft ?? mToFt(anyRow.tide_level_m ?? null);
    const windMph =
      row.wind_speed_mph ?? kphToMph(anyRow.wind_speed_kph ?? null);
    let gustMph = row.wind_gust_mph ?? kphToMph(anyRow.wind_gust_kph ?? null);
    // Guardrail: ensure gust is never lower than sustained when both present
    if (gustMph != null && windMph != null && gustMph < windMph) {
      gustMph = windMph;
    }
    const pressureInHg =
      row.pressure_inhg ?? hPaToInHg(anyRow.pressure_hpa ?? null);
    const energyKj =
      row.wave_energy_kj ??
      (anyRow.wave_energy_joules != null
        ? anyRow.wave_energy_joules / 1000
        : null);

    return {
      timestamp: row.timestamp,
      swell: {
        primary: {
          height: row.primary_swell_height_ft,
          period: row.primary_swell_period_s,
          direction: row.primary_swell_direction,
        },
        secondary: {
          height: row.secondary_swell_height_ft,
          period: row.secondary_swell_period_s,
          direction: row.secondary_swell_direction,
        },
        tertiary: {
          // NEW: Tertiary swell transformation
          height: row.tertiary_swell_height_ft,
          period: row.tertiary_swell_period_s,
          direction: row.tertiary_swell_direction,
        },
      },
      surf: {
        heightMin: row.surf_height_min_ft,
        heightMax: row.surf_height_max_ft,
        waveEnergy: energyKj, // kJ, fallback from joules
      },
      conditions: {
        waterTemp: waterTempF,
        tideLevel: tideFt, // NOTE: Includes +2.4ft adjustment from Python script if applied upstream
        windSpeed: windMph,
        windGust: gustMph,
        windDirection: row.wind_direction_deg,
        airTemp: row.temperature ?? toF(anyRow.temperature_c ?? null),
        pressure: pressureInHg,
        weather: row.weather,
      },
    };
  });
}
// ----------------------------
// Tide queries (County-based, 15-minute intervals)
// ----------------------------
export async function fetchBeachTides(
  beachId: string,
  startDate?: Date,
  endDate?: Date
): Promise<TidePoint[]> {
  console.log("fetchBeachTides called with:", {
    beachId,
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
  });

  // First, get the beach to find its county
  const beach = await fetchBeachByIdLoose(beachId);
  if (!beach || !beach.COUNTY) {
    console.error("Beach not found or has no county:", beachId);
    return [];
  }

  console.log("Fetching tides for county:", beach.COUNTY);

  // Query county_tides_15min instead of beach_tides_hourly
  let q = supabase
    .from("county_tides_15min")
    .select("timestamp,tide_level_ft,tide_level_m")
    .eq("county", beach.COUNTY)
    .order("timestamp", { ascending: true });

  if (startDate) q = q.gte("timestamp", startDate.toISOString());
  if (endDate) q = q.lte("timestamp", endDate.toISOString());

  const { data, error } = await q.returns<CountyTideRow[]>();

  console.log("Query result:", {
    dataCount: data?.length,
    error,
    county: beach.COUNTY,
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString()
  });

  if (error) {
    console.error("Error fetching county tides:", error);
    return [];
  }

  // Apply -2.4 ft correction to all tide levels
  const TIDE_CORRECTION_FT = -2.4;
  const TIDE_CORRECTION_M = TIDE_CORRECTION_FT * 0.3048; // Convert to meters

  const result = (data ?? []).map((r) => ({
    timestamp: r.timestamp,
    tideLevelFt: r.tide_level_ft != null ? r.tide_level_ft + TIDE_CORRECTION_FT : null,
    tideLevelM: r.tide_level_m != null ? r.tide_level_m + TIDE_CORRECTION_M : null,
  }));

  console.log("✓ Processed tide data:", result.length, "points from county_tides_15min table (6-min intervals, with -2.4 ft correction)");
  if (result.length > 0) {
    console.log("  First timestamp:", result[0].timestamp);
    console.log("  Last timestamp:", result[result.length - 1].timestamp);
  }
  return result;
}

export async function fetchCurrentTide(
  beachId: string
): Promise<TidePoint | null> {
  // First, get the beach to find its county
  const beach = await fetchBeachByIdLoose(beachId);
  if (!beach || !beach.COUNTY) {
    console.error("Beach not found or has no county:", beachId);
    return null;
  }

  const now = new Date().toISOString();

  console.log("🕐 Fetching current tide for county:", beach.COUNTY, "at time:", now);

  // Get the most recent tide data up to current time
  const { data, error } = await supabase
    .from("county_tides_15min")
    .select("timestamp,tide_level_ft,tide_level_m")
    .eq("county", beach.COUNTY)
    .lte("timestamp", now)
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching current tide:", error);
    return null;
  }
  if (!data) return null;

  // Apply -2.4 ft correction
  const TIDE_CORRECTION_FT = -2.4;
  const TIDE_CORRECTION_M = TIDE_CORRECTION_FT * 0.3048;

  const correctedFt = data.tide_level_ft != null ? data.tide_level_ft + TIDE_CORRECTION_FT : null;
  const correctedM = data.tide_level_m != null ? data.tide_level_m + TIDE_CORRECTION_M : null;

  console.log("✓ Current tide:", correctedFt, "ft (corrected from", data.tide_level_ft, "ft) at", data.timestamp);

  return {
    timestamp: data.timestamp,
    tideLevelFt: correctedFt,
    tideLevelM: correctedM,
  };
}

// ----------------------------
// Queries
// ----------------------------
export async function fetchBeachDetails(id: string): Promise<Beach | null> {
  console.log("fetchBeachDetails called with id:", id);

  const columns = [
    "id",
    "Name",
    "LATITUDE",
    "LONGITUDE",
    "COUNTY",
    "DISTRICT",
    "CountyNum",
    "FeatureTyp",
    "AccessType",
    "BT_FACIL_T",
    ...FEATURE_COLUMNS,
  ].join(", ");

  console.log("Querying columns:", columns);

  const { data, error } = await supabase
    .from("beaches")
    .select(columns)
    .eq("id", id)
    .maybeSingle()
    .returns<BeachDetailsRow>();

  console.log("Supabase query result:", { data, error });

  if (error) {
    console.error("Error fetching beach details:", error);
    return null;
  }
  if (!data) {
    console.log("No data returned from query");
    return null;
  }

  console.log("Raw data from database:", data);
  console.log("Sample feature values from raw data:", {
    FISHING: (data as any).FISHING,
    PARKING: (data as any).PARKING,
    RESTROOMS: (data as any).RESTROOMS,
    LIFEGUARD: (data as any).LIFEGUARD,
  });

  // Return Beach object with all features populated
  const beachWithFeatures: Beach = {
    id: data.id,
    Name: data.Name,
    LATITUDE: data.LATITUDE,
    LONGITUDE: data.LONGITUDE,
    COUNTY: data.COUNTY,

    // Access & Fees
    O_PUBLIC: toBool((data as any).O_PUBLIC),
    FEE: toBool((data as any).FEE),
    PARKING: toBool((data as any).PARKING),
    RSTRCTNS: toBool((data as any).RSTRCTNS),
    DSABLDACSS: toBool((data as any).DSABLDACSS),

    // Facilities
    RESTROOMS: toBool((data as any).RESTROOMS),
    VISTOR_CTR: toBool((data as any).VISTOR_CTR),
    DOG_FRIEND: toBool((data as any).DOG_FRIEND),
    EZ4STROLLE: toBool((data as any).EZ4STROLLE),
    LIFEGUARD: toBool((data as any).LIFEGUARD),
    SHOWERS: toBool((data as any).SHOWERS),
    FOOD: toBool((data as any).FOOD),
    DRINKWTR: toBool((data as any).DRINKWTR),
    PCNC_AREA: toBool((data as any).PCNC_AREA),
    FIREPITS: toBool((data as any).FIREPITS),
    CAMPGROUND: toBool((data as any).CAMPGROUND),
    RV_CMP: toBool((data as any).RV_CMP),
    BT_FACILIT: toBool((data as any).BT_FACILIT),
    BT_FACIL_T: data.BT_FACIL_T, // Keep as string
    LIGHTHOUSE: toBool((data as any).LIGHTHOUSE),
    PIER: toBool((data as any).PIER),
    HAND_LAUNCH: toBool((data as any).HAND_LAUNCH),

    // Beach Types
    SNDY_BEACH: toBool((data as any).SNDY_BEACH),
    DUNES: toBool((data as any).DUNES),
    RKY_SHORE: toBool((data as any).RKY_SHORE),
    UPLAND_BCH: toBool((data as any).UPLAND_BCH),
    STRM_CRDOR: toBool((data as any).STRM_CRDOR),
    WETLAND: toBool((data as any).WETLAND),
    BLUFF: toBool((data as any).BLUFF),
    BAY_LGN_LK: toBool((data as any).BAY_LGN_LK),
    URBN_WFRNT: toBool((data as any).URBN_WFRNT),
    INLND_AREA: toBool((data as any).INLND_AREA),
    STRS_BEACH: toBool((data as any).STRS_BEACH),
    PTH_BEACH: toBool((data as any).PTH_BEACH),
    BOARDWLK: toBool((data as any).BOARDWLK),

    // Trails & Paths
    BLFTP_TRLS: toBool((data as any).BLFTP_TRLS),
    BLFTP_PRK: toBool((data as any).BLFTP_PRK),
    TRAIL_OR_P: toBool((data as any).TRAIL_OR_P),
    BIKE_PATH: toBool((data as any).BIKE_PATH),
    EQUEST_TRL: toBool((data as any).EQUEST_TRL),
    WLDLFE_VWG: toBool((data as any).WLDLFE_VWG),

    // Activities
    SWIMMING: toBool((data as any).SWIMMING),
    DIVING: toBool((data as any).DIVING),
    SNORKLNG: toBool((data as any).SNORKLNG),
    TIDEPOOL: toBool((data as any).TIDEPOOL),
    PLAYGROUND: toBool((data as any).PLAYGROUND),
    SPORT_FLDS: toBool((data as any).SPORT_FLDS),
    VOLLEYBALL: toBool((data as any).VOLLEYBALL),
    WNDSRF_KIT: toBool((data as any).WNDSRF_KIT),
    KAYAKING: toBool((data as any).KAYAKING),
    SURFING: toBool((data as any).SURFING),
    FISHING: toBool((data as any).FISHING),
    BOATING: toBool((data as any).BOATING),
  };

  console.log("Final processed beach object:", beachWithFeatures);
  console.log("Sample processed features:", {
    FISHING: beachWithFeatures.FISHING,
    PARKING: beachWithFeatures.PARKING,
    RESTROOMS: beachWithFeatures.RESTROOMS,
    LIFEGUARD: beachWithFeatures.LIFEGUARD,
  });

  return beachWithFeatures;
}

function resolveInternalApiUrl(pathname: string) {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || null;
  if (explicit) {
    try {
      return new URL(pathname, explicit).toString();
    } catch {
      // ignore
    }
  }
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}${pathname}`;
  }
  return null;
}

export async function fetchAllBeaches(): Promise<Beach[]> {
  const endpoint = resolveInternalApiUrl("/api/beaches");
  if (endpoint) {
    try {
      const res = await fetch(endpoint, { next: { revalidate: 300 } });
      if (res.ok) {
        const json = await res.json();
        if (json?.success && Array.isArray(json.data)) {
          return (json.data as any[]).map((beach) => ({
            id: beach.id,
            Name: beach.name ?? beach.Name,
            LATITUDE: Number(beach.latitude ?? beach.LATITUDE),
            LONGITUDE: Number(beach.longitude ?? beach.LONGITUDE),
            COUNTY: beach.county ?? beach.COUNTY ?? "",
          }));
        }
      }
    } catch (error) {
      console.warn("Failed to fetch beaches via API, falling back", error);
    }
  }

  const { data, error } = await supabase
    .from("beaches")
    .select("id, Name, LATITUDE, LONGITUDE, COUNTY")
    .order("Name")
    .limit(10000)
    .returns<Beach[]>();

  if (error) {
    console.error("Error fetching beaches:", {
      message: error.message,
      code: (error as any).code,
      details: (error as any).details,
      hint: (error as any).hint,
    });
    throw error; // let the page show the real cause
  }

  return (data ?? []).filter(
    (b) =>
      b.LATITUDE != null &&
      b.LONGITUDE != null &&
      !Number.isNaN(Number(b.LATITUDE)) &&
      !Number.isNaN(Number(b.LONGITUDE))
  );
}

export async function fetchBeachByIdLoose(id: string): Promise<Beach | null> {
  const target = id.trim();

  console.log("Looking up beach:", target);

  // Use optimized RPC function (reduces 4 queries to 1)
  const { data, error } = await supabase
    .rpc('find_beach_smart', { search_term: target })
    .limit(1)
    .single();

  if (error) {
    console.error("Error in find_beach_smart:", error);
    // Fallback to direct query if RPC fails
    const fallback = await supabase
      .from("beaches")
      .select("id, Name, LATITUDE, LONGITUDE, COUNTY, grid_id")
      .eq("id", target)
      .maybeSingle();
    return (fallback.data as Beach) ?? null;
  }

  if (data) {
    console.log("Beach found:", (data as any).Name);
  } else {
    console.log("Beach not found for:", target);
  }

  const beachRecord = (data as Beach | null) ?? null;
  if (beachRecord && beachRecord.grid_id == null) {
    const { data: directGrid } = await supabase
      .from("beaches")
      .select("grid_id")
      .eq("id", beachRecord.id)
      .maybeSingle();
    if (directGrid?.grid_id != null) {
      return { ...beachRecord, grid_id: directGrid.grid_id };
    }
  }

  return beachRecord;
}

export async function fetchBeachForecast(
  beachId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ForecastData[]> {
  const normalizedBeachId = (beachId ?? "").trim();
  const cacheKey = getForecastCacheKey(
    normalizedBeachId,
    startDate,
    endDate
  );
  const now = Date.now();
  const cached = forecastFetchCache.get(cacheKey);

  if (cached) {
    const isFresh = now - cached.timestamp < FORECAST_FETCH_CACHE_MS;
    if (cached.data && isFresh) {
      return cached.data;
    }
    if (isFresh) {
      return cached.promise;
    }
    forecastFetchCache.delete(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
      const { resolvedId, gridId } = await resolveBeachAndGrid(
        normalizedBeachId
      );

      if (resolvedId == null) {
        throw new Error(`Unable to resolve beach ID for "${beachId}"`);
      }

      if (gridId == null) {
        console.warn("No grid_id for beach; returning empty forecast dataset", {
          beachId: resolvedId,
        });
        forecastFetchCache.set(cacheKey, {
          promise: Promise.resolve([]),
          data: [],
          timestamp: Date.now(),
        });
        pruneForecastFetchCache();
        return [];
      }

      const data = await fetchGridForecastRecords(
        resolvedId,
        gridId,
        startDate,
        endDate
      );

      const transformed = transformToComponentFormat(data);
      forecastFetchCache.set(cacheKey, {
        promise: Promise.resolve(transformed),
        data: transformed,
        timestamp: Date.now(),
      });
      pruneForecastFetchCache();
      return transformed;
    } catch (error) {
      forecastFetchCache.delete(cacheKey);
      throw error;
    }
  })();

  forecastFetchCache.set(cacheKey, { promise: fetchPromise, timestamp: now });
  return fetchPromise;
}

async function resolveBeachAndGrid(
  beachId: string
): Promise<{ resolvedId: string | null; gridId: number | null }> {
  const trimmed = beachId?.trim();
  if (!trimmed) {
    return { resolvedId: null, gridId: null };
  }

  if (/^\d+$/.test(trimmed)) {
    const gridId = await fetchBeachGridId(trimmed);
    return { resolvedId: trimmed, gridId };
  }

  const beach = await fetchBeachByIdLoose(trimmed);
  if (!beach) {
    return { resolvedId: null, gridId: null };
  }

  const resolvedId = String(beach.id);
  const gridId =
    beach.grid_id != null
      ? beach.grid_id
      : await fetchBeachGridId(resolvedId);
  return { resolvedId, gridId };
}

async function fetchGridForecastRecords(
  beachId: string,
  gridId: number,
  startDate?: Date,
  endDate?: Date
): Promise<SupabaseForecastData[]> {
  let query = supabase
    .from("grid_forecast_data")
    .select("*")
    .eq("grid_id", gridId)
    .order("timestamp", { ascending: true });

  if (startDate) {
    query = query.gte("timestamp", startDate.toISOString());
  }
  if (endDate) {
    query = query.lte("timestamp", endDate.toISOString());
  }

  const { data, error } = await query.returns<SupabaseGridForecastRow[]>();

  if (error) {
    console.error("Error fetching grid forecast data:", error);
    throw new Error(`Database error: ${error.message}`);
  }

  return (data || []).map((row) => ({
    ...row,
    beach_id: String(beachId),
  }));
}

export async function fetchCurrentConditions(
  beachId: string
): Promise<ForecastData | null> {
  const { resolvedId, gridId } = await resolveBeachAndGrid(beachId);
  if (resolvedId == null) {
    return null;
  }

  if (gridId == null) {
    console.warn(
      "No grid_id for beach; unable to fetch grid current conditions",
      { beachId: resolvedId }
    );
    return null;
  }

  const { data, error } = await supabase
    .from("grid_forecast_data")
    .select("*")
    .eq("grid_id", gridId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching grid current conditions:", error);
    return null;
  }
  if (!data) return null;

  const record: SupabaseForecastData = {
    ...(data as SupabaseGridForecastRow),
    beach_id: String(resolvedId),
  };

  return transformToComponentFormat([record])[0] ?? null;
}

export async function fetchDailyConditions(
  county: string,
  date?: Date
): Promise<DailyConditions | null> {
  const trimmedCounty = county?.trim();
  if (!trimmedCounty) {
    return null;
  }

  const toPacificDate = (value: Date) => {
    // Use Intl.DateTimeFormat to get Pacific timezone date components safely
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(value);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    return `${year}-${month}-${day}`;
  };

  const targetDate = date ? toPacificDate(date) : null;
  const toTitleCase = (value: string) =>
    value
      .toLowerCase()
      .split(" ")
      .filter((part) => part.length > 0)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(" ");

  const baseName = trimmedCounty.replace(/\s+County$/i, "").trim();
  const candidateSet = new Set<string>();
  const addVariants = (value?: string | null) => {
    if (!value) return;
    const normalized = value.trim();
    if (!normalized) return;
    candidateSet.add(normalized);
    candidateSet.add(normalized.toUpperCase());
    candidateSet.add(toTitleCase(normalized));
  };

  addVariants(trimmedCounty);
  addVariants(baseName);
  if (baseName) addVariants(`${baseName} County`);

  const candidates = Array.from(candidateSet.values());
  const escapePattern = (value: string) => value.replace(/([%_])/g, "\\$1");

  const runExactQuery = async (
    countyName: string,
    matchDate: boolean
  ): Promise<DailyConditions | null> => {
    let query = supabase
      .from("daily_county_conditions")
      .select("*")
      .eq("county", countyName)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (matchDate && targetDate) {
      // @ts-expect-error - (temporarily ignore) works as expected for now
      query = query.eq("date", targetDate);
    }
    const { data, error } = await query;
    if (error) {
      console.warn("fetchDailyConditions error (exact)", {
        error,
        county: countyName,
        matchDate,
      });
      return null;
    }
    return (data as DailyConditions | null) ?? null;
  };

  const runPatternQuery = async (
    pattern: string,
    matchDate: boolean
  ): Promise<DailyConditions | null> => {
    let query = supabase
      .from("daily_county_conditions")
      .select("*")
      .ilike("county", pattern)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (matchDate && targetDate) {
      // @ts-expect-error - (temporarily ignore) works as expected for now
      query = query.eq("date", targetDate);
    }
    const { data, error } = await query;
    if (error) {
      console.warn("fetchDailyConditions error (pattern)", {
        error,
        pattern,
        matchDate,
      });
      return null;
    }
    return (data as DailyConditions | null) ?? null;
  };

  for (const name of candidates) {
    const exact = await runExactQuery(name, true);
    if (exact) return exact;
  }
  for (const name of candidates) {
    const latest = await runExactQuery(name, false);
    if (latest) return latest;
  }

  const likePatterns = Array.from(
    new Set(
      candidates.flatMap((name) => {
        const escaped = escapePattern(name);
        const patterns = [escaped, `${escaped}%`, `%${escaped}%`];
        if (!/\bcounty$/i.test(name.trim())) {
          patterns.push(`${escaped} County`, `${escaped} County%`);
        }
        return patterns;
      })
    )
  );

  for (const pattern of likePatterns) {
    const exactDateMatch = await runPatternQuery(pattern, true);
    if (exactDateMatch) return exactDateMatch;
  }
  for (const pattern of likePatterns) {
    const latestMatch = await runPatternQuery(pattern, false);
    if (latestMatch) return latestMatch;
  }

  return null;
}

export async function fetchTodaysForecast(
  beachId: string
): Promise<ForecastData[]> {
  const start = pacificMidnightUTC();
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return fetchBeachForecast(beachId, start, end);
}

export async function fetchWeeklyForecast(
  beachId: string,
  beforeOffset?: number
): Promise<ForecastData[]> {
  const start = pacificMidnightUTC();
  // for forecast wave energy offset by 3 hours
  const startWithOffset = beforeOffset
    ? new Date(start.getTime() - beforeOffset * 60 * 60 * 1000)
    : start;
  const endWithOffset = beforeOffset
    ? new Date(
        startWithOffset.getTime() + (7 * 24 + beforeOffset) * 60 * 60 * 1000
      )
    : new Date(startWithOffset.getTime() + 7 * 24 * 60 * 60 * 1000);
  console.log("RAW ENERGY TIMES", startWithOffset, endWithOffset);
  return fetchBeachForecast(beachId, startWithOffset, endWithOffset);
}

// Helper: compute the UTC Date corresponding to today's 00:00 in America/Los_Angeles
// This properly handles DST transitions using Intl.DateTimeFormat
function pacificMidnightUTC(base: Date = new Date()): Date {
  const timeZone = "America/Los_Angeles";

  // Get Pacific timezone date components using Intl API (DST-aware)
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(base);
  const year = parseInt(parts.find((p) => p.type === "year")?.value || "0");
  const month = parseInt(parts.find((p) => p.type === "month")?.value || "1") - 1;
  const day = parseInt(parts.find((p) => p.type === "day")?.value || "1");

  // Create a date string for midnight in Pacific time
  // Format: YYYY-MM-DDTHH:MM:SS (we want midnight)
  const yearStr = String(year);
  const monthStr = String(month + 1).padStart(2, "0");
  const dayStr = String(day).padStart(2, "0");
  const pacificMidnightStr = `${yearStr}-${monthStr}-${dayStr}T00:00:00`;

  // Parse this as if it were in Pacific timezone to get the correct UTC timestamp
  // We'll use the offset at noon of that day to avoid DST transition edge cases
  const noonThatDay = new Date(`${yearStr}-${monthStr}-${dayStr}T12:00:00`);
  const noonFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const noonParts = noonFormatter.formatToParts(noonThatDay);
  const noonHour = parseInt(noonParts.find((p) => p.type === "hour")?.value || "12");

  // Calculate the offset: if Pacific noon is showing as 12:00 but UTC shows 20:00, offset is -8 hours
  const utcNoonHour = noonThatDay.getUTCHours();
  const offsetHours = noonHour - utcNoonHour;

  // Create midnight in UTC by adding the offset
  const midnightUTC = new Date(Date.UTC(year, month, day, -offsetHours, 0, 0, 0));

  return midnightUTC;
}

// Returns the earliest and latest timestamps available for a beach's forecast data
export async function fetchForecastRange(
  beachId: string
): Promise<{ start: string; end: string } | null> {
  const { resolvedId, gridId } = await resolveBeachAndGrid(beachId);
  if (resolvedId == null) return null;

  if (gridId == null) {
    console.warn("No grid_id for beach; forecast range unavailable", {
      beachId: resolvedId,
    });
    return null;
  }

  const earliest = await supabase
    .from("grid_forecast_data")
    .select("timestamp")
    .eq("grid_id", gridId)
    .order("timestamp", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (earliest.error || !earliest.data) return null;

  const latest = await supabase
    .from("grid_forecast_data")
    .select("timestamp")
    .eq("grid_id", gridId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest.error || !latest.data) return null;

  return {
    start: (earliest.data as { timestamp: string }).timestamp,
    end: (latest.data as { timestamp: string }).timestamp,
  };
}

export async function searchBeaches(searchTerm: string): Promise<Beach[]> {
  const { data, error } = await supabase
    .from("beaches")
    .select("id, Name, LATITUDE, LONGITUDE, COUNTY")
    .or(`Name.ilike.%${searchTerm}%,COUNTY.ilike.%${searchTerm}%`)
    .order("Name")
    .limit(10)
    .returns<Beach[]>(); // <-- typed array

  if (error) {
    console.error("Error searching beaches:", error);
    return [];
  }

  return data || [];
}

// ----------------------------
// UI helper formatters (unchanged)
// ----------------------------
export const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toISOString();
};

export const getWindDirection = (degrees: number | null): string => {
  if (degrees === null || degrees === undefined) return "N/A";
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

export const formatSurfHeight = (
  min: number | null,
  max: number | null
): string => {
  if (min == null || max == null) return "N/A";
  if (min === max) return `${min.toFixed(1)}ft`;
  return `${min.toFixed(1)}-${max.toFixed(1)}ft`;
};

export const formatTemperature = (temp: number | null): string => {
  if (temp === null) return "N/A";
  return `${Math.round(temp)}°F`;
};

export const formatWindSpeed = (speed: number | null): string => {
  if (speed === null) return "N/A";
  return `${Math.round(speed)} mph`;
};

export const formatPressure = (pressure: number | null): string => {
  if (pressure === null) return "N/A";
  return `${pressure.toFixed(2)} inHg`;
};

export const formatWaveEnergy = (energy: number | null): string => {
  if (energy === null) return "N/A";
  return `${Math.round(energy)} kJ`;
};

// ----------------------------
export function getForecastSummary(data: ForecastData[]) {
  if (!data || data.length === 0) {
    return {
      avgSurfHeight: 0,
      maxSurfHeight: 0,
      avgWindSpeed: 0,
      maxWindSpeed: 0,
      avgWaterTemp: 0,
      avgWaveEnergy: 0, // NEW: Average wave energy
      maxWaveEnergy: 0, // NEW: Max wave energy
      conditions: "No data",
    };
  }

  const validSurfHeights = data
    .map((d) => d.surf.heightMax)
    .filter((h): h is number => h !== null);

  const validWindSpeeds = data
    .map((d) => d.conditions.windSpeed)
    .filter((w): w is number => w !== null);

  const validWaterTemps = data
    .map((d) => d.conditions.waterTemp)
    .filter((t): t is number => t !== null);

  const validWaveEnergies = data
    .map((d) => d.surf.waveEnergy)
    .filter((e): e is number => e !== null);

  return {
    avgSurfHeight:
      validSurfHeights.length > 0
        ? validSurfHeights.reduce((a, b) => a + b, 0) / validSurfHeights.length
        : 0,
    maxSurfHeight:
      validSurfHeights.length > 0 ? Math.max(...validSurfHeights) : 0,
    avgWindSpeed:
      validWindSpeeds.length > 0
        ? validWindSpeeds.reduce((a, b) => a + b, 0) / validWindSpeeds.length
        : 0,
    maxWindSpeed: validWindSpeeds.length > 0 ? Math.max(...validWindSpeeds) : 0,
    avgWaterTemp:
      validWaterTemps.length > 0
        ? validWaterTemps.reduce((a, b) => a + b, 0) / validWaterTemps.length
        : 0,
    avgWaveEnergy:
      validWaveEnergies.length > 0
        ? validWaveEnergies.reduce((a, b) => a + b, 0) /
          validWaveEnergies.length
        : 0,
    maxWaveEnergy:
      validWaveEnergies.length > 0 ? Math.max(...validWaveEnergies) : 0,
    conditions: validSurfHeights.length > 0 ? "Good" : "No data",
  };
}
