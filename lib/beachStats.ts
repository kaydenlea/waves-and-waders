import {
  fetchBeachByIdLoose,
  fetchBeachDetails,
  fetchBeachForecast,
  fetchBeachTides,
  fetchDailyConditions,
  fetchCurrentConditions,
  type ForecastData,
  type TidePoint,
  type DailyConditions,
} from "./supabase";
import { computeRepresentativeSurfFt } from "./forecast/surfIntensity";
import { getPacificDayRange } from "./utils";
import {
  type BeachStatsSnapshot,
  type SummaryStat,
  type TidePeak,
  normalizeHour,
} from "./beachStatsShared";

type TidePointValue = { x: number; tide: number };

const SURF_HEIGHT_CAP = 12;
const WIND_SPEED_CAP = 40;
const TEMP_CAP = 100;
const STATS_CACHE_VERSION = 2;

const statsCache = new Map<string, Promise<BeachStatsSnapshot | null>>();
type CacheEntry<T> = { promise: Promise<T>; expiresAt: number };
const now = () => Date.now();

const FORECAST_TTL_MS = 2 * 60 * 1000;
const TIDE_TTL_MS = 10 * 60 * 1000;
const DAILY_TTL_MS = 6 * 60 * 60 * 1000;

const forecastServerCache = new Map<string, CacheEntry<ForecastData[]>>();
const tidesServerCache = new Map<string, CacheEntry<TidePoint[]>>();
const dailyServerCache = new Map<string, CacheEntry<DailyConditions | null>>();

const getOrCreateServerCache = <T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  factory: () => Promise<T>,
  ttl: number
): Promise<T> => {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now()) {
    return cached.promise;
  }
  const promise = factory().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, { promise, expiresAt: now() + ttl });
  return promise;
};

const getForecastForStats = (
  beachId: string,
  start: Date,
  end: Date
): Promise<ForecastData[]> => {
  const key = `forecast:${beachId}:${start.toISOString()}:${end.toISOString()}`;
  return getOrCreateServerCache(
    forecastServerCache,
    key,
    () => fetchBeachForecast(beachId, start, end),
    FORECAST_TTL_MS
  );
};

const getTidesForStats = (
  beachId: string,
  start: Date,
  end: Date
): Promise<TidePoint[]> => {
  const key = `tides:${beachId}:${start.toISOString()}:${end.toISOString()}`;
  return getOrCreateServerCache(
    tidesServerCache,
    key,
    () => fetchBeachTides(beachId, start, end),
    TIDE_TTL_MS
  );
};

