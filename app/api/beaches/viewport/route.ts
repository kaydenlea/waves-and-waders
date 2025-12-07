import { NextRequest, NextResponse } from "next/server";
import { supabase, FEATURE_COLUMNS } from "@/lib/supabase";

const MAX_ROWS = 1000;

type Bounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

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

const normalizeBounds = (bounds: Bounds): Bounds => {
  const south = Math.min(bounds.south, bounds.north);
  const north = Math.max(bounds.south, bounds.north);
  return {
    south,
    north,
    west: bounds.west,
    east: bounds.east,
  };
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

const mapRowToBeach = (row: Record<string, any>) => {
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

const normalizeFilterKeys = (values: string[] | null) => {
  if (!values?.length) return [];
  const valid = new Set(FEATURE_COLUMNS);
  return values
    .map((value) => (value ? value.trim().toUpperCase() : ""))
    .filter((value) => value && valid.has(value));
};

const parseFavoriteIds = (values: string[] | null) => {
  if (!values?.length) return [];
  return values.map((value) => value?.trim()).filter((value) => value);
};

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const south = parseNumber(params.get("south"), "south");
    const west = parseNumber(params.get("west"), "west");
    const north = parseNumber(params.get("north"), "north");
    const east = parseNumber(params.get("east"), "east");
    const crossesAntimeridian = params.get("crosses") === "true" || west > east;
    const limitParam = Number.parseInt(params.get("limit") ?? "", 10);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), MAX_ROWS)
      : MAX_ROWS;

    const bounds = normalizeBounds({ south, west, north, east });
    const selectCols = buildSelectColumns();
    const filterKeys = normalizeFilterKeys(params.getAll("filter"));
    const favoriteIds = parseFavoriteIds(params.getAll("favoriteId"));

    const applyQueryFilters = (query: any) => {
      let next = query;
      if (filterKeys.length) {
        for (const key of filterKeys) {
          next = next.eq(key, true);
        }
      }
      if (favoriteIds.length) {
        next = next.in("id", favoriteIds);
      }
      return next;
    };

    const baseQuery = () =>
      applyQueryFilters(
        supabase
          .from("beaches_optimized")
          .select(selectCols)
          .gte("LATITUDE", bounds.south)
          .lte("LATITUDE", bounds.north)
          .order("Name", { ascending: true })
      );

    const collectResults = async () => {
      if (!crossesAntimeridian) {
        const { data, error } = await baseQuery()
          .gte("LONGITUDE", bounds.west)
          .lte("LONGITUDE", bounds.east)
          .limit(limit);

        if (error) throw error;
        return data ?? [];
      }

      const eastwardQuery = baseQuery()
        .gte("LONGITUDE", bounds.west)
        .limit(limit);
      const westwardQuery = baseQuery()
        .lte("LONGITUDE", bounds.east)
        .limit(limit);

      const [
        { data: eastData, error: eastError },
        { data: westData, error: westError },
      ] = await Promise.all([eastwardQuery, westwardQuery]);

      if (eastError) throw eastError;
      if (westError) throw westError;

      return [...(eastData ?? []), ...(westData ?? [])];
    };

    const rows = await collectResults();
    const deduped = new Map<string, ReturnType<typeof mapRowToBeach>>();
    for (const row of rows) {
      if (!row?.id) continue;
      if (!deduped.has(row.id)) {
        deduped.set(row.id, mapRowToBeach(row));
      }
      if (deduped.size >= limit) break;
    }

    return NextResponse.json({
      success: true,
      data: Array.from(deduped.values()),
    });
  } catch (error: any) {
    const status = error?.message?.startsWith("Missing") ? 400 : 500;
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to fetch beaches",
      },
      { status }
    );
  }
}
