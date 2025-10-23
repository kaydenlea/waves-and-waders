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
import {
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  CircleParking,
  Dog,
  Droplets,
  Fish,
  Flame,
  LifeBuoy,
  Lightbulb,
  SearchX,
  Shell,
  Ship,
  Sun,
  Tent,
  Toilet,
  Waves,
  Wind,
} from "lucide-react";
import { useDateContext } from "../context/DateContext";
import { Spinner } from "../ui/spinner";
import { AnimatePresence, motion } from "motion/react";

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
      tags: { label: string; icon: React.ReactNode; color: string }[];
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
  const { filters } = useMapFilters();
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
  const [apiBeaches, setApiBeaches] = useState<ApiBeach[] | null>(null);
  const [status, setStatus] = useState<
    "idle" | "locating" | "granted" | "denied" | "unavailable"
  >("idle");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const { surfRange } = useDateContext();
  const [stats, setStats] = useState<SummaryStat[]>([]);
  const dataLoaded = useRef<boolean>(false);

  // Load richer beach data
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/beaches");
        const json = await res.json();
        if (!cancelled && json?.success) setApiBeaches(json.data as ApiBeach[]);
      } catch {}
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const totalPages = Math.ceil(sorted.length / perPage);
  const [currentItems, setCurrentItems] = useState<UIBeach[]>([]);
  // const currentItems = sorted.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    setCurrentItems(sorted.slice((page - 1) * perPage, page * perPage));
  }, [perPage, sorted, page]);

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
            // Centralized icon/color map (safe icons known to exist in lucide-react)
            const iconMap: Record<
              string,
              { icon: React.ReactNode; color: string }
            > = {
              // Access & Fees
              O_PUBLIC: {
                icon: <BadgeCheck size={16} />,
                color: "bg-emerald-100",
              },
              FEE: { icon: <BadgeCheck size={16} />, color: "bg-amber-100" },
              PARKING: {
                icon: <CircleParking size={16} />,
                color: "bg-green-100",
              },
              RSTRCTNS: {
                icon: <BadgeCheck size={16} />,
                color: "bg-slate-200",
              },
              DSABLDACSS: {
                icon: <BadgeCheck size={16} />,
                color: "bg-indigo-100",
              },

              // Facilities
              RESTROOMS: { icon: <Toilet size={16} />, color: "bg-yellow-100" },
              VISTOR_CTR: {
                icon: <BadgeCheck size={16} />,
                color: "bg-sky-100",
              },
              DOG_FRIEND: { icon: <Dog size={16} />, color: "bg-pink-100" },
              EZ4STROLLE: {
                icon: <BadgeCheck size={16} />,
                color: "bg-violet-100",
              },
              LIFEGUARD: { icon: <LifeBuoy size={16} />, color: "bg-red-100" },
              SHOWERS: { icon: <Droplets size={16} />, color: "bg-cyan-100" },
              FOOD: { icon: <BadgeCheck size={16} />, color: "bg-orange-100" },
              DRINKWTR: { icon: <Droplets size={16} />, color: "bg-blue-100" },
              PCNC_AREA: { icon: <Sun size={16} />, color: "bg-amber-100" },
              FIREPITS: { icon: <Flame size={16} />, color: "bg-rose-100" },
              CAMPGROUND: { icon: <Tent size={16} />, color: "bg-lime-100" },
              RV_CMP: { icon: <BadgeCheck size={16} />, color: "bg-lime-100" },
              BT_FACILIT: { icon: <Ship size={16} />, color: "bg-teal-100" },
              LIGHTHOUSE: {
                icon: <Lightbulb size={16} />,
                color: "bg-purple-100",
              },
              PIER: { icon: <Ship size={16} />, color: "bg-slate-100" },
              HAND_LAUNCH: { icon: <Ship size={16} />, color: "bg-teal-100" },

              // Beach Types
              SNDY_BEACH: { icon: <Shell size={16} />, color: "bg-orange-100" },
              DUNES: { icon: <Shell size={16} />, color: "bg-amber-100" },
              RKY_SHORE: { icon: <Shell size={16} />, color: "bg-slate-200" },
              UPLAND_BCH: {
                icon: <Shell size={16} />,
                color: "bg-emerald-100",
              },
              STRM_CRDOR: {
                icon: <Droplets size={16} />,
                color: "bg-cyan-100",
              },
              WETLAND: { icon: <Droplets size={16} />, color: "bg-green-100" },
              BLUFF: { icon: <BadgeCheck size={16} />, color: "bg-lime-100" },
              BAY_LGN_LK: { icon: <Droplets size={16} />, color: "bg-sky-100" },
              URBN_WFRNT: {
                icon: <BadgeCheck size={16} />,
                color: "bg-gray-200",
              },
              STRS_BEACH: {
                icon: <BadgeCheck size={16} />,
                color: "bg-slate-100",
              },
              PTH_BEACH: {
                icon: <BadgeCheck size={16} />,
                color: "bg-slate-100",
              },
              BOARDWLK: {
                icon: <BadgeCheck size={16} />,
                color: "bg-slate-100",
              },

              // Trails & Paths
              BLFTP_TRLS: {
                icon: <BadgeCheck size={16} />,
                color: "bg-emerald-100",
              },
              BLFTP_PRK: {
                icon: <BadgeCheck size={16} />,
                color: "bg-emerald-100",
              },
              TRAIL_OR_P: {
                icon: <BadgeCheck size={16} />,
                color: "bg-emerald-100",
              },
              BIKE_PATH: {
                icon: <BadgeCheck size={16} />,
                color: "bg-teal-100",
              },
              EQUEST_TRL: {
                icon: <BadgeCheck size={16} />,
                color: "bg-amber-100",
              },
              WLDLFE_VWG: {
                icon: <BadgeCheck size={16} />,
                color: "bg-green-100",
              },

              // Activities
              SWIMMING: { icon: <Droplets size={16} />, color: "bg-cyan-100" },
              DIVING: { icon: <Droplets size={16} />, color: "bg-cyan-100" },
              SNORKLNG: { icon: <Droplets size={16} />, color: "bg-cyan-100" },
              TIDEPOOL: { icon: <Shell size={16} />, color: "bg-amber-100" },
              PLAYGROUND: { icon: <Sun size={16} />, color: "bg-yellow-100" },
              SPORT_FLDS: {
                icon: <BadgeCheck size={16} />,
                color: "bg-orange-100",
              },
              VOLLEYBALL: {
                icon: <BadgeCheck size={16} />,
                color: "bg-orange-100",
              },
              WNDSRF_KIT: { icon: <Wind size={16} />, color: "bg-sky-100" },
              KAYAKING: { icon: <Ship size={16} />, color: "bg-teal-100" },
              SURFING: { icon: <Waves size={16} />, color: "bg-blue-100" },
              FISHING: { icon: <Fish size={16} />, color: "bg-blue-100" },
              BOATING: { icon: <Ship size={16} />, color: "bg-teal-100" },
            };
            for (const key of keys) {
              const val = (beach as any)[key];
              if (val === true) {
                const label =
                  typeof getFeatureDisplayName === "function"
                    ? getFeatureDisplayName(key)
                    : key;
                const def = iconMap[key] ?? {
                  icon: <BadgeCheck size={16} />,
                  color: "bg-highlight-2",
                };
                tags.push({ label, icon: def.icon, color: def.color });
              }
            }
            if (tags.length > 0) {
              s.push({ type: "features", tags });
            }
          }
          setStats(s);
          return [beachId, s, current] as const;
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
      const statsMap = await loadStats(currentItems);
      if (!statsMap) return;
      currentItems.forEach((beach) => {
        const beachStats = statsMap[beach.id].summary;
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

        const beachConditions = statsMap[beach.id].current;
        if (!beachConditions) return;
        beach.current = beachConditions;
      });
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

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (value: number) => {
    setPerPage(value);
    setPage(1);
    setOpen(false);
  };

  const PageOptions = () => {
    return (
      <div className="flex items-center gap-2">
        <label
          htmlFor="perPage"
          className="text-sm text-muted-foreground font-medium select-none"
        >
          Per page:
        </label>

        <div ref={dropdownRef} className="relative">
          {/* Dropdown trigger */}
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="
                flex items-center justify-between gap-2
                rounded-full border border-border/20
                bg-highlight-3 px-4 py-1.5
                text-sm font-medium text-foreground
                shadow-inner
                hover:bg-background/60 dark:hover:bg-highlight-5/40
                transition-all duration-200
                focus:outline-none
              "
          >
            {perPage}
            {open ? (
              <ChevronUp
                size={16}
                className="text-muted-foreground transition-transform duration-200"
              />
            ) : (
              <ChevronDown
                size={16}
                className="text-muted-foreground transition-transform duration-200"
              />
            )}
          </button>

          {/* Dropdown menu */}
          <AnimatePresence>
            {open && (
              <motion.ul
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="
                    absolute right-0 mt-2 w-28
                    rounded-xl border border-border
                    bg-background
                    shadow-lg overflow-hidden
                    z-50
                  "
              >
                {[10, 20, 50].map((num) => (
                  <li
                    key={num}
                    onClick={() => handleSelect(num)}
                    className={`
                        px-4 py-2 text-sm cursor-pointer
                        transition-colors duration-150
                        ${
                          perPage === num
                            ? "bg-highlight-3 font-semibold"
                            : "hover:bg-highlight-5"
                        }
                      `}
                  >
                    {num}
                  </li>
                ))}
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
        currentItems.length > 0 ? (
          <section className="grid grid-cols-1 gap-3 @min-lg:grid-cols-2 mb-4">
            {currentItems.map((b) => (
              <BeachCard
                key={b.id}
                b={b}
                isFav={favoriteSet.has(String(b.id))}
              />
            ))}
          </section>
        ) : (
          <section className="text-center pt-10 flex flex-col justify-center items-center gap-3">
            <SearchX className="w-10 h-10" />
            <span className="text-lg">No beaches found...</span>
          </section>
        )
      ) : (
        <section className="text-center pt-10 flex flex-col justify-center items-center gap-3">
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
