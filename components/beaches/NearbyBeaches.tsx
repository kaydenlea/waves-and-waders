"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMapFilters } from "@/components/context/MapFilterContext";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import BeachCard, {
  type Beach as UIBeach,
} from "@/components/general/BeachCard";
import { cn, getPacificMidnightUTC } from "@/lib/utils";
import {
  FEATURE_COLUMNS,
  fetchBeachByIdLoose,
  fetchBeachDetails,
  fetchCurrentConditions,
  getFeatureDisplayName,
} from "@/lib/supabase";
import type { ForecastData } from "@/lib/supabase";
import { ChevronDown, ChevronUp, SearchX } from "lucide-react";
import {
  BEACH_FEATURE_ICONS,
  DEFAULT_FEATURE_ICON,
} from "@/lib/beachFeatureIcons";
import { Spinner } from "../ui/spinner";
import { AnimatePresence, motion } from "motion/react";
import { useClientPath } from "../context/PathContext";
import {
  getForecastCached,
  getTidesCached,
  getDailyConditionsCached,
} from "@/lib/dataCache";

type DbBeach = {
  id: string | number;
  Name: string;
  COUNTY: string;
  LATITUDE: number;
  LONGITUDE: number;
};

type SummaryStat =
  | {
      type: "temperature";
      waterTemp?: number;
      airTemp?: number;
      waterTempPercent?: number;
      airTempPercent?: number;
      weatherCode?: number | null;
    }
  | {
      type: "tide";
      currentHeight?: number;
      peaks: TidePeak[];
      sunrise?: string;
      sunset?: string;
    }
  | {
      type: "wind";
      wind: {
        direction?: number;
        speed: number;
        loc?: string;
        gust?: number;
        intensity: number;
      };
    }
  | {
      type: "surf";
      surf: { height: string; period: number; intensity: number };
    }
  | {
      type: "features";
      tags: {
        label: string;
        icon: React.ReactNode;
        color: string;
        rank?: number;
      }[];
    };
type TidePointValue = { x: number; tide: number };
type TidePeak = { kind: "high" | "low"; time: Date; level: number };

type ApiBeach = {
  id: string | number;
  name: string;
  county: string;
  latitude: number;
  longitude: number;
  features?: Record<string, boolean>;
};

const haversineKm = (a: [number, number], b: [number, number]) => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const computeTidePeaks = (points: TidePointValue[]): TidePeak[] => {
  if (!points || points.length < 3) return [];
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const peaks: TidePeak[] = [];
  for (let i = 1; i < sorted.length - 1; i += 1) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const next = sorted[i + 1];
    const tide = curr.tide;
    if (tide > prev.tide && tide >= next.tide) {
      peaks.push({
        kind: "high",
        time: new Date(curr.x),
        level: Number(tide.toFixed(1)),
      });
    } else if (tide < prev.tide && tide <= next.tide) {
      peaks.push({
        kind: "low",
        time: new Date(curr.x),
        level: Number(tide.toFixed(1)),
      });
    }
  }
  return peaks;
};

