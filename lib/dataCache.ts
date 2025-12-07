import type { ForecastData, TidePoint, DailyConditions } from "./supabase";
import {
  fetchBeachForecastAPI,
  fetchBeachTidesAPI,
  fetchDailyConditionsAPI,
} from "./api";

type CacheEntry<T> = {
  /**
   * The in-flight or cached promise for this key.
   * We store the promise instead of its resolved value so that duplicate requests
   * during the TTL share the same network call.
   */
  promise: Promise<T>;
  /**
   * Absolute expiration timestamp (ms since epoch). Entries are considered fresh
   * if expiresAt > Date.now().
   */
  expiresAt: number;
};

/**
 * Default fallback TTL used when a more specific TTL isn't provided.
 * (Primarily useful when callers pass a custom ttl argument.)
 */
const DEFAULT_TTL_MS = 5 * 60 * 1000;
/**
 * Forecast data changes frequently and near-term accuracy matters,
 * so cache for only 2 minutes by default.
 */
const FORECAST_TTL_MS = 2 * 60 * 1000;
/**
 * Tides change slowly and are predictable; a 10-minute TTL avoids redundant calls
 * without causing stale values for most interactions.
 */
const TIDE_TTL_MS = 10 * 60 * 1000;
/**
 * Sunrise/sunset values change once per day, so they can be cached for 6 hours.
 */
const DAILY_TTL_MS = 6 * 60 * 60 * 1000;

const forecastCache = new Map<string, CacheEntry<ForecastData[]>>();
const tideCache = new Map<string, CacheEntry<TidePoint[]>>();
const dailyCache = new Map<string, CacheEntry<DailyConditions | null>>();

const now = () => Date.now();

const getOrCreate = <T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  factory: () => Promise<T>,
  ttl = DEFAULT_TTL_MS
): Promise<T> => {
  const existing = cache.get(key);
  if (existing && existing.expiresAt > now()) {
    return existing.promise;
  }

  const promise = factory().catch((error) => {
    cache.delete(key);
    throw error;
  });

  cache.set(key, { promise, expiresAt: now() + ttl });
  return promise;
};

export const getForecastCached = (
  beachId: string,
  start: Date,
  end: Date,
  ttl = FORECAST_TTL_MS
) => {
  /**
   * Cache key schema: forecast:<beachId>:<isoStart>:<isoEnd>
   */
  const key = `forecast:${beachId}:${start.toISOString()}:${end.toISOString()}`;
  return getOrCreate(forecastCache, key, () =>
    fetchBeachForecastAPI(beachId, start, end)
  , ttl);
};

export const getTidesCached = (
  beachId: string,
  start: Date,
  end: Date,
  ttl = TIDE_TTL_MS
) => {
  /**
   * Cache key schema: tide:<beachId>:<isoStart>:<isoEnd>
   */
  const key = `tide:${beachId}:${start.toISOString()}:${end.toISOString()}`;
  return getOrCreate(tideCache, key, () =>
    fetchBeachTidesAPI(beachId, start, end)
  , ttl);
};

export const getDailyConditionsCached = (
  county: string,
  date?: Date,
  ttl = DAILY_TTL_MS
) => {
  /**
   * Cache key schema: daily:<county>:<yyyy-mm-dd or today>
   */
  const key = date
    ? `daily:${county}:${date.toISOString().split("T")[0]}`
    : `daily:${county}:today`;
  return getOrCreate(dailyCache, key, () =>
    fetchDailyConditionsAPI(county, date)
  , ttl);
};

export const clearDataCaches = () => {
  forecastCache.clear();
  tideCache.clear();
  dailyCache.clear();
};
