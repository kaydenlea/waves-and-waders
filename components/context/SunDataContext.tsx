"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
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
  const [cache, setCache] = useState<SunDataCache>({});
  const [countyCache, setCountyCache] = useState<Map<string, string>>(new Map());
  const [pendingRequests, setPendingRequests] = useState<Map<string, Promise<SunData | null>>>(new Map());

  const getCacheKey = (beachId: string, date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return `${beachId}:${dateStr}`;
  };

  const getCounty = useCallback(async (beachId: string): Promise<string | null> => {
    if (countyCache.has(beachId)) {
      return countyCache.get(beachId) ?? null;
    }

    try {
      const resolved = await fetchBeachByIdLoose(beachId);
      const id = resolved?.id ?? beachId;
      const beach = await fetchBeachDetails(String(id));
      const county = beach?.COUNTY ?? null;
      
      setCountyCache(prev => new Map(prev).set(beachId, county ?? ""));
      return county;
    } catch (error) {
      console.error("Failed to fetch county for beach:", beachId, error);
      return null;
    }
  }, [countyCache]);

  const getSunData = useCallback(async (beachId: string, date: Date): Promise<SunData | null> => {
    const key = getCacheKey(beachId, date);

    // Return cached data if available
    if (cache[key] !== undefined) {
      return cache[key];
    }

    // Return pending request if it exists
    if (pendingRequests.has(key)) {
      return pendingRequests.get(key)!;
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
        setCache(prev => ({ ...prev, [key]: sunData }));
        return sunData;
      } catch (error) {
        console.error("Failed to fetch sun data:", error);
        setCache(prev => ({ ...prev, [key]: null }));
        return null;
      } finally {
        // Remove from pending requests
        setPendingRequests(prev => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      }
    })();

    setPendingRequests(prev => new Map(prev).set(key, request));
    return request;
  }, [cache, pendingRequests, getCounty]);

  const prefetchSunData = useCallback(async (beachId: string, dates: Date[]) => {
    // Batch fetch all dates at once
    await Promise.all(dates.map(date => getSunData(beachId, date)));
  }, [getSunData]);

  const clearCache = useCallback(() => {
    setCache({});
    setCountyCache(new Map());
    setPendingRequests(new Map());
  }, []);

  return (
    <SunDataContext.Provider value={{ getSunData, prefetchSunData, clearCache }}>
      {children}
    </SunDataContext.Provider>
  );
};
