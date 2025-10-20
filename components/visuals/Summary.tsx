"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import GradientCircle from "../general/Stats/GradientCircle";
import Tag from "../general/Tag";
import WindStat from "../general/Stats/WindStat";
import SurfStat from "../general/Stats/SurfStat";

import {
  Dog,
  CircleParking,
  Toilet,
  LifeBuoy,
  Fish,
  Shell,
  BadgeCheck,
  Waves,
  Droplets,
  Sun,
  Wind,
  Lightbulb,
  Tent,
  Flame,
  Ship,
  Sunrise,
  Sunset,
} from "lucide-react";

import {
  fetchCurrentConditions,
  fetchBeachForecast,
  fetchBeachByIdLoose,
  fetchBeachDetails,
  fetchBeachTides,
  fetchDailyConditions,
} from "@/lib/supabase";
import { useDateContext } from "@/components/context/DateContext";
// Optionally import the feature registry if exposed
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { FEATURE_COLUMNS } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getFeatureDisplayName } from "@/lib/supabase";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

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
      wind: { speed: number; loc?: string; gust?: number; intensity: number };
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

const computeTidePeaks = (
  points: TidePointValue[],
  isToday: boolean = false,
  windowStartMs?: number
): TidePeak[] => {
  if (!points || points.length < 2) return [];
  const sorted = [...points].sort((a, b) => a.x - b.x);

  // First pass: identify all potential peaks
  const potentialPeaks: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const prev = i > 0 ? sorted[i - 1] : null;
    const curr = sorted[i];
    const next = i < sorted.length - 1 ? sorted[i + 1] : null;

    // Special case: For today, don't mark the start edge (12 AM) as a peak
    // because there's no previous data (it was deleted)
    if (isToday && windowStartMs != null && curr.x === windowStartMs && !prev) {
      continue;
    }

    // Must have at least one neighbor
    if (!prev && !next) continue;

    const tide = curr.tide;

    // Check if it's a high tide (local maximum)
    const isHigh =
      (!prev || tide >= prev.tide) &&
      (!next || tide >= next.tide) &&
      ((prev && tide > prev.tide) || (next && tide > next.tide));

    // Check if it's a low tide (local minimum)
    const isLow =
      (!prev || tide <= prev.tide) &&
      (!next || tide <= next.tide) &&
      ((prev && tide < prev.tide) || (next && tide < next.tide));

    if (isHigh || isLow) {
      potentialPeaks.push(i);
    }
  }

  // Second pass: remove duplicate peaks (consecutive points with same tide value)
  const peaks: TidePeak[] = [];
  for (let i = 0; i < potentialPeaks.length; i++) {
    const idx = potentialPeaks[i];
    const curr = sorted[idx];

    // Check if next potential peak has the same tide value
    if (i + 1 < potentialPeaks.length) {
      const nextIdx = potentialPeaks[i + 1];
      const nextPeak = sorted[nextIdx];

      // If same tide value, only keep one (prefer the earlier one)
      if (Math.abs(curr.tide - nextPeak.tide) < 0.01) {
        const prev = idx > 0 ? sorted[idx - 1] : null;
        const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;
        const isHigh =
          (!prev || curr.tide >= prev.tide) &&
          (!next || curr.tide >= next.tide);

        peaks.push({
          kind: isHigh ? "high" : "low",
          time: new Date(curr.x),
          level: Number(curr.tide.toFixed(1)),
        });
        i++; // Skip the next one
        continue;
      }
    }

    // Determine if it's a high or low tide
    const prev = idx > 0 ? sorted[idx - 1] : null;
    const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;
    const isHigh =
      (!prev || curr.tide >= prev.tide) && (!next || curr.tide >= next.tide);

    peaks.push({
      kind: isHigh ? "high" : "low",
      time: new Date(curr.x),
      level: Number(curr.tide.toFixed(1)),
    });
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

const Summary = ({ beachId, date }: { beachId?: string; date?: Date }) => {
  // Visible immediately while data loads
  const placeholderTime = new Date();
  placeholderTime.setHours(0, 0, 0, 0);
  const [stats, setStats] = useState<SummaryStat[]>([
    {
      type: "surf",
      surf: {
        height: "-",
        period: 0,
        intensity: 0,
      },
    },
    {
      type: "wind",
      wind: {
        speed: 0,
        gust: 0,
        loc: "-",
        intensity: 0,
      },
    },
    {
      type: "tide",
      currentHeight: 0,
      peaks: [
        // { kind: "high", time: placeholderTime, level: 0 },
        // { kind: "low", time: placeholderTime, level: 0 },
        // { kind: "high", time: placeholderTime, level: 0 },
        // { kind: "low", time: placeholderTime, level: 0 },
      ],
      sunrise: "--:-- AM",
      sunset: "--:-- PM",
    },
    {
      type: "temperature",
      waterTemp: 0,
      airTemp: 0,
      waterTempPercent: undefined,
      airTempPercent: undefined,
      weatherCode: undefined,
    },
    { type: "features", tags: [] },
  ]);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const featuresContainerRef = useRef<HTMLDivElement | null>(null);
  const [featuresOverflowing, setFeaturesOverflowing] = useState(false);
  const { surfRange } = useDateContext();
  const [tags, setTags] = useState<
    {
      label: string;
      icon: React.ReactNode;
      color: string;
    }[]
  >([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!beachId) return;

        // Resolve the param to a concrete id (supports id/uuid/slug)
        const resolved = await fetchBeachByIdLoose(beachId);
        const resolvedId = resolved?.id ?? beachId;

        // Choose the time window: if a date is provided, use that local day; otherwise next 24 hours
        const now = new Date();
        let startWindow = now;
        let endWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        let tideStartWindow = now;
        let tideEndWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        if (date instanceof Date) {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          startWindow = d;
          endWindow = new Date(d.getTime() + 24 * 60 * 60 * 1000);
          tideStartWindow = startWindow;
          tideEndWindow = endWindow;
        }

        // Fetch extra tide data (6 hours before and after) to detect peaks at window boundaries
        const BUFFER_HOURS = 6;
        const tideFetchStart = new Date(
          tideStartWindow.getTime() - BUFFER_HOURS * 60 * 60 * 1000
        );
        const tideFetchEnd = new Date(
          tideEndWindow.getTime() + BUFFER_HOURS * 60 * 60 * 1000
        );

        const [current, forecast, beach, tideRows] = await Promise.all([
          fetchCurrentConditions(resolvedId),
          fetchBeachForecast(resolvedId, startWindow, endWindow),
          fetchBeachDetails(resolvedId),
          fetchBeachTides(resolvedId, tideFetchStart, tideFetchEnd),
        ]);
        if (cancelled) return;
        console.log("OBSERVE", current, forecast, beach, tideRows);
        const first = forecast[0];
        // If a specific date is selected, use that day's forecast; otherwise prefer current conditions
        const base = date ? first : current ?? first;
        console.log(
          "overview data compare HERE",
          current,
          forecast,
          beach,
          tideRows,
          base
        );
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
        if (date && surfRange) {
          // Use the exact range from DatePicker
          surfHeightLabel = surfRange;
        } else if (hasRange) {
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
          console.log(
            "OVERVIEW DATA SURF",
            surfHeightLabel,
            surfPeriod,
            max,
            surfRange
          );
          s.push({
            type: "surf",
            surf: {
              height: surfHeightLabel ?? "-",
              period: surfPeriod,
              intensity: surfIntensity,
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

        const avgWindSpeed = average(windSpeeds);
        const avgWindGust = average(windGusts);

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

        // Check if this is today
        const today = new Date();
        const isToday =
          tideStartWindow.getFullYear() === today.getFullYear() &&
          tideStartWindow.getMonth() === today.getMonth() &&
          tideStartWindow.getDate() === today.getDate();

        // Filter peaks to only include those within the actual window (not the buffer)
        const windowStartMs = tideStartWindow.getTime();
        const windowEndMs = tideEndWindow.getTime();

        let tidePeaks = computeTidePeaks(tideSeries, isToday, windowStartMs);
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
          tidePeaks = computeTidePeaks(fallbackSeries, isToday, windowStartMs);
        }
        const peaksInWindow = tidePeaks.filter((peak) => {
          const peakTime = peak.time.getTime();
          return peakTime >= windowStartMs && peakTime <= windowEndMs;
        });

        const tideStatPeaks = peaksInWindow.slice(0, 4);
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
              if (!Number.isFinite(h) || !Number.isFinite(m)) return undefined;

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
        const airTemp = avgAirTemp != null ? Math.round(avgAirTemp) : undefined;

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
            RSTRCTNS: { icon: <BadgeCheck size={16} />, color: "bg-slate-200" },
            DSABLDACSS: {
              icon: <BadgeCheck size={16} />,
              color: "bg-indigo-100",
            },

            // Facilities
            RESTROOMS: { icon: <Toilet size={16} />, color: "bg-yellow-100" },
            VISTOR_CTR: { icon: <BadgeCheck size={16} />, color: "bg-sky-100" },
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
            UPLAND_BCH: { icon: <Shell size={16} />, color: "bg-emerald-100" },
            STRM_CRDOR: { icon: <Droplets size={16} />, color: "bg-cyan-100" },
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
            BOARDWLK: { icon: <BadgeCheck size={16} />, color: "bg-slate-100" },

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
            BIKE_PATH: { icon: <BadgeCheck size={16} />, color: "bg-teal-100" },
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
            if (!cancelled) {
              setTags(tags);
            }
          }
        }

        if (!cancelled) {
          setStats(s);
        }
      } catch (e) {
        console.error("Failed to load summary", e);
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [beachId, date, surfRange]);

  useEffect(() => {
    const el = featuresContainerRef.current;

    if (!el) {
      setFeaturesOverflowing(false);

      return;
    }

    const measure = () => {
      const target = featuresContainerRef.current;

      if (!target) return;

      const previousWrap = target.style.flexWrap;

      const previousOverflow = target.style.overflow;

      target.style.flexWrap = "nowrap";

      target.style.overflow = "hidden";

      const isOverflowing = target.scrollWidth > target.clientWidth + 1;

      target.style.flexWrap = previousWrap;

      target.style.overflow = previousOverflow;

      setFeaturesOverflowing(isOverflowing);

      if (!isOverflowing && showAllFeatures) {
        setShowAllFeatures(false);
      }
    };

    const scheduleMeasure = () => {
      requestAnimationFrame(measure);
    };

    scheduleMeasure();

    let observer: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => scheduleMeasure());

      observer.observe(el);
    }

    const resizeHandler = () => scheduleMeasure();

    if (typeof window !== "undefined") {
      window.addEventListener("resize", resizeHandler);
    }

    return () => {
      observer?.disconnect();

      if (typeof window !== "undefined") {
        window.removeEventListener("resize", resizeHandler);
      }
    };
  }, [stats, showAllFeatures]);

  const surfStat = stats.find(
    (stat): stat is Extract<SummaryStat, { type: "surf" }> =>
      stat.type === "surf"
  );
  const windStat = stats.find(
    (stat): stat is Extract<SummaryStat, { type: "wind" }> =>
      stat.type === "wind"
  );
  const tideStat = stats.find(
    (stat): stat is Extract<SummaryStat, { type: "tide" }> =>
      stat.type === "tide"
  );

  // Generate dynamic overview text based on conditions
  const getOverviewText = () => {
    const surfHeight = surfStat?.surf?.height || "N/A";
    const windSpeed = windStat?.wind?.speed;

    // Determine surf condition
    let surfCondition = "calm";
    if (surfStat?.surf?.intensity) {
      const intensity = surfStat.surf.intensity;
      if (intensity >= 75) surfCondition = "huge";
      else if (intensity >= 50) surfCondition = "pumping";
      else if (intensity >= 25) surfCondition = "moderate";
      else surfCondition = "calm";
    }

    // Determine wind condition
    let windCondition = "light";
    let windAction = "blowing";
    if (windSpeed != null) {
      if (windSpeed >= 25) {
        windCondition = "strong";
        windAction = "whipping";
      } else if (windSpeed >= 15) {
        windCondition = "moderate";
        windAction = "blowing";
      } else if (windSpeed >= 8) {
        windCondition = "gentle";
        windAction = "coming in";
      } else {
        windCondition = "light";
        windAction = "blowing";
      }
    }

    // Build sentence based on conditions
    let sentence = `The waves are ${surfHeight} ft and ${surfCondition}.`;

    if (windSpeed != null) {
      if (windSpeed >= 15) {
        sentence += ` Watch out for ${windCondition} winds ${windAction} at ${windSpeed} mph.`;
      } else {
        sentence += ` Winds are ${windCondition}, ${windAction} at ${windSpeed} mph.`;
      }
    } else {
      sentence += ` Wind conditions unavailable.`;
    }

    return sentence;
  };

  const gapPx = 12;
  const moreButtonReservePx = 60;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // widths for each tag (stable numbers used for layout decisions)
  const [tagWidths, setTagWidths] = useState<number[]>(() =>
    Array(tags.length).fill(0)
  );

  const [visibleCount, setVisibleCount] = useState(() => tags.length);

  // Create measurement nodes once (keys stable)
  const measurementNodes = React.useMemo(
    () =>
      tags.map((t, i) => (
        <div
          key={t.label ?? i}
          data-measure-index={i}
          style={{ display: "inline-block" }}
        >
          <Tag data={t} />
        </div>
      )),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tags.map((t) => t.label ?? Math.random()).join("|")] // keep keyed but stable if tags input stable
  );

  // Synchronously measure tag widths in the off-screen measurement container
  const measureTagWidths = () => {
    const measure = measureRef.current;
    if (!measure) return;
    const children = Array.from(measure.children) as HTMLElement[];
    const widths = children.map((el) => {
      const w = Math.ceil(el.getBoundingClientRect().width);
      return w;
    });
    if (widths.length === tags.length) {
      // Only update when changed to avoid extra re-renders
      let changed = false;
      if (tagWidths.length !== widths.length) changed = true;
      else {
        for (let i = 0; i < widths.length; i++) {
          if (tagWidths[i] !== widths[i]) {
            changed = true;
            break;
          }
        }
      }
      if (changed) setTagWidths(widths);
    }
  };

  // Compute visibleCount from container width and stable tagWidths
  const computeVisibleCount = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!tagWidths.length) return;

    const available = Math.max(0, container.clientWidth - moreButtonReservePx);
    let total = 0;
    let count = 0;

    for (let i = 0; i < tagWidths.length; i++) {
      const w = tagWidths[i];
      const gapAdd = count > 0 ? gapPx : 0;
      // require the full width to be available before counting the tag
      if (total + gapAdd + w <= available) {
        total += gapAdd + w;
        count++;
      } else {
        break;
      }
    }
    // update only if different (prevents oscillation)
    setVisibleCount((prev) => (prev !== count ? count : prev));
  };

  // Schedule compute with RAF (debounce)
  const scheduleCompute = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      computeVisibleCount();
      rafRef.current = null;
    });
  };

  // initial measurement after mount/update of measurement nodes
  React.useLayoutEffect(() => {
    // measure nodes synchronously once they are rendered into measureRef
    measureTagWidths();
    // compute visible count once widths are known
    scheduleCompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [/* run when measurement nodes (tags) change */ tags.length]);

  // Recompute when tagWidths change or container size changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // observe container resize
    const ro = new ResizeObserver(() => {
      scheduleCompute();
    });
    ro.observe(container);

    // also recompute if tagWidths update
    scheduleCompute();

    return () => {
      ro.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [tagWidths, gapPx, moreButtonReservePx]);

  // If DOM fonts or images load might affect widths, also observe the measurement container for mutations
  useEffect(
    () => {
      const measure = measureRef.current;
      if (!measure) return;
      const mo = new MutationObserver(() => {
        measureTagWidths();
        scheduleCompute();
      });
      mo.observe(measure, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      return () => mo.disconnect();
    },
    [
      /* tags */
    ]
  );

  // Build visible/hidden slices
  const visibleItems = tags.slice(0, visibleCount);
  const hiddenItems = tags.slice(visibleCount);

  return (
    <ul className="grid grid-cols-2 @min-2xl:grid-cols-3 @min-4xl:grid-cols-6 gap-3">
      {/* Overview card */}
      <li
        className={cn(
          "highlight-card shadow-even flex flex-col gap-3 xl:gap-0 overflow-hidden col-span-2",
          getOverviewText().includes("- ft") && "animate-pulse"
        )}
      >
        <div className="flex items-top justify-between">
          <h3 className="highlight-title bg-highlight-5 h-1/2 flex items-center px-2 py-1 rounded-xl">
            OVERVIEW
          </h3>
          <div className="py-1 px-2 rounded-md bg-highlight-6 grid grid-cols-[80px_1fr] grid-rows-2 space-y-0.5 items-center text-xs text-muted-foreground uppercase tracking-wide leading-tight">
            <span className="flex gap-2 items-center">
              <Sunrise
                fill="#ff9f45ff"
                className="stroke-muted-foreground w-4 h-4"
              />
              <span>Sunrise</span>
            </span>
            <span className="ml-1 text-foreground normal-case font-medium">
              {tideStat?.sunrise ?? "--"}
            </span>
            <span className="flex gap-2 items-center">
              <Sunset
                fill="#ff9f45ff"
                className="stroke-muted-foreground w-4 h-4"
              />
              <span className="-mb-0.5">Sunset</span>
            </span>
            <span className="ml-1 text-foreground normal-case font-medium">
              {tideStat?.sunset ?? "--"}
            </span>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-1 mt-2 justify-center">
          <p className="text-center text-base">{getOverviewText()}</p>
        </div>
      </li>
      {stats.map((stat) => {
        let content;
        switch (stat.type) {
          case "temperature":
            content = (
              <div className="flex gap-6 items-center justify-center w-full px-1">
                {stat.waterTemp != null && (
                  <div className="flex flex-col gap-1 items-center min-w-0">
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                      WATER
                    </span>
                    <GradientCircle
                      condition="water"
                      data={stat.waterTemp}
                      percent={stat.waterTempPercent}
                      size={58}
                      strokeWidth={4}
                    />
                  </div>
                )}
                {stat.airTemp != null && (
                  <div className="flex flex-col gap-1 items-center min-w-0">
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                      AIR
                    </span>
                    <GradientCircle
                      condition="sun"
                      data={stat.airTemp}
                      percent={stat.airTempPercent}
                      weatherCode={stat.weatherCode}
                      size={58}
                      strokeWidth={4}
                    />
                  </div>
                )}
              </div>
            );
            break;
          case "tide":
            content = (
              <div className="touch-pan-y flex flex-col w-full gap-2 h-full overflow-hidden">
                <div className="flex items-baseline justify-between text-sm flex-shrink-0">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    Current
                  </span>
                  <span className="text-lg font-semibold">
                    {stat.currentHeight != null ? stat.currentHeight : "--"}
                    <span className="text-xs ml-0.5">ft</span>
                  </span>
                </div>
                <div className="touch-pan-y flex flex-col overflow-y-auto flex-1">
                  {stat.peaks.length > 0 ? (
                    stat.peaks.slice(0, 4).map((peak) => (
                      <div
                        key={`${peak.kind}-${peak.time.getTime()}`}
                        className="flex items-center justify-between flex-shrink-0 gap-1 @container"
                      >
                        <span className="text-sm font-medium hidden @min-[145px]:flex">
                          {peak.kind === "high" ? "High" : "Low"}
                        </span>
                        <span className="font-medium text-xs @min-[125px]:text-sm @min-[130px]:text-sm @min-[145px]:hidden">
                          {peak.kind === "high" ? "Hi" : "Lo"}
                        </span>
                        <span className="text-muted-foreground text-xs @min-[125px]:text-sm @min-[130px]:text-sm text-right flex justify-between min-w-21 @min-[125px]:min-w-24 @min-[130px]:min-w-25">
                          <span className="">{`${peak.time.toLocaleTimeString(
                            [],
                            {
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}`}</span>
                          <span className="font-semibold">
                            {peak.level}
                            <span className="ml-0.5 text-[10px] font-light">
                              ft
                            </span>
                          </span>
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground text-center h-16 flex items-center">
                      Tide peaks unavailable
                    </span>
                  )}
                </div>
              </div>
            );
            break;
          case "wind":
            content = stat.wind && <WindStat data={stat.wind} />;
            break;
          case "surf":
            content = stat.surf && <SurfStat data={stat.surf} />;
            break;
          case "features":
            content =
              stat.tags &&
              stat.tags.map((tag) => <Tag key={tag.label} data={tag} />);
            break;
        }
        if (content) {
          return (
            <li
              key={stat.type}
              className={cn(
                "highlight-card shadow-even flex flex-col overflow-hidden",
                stat.type === "surf" &&
                  stat.surf.height === "-" &&
                  "animate-pulse",
                stat.type === "wind" &&
                  stat.wind.loc === "-" &&
                  "animate-pulse",
                stat.type === "tide" &&
                  stat.sunrise?.includes("--:--") &&
                  "animate-pulse",
                stat.type === "temperature" &&
                  !stat.airTempPercent &&
                  "animate-pulse",
                stat.type === "features" &&
                  stat.tags.length === 0 &&
                  "animate-pulse",
                stat.type === "features"
                  ? "col-span-2 @min-xl:col-span-3 @min-4xl:col-span-6"
                  : "min-h-35"
              )}
            >
              <div className="flex items-start justify-between">
                <h3 className="highlight-title mt-0.5 bg-highlight-5 px-2 py-1 rounded-xl">
                  {stat.type.toUpperCase()}
                </h3>
                {/* {stat.type === "features" && featuresOverflowing ? (
                  <button
                    className="text-[11px] px-2 py-0.5 rounded border border-border bg-highlight-5 hover:bg-highlight-4"
                    onClick={() => setShowAllFeatures((v) => !v)}
                  >
                    {showAllFeatures ? "Collapse" : "Show all"}
                  </button>
                ) : null} */}
              </div>
              {stat.type === "features" ? (
                <div>
                  {/* Visible container */}
                  <div
                    ref={containerRef}
                    className="flex items-center gap-2 overflow-hidden mt-2 p-1 min-h-10"
                    style={{ gap: `${gapPx}px` }}
                  >
                    {visibleItems.map((tag) => (
                      <Tag key={tag.label} data={tag} />
                    ))}

                    {hiddenItems.length > 0 ? (
                      <Popover>
                        <PopoverTrigger className="more-button shrink-0 px-2 py-1 rounded-full bg-highlight-5 hover:bg-highlight-3 border border-border text-[14px] shadow-sm">
                          +{hiddenItems.length}
                        </PopoverTrigger>
                        <PopoverContent className="w-80 touch-pan-y">
                          {hiddenItems.map((tag) => (
                            <Tag className="m-1" key={tag.label} data={tag} />
                          ))}
                        </PopoverContent>
                      </Popover>
                    ) : null}
                  </div>

                  {/* off-screen measurement area (clones of every tag) */}
                  <div
                    ref={measureRef}
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: -9999,
                      top: 0,
                      visibility: "hidden",
                      whiteSpace: "nowrap",
                      display: "inline-block",
                      pointerEvents: "none",
                    }}
                  >
                    {measurementNodes}
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "flex-1 flex items-center gap-1 mt-1",
                    "justify-center"
                  )}
                >
                  {content}
                </div>
              )}
            </li>
          );
        }
      })}
    </ul>
  );
};

export default Summary;