const getDailyConditionsForStats = (
  county: string,
  date: Date
): Promise<DailyConditions | null> => {
  const dateKey = date.toISOString().split("T")[0];
  const key = `daily:${county}:${dateKey}`;
  return getOrCreateServerCache(
    dailyServerCache,
    key,
    () => fetchDailyConditions(county, date),
    DAILY_TTL_MS
  );
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

const getCacheKey = (
  beachId: string,
  targetDate?: Date,
  targetHour?: number | null
) => {
  const dateKey =
    targetDate instanceof Date
      ? targetDate.toISOString().split("T")[0]
      : "today";
  const hourKey =
    typeof targetHour === "number"
      ? normalizeHour(targetHour)
      : targetDate instanceof Date
      ? "midday"
      : "now";
  return `v${STATS_CACHE_VERSION}:${beachId}:${dateKey}:${hourKey}`;
};

export async function computeBeachStatsSnapshot(
  beachId: string,
  targetDate?: Date,
  targetHour?: number | null
): Promise<BeachStatsSnapshot | null> {
  const resolved = await fetchBeachByIdLoose(beachId);
  const resolvedId = resolved?.id ? String(resolved.id) : beachId;
  const beach = await fetchBeachDetails(resolvedId);
  const { start: dayStart, end: dayEnd } = getPacificDayRange(
    targetDate instanceof Date ? targetDate : undefined
  );
  const tideBufferMs = 6 * 60 * 60 * 1000;
  const tideStart = new Date(dayStart.getTime() - tideBufferMs);
  const tideEnd = new Date(dayEnd.getTime() + tideBufferMs);

  const [forecast = [], current, tides = [], daily] = await Promise.all([
    getForecastForStats(resolvedId, dayStart, dayEnd),
    fetchCurrentConditions(resolvedId).catch(() => null),
    getTidesForStats(resolvedId, tideStart, tideEnd),
    beach?.COUNTY
      ? getDailyConditionsForStats(
          beach.COUNTY,
          targetDate instanceof Date ? targetDate : dayStart
        )
      : Promise.resolve(null),
  ]);

  if (!forecast.length && !current) {
    return null;
  }

  const targetHourNormalized =
    typeof targetHour === "number"
      ? normalizeHour(targetHour)
      : targetDate instanceof Date
      ? 12
      : normalizeHour(new Date().getHours());
  const pacificHourFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    hour12: false,
  });

  const baseRow =
    forecast.length > 0
      ? forecast.reduce((best, row) => {
          const rowHour = normalizeHour(
            Number.parseInt(
              pacificHourFormatter.format(new Date(row.timestamp)),
              10
            )
          );
          const bestHour = normalizeHour(
            Number.parseInt(
              pacificHourFormatter.format(new Date(best.timestamp)),
              10
            )
          );
          const diff = Math.abs(rowHour - targetHourNormalized);
          const bestDiff = Math.abs(bestHour - targetHourNormalized);
          const wrappedDiff = diff > 12 ? 24 - diff : diff;
          const wrappedBest = bestDiff > 12 ? 24 - bestDiff : bestDiff;
          return wrappedDiff < wrappedBest ? row : best;
        }, forecast[0])
      : null;

  const renderData = baseRow ?? current ?? forecast[0] ?? null;
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

  const avgPeriod = average(periods);
  const representativeSurf =
    renderData != null ? computeRepresentativeSurfFt(renderData) : null;
  let surfHeightLabel: string | null = null;
  if (representativeSurf != null && representativeSurf > 0) {
    const low = Math.max(0, Math.floor(representativeSurf));
    const high = Math.max(low + 1, Math.ceil(representativeSurf));
    surfHeightLabel = `${low}-${high}`;
  }
  const surfPeriodRaw = renderData?.swell?.primary?.period;
  const surfPeriod =
    typeof surfPeriodRaw === "number" && Number.isFinite(surfPeriodRaw)
      ? Math.round(surfPeriodRaw)
      : avgPeriod != null
        ? Math.round(avgPeriod)
        : null;

  if (surfHeightLabel && surfPeriod != null) {
    const fallbackSurf =
      representativeSurf ??
      (heightMaxes.length > 0
        ? Math.max(...heightMaxes)
        : heightMins.length > 0
          ? Math.max(...heightMins)
          : 0);
    const surfIntensity = clampIntensity(
      fallbackSurf,
      SURF_HEIGHT_CAP
    );
    stats.push({
      type: "surf",
      surf: {
        height: surfHeightLabel,
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
    renderData?.conditions.tideLevel != null &&
    Number.isFinite(renderData.conditions.tideLevel)
  ) {
    currentTideHeight = Number(renderData.conditions.tideLevel.toFixed(1));
  }

  let sunrise: string | undefined;
  let sunset: string | undefined;
  const conditionsSource = daily ?? null;
  if (conditionsSource) {
    const dayForFormat = conditionsSource.date
      ? new Date(`${conditionsSource.date}T00:00:00`)
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
      formatClock(conditionsSource.sunrise) ??
      conditionsSource.sunrise ??
      undefined;
    sunset =
      formatClock(conditionsSource.sunset) ??
      conditionsSource.sunset ??
      undefined;
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

  return {
    summary: stats,
    current: renderData,
  };
}

export async function getBeachStatsCached(
  beachId: string,
  targetDate?: Date,
  targetHour?: number | null
): Promise<BeachStatsSnapshot | null> {
  const key = getCacheKey(beachId, targetDate, targetHour);
  const cached = statsCache.get(key);
  if (cached) return cached;
  const promise = computeBeachStatsSnapshot(beachId, targetDate, targetHour).catch(
    () => {
      // Avoid poisoning the cache with a permanently rejected promise; allow retries.
      statsCache.delete(key);
      return null;
    }
  );
  statsCache.set(key, promise);
  return promise;
}

export async function getBeachStatsBatch(
  beachIds: Array<string | number>,
  options?: { targetDate?: Date; targetHour?: number | null }
): Promise<Record<string, BeachStatsSnapshot | null>> {
  const unique = Array.from(new Set(beachIds.map((id) => String(id))));
  const map: Record<string, BeachStatsSnapshot | null> = {};
  // Limit concurrency to avoid overwhelming downstream fetches (Supabase/external APIs).
  const concurrency = Math.min(6, unique.length || 1);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= unique.length) return;
        const id = unique[index];
        try {
          map[id] =
            (await getBeachStatsCached(id, options?.targetDate, options?.targetHour)) ??
            null;
        } catch {
          map[id] = null;
        }
      }
    })
  );
  return map;
}
