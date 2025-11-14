"use client";

import { useEffect, useRef, useState } from "react";
import { fetchBeachForecast, type ForecastData } from "@/lib/supabase";

// Global cache shared across all hook instances
const forecastCache = new Map<string, {
  data: ForecastData[];
  timestamp: number;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

type UseCachedForecastOptions = {
  beachId?: string;
  start: Date;
  end: Date;
  enabled?: boolean;
};

export function useCachedForecast({
  beachId,
  start,
  end,
  enabled = true,
}: UseCachedForecastOptions) {
  const [data, setData] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track current request to cancel stale requests
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled || !beachId) {
      setData([]);
      return;
    }

    const requestId = ++requestIdRef.current;
    let cancelled = false;

    const fetchData = async () => {
      // Generate cache key from parameters
      const cacheKey = `${beachId}:${start.getTime()}:${end.getTime()}`;
      
      // Check cache first
      const cached = forecastCache.get(cacheKey);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        console.log(`📦 Using cached forecast for ${beachId}`);
        if (requestId === requestIdRef.current) {
          setData(cached.data);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetchBeachForecast(beachId, start, end);
        
        if (cancelled || requestId !== requestIdRef.current) {
          return; // Ignore stale requests
        }

        // Update cache
        forecastCache.set(cacheKey, {
          data: result,
          timestamp: now,
        });

        // Clean up old cache entries (keep only last 10)
        if (forecastCache.size > 10) {
          const keys = Array.from(forecastCache.keys());
          const oldestKey = keys[0];
          forecastCache.delete(oldestKey);
        }

        console.log(`🌊 Fetched fresh forecast for ${beachId} (${result.length} records)`);
        setData(result);
      } catch (err) {
        if (!cancelled && requestId === requestIdRef.current) {
          setError(err as Error);
          console.error("Failed to fetch forecast:", err);
        }
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [beachId, start.getTime(), end.getTime(), enabled]);

  return { data, loading, error };
}

// Helper to clear cache (useful when data is known to be stale)
export function clearForecastCache(beachId?: string) {
  if (beachId) {
    // Clear all entries for this beach
    const keysToDelete: string[] = [];
    forecastCache.forEach((_, key) => {
      if (key.startsWith(`${beachId}:`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => forecastCache.delete(key));
    console.log(`🗑️ Cleared ${keysToDelete.length} cache entries for ${beachId}`);
  } else {
    // Clear entire cache
    forecastCache.clear();
    console.log("🗑️ Cleared entire forecast cache");
  }
}
