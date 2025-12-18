"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn, getPacificDayRange } from "@/lib/utils";
import GradientCircle from "../general/Stats/GradientCircle";
import Tag from "../general/Tag";
import WindStat from "../general/Stats/WindStat";
import SurfStat from "../general/Stats/SurfStat";

import { Sunrise, Sunset } from "lucide-react";
import {
  BEACH_FEATURE_ICONS,
  DEFAULT_FEATURE_ICON,
} from "@/lib/beachFeatureIcons";

import { useDateContext } from "@/components/context/DateContext";
import {
  useBeachForecast,
  useCurrentConditions,
  useBeachTides,
  useDailyConditions,
  useBeachDetails,
} from "@/lib/hooks/useBeachData";
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

export const clampIntensity = (value: number, max: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(100, Math.round((value / max) * 100));
};

const SURF_HEIGHT_CAP = 12;
const WIND_SPEED_CAP = 40;
const TEMP_CAP = 100; // For temperature circles

const createInitialStats = (): SummaryStat[] => [
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
    peaks: [],
    sunrise: "-:-- AM",
    sunset: "-:-- PM",
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
];

import type { ForecastData } from "@/lib/supabase";

const Summary = ({
  beachId,
  date,
  forecastRows,
  forecastLoading,
}: {
  beachId?: string;
  date?: Date;
  forecastRows?: ForecastData[] | null;
  forecastLoading?: boolean;
}) => {
  const [stats, setStats] = useState<SummaryStat[] | null>(null);
  const statsRef = useRef<SummaryStat[] | null>(null);
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

  const targetDateValue = date instanceof Date ? date : undefined;

  const timeWindow = useMemo(() => {
    const { start, end } = getPacificDayRange(targetDateValue);
    const tideBuffer = 6 * 60 * 60 * 1000;
    return {
      dayStart: start,
      dayEnd: end,
      tideStart: new Date(start.getTime() - tideBuffer),
      tideEnd: new Date(end.getTime() + tideBuffer),
    };
  }, [targetDateValue]);

  const hasExternalForecast = Array.isArray(forecastRows);

  // TODO(overview-perf): When a shared daily `ForecastDataContext` is present (as on `/[beach]/overview`),
  // prefer reusing those rows here instead of starting an independent `useBeachForecast` query for the
  // same day range, so Summary stays in lockstep with Highlights and the overview charts.
  const {
    data: forecastFromQuery = [],
    isSuccess: forecastSuccessRaw,
    isError: forecastErrorRaw,
  } = useBeachForecast(
    beachId ?? null,
    timeWindow.dayStart,
    timeWindow.dayEnd,
    Boolean(beachId) && !hasExternalForecast
  );

  const forecast: ForecastData[] = hasExternalForecast
    ? forecastRows ?? []
    : (forecastFromQuery as ForecastData[]);

  const forecastSuccess =
    (hasExternalForecast && !forecastLoading && forecast.length > 0) ||
    (!hasExternalForecast && forecastSuccessRaw);

  const forecastError = !hasExternalForecast && forecastErrorRaw ? true : false;
  const { data: current } = useCurrentConditions(
    beachId ?? null,
    Boolean(beachId)
  );
  const {
    data: tides = [],
    isSuccess: tidesSuccess,
    isError: tidesError,
  } = useBeachTides(
    beachId ?? null,
    timeWindow.tideStart,
    timeWindow.tideEnd,
    Boolean(beachId)
  );
  const { data: beachDetails } = useBeachDetails(
    beachId ?? null,
    Boolean(beachId)
  );
  const county = beachDetails?.COUNTY ?? null;
  const {
    data: dailyConditions,
    isSuccess: dailySuccess,
    isError: dailyError,
  } = useDailyConditions(
    county,
    targetDateValue ?? timeWindow.dayStart,
    Boolean(county)
  );
  const forecastReady = forecastSuccess || forecastError;
  const tidesReady = tidesSuccess || tidesError;
  const dailyReady = county ? dailySuccess || dailyError : true;

  useEffect(() => {
    if (!beachId) {
      setStats(null);
      statsRef.current = null;
      setTags([]);
      return;
    }

    if (!forecastReady || !tidesReady || !dailyReady) {
      return;
    }

    const base = targetDateValue ? forecast[0] : current ?? forecast[0];
    if (!base) {
      return;
    }

    const nextStats: SummaryStat[] = [];

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
    if (targetDateValue && surfRange) {
      surfHeightLabel = surfRange;
    } else if (hasRange) {
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
      nextStats.push({
        type: "surf",
        surf: {
          height: surfHeightLabel ?? "-",
          period: surfPeriod,
          intensity: surfIntensity,
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

      nextStats.push({
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

    const tideSeries: TidePointValue[] = tides
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

    const today = new Date();
    const isToday =
      !targetDateValue &&
      timeWindow.dayStart.getFullYear() === today.getFullYear() &&
      timeWindow.dayStart.getMonth() === today.getMonth() &&
      timeWindow.dayStart.getDate() === today.getDate();

    const windowStartMs = timeWindow.dayStart.getTime();
    const windowEndMs = timeWindow.dayEnd.getTime();

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
        if (tideFt == null) {
          return;
        }
        const diff = Math.abs(new Date(row.timestamp).getTime() - nowMs);
        if (diff < bestDiff) {
          bestDiff = diff;
          currentTideHeight = Number(tideFt.toFixed(1));
        }
      });
    }
    if (
      currentTideHeight == null &&
      base.conditions.tideLevel != null &&
      Number.isFinite(base.conditions.tideLevel)
    ) {
      currentTideHeight = Number(base.conditions.tideLevel.toFixed(1));
    }

    let sunrise: string | undefined;
    let sunset: string | undefined;
    if (dailyConditions) {
      const dayForFormat = dailyConditions?.date
        ? new Date(`${dailyConditions.date}T00:00:00`)
        : new Date(targetDateValue ?? timeWindow.dayStart);
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
      const resolvedSunrise = formatClock(dailyConditions?.sunrise);
      const resolvedSunset = formatClock(dailyConditions?.sunset);
      sunrise = resolvedSunrise ?? dailyConditions?.sunrise ?? undefined;
      sunset = resolvedSunset ?? dailyConditions?.sunset ?? undefined;
    }

    if (
      currentTideHeight != null ||
      tideStatPeaks.length > 0 ||
      sunrise ||
      sunset
    ) {
      nextStats.push({
        type: "tide",
        currentHeight: currentTideHeight,
        peaks: tideStatPeaks,
        sunrise,
        sunset,
      });
    }

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

    const waterTempHigh =
      waterTemps.length > 0 ? Math.round(Math.max(...waterTemps)) : undefined;
    const waterTempLow =
      waterTemps.length > 0 ? Math.round(Math.min(...waterTemps)) : undefined;
    const airTempHigh =
      airTemps.length > 0 ? Math.round(Math.max(...airTemps)) : undefined;
    const airTempLow =
      airTemps.length > 0 ? Math.round(Math.min(...airTemps)) : undefined;

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
      nextStats.push({
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

    const featureTags: {
      label: string;
      icon: React.ReactNode;
      color: string;
      rank?: number;
    }[] = [];
    if (beachDetails) {
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
        const val = (beachDetails as any)[key];
        if (val === true) {
          const label =
            typeof getFeatureDisplayName === "function"
              ? getFeatureDisplayName(key)
              : key;
          const def = BEACH_FEATURE_ICONS[key] ?? DEFAULT_FEATURE_ICON;
          featureTags.push({
            label,
            icon: def.icon,
            color: def.color,
            rank: def.rank,
          });
        }
      }
      featureTags.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    }
    const topTags = featureTags.slice(0, 5);
    setTags(topTags);
    nextStats.push({ type: "features", tags: topTags });

    if (nextStats.length > 0) {
      statsRef.current = nextStats;
      setStats(nextStats);
    }
  }, [
    beachId,
    targetDateValue,
    surfRange,
    forecast,
    current,
    tides,
    dailyConditions,
    beachDetails,
    timeWindow.dayStart.getTime(),
    timeWindow.dayEnd.getTime(),
    forecastReady,
    tidesReady,
    dailyReady,
  ]);

  const displayStats = stats ?? statsRef.current;
  const [overviewText, setOverviewText] = useState<string | null>(null);
  const overviewTextLockedRef = useRef(false);

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
  }, [displayStats, showAllFeatures]);

  const statsForRender = displayStats ?? createInitialStats();
  const isLoading = !forecastReady || !tidesReady || !dailyReady;
  const overviewStatsReady = !isLoading && displayStats != null;

  const surfStat = statsForRender.find(
    (stat): stat is Extract<SummaryStat, { type: "surf" }> =>
      stat.type === "surf"
  );
  const windStat = statsForRender.find(
    (stat): stat is Extract<SummaryStat, { type: "wind" }> =>
      stat.type === "wind"
  );
  const tideStat = statsForRender.find(
    (stat): stat is Extract<SummaryStat, { type: "tide" }> =>
      stat.type === "tide"
  );
  const tempStat = statsForRender.find(
    (stat): stat is Extract<SummaryStat, { type: "temperature" }> =>
      stat.type === "temperature"
  );

  const buildOverviewText = () => {
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

  useEffect(() => {
    overviewTextLockedRef.current = false;
    setOverviewText(null);
  }, [beachId, targetDateValue?.getTime()]);

  useEffect(() => {
    if (!overviewStatsReady) return;
    if (overviewTextLockedRef.current) return;

    setOverviewText(buildOverviewText());
    overviewTextLockedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overviewStatsReady, surfStat, windStat, tempStat]);

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
      <li className="highlight-card shadow-even flex flex-col gap-3 xl:gap-0 overflow-hidden col-span-2 min-h-35">
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
              {tideStat?.sunrise ?? "-:-- AM"}
            </span>
            <span className="flex gap-2 items-center">
              <Sunset
                fill="#ff9f45ff"
                className="stroke-muted-foreground w-4 h-4"
              />
              <span className="-mb-0.5">Sunset</span>
            </span>
            <span className="ml-1 text-foreground normal-case font-medium">
              {tideStat?.sunset ?? "-:-- PM"}
            </span>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-1 mt-2 justify-center min-h-0">
          {overviewText ? (
            <p className="text-center text-sm leading-snug">
              {overviewText}
            </p>
          ) : (
            <div className="w-full max-w-[26rem] px-4">
              <div className="mx-auto h-3 w-full rounded-md bg-highlight-6/70 animate-pulse" />
              <div className="mx-auto mt-2 h-3 w-5/6 rounded-md bg-highlight-6/50 animate-pulse" />
            </div>
          )}
        </div>
      </li>
      {statsForRender.map((stat) => {
        let content;
        switch (stat.type) {
          case "temperature":
            content = (
              <div className="flex gap-6 items-center justify-center w-full px-1">
                {(stat.waterTempHigh != null || isLoading) && (
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
                {(stat.airTempHigh != null || isLoading) && (
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
                  : "min-h-43"
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