const average = (values: number[]): number | null => {
  if (!values || values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
};

const clampIntensity = (value: number, max: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(100, Math.round((value / max) * 100));
};

const SURF_HEIGHT_CAP = 12;
const WIND_SPEED_CAP = 40;
const TEMP_CAP = 100; // For temperature circles

type BeachStatsSnapshot = {
  summary: SummaryStat[];
  current: ForecastData | null;
};

const beachStatsCache = new Map<string, Promise<BeachStatsSnapshot | null>>();

const decorateBeachWithStats = (
  beach: UIBeach,
  snapshot?: BeachStatsSnapshot | null
): UIBeach => {
  if (!snapshot || !snapshot.summary) return beach;
  const surfStat = snapshot.summary.find(
    (stat): stat is Extract<SummaryStat, { type: "surf" }> =>
      stat.type === "surf"
  );
  const windStat = snapshot.summary.find(
    (stat): stat is Extract<SummaryStat, { type: "wind" }> =>
      stat.type === "wind"
  );
  const featuresStat = snapshot.summary.find(
    (stat): stat is Extract<SummaryStat, { type: "features" }> =>
      stat.type === "features"
  );

  return {
    ...beach,
    conditions: {
      ...beach.conditions,
      rating: surfStat?.surf.intensity ?? beach.conditions.rating ?? 0,
      surf: surfStat?.surf.height ?? beach.conditions.surf,
      windDir: windStat?.wind.direction ?? beach.conditions.windDir,
      wind:
        windStat?.wind.speed != null
          ? String(windStat.wind.speed)
          : beach.conditions.wind,
    },
    features: featuresStat?.tags ?? beach.features,
    current: snapshot.current ?? beach.current,
  };
};

const dateKey = (value?: Date) => {
  if (!value) return "today";
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().split("T")[0]!;
};
async function computeBeachStatsSnapshot(
  beachId: string,
  targetDate?: Date
): Promise<BeachStatsSnapshot | null> {
  try {
    const resolved = await fetchBeachByIdLoose(beachId);
    const resolvedId = resolved?.id ? String(resolved.id) : beachId;
    const beach = await fetchBeachDetails(resolvedId);
    const dayStart =
      targetDate instanceof Date
        ? getPacificMidnightUTC(targetDate)
        : getPacificMidnightUTC();
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const tideBufferMs = 6 * 60 * 60 * 1000;
    const tideStart = new Date(dayStart.getTime() - tideBufferMs);
    const tideEnd = new Date(dayEnd.getTime() + tideBufferMs);

    const [forecast = [], current, tides = [], daily] = await Promise.all([
      getForecastCached(resolvedId, dayStart, dayEnd),
      fetchCurrentConditions(resolvedId).catch(() => null),
      getTidesCached(resolvedId, tideStart, tideEnd),
      beach?.COUNTY
        ? getDailyConditionsCached(
            beach.COUNTY,
            targetDate instanceof Date ? targetDate : dayStart
          )
        : Promise.resolve(null),
    ]);

    if (!forecast.length && !current) {
      return null;
    }

    const base = targetDate ? forecast[0] : current ?? forecast[0];
    const renderData = base ?? current ?? null;
    const stats: SummaryStat[] = [];

    const heightMins = forecast
      .map((row) => row?.surf?.heightMin)
      .filter(
        (value): value is number =>
          typeof value === "number" && !Number.isNaN(value)
      );
    const heightMaxes = forecast
      .map((row) => row?.surf?.heightMax)
      .filter(
        (value): value is number =>
          typeof value === "number" && !Number.isNaN(value)
      );
    const periods = forecast
      .map((row) => row?.swell?.primary?.period)
      .filter(
        (value): value is number =>
          typeof value === "number" && !Number.isNaN(value)
      );

    const avgHeightMin = average(heightMins);
    const avgHeightMax = average(heightMaxes);
    const avgPeriod = average(periods);

    const max = avgHeightMax != null ? avgHeightMax : null;
    const minWithFallback =
      avgHeightMin != null ? avgHeightMin : max != null && max <= 1 ? 0 : null;
    const hasRange = minWithFallback != null && max != null;

    let surfHeightLabel: string | null = null;
    if (hasRange) {
      let minRounded = Math.round(minWithFallback!);
      let maxRounded = Math.round(max!);
      if (minRounded > maxRounded) {
        [minRounded, maxRounded] = [maxRounded, minRounded];
      }
      if (minRounded === maxRounded) {
        minRounded = Math.max(0, maxRounded - 1);
      }
      surfHeightLabel = `${minRounded}-${maxRounded}`;
    }
    const surfPeriod = avgPeriod != null ? Math.round(avgPeriod) : null;

    if ((surfHeightLabel || hasRange) && surfPeriod != null) {
      const surfIntensity = clampIntensity(
        max ?? minWithFallback ?? 0,
        SURF_HEIGHT_CAP
      );
      stats.push({
        type: "surf",
        surf: {
          height: surfHeightLabel ?? "-",
          period: surfPeriod,
          intensity: max ?? 0,
        },
      });
    }

    const windSpeeds = forecast
      .map((row) => row?.conditions?.windSpeed)
      .filter(
        (value): value is number =>
          typeof value === "number" && !Number.isNaN(value)
      );
    const windGusts = forecast
      .map((row) => row?.conditions?.windGust)
      .filter(
        (value): value is number =>
          typeof value === "number" && !Number.isNaN(value)
      );
    const windDirections = forecast
      .map((row) => row?.conditions?.windDirection)
      .filter(
        (value): value is number =>
          typeof value === "number" && !Number.isNaN(value)
      );

    const avgWindSpeed = average(windSpeeds);
    const avgWindGust = average(windGusts);
    const avgWindDirection = average(windDirections);

    const resolvedWindSpeed =
      avgWindSpeed != null ? Math.round(avgWindSpeed) : null;
    const resolvedWindGust =
      avgWindGust != null ? Math.round(avgWindGust) : undefined;
    const resolvedWindDirection =
      avgWindDirection != null ? Math.round(avgWindDirection) : undefined;

    if (resolvedWindSpeed != null) {
      const windIntensity = clampIntensity(resolvedWindSpeed, WIND_SPEED_CAP);

      stats.push({
        type: "wind",
        wind: {
          speed: resolvedWindSpeed,
          gust: resolvedWindGust,
          loc: resolvedWindGust == null ? "-" : undefined,
          intensity: windIntensity,
          direction: resolvedWindDirection,
        },
      });
    }

    const tideSeries: TidePointValue[] = (tides as any[])
      .map((row) => {
        const tideFt =
          typeof row?.tideLevelFt === "number"
            ? row.tideLevelFt
            : typeof row?.tideLevelM === "number"
            ? row.tideLevelM * 3.28084
            : null;
        if (tideFt == null || Number.isNaN(tideFt)) return null;
        return {
          x: new Date(row.timestamp).getTime(),
          tide: tideFt,
        };
      })
      .filter((point): point is TidePointValue => point !== null)
      .sort((a, b) => a.x - b.x);

    let tidePeaks = computeTidePeaks(tideSeries);
    if (tidePeaks.length === 0 && forecast.length > 0) {
      const fallbackSeries: TidePointValue[] = forecast
        .map((row) => {
          const tideLevel = row?.conditions?.tideLevel;
          if (tideLevel == null || Number.isNaN(tideLevel)) return null;
          return {
            x: new Date(row.timestamp).getTime(),
            tide: tideLevel,
          };
        })
        .filter((point): point is TidePointValue => point !== null)
        .sort((a, b) => a.x - b.x);
      tidePeaks = computeTidePeaks(fallbackSeries);
    }
    const tideStatPeaks = tidePeaks.slice(0, 4);
    while (tideStatPeaks.length < 4) {
      const peakType = tideStatPeaks.length % 2 === 0 ? "high" : "low";
      tideStatPeaks.push({
        kind: peakType,
        time: new Date(dayStart),
        level: null,
      });
    }

    let currentTideHeight: number | undefined;
    if (tides.length > 0) {
      const nowMs = Date.now();
      let bestDiff = Number.POSITIVE_INFINITY;
      tides.forEach((row) => {
        const tideFt =
          typeof row?.tideLevelFt === "number"
            ? row.tideLevelFt
            : typeof row?.tideLevelM === "number"
            ? row.tideLevelM * 3.28084
            : null;
        if (tideFt == null || Number.isNaN(tideFt)) return;
        const diff = Math.abs(new Date(row.timestamp).getTime() - nowMs);
        if (diff < bestDiff) {
          bestDiff = diff;
          currentTideHeight = Number(tideFt.toFixed(1));
        }
      });
    }
    if (
      currentTideHeight == null &&
      base?.conditions.tideLevel != null &&
      Number.isFinite(base.conditions.tideLevel)
    ) {
      currentTideHeight = Number(base.conditions.tideLevel.toFixed(1));
    }

    let sunrise: string | undefined;
    let sunset: string | undefined;
    const county = beach?.COUNTY;
    if (county) {
      try {
        const conditions = await getDailyConditionsCached(
          county,
          targetDate instanceof Date ? targetDate : dayStart
        );
        const dayForFormat = conditions?.date
          ? new Date(`${conditions.date}T00:00:00`)
          : new Date(targetDate ?? dayStart);
        const formatClock = (raw: string | null | undefined) => {
          if (!raw) return undefined;
          const match = /^([0-9]{1,2}):([0-9]{2})(?::([0-9]{2}))?/.exec(
            raw.trim()
          );
          if (!match) return undefined;
          const h = Number(match[1]);
          const m = Number(match[2]);
          if (!Number.isFinite(h) || !Number.isFinite(m)) return undefined;
          const ts = new Date(dayForFormat);
          ts.setHours(h, m, 0, 0);
          return ts.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          });
        };
        sunrise =
          formatClock(conditions?.sunrise) ?? conditions?.sunrise ?? undefined;
        sunset =
          formatClock(conditions?.sunset) ?? conditions?.sunset ?? undefined;
      } catch (err) {
        console.warn("NearbyBeaches sunrise/sunset unavailable", err);
      }
    }

    stats.push({
      type: "tide",
      currentHeight: currentTideHeight,
      peaks: tideStatPeaks,
      sunrise,
      sunset,
    });

    const waterTemps = forecast
      .map((row) => row?.conditions?.waterTemp)
      .filter(
        (value): value is number =>
          typeof value === "number" && !Number.isNaN(value)
      );
    const airTemps = forecast
      .map((row) => row?.conditions?.airTemp)
      .filter(
        (value): value is number =>
          typeof value === "number" && !Number.isNaN(value)
      );

    const waterTemp =
      waterTemps.length > 0
        ? Math.round(
            waterTemps.reduce((sum, v) => sum + v, 0) / waterTemps.length
          )
        : undefined;
    const airTemp =
      airTemps.length > 0
        ? Math.round(airTemps.reduce((sum, v) => sum + v, 0) / airTemps.length)
        : undefined;

    const weatherCodes = forecast
      .map((row) => row?.conditions?.weather)
      .filter(
        (value): value is number =>
          typeof value === "number" && !Number.isNaN(value)
      );

    let dominantWeatherCode: number | null = null;
    if (weatherCodes.length > 0) {
      const codeCounts: Record<number, number> = {};
      for (const code of weatherCodes) {
        codeCounts[code] = (codeCounts[code] ?? 0) + 1;
      }
      let bestCount = -1;
      for (const code of Object.keys(codeCounts)) {
        const count = codeCounts[Number(code)];
        if (count > bestCount) {
          dominantWeatherCode = Number(code);
          bestCount = count;
        }
      }
    }

    if (waterTemp != null || airTemp != null) {
      stats.push({
        type: "temperature",
        waterTemp,
        airTemp,
        waterTempPercent:
          waterTemp != null ? clampIntensity(waterTemp, TEMP_CAP) : undefined,
        airTempPercent:
          airTemp != null ? clampIntensity(airTemp, TEMP_CAP) : undefined,
        weatherCode: dominantWeatherCode,
      });
    }

    if (beach) {
      const tags: {
        label: string;
        icon: React.ReactNode;
        color: string;
        rank?: number;
      }[] = [];
      const keys: string[] =
        typeof FEATURE_COLUMNS !== "undefined" && Array.isArray(FEATURE_COLUMNS)
          ? (FEATURE_COLUMNS as string[])
          : [
              "FISHING",
              "RESTROOMS",
              "PARKING",
              "DOG_FRIEND",
              "SNDY_BEACH",
              "LIFEGUARD",
            ];
      for (const key of keys) {
        const val = (beach as any)[key];
        if (val === true) {
          const label =
            typeof getFeatureDisplayName === "function"
              ? getFeatureDisplayName(key)
              : key;
          const def = BEACH_FEATURE_ICONS[key] ?? DEFAULT_FEATURE_ICON;
          tags.push({
            label,
            icon: def.icon,
            color: def.color,
            rank: def.rank,
          });
        }
      }
      tags.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
      const topTags = tags.slice(0, 5);
      if (topTags.length > 0) {
        stats.push({
          type: "features",
          tags: topTags,
        });
      }
    }

    return {
      summary: stats,
      current: renderData,
    };
  } catch (error) {
    console.error("Failed to load cached beach stats", error);
    return null;
  }
}

