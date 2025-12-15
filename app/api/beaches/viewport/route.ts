import { NextRequest, NextResponse } from "next/server";
import { supabase, FEATURE_COLUMNS } from "@/lib/supabase";
import { getBeachStatsBatch } from "@/lib/beachStats";

const PAGE_SIZE = 1000;
const MAX_RESULTS = 4000;

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

const parseDateParam = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const fetchPagedResults = async (
  buildQuery: () => any,
  totalLimit: number
) => {
  const rows: Record<string, any>[] = [];
  let offset = 0;
  while (rows.length < totalLimit) {
    const chunkSize = Math.min(PAGE_SIZE, totalLimit - rows.length);
    const rangeStart = offset;
    const rangeEnd = offset + chunkSize - 1;
    const { data, error } = await buildQuery().range(rangeStart, rangeEnd);
    if (error) {
      throw error;
    }
    if (!data?.length) {
      break;
    }
    rows.push(...data);
    if (data.length < chunkSize) {
      break;
    }
    offset += chunkSize;
  }
  return rows;
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
      ? Math.min(Math.max(limitParam, 1), MAX_RESULTS)
      : MAX_RESULTS;
    const includeStats = params.get("includeStats") === "1";
    const statsLimitParam = Number.parseInt(params.get("statsLimit") ?? "", 10);
    const statsLimit = Number.isFinite(statsLimitParam)
      ? Math.max(1, Math.min(statsLimitParam, limit))
      : 0;
    const statsDateParam = parseDateParam(params.get("date"));
    const statsHourParam = params.get("hour");
    const statsHour =
      statsHourParam != null && statsHourParam !== ""
        ? Number.parseInt(statsHourParam, 10)
        : null;

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
        return fetchPagedResults(
          () =>
            baseQuery()
              .gte("LONGITUDE", bounds.west)
              .lte("LONGITUDE", bounds.east),
          limit
        );
      }

      const [eastData, westData] = await Promise.all([
        fetchPagedResults(
          () => baseQuery().gte("LONGITUDE", bounds.west),
          limit
        ),
        fetchPagedResults(
          () => baseQuery().lte("LONGITUDE", bounds.east),
          limit
        ),
      ]);

      return [...eastData, ...westData];
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

    let statsPayload: Record<string, any> | null = null;
    if (includeStats && statsLimit > 0 && deduped.size) {
      const ids = Array.from(deduped.keys()).slice(0, statsLimit);
      if (ids.length) {
        statsPayload = await getBeachStatsBatch(ids, {
          targetDate: statsDateParam ?? undefined,
          targetHour:
            typeof statsHour === "number" && Number.isFinite(statsHour)
              ? statsHour
              : undefined,
        });
      }
    }

    if (includeStats) {
      return NextResponse.json({
        success: true,
        data: {
          beaches: Array.from(deduped.values()),
          stats: statsPayload,
        },
      });
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
