"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import GradientCircle from "../general/Stats/GradientCircle";
import Tag from "../general/Tag";
import WindStat from "../general/Stats/WindStat";
import SurfStat from "../general/Stats/SurfStat";

import { Sunrise, Sunset } from "lucide-react";
import {
  BEACH_FEATURE_ICONS,
  DEFAULT_FEATURE_ICON,
} from "@/lib/beachFeatureIcons";

import {
  fetchCurrentConditions,
  fetchBeachForecast,
  fetchBeachByIdLoose,
  fetchBeachDetails,
  fetchBeachTides,
  fetchCurrentTide,
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
      waterTempHigh?: number;
      waterTempLow?: number;
      airTempHigh?: number;
      airTempLow?: number;
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
        speed: number;
        loc?: string;
        gust?: number;
        intensity: number;
        direction?: number;
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
type TidePeak = {
  kind: "high" | "low";
  time: Date | null;
  level: number | null;
};

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

    // Look ahead to find all consecutive peaks with the same tide value
    let j = i + 1;
    const sameTidePeaks = [idx];

    while (j < potentialPeaks.length) {
      const nextIdx = potentialPeaks[j];
      const nextPeak = sorted[nextIdx];

      // If same tide value (within 0.1 ft tolerance), add to group
      if (Math.abs(curr.tide - nextPeak.tide) < 0.1) {
        sameTidePeaks.push(nextIdx);
        j++;
      } else {
        break;
      }
    }

    // If we found multiple peaks with the same tide value, only keep the middle one
    let selectedIdx = idx;
    if (sameTidePeaks.length > 1) {
      const middleIndex = Math.floor(sameTidePeaks.length / 2);
      selectedIdx = sameTidePeaks[middleIndex];
      i = j - 1; // Skip all the peaks we just processed
    }

    const selectedPoint = sorted[selectedIdx];
    const prev = selectedIdx > 0 ? sorted[selectedIdx - 1] : null;
    const next =
      selectedIdx < sorted.length - 1 ? sorted[selectedIdx + 1] : null;
    const isHigh =
      (!prev || selectedPoint.tide >= prev.tide) &&
      (!next || selectedPoint.tide >= next.tide);

    peaks.push({
      kind: isHigh ? "high" : "low",
      time: new Date(selectedPoint.x),
      level: Number(selectedPoint.tide.toFixed(1)),
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
        direction: 0,
      },
    },
    {
      type: "tide",
      currentHeight: undefined,
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
      waterTempHigh: undefined,
      waterTempLow: undefined,
      airTempHigh: undefined,
      airTempLow: undefined,
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
      rank?: number;
    }[]
  >([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!beachId) return;

        // Choose the time window: if a date is provided, use that local day; otherwise next 24 hours
        const now = new Date();
        let startWindow = now;
        let endWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        let tideStartWindow = now;
        let tideEndWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        if (date instanceof Date) {
          // Get midnight in Pacific timezone (DST-aware)
          const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Los_Angeles",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
          const parts = formatter.formatToParts(date);
          const year = parseInt(
            parts.find((p) => p.type === "year")?.value || "0"
          );
          const month =
            parseInt(parts.find((p) => p.type === "month")?.value || "1") - 1;
          const day = parseInt(
            parts.find((p) => p.type === "day")?.value || "1"
          );

          // Calculate UTC timestamp for Pacific midnight using offset at noon
          const noonUTC = Date.UTC(year, month, day, 12, 0, 0, 0);
          const noonDate = new Date(noonUTC);
          const noonFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Los_Angeles",
            hour: "2-digit",
            hour12: false,
          });
          const pacificNoonHour = parseInt(noonFormatter.format(noonDate));
          const offsetHours = pacificNoonHour - 12;

          const d = new Date(Date.UTC(year, month, day, -offsetHours, 0, 0, 0));
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

        // Parallelize all data fetches (we'll fetch daily conditions after we know the county)
        const [resolved, current, forecast, beach, tideRows, currentTide] =
          await Promise.all([
            fetchBeachByIdLoose(beachId),
            fetchCurrentConditions(beachId),
            fetchBeachForecast(beachId, startWindow, endWindow),
            fetchBeachDetails(beachId),
            fetchBeachTides(beachId, tideFetchStart, tideFetchEnd),
            fetchCurrentTide(beachId).catch(() => null),
          ]);
        if (cancelled) return;
        const resolvedId = resolved?.id ?? beachId;

        // Fetch daily conditions in parallel now that we have beach details
        const county = beach?.COUNTY;
        const basisDate =
          date instanceof Date ? new Date(date) : new Date(startWindow);
        const dailyConditionsPromise = county
          ? fetchDailyConditions(county, basisDate).catch(() => null)
          : Promise.resolve(null);
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
              direction: resolvedWindDirection,
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
          if (peak.time) {
            const peakTime = peak.time.getTime();
            return peakTime >= windowStartMs && peakTime <= windowEndMs;
          }
        });

        const tideStatPeaks = peaksInWindow.slice(0, 4);

        // fill with placeholders if less than 4 peaks
        if (tideStatPeaks.length < 4) {
          let peakHighEvens = true;
          if (tideStatPeaks[0] && tideStatPeaks[0].kind === "low") {
            peakHighEvens = false;
          }
          for (let i = 0; i < 4; i++) {
            const peakCheck = peakHighEvens ? i % 2 === 0 : i % 2 !== 0;
            const peakType = peakCheck ? "high" : "low";
            if (!tideStatPeaks[i]) {
              tideStatPeaks.push({ kind: peakType, time: null, level: null });
            }
          }
        }

        // Use current tide from county_tides_15min table (already fetched in parallel)
        let currentTideHeight: number | undefined;
        if (currentTide?.tideLevelFt != null) {
          currentTideHeight = Number(currentTide.tideLevelFt.toFixed(1));
          console.log(
            "✅ Using county tide data for current height:",
            currentTideHeight,
            "ft"
          );
        } else {
          console.warn(
            "⚠️ currentTide is null/undefined, falling back to forecast"
          );
          // Fallback to forecast data if county tide fetch fails
          currentTideHeight =
            base?.conditions.tideLevel != null
              ? Number(base.conditions.tideLevel.toFixed(1))
              : undefined;
          console.log(
            "📊 Using forecast data for current height:",
            currentTideHeight,
            "ft"
          );
        }

        // Use daily conditions (already fetched in parallel)
        let sunrise: string | undefined;
        let sunset: string | undefined;
        const cond = await dailyConditionsPromise;
        if (cond) {
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

        // Calculate high and low temperatures for the day
        const waterTempHigh =
          waterTemps.length > 0
            ? Math.round(Math.max(...waterTemps))
            : undefined;
        const waterTempLow =
          waterTemps.length > 0
            ? Math.round(Math.min(...waterTemps))
            : undefined;
        const airTempHigh =
          airTemps.length > 0 ? Math.round(Math.max(...airTemps)) : undefined;
        const airTempLow =
          airTemps.length > 0 ? Math.round(Math.min(...airTemps)) : undefined;

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

        if (waterTempHigh != null || airTempHigh != null) {
          s.push({
            type: "temperature",
            waterTempHigh,
            waterTempLow,
            airTempHigh,
            airTempLow,
            waterTempPercent:
              waterTempHigh != null
                ? clampIntensity(waterTempHigh, TEMP_CAP)
                : undefined,
            airTempPercent:
              airTempHigh != null
                ? clampIntensity(airTempHigh, TEMP_CAP)
                : undefined,
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
  const tempStat = stats.find(
    (stat): stat is Extract<SummaryStat, { type: "temperature" }> =>
      stat.type === "temperature"
  );

  // Generate dynamic overview text based on conditions
  const getOverviewText = () => {
    const surfHeight = surfStat?.surf?.height || "N/A";
    const windSpeed = windStat?.wind?.speed;
    const airTempHigh = tempStat?.airTempHigh;
    const airTempLow = tempStat?.airTempLow;

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

    // Add temperature information
    if (airTempHigh != null && airTempLow != null) {
      sentence += ` Temperatures will range from ${airTempLow}°F to ${airTempHigh}°F.`;
    } else if (airTempHigh != null) {
      sentence += ` Expect highs around ${airTempHigh}°F.`;
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
    <ul className="grid grid-cols-2 @min-md:grid-cols-3 @min-4xl:grid-cols-6 gap-3">
      {/* Overview card */}
      <li
        className={cn(
          "highlight-card shadow-even flex flex-col gap-3 xl:gap-0 overflow-hidden col-span-2 min-h-35",
          getOverviewText().includes("- ft") && "animate-pulse"
        )}
      >
        <div className="flex items-top justify-between flex-shrink-0">
          <h3 className="highlight-title bg-highlight-5 h-1/2 flex items-center px-2 py-1 rounded-xl">
            SUMMARY
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
        <div className="flex-1 flex items-center gap-1 mt-2 justify-center min-h-0">
          <p className="text-center text-sm leading-snug">
            {getOverviewText()}
          </p>
        </div>
      </li>
      {stats.map((stat) => {
        let content;
        switch (stat.type) {
          case "temperature":
            content = (
              <div className="flex gap-6 items-center justify-center w-full px-1">
                {stat.waterTempHigh != null && (
                  <div className="flex flex-col gap-1 items-center min-w-0">
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                      WATER
                    </span>
                    <GradientCircle
                      condition="water"
                      percent={stat.waterTempPercent}
                      size={55}
                      strokeWidth={3}
                      content={
                        <div className="flex flex-col items-center leading-tight">
                          <span className="text-[0.9rem] font-semibold mt-1 flex items-start">
                            {stat.waterTempHigh}
                            <span className="text-[0.6rem] mt-0.5">°F</span>
                          </span>
                          {stat.waterTempLow != null && (
                            <span className="text-[0.7rem] text-muted-foreground">
                              {stat.waterTempLow}
                            </span>
                          )}
                        </div>
                      }
                    />
                  </div>
                )}
                {stat.airTempHigh != null && (
                  <div className="flex flex-col gap-1 items-center min-w-0">
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                      AIR
                    </span>
                    <GradientCircle
                      condition="sun"
                      percent={stat.airTempPercent}
                      weatherCode={stat.weatherCode}
                      size={55}
                      strokeWidth={3}
                      content={
                        <div className="flex flex-col items-center leading-tight">
                          <span className="text-[0.9rem] font-semibold mt-1 flex items-start">
                            {stat.airTempHigh}
                            <span className="text-[0.6rem] mt-0.5">°F</span>
                          </span>
                          {stat.airTempLow != null && (
                            <span className="text-[0.7rem] text-muted-foreground">
                              {stat.airTempLow}
                            </span>
                          )}
                        </div>
                      }
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
                    {stat.currentHeight != null && (
                      <span className="text-xs ml-0.5">ft</span>
                    )}
                  </span>
                </div>
                <div className="touch-pan-y flex flex-col overflow-y-auto flex-1">
                  {stat.peaks.length > 0 ? (
                    stat.peaks.slice(0, 4).map((peak, i) => (
                      <div
                        key={`${peak.kind}-${
                          peak.time ? peak.time.getTime() : "undefined"
                        }-${i}`}
                        className="flex items-center justify-between flex-shrink-0 gap-1 @container"
                      >
                        <div className="flex gap-2">
                          <span className="text-sm font-medium hidden @min-[145px]:flex min-w-8.5">
                            {peak.kind === "high" ? "High" : "Low"}
                          </span>
                          <span className="font-medium text-xs @min-[125px]:text-sm @min-[130px]:text-sm @min-[145px]:hidden min-w-4">
                            {peak.kind === "high" ? "Hi" : "Lo"}
                          </span>
                          <span className="text-xs @min-[125px]:text-sm @min-[130px]:text-sm">
                            {peak.time
                              ? `${peak.time.toLocaleTimeString([], {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}`
                              : "--:--"}
                          </span>
                        </div>
                        <span className="text-muted-foreground flex items-baseline font-semibold text-xs @min-[125px]:text-sm @min-[130px]:text-sm">
                          {peak.level != null ? peak.level : "--"}
                          {peak.level != null && (
                            <span className="ml-0.5 text-[10px] font-light">
                              ft
                            </span>
                          )}
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
                  ? "col-span-2 @min-md:col-span-3 @min-4xl:col-span-6"
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
