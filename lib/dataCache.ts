import type { ForecastData, TidePoint, DailyConditions } from "./supabase";
import {
  fetchBeachForecastAPI,
  fetchBeachTidesAPI,
  fetchDailyConditionsAPI,
} from "./api";

type CacheEntry<T> = {
  promise: Promise<T>;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
  ttl = DEFAULT_TTL_MS
) => {
  const key = `${beachId}:${start.toISOString()}:${end.toISOString()}`;
  return getOrCreate(forecastCache, key, () =>
    fetchBeachForecastAPI(beachId, start, end)
  , ttl);
};

export const getTidesCached = (
  beachId: string,
  start: Date,
  end: Date,
  ttl = DEFAULT_TTL_MS
) => {
  const key = `${beachId}:${start.toISOString()}:${end.toISOString()}`;
  return getOrCreate(tideCache, key, () =>
    fetchBeachTidesAPI(beachId, start, end)
  , ttl);
};

export const getDailyConditionsCached = (
  county: string,
  date?: Date,
  ttl = DEFAULT_TTL_MS
) => {
  const key = date
    ? `${county}:${date.toISOString().split("T")[0]}`
    : `${county}:today`;
  return getOrCreate(dailyCache, key, () =>
    fetchDailyConditionsAPI(county, date)
  , ttl);
};

export const clearDataCaches = () => {
  forecastCache.clear();
  tideCache.clear();
  dailyCache.clear();
};