async function getBeachStatsCached(
  beachId: string,
  targetDate?: Date
): Promise<BeachStatsSnapshot | null> {
  const key = `${beachId}:${dateKey(targetDate)}`;
  if (!beachStatsCache.has(key)) {
    beachStatsCache.set(key, computeBeachStatsSnapshot(beachId, targetDate));
  }
  return beachStatsCache.get(key)!;
}

export default function NearbyBeaches({
  beaches,
  date,
  favoriteIds = [],
}: {
  beaches: DbBeach[];
  date?: Date;
  favoriteIds?: string[];
}) {
  const {
    filters,
    map,
    beaches: sharedBeaches,
    setBeaches: setSharedBeaches,
  } = useMapFilters();
  const filterCount = filters?.size ?? 0;
  const initialList: UIBeach[] = useMemo(
    () =>
      (beaches || []).map(
        (b) =>
          ({
            id: String(b.id),
            name: b.Name,
            region: b.COUNTY ?? "",
            coords: [Number(b.LATITUDE), Number(b.LONGITUDE)],
            image:
              "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
            conditions: {
              surf: "-",
              wind: "-",
              windDir: 0,
              temp: 0,
              rating: 0,
            },
            features: [],
          } satisfies UIBeach)
      ),
    [beaches]
  );

  const fallbackApiBeaches = useMemo(
    () =>
      (beaches || []).map(
        (b) =>
          ({
            id: b.id,
            name: b.Name,
            county: b.COUNTY,
            latitude: Number(b.LATITUDE),
            longitude: Number(b.LONGITUDE),
            features: undefined,
          } satisfies ApiBeach)
      ),
    [beaches]
  );

  const favoriteSet = useMemo(
    () => new Set((favoriteIds ?? []).map((id) => String(id))),
    [favoriteIds]
  );

  const [sorted, setSorted] = useState<UIBeach[]>([]);
  // Subset of beaches currently visible within the map's viewport
  const [inView, setInView] = useState<UIBeach[]>([]);
  const [apiBeaches, setApiBeaches] = useState<ApiBeach[] | null>(null);
  const [status, setStatus] = useState<
    "idle" | "locating" | "granted" | "denied" | "unavailable"
  >("idle");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const loadingListRef = useRef<boolean>(false);
  const statsLoadingRef = useRef<boolean>(false);
  const dataLoaded = useRef<boolean>(false);
  const { selectedTab } = useClientPath();

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        if (!loadingListRef.current && !statsLoadingRef.current) setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  // Load richer beach data
  useEffect(() => {
    let cancelled = false;
    const loadBeachesContextOrFetch = async () => {
      try {
        if (sharedBeaches && sharedBeaches.length > 0) {
          if (!cancelled) setApiBeaches(sharedBeaches as ApiBeach[]);
          return;
        }
        const res = await fetch("/api/beaches");
        if (!res.ok) {
          throw new Error(`status ${res.status}`);
        }
        const json = await res.json();
        if (!cancelled && json?.success && Array.isArray(json.data)) {
          setApiBeaches(json.data as ApiBeach[]);
          setSharedBeaches(json.data as ApiBeach[]);
          return;
        }
        throw new Error("invalid beaches payload");
      } catch (error) {
        console.warn("NearbyBeaches failed to load /api/beaches", error);
        if (!cancelled && fallbackApiBeaches.length) {
          setApiBeaches(fallbackApiBeaches);
          setSharedBeaches(fallbackApiBeaches);
        }
      }
    };
    loadBeachesContextOrFetch();
    return () => {
      cancelled = true;
    };
  }, [sharedBeaches, setSharedBeaches]);

  // Filtering + sorting
  useEffect(() => {
    if (!apiBeaches) return;
    const base = apiBeaches;
    // const base = (apiBeaches ?? []).length
    //   ? apiBeaches!
    //   : (beaches || []).map(
    //       (b) =>
    //         ({
    //           id: b.id,
    //           name: b.Name,
    //           county: b.COUNTY,
    //           latitude: b.LATITUDE,
    //           longitude: b.LONGITUDE,
    //         } as ApiBeach)
    //     );

    const applyFilters = (list: ApiBeach[]) =>
      list.filter((b) => {
        if (b.features && (b.features as any).INLND_AREA) return false;
        if (!filters.size) return true;
        const feats = (b.features ?? {}) as Record<string, boolean>;
        for (const k of filters) if (!feats[k]) return false;
        return true;
      });

    if (!navigator?.geolocation) {
      setStatus("unavailable");
      const filtered = applyFilters(base);
      const toUi: UIBeach[] = filtered.map((b) => ({
        id: String(b.id),
        name: b.name ?? (b as any).Name,
        region: b.county ?? (b as any).COUNTY ?? "",
        coords: [
          Number(b.latitude ?? (b as any).LATITUDE),
          Number(b.longitude ?? (b as any).LONGITUDE),
        ],
        features: [],
        image:
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
        conditions: { surf: "-", wind: "-", windDir: 0, temp: 0, rating: 0 },
      }));
      setSorted(toUi);
      dataLoaded.current = true;
      return;
    }

    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const origin: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];
        const filtered = applyFilters(base);
        const withDistance: UIBeach[] = filtered.map((b) => ({
          id: String(b.id),
          name: b.name ?? (b as any).Name,
          region: b.county ?? (b as any).COUNTY ?? "",
          coords: [
            Number(b.latitude ?? (b as any).LATITUDE),
            Number(b.longitude ?? (b as any).LONGITUDE),
          ],
          features: [],
          image:
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
          conditions: { surf: "-", wind: "-", windDir: 0, temp: 0, rating: 0 },
          distanceKm: haversineKm(origin, [
            Number(b.latitude ?? (b as any).LATITUDE),
            Number(b.longitude ?? (b as any).LONGITUDE),
          ]),
        }));
        withDistance.sort(
          (a, z) => (a.distanceKm ?? 9e9) - (z.distanceKm ?? 9e9)
        );
        setSorted(withDistance);
        dataLoaded.current = true;
        setStatus("granted");
      },
      () => {
        setStatus("denied");
        const filtered = applyFilters(base);
        const toUi: UIBeach[] = filtered.map((b) => ({
          id: String(b.id),
          name: b.name ?? (b as any).Name,
          region: b.county ?? (b as any).COUNTY ?? "",
          coords: [
            Number(b.latitude ?? (b as any).LATITUDE),
            Number(b.longitude ?? (b as any).LONGITUDE),
          ],
          features: [],
          image:
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop",
          conditions: { surf: "-", wind: "-", windDir: 0, temp: 0, rating: 0 },
        }));
        setPage(1);
        setSorted(toUi);
        dataLoaded.current = true;
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [filters, apiBeaches]);

  // Compute visible beaches based on map bounds (when map is available)
  const updateInViewFromMap = useMemo(() => {
    return () => {
      // If no map instance yet, show full or favorites-only based on selected tab
      if (!map) {
        if (selectedTab === "saved") {
          const favOnly = sorted.filter((b) => favoriteSet.has(String(b.id)));
          setInView(favOnly);
        } else {
          setInView(sorted);
        }
        return;
      }
      try {
        const bounds = map.getBounds?.();
        if (!bounds) {
          setInView(sorted);
          return;
        }
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const west = sw.lng;
        const south = sw.lat;
        const east = ne.lng;
        const north = ne.lat;
        const crossesAntimeridian = west > east;

        const inBounds = (lat: number, lon: number) => {
          const withinLat = lat >= south && lat <= north;
          const withinLon = crossesAntimeridian
            ? lon >= west || lon <= east
            : lon >= west && lon <= east;
          return withinLat && withinLon;
        };

        // Apply tab-specific filter (saved shows favorites only)
        const idIsFavorite = (id: string | number) =>
          favoriteSet.has(String(id));

        const filtered = sorted.filter((b) => {
          const lat = b.coords[0]; // coords: [lat, lon]
          const lon = b.coords[1];
          if (!inBounds(lat, lon)) return false;
          if (selectedTab === "saved") {
            return idIsFavorite(b.id);
          }
          return true;
        });

        setInView(filtered);
      } catch (e) {
        // On any unexpected error, fallback to full list
        setInView(sorted);
      }
    };
  }, [map, sorted, favoriteSet, selectedTab]);

  // Recompute in-view list when sorted list changes or map becomes available
  useEffect(() => {
    updateInViewFromMap();
  }, [updateInViewFromMap]);

  // When switching tabs, reset pagination and recompute in-view
  useEffect(() => {
    setPage(1);
    updateInViewFromMap();
  }, [selectedTab, updateInViewFromMap]);

  // Listen for map view changes and update the in-view list on interaction end
  useEffect(() => {
    if (!map) return;
    let t: number | null = null;
    const debounced = () => {
      if (t != null) window.clearTimeout(t);
      t = window.setTimeout(() => {
        // Reset pagination when the map view changes to avoid empty pages
        setPage(1);
        updateInViewFromMap();
      }, 120);
    };
    map.on("move", debounced);
    map.on("zoom", debounced);
    // Initial compute
    debounced();
    return () => {
      try {
        map.off("move", debounced);
        map.off("zoom", debounced);
      } catch {}
      if (t != null) window.clearTimeout(t);
    };
  }, [map, updateInViewFromMap]);

  const totalPages = Math.ceil(inView.length / perPage);
  const [currentItems, setCurrentItems] = useState<UIBeach[]>([]);

  useEffect(() => {
    // Clamp page if current page exceeds new total pages after filtering
    const maxPage = Math.max(1, Math.ceil(inView.length / perPage));
    if (page > maxPage) {
      setPage(maxPage);
    }
    // Mark as updating to avoid UI flicker on page options
    loadingListRef.current = true;
    const next = inView.slice((page - 1) * perPage, page * perPage);
    setCurrentItems(next);
    // Let the UI settle this tick
    const t = setTimeout(() => {
      loadingListRef.current = false;
    }, 0);
    return () => clearTimeout(t);
  }, [perPage, inView, page]);

  const [statsByBeach, setStatsByBeach] = useState<
    Record<string, BeachStatsSnapshot>
  >({});

  const loadStats = async (beaches: UIBeach[]) => {
    if (!beaches.length) return null;
    const targetDate = date instanceof Date ? new Date(date) : undefined;

    const entries = await Promise.all(
      beaches.map(async (beach) => {
        try {
          if (!beach?.id) return null;
          const snapshot = await getBeachStatsCached(
            String(beach.id),
            targetDate
          );
          if (!snapshot) return null;
          return [String(beach.id), snapshot] as const;
        } catch (error) {
          console.error("Failed to load summary", error);
          return null;
        }
      })
    );

    const statsMap: Record<string, BeachStatsSnapshot> = {};
    entries.forEach((entry) => {
      if (!entry) return;
      const [id, snapshot] = entry;
      statsMap[id] = snapshot;
    });
    return Object.keys(statsMap).length ? statsMap : null;
  };

  const missingStatIds = useMemo(() => {
    return currentItems
      .map((beach) => String(beach.id))
      .filter((id) => !statsByBeach[id]);
  }, [currentItems, statsByBeach]);

  const dateKey = date instanceof Date ? date.getTime() : null;

  useEffect(() => {
    setStatsByBeach({});
  }, [dateKey]);

  useEffect(() => {
    if (!missingStatIds.length) return;
    const loadBeaches = async () => {
      statsLoadingRef.current = true;
      try {
        const missingSet = new Set(missingStatIds);
        const targets = currentItems.filter((beach) =>
          missingSet.has(String(beach.id))
        );
        const statsMap = await loadStats(targets);
        if (!statsMap) return;
        setStatsByBeach((prev) => ({ ...prev, ...statsMap }));
      } finally {
        statsLoadingRef.current = false;
      }
    };
    loadBeaches();
  }, [missingStatIds, currentItems]);

  const renderedItems = useMemo(
    () =>
      currentItems.map((beach) =>
        decorateBeachWithStats(beach, statsByBeach[String(beach.id)])
      ),
    [currentItems, statsByBeach]
  );

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  // Build pagination range with ellipses
  const getPageNumbers = () => {
    const delta = 1;
    const pages: (number | string)[] = [];
    const range = [];

    for (
      let i = Math.max(2, page - delta);
      i <= Math.min(totalPages - 1, page + delta);
      i++
    ) {
      range.push(i);
    }

    if (page - delta > 2) {
      range.unshift("…");
    }
    if (page + delta < totalPages - 1) {
      range.push("…");
    }

    if (totalPages >= 1) pages.push(1);
    pages.push(...range);
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  // Page size selector – custom popover with disabled state while loading
  const handleSelect = (value: number) => {
    setPerPage(value);
    setPage(1);
  };

  const PageOptions = () => {
    const disabled = loadingListRef.current || statsLoadingRef.current;
    const toggle = () => {
      if (disabled) return; // Prevent open while loading to avoid flicker
      setOpen((v) => !v);
    };
    const close = () => setOpen(false);

    return (
      <div className="flex items-center gap-2" ref={dropdownRef}>
        <span className="text-sm text-muted-foreground font-medium select-none">
          Per page:
        </span>
        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={toggle}
            disabled={disabled}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-border/20",
              "bg-highlight-3 px-3.5 py-1.5 text-sm font-medium text-foreground",
              "shadow-inner transition-all duration-200",
              "hover:bg-background/60 dark:hover:bg-highlight-5/40",
              "focus:outline-none",
              "disabled:opacity-60 disabled:cursor-not-allowed"
            )}
          >
            <span>{perPage}</span>
            {open ? (
              <ChevronUp size={16} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={16} className="text-muted-foreground" />
            )}
          </button>

          <AnimatePresence>
            {open && !disabled && (
              <motion.ul
                key="perpage-menu"
                role="menu"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className={cn(
                  "absolute right-0 z-20 mt-2 min-w-[7rem] overflow-hidden",
                  "rounded-xl border border-border/30 bg-background shadow-lg"
                )}
              >
                {[10, 20, 50].map((num) => {
                  const active = num === perPage;
                  return (
                    <li key={num} role="menuitem">
                      <button
                        type="button"
                        onClick={() => {
                          handleSelect(num);
                          close();
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm",
                          active
                            ? "bg-highlight-5/60 text-foreground"
                            : "hover:bg-highlight-3/70",
                          "transition-colors"
                        )}
                      >
                        {num}
                      </button>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  // console.log("FINAL BEACHES", currentItems);
  return (
    <>
      {/* <div className="flex mb-4 ml-2 items-center justify-between gap-10 mx-2"> */}
      {/* {status === "locating" && (
          <div className="text-sm text-foreground/70">
            Finding your location…
          </div>
        )}
        {status === "denied" && (
          <div className="hidden @min-lg:flex text-sm text-foreground/70">
            Location denied. Showing unsorted beaches.
          </div>
        )} */}
      {/* Per Page Dropdown */}
      {/* <div className="flex items-center gap-2">
          <label htmlFor="perPage" className="text-sm text-gray-600">
            Per page:
          </label>
          <select
            id="perPage"
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-md border px-2 py-1 text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option className="bg-highlight-5" value={10}>
              10
            </option>
            <option className="bg-highlight-5" value={20}>
              20
            </option>
          </select>
        </div> */}
      {/* <PageOptions /> */}
      {/* </div> */}

      {dataLoaded.current ? (
        // If we have beaches loaded but none are in view, show a helpful message
        sorted.length > 0 && inView.length === 0 ? (
          <section className="text-center pt-10 pb-100 flex flex-col justify-center items-center gap-3">
            <SearchX className="w-10 h-10" />
            <span className="text-lg">
              {selectedTab === "saved"
                ? "No saved beaches in the current map view."
                : "No beaches in the current map view."}
            </span>
            <span className="text-sm text-muted-foreground">
              Pan or zoom the map to see beaches here.
            </span>
          </section>
        ) : renderedItems.length > 0 ? (
          <section className="grid grid-cols-1 gap-3 @min-4xl/main:gap-4 @min-md/beaches:grid-cols-2 mb-4">
            {renderedItems.map((b) => (
              <BeachCard
                key={b.id}
                b={b}
                isFav={favoriteSet.has(String(b.id))}
              />
            ))}
          </section>
        ) : filterCount > 0 ? (
          <section className="text-center pt-10 pb-100 flex flex-col justify-center items-center gap-3">
            <SearchX className="w-10 h-10" />
            <span className="text-lg">No beaches found...</span>
          </section>
        ) : (
          <section className="text-center pt-10 pb-100 flex flex-col justify-center items-center gap-3">
            <span className="text-lg">Loading beaches...</span>
            <Spinner />
          </section>
        )
      ) : (
        <section className="text-center pt-10 pb-100 flex flex-col justify-center items-center gap-3">
          <span className="text-lg">Loading beaches...</span>
          <Spinner />
        </section>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                className={cn(
                  page === 1 && "pointer-events-none text-muted-foreground"
                )}
                onClick={() => {
                  handlePrev();
                  document
                    .getElementById("content")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            </PaginationItem>
            {getPageNumbers().map((p, idx) =>
              p === "…" ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    isActive={p === page}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(p as number);
                      document
                        .getElementById("content")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                className={cn(
                  page === totalPages &&
                    "pointer-events-none text-muted-foreground"
                )}
                onClick={() => {
                  handleNext();
                  document
                    .getElementById("content")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </>
  );
}
