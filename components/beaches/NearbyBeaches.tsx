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
import { cn } from "@/lib/utils";
import {
  FEATURE_COLUMNS,
  fetchBeachByIdLoose,
  fetchBeachDetails,
  fetchBeachForecast,
  fetchBeachTides,
  fetchCurrentConditions,
  fetchDailyConditions,
  getFeatureDisplayName,
} from "@/lib/supabase";
import type { ForecastData } from "@/lib/supabase";
import { ChevronDown, ChevronUp, SearchX } from "lucide-react";
import {
  BEACH_FEATURE_ICONS,
  DEFAULT_FEATURE_ICON,
} from "@/lib/beachFeatureIcons";
import { useDateContext } from "../context/DateContext";
import { Spinner } from "../ui/spinner";
import { AnimatePresence, motion } from "motion/react";
import { useClientPath } from "../context/PathContext";

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

export default function NearbyBeaches({
  beaches,
  date = new Date(),
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
  const { surfRange } = useDateContext();
  const [stats, setStats] = useState<SummaryStat[]>([]);
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
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json?.success) {
          setApiBeaches(json.data as ApiBeach[]);
          setSharedBeaches(json.data as ApiBeach[]);
        }
      } catch {}
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

  const loadStats = async (beaches: UIBeach[]) => {
    const entries = await Promise.all(
      beaches.map(async (beach) => {
        const beachId = beach.id;
        try {
          if (!beachId) return;

          // Resolve the param to a concrete id (supports id/uuid/slug)
          const resolved = await fetchBeachByIdLoose(beachId);
          const resolvedId = resolved?.id ?? beachId;

          // Choose the time window: if a date is provided, use that local day; otherwise next 24 hours
          const now = new Date();
          let startWindow = now;
          let endWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          let tideEndWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          if (date instanceof Date) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            startWindow = d;
            endWindow = new Date(d.getTime() + 24 * 60 * 60 * 1000);
            tideEndWindow = endWindow;
          }
          const [current, forecast, beach, tideRows] = await Promise.all([
            fetchCurrentConditions(resolvedId),
            fetchBeachForecast(resolvedId, startWindow, endWindow),
            fetchBeachDetails(resolvedId),
            fetchBeachTides(resolvedId, startWindow, tideEndWindow),
          ]);
          const first = forecast[0];
          // If a specific date is selected, use that day's forecast; otherwise prefer current conditions
          const base = date ? first : current ?? first;

          const s: SummaryStat[] = [];

          // Use base for rendering (has swell directions), fallback to current if base is null
          const renderData = base ?? current;

          // 1. SURF (first in order)
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
            avgHeightMin != null
              ? avgHeightMin
              : max != null && max <= 1
              ? 0
              : null;
          const hasRange = minWithFallback != null && max != null;

          // Use surf range from DatePicker context when date is selected, otherwise calculate
          let surfHeightLabel: string | null = null;
          // if (date && surfRange) {
          //   // Use the exact range from DatePicker
          //   surfHeightLabel = surfRange;
          // } else if (hasRange) {
          //   let minRounded = Math.round(minWithFallback!);
          //   let maxRounded = Math.round(max!);
          //   // Ensure min <= max
          //   if (minRounded > maxRounded) {
          //     [minRounded, maxRounded] = [maxRounded, minRounded];
          //   }
          //   // If they're equal, subtract 1 from min
          //   if (minRounded === maxRounded) {
          //     minRounded = Math.max(0, maxRounded - 1);
          //   }
          //   surfHeightLabel = `${minRounded}-${maxRounded}`;
          // }

          if (hasRange) {
            let minRounded = Math.round(minWithFallback!);
            let maxRounded = Math.round(max!);
            // Ensure min <= max
            if (minRounded > maxRounded) {
              [minRounded, maxRounded] = [maxRounded, minRounded];
            }
            // If they're equal, subtract 1 from min
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
            s.push({
              type: "surf",
              surf: {
                height: surfHeightLabel ?? "-",
                period: surfPeriod,
                intensity: max ?? 0,
              },
            });
          }

          // 2. WIND (second in order)
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

          const resolvedWindDirection =
            avgWindDirection != null ? Math.round(avgWindDirection) : undefined;
          const resolvedWindSpeed =
            avgWindSpeed != null ? Math.round(avgWindSpeed) : null;
          const resolvedWindGust =
            avgWindGust != null ? Math.round(avgWindGust) : undefined;

          if (resolvedWindSpeed != null) {
            const windIntensity = clampIntensity(
              resolvedWindSpeed,
              WIND_SPEED_CAP
            );

            s.push({
              type: "wind",
              wind: {
                direction: resolvedWindDirection,
                speed: resolvedWindSpeed,
                gust: resolvedWindGust,
                loc: resolvedWindGust == null ? "-" : undefined,
                intensity: windIntensity,
              },
            });
          }

          // 3. TIDE (third in order)
          const tideSeries: TidePointValue[] = (tideRows ?? [])
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
          const currentTideHeight =
            base?.conditions.tideLevel != null
              ? Number(base.conditions.tideLevel.toFixed(1))
              : undefined;

          let sunrise: string | undefined;
          let sunset: string | undefined;
          const county = beach?.COUNTY;
          if (county) {
            try {
              const basisDate =
                date instanceof Date ? new Date(date) : new Date(startWindow);
              const cond = await fetchDailyConditions(county, basisDate);
              const dayForFormat = cond?.date
                ? new Date(`${cond.date}T00:00:00`)
                : new Date(basisDate);
              const formatClock = (raw: string | null | undefined) => {
                if (!raw) return undefined;
                // Match HH:MM:SS or HH:MM format
                const match = /^([0-9]{1,2}):([0-9]{2})(?::([0-9]{2}))?/.exec(
                  raw.trim()
                );
                if (!match) return undefined;
                const h = Number(match[1]);
                const m = Number(match[2]);
                if (!Number.isFinite(h) || !Number.isFinite(m))
                  return undefined;

                // Create a date with the correct time
                const ts = new Date(dayForFormat);
                ts.setHours(h, m, 0, 0);

                return ts.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                });
              };
              const resolvedSunrise = formatClock(cond?.sunrise);
              const resolvedSunset = formatClock(cond?.sunset);
              sunrise = resolvedSunrise ?? cond?.sunrise ?? undefined;
              sunset = resolvedSunset ?? cond?.sunset ?? undefined;
            } catch (sunErr) {
              console.warn("Summary sunrise/sunset unavailable", sunErr);
            }
          }

          if (
            currentTideHeight != null ||
            tideStatPeaks.length > 0 ||
            sunrise ||
            sunset
          ) {
            s.push({
              type: "tide",
              currentHeight: currentTideHeight,
              peaks: tideStatPeaks,
              sunrise,
              sunset,
            });
          }

          // 4. TEMPERATURE (fourth in order)
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

          const avgWaterTemp = average(waterTemps);
          const avgAirTemp = average(airTemps);

          const waterTemp =
            avgWaterTemp != null ? Math.round(avgWaterTemp) : undefined;
          const airTemp =
            avgAirTemp != null ? Math.round(avgAirTemp) : undefined;

          // Calculate most occurring weather code for the day
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
            s.push({
              type: "temperature",
              waterTemp,
              airTemp,
              waterTempPercent:
                waterTemp != null
                  ? clampIntensity(waterTemp, TEMP_CAP)
                  : undefined,
              airTempPercent:
                airTemp != null ? clampIntensity(airTemp, TEMP_CAP) : undefined,
              weatherCode: dominantWeatherCode,
            });
          }

          // Build features from beach flags when available
          if (beach) {
            const tags: {
              label: string;
              icon: React.ReactNode;
              color: string;
              rank?: number;
            }[] = [];
            // If FEATURE_COLUMNS/getFeatureDisplayName are exported, iterate them; else, fallback to known ones
            const keys: string[] =
              typeof FEATURE_COLUMNS !== "undefined" &&
              Array.isArray(FEATURE_COLUMNS)
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
            // Sort tags by rank (lower rank = higher priority)
            tags.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
            const topTags = tags.slice(0, 5);
            if (topTags.length > 0) {
              s.push({ type: "features", tags: topTags });
            }
          }
          setStats(s);
          return [beachId, s, renderData] as const;
        } catch (e) {
          console.error("Failed to load summary", e);
        }
      })
    );
    const statsMap: Record<
      string,
      { summary: SummaryStat[] | null; current: ForecastData | null }
    > = {};
    if (!entries) return null;
    if (!entries.some((e) => !e || !e[0] || !e[1])) {
      entries.forEach((e) => {
        if (e) {
          const val: {
            summary: SummaryStat[] | null;
            current: ForecastData | null;
          } = { summary: null, current: null };
          const id = e[0];
          const stat = e[1];
          val.summary = stat;
          if (e[2]) {
            const currentConditions = e[2];
            val.current = currentConditions;
          }
          statsMap[id] = val;
        }
      });
    }
    return statsMap;
  };

  useEffect(() => {
    const loadBeaches = async () => {
      statsLoadingRef.current = true;
      try {
        const statsMap = await loadStats(currentItems);
        if (!statsMap) return;
        currentItems.forEach((beach) => {
          const statsEntry = statsMap[beach.id];
          if (!statsEntry) {
            return;
          }
          const beachStats = statsEntry.summary;
          if (!beachStats) return;
          const surfStat = beachStats.find(
            (stat): stat is Extract<SummaryStat, { type: "surf" }> =>
              stat.type === "surf"
          );
          const windStat = beachStats.find(
            (stat): stat is Extract<SummaryStat, { type: "wind" }> =>
              stat.type === "wind"
          );
          const featuresStat = beachStats.find(
            (stat): stat is Extract<SummaryStat, { type: "features" }> =>
              stat.type === "features"
          );
          beach.conditions.rating = surfStat?.surf.intensity ?? 0;
          beach.conditions.surf = surfStat?.surf.height ?? "-";
          beach.conditions.windDir = windStat?.wind.direction ?? 0;
          beach.conditions.wind = windStat?.wind.speed
            ? String(windStat?.wind.speed)
            : "-";
          beach.features = featuresStat?.tags ?? [];

          const beachConditions = statsEntry.current;
          if (!beachConditions) return;
          beach.current = beachConditions;
        });
      } finally {
        statsLoadingRef.current = false;
      }
    };
    loadBeaches();
  }, [currentItems]);

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
      <div className="flex mb-4 ml-2 items-center justify-between gap-10 mx-2">
        {status === "locating" && (
          <div className="text-sm text-foreground/70">
            Finding your location…
          </div>
        )}
        {status === "denied" && (
          <div className="hidden @min-lg:flex text-sm text-foreground/70">
            Location denied. Showing unsorted beaches.
          </div>
        )}
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
        <PageOptions />
      </div>

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
        ) : currentItems.length > 0 ? (
          <section className="grid grid-cols-1 gap-3 @min-lg:grid-cols-2 mb-4">
            {currentItems.map((b) => (
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
