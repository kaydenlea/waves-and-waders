"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef } from "react";
import { fetchBeachByIdLoose, fetchBeachDetails } from "@/lib/supabase";
import { getDailyConditionsCached } from "@/lib/dataCache";

interface SunData {
  sunrise: string | null;
  sunset: string | null;
}

interface SunDataCache {
  [dateKey: string]: SunData | null;
}

interface SunDataContextValue {
  getSunData: (beachId: string, date: Date) => Promise<SunData | null>;
  prefetchSunData: (beachId: string, dates: Date[]) => Promise<void>;
  clearCache: () => void;
}

const SunDataContext = createContext<SunDataContextValue | null>(null);

export const useSunData = () => {
  const context = useContext(SunDataContext);
  if (!context) {
    throw new Error("useSunData must be used within SunDataProvider");
  }
  return context;
};

export const SunDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cacheRef = useRef<SunDataCache>({});
  const countyCacheRef = useRef<Map<string, string>>(new Map());
  const pendingRequestsRef = useRef<Map<string, Promise<SunData | null>>>(new Map());

  const getCacheKey = (beachId: string, date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return `${beachId}:${dateStr}`;
  };

  const getCounty = useCallback(async (beachId: string): Promise<string | null> => {
    const cached = countyCacheRef.current.get(beachId);
    if (cached !== undefined) return cached || null;

    try {
      const resolved = await fetchBeachByIdLoose(beachId);
      const id = resolved?.id ?? beachId;
      const beach = await fetchBeachDetails(String(id));
      const county = beach?.COUNTY ?? null;

      countyCacheRef.current.set(beachId, county ?? "");
      return county;
    } catch (error) {
      console.error("Failed to fetch county for beach:", beachId, error);
      return null;
    }
  }, []);

  const getSunData = useCallback(async (beachId: string, date: Date): Promise<SunData | null> => {
    const key = getCacheKey(beachId, date);

    // Return cached data if available
    if (Object.prototype.hasOwnProperty.call(cacheRef.current, key)) {
      return cacheRef.current[key] ?? null;
    }

    // Return pending request if it exists
    const pending = pendingRequestsRef.current.get(key);
    if (pending) {
      return pending;
    }

    // Create new request
    const request = (async () => {
      try {
        const county = await getCounty(beachId);
        if (!county) {
          return null;
        }

        const conditions = await getDailyConditionsCached(county, date);
        const sunData: SunData = {
          sunrise: conditions?.sunrise ?? null,
          sunset: conditions?.sunset ?? null,
        };

        // Update cache
        cacheRef.current[key] = sunData;
        return sunData;
      } catch (error) {
        console.error("Failed to fetch sun data:", error);
        cacheRef.current[key] = null;
        return null;
      } finally {
        // Remove from pending requests
        pendingRequestsRef.current.delete(key);
      }
    })();

    pendingRequestsRef.current.set(key, request);
    return request;
  }, [getCounty]);

  const prefetchSunData = useCallback(async (beachId: string, dates: Date[]) => {
    // Batch fetch all dates at once
    await Promise.all(dates.map(date => getSunData(beachId, date)));
  }, [getSunData]);

  const clearCache = useCallback(() => {
    cacheRef.current = {};
    countyCacheRef.current = new Map();
    pendingRequestsRef.current = new Map();
  }, []);

  const value = useMemo(
    () => ({ getSunData, prefetchSunData, clearCache }),
    [getSunData, prefetchSunData, clearCache]
  );

  return (
    <SunDataContext.Provider value={value}>
      {children}
    </SunDataContext.Provider>
  );
};
