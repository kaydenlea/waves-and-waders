"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { clearDataCaches } from "@/lib/dataCache";
import { clearCachedHourSliderTrackGradient } from "@/lib/ui/hourSliderTrackCache";
import { getPacificMidnightUTC } from "@/lib/utils";

/**
 * Data update runs from ~12:30 AM to ~1:30 AM Pacific.
 * We delay cache invalidation until this hour (2 AM Pacific) to ensure
 * users see complete cached data during the update window rather than
 * incomplete/holey data while the update is in progress.
 */
const DATA_UPDATE_COMPLETE_HOUR = 2; // 2:00 AM Pacific

/**
 * Get the timestamp for when caches should be invalidated for the current day.
 * This is DATA_UPDATE_COMPLETE_HOUR (2 AM) Pacific time on the current Pacific day.
 */
function getCacheInvalidationTimeMs(): number {
  const pacificMidnight = getPacificMidnightUTC(new Date());
  return pacificMidnight.getTime() + DATA_UPDATE_COMPLETE_HOUR * 60 * 60 * 1000;
}

/**
 * Get the current Pacific day's midnight timestamp, but only if we're past
 * the data update window. Before then, return the previous day's timestamp
 * so caches are preserved during the update window.
 */
function getEffectiveCacheDayMs(): number {
  const now = Date.now();
  const todayMidnight = getPacificMidnightUTC(new Date()).getTime();
  const cacheInvalidationTime = todayMidnight + DATA_UPDATE_COMPLETE_HOUR * 60 * 60 * 1000;
  
  // If we haven't reached the cache invalidation time yet (e.g., it's 12:30 AM),
  // treat it as still being "yesterday" for caching purposes
  if (now < cacheInvalidationTime) {
    return todayMidnight - 24 * 60 * 60 * 1000; // Previous day
  }
  
  return todayMidnight;
}

/**
 * Inner component that listens for when caches should be invalidated.
 * This fires at 2 AM Pacific (after the nightly data update completes)
 * rather than at midnight, so users see complete cached data during
 * the 12:30-1:30 AM update window.
 */
function DataUpdateCacheInvalidator({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: React.ReactNode;
}) {
  const [effectiveCacheDayMs, setEffectiveCacheDayMs] = useState<number>(() =>
    getEffectiveCacheDayMs()
  );
  const prevEffectiveCacheDayMsRef = useRef<number | null>(null);

  // Schedule timer to fire at cache invalidation time and periodic sync
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const sync = () => {
      const next = getEffectiveCacheDayMs();
      setEffectiveCacheDayMs((prev) => (prev === next ? prev : next));
    };

    const scheduleNextInvalidation = () => {
      const now = Date.now();
      const cacheInvalidationTime = getCacheInvalidationTimeMs();
      
      // If we've already passed today's invalidation time, schedule for tomorrow
      let targetTime = cacheInvalidationTime;
      if (now >= cacheInvalidationTime) {
        targetTime = cacheInvalidationTime + 24 * 60 * 60 * 1000;
      }
      
      const delayMs = Math.max(1000, targetTime - now + 500);
      timer = setTimeout(() => {
        sync();
        scheduleNextInvalidation();
      }, delayMs);
    };

    const onFocus = () => sync();
    const onVisibilityChange = () => {
      if (!document.hidden) sync();
    };

    scheduleNextInvalidation();
    
    // Safety net: periodic sync every 5 minutes
    intervalId = setInterval(sync, 5 * 60 * 1000);

    window.addEventListener("focus", onFocus, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange, {
      passive: true,
    });

    return () => {
      if (timer) clearTimeout(timer);
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  // Handle cache invalidation when effective cache day changes
  useEffect(() => {
    const prevMs = prevEffectiveCacheDayMsRef.current;

    // First mount: just establish the baseline
    if (prevMs === null) {
      prevEffectiveCacheDayMsRef.current = effectiveCacheDayMs;
      return;
    }

    // Day hasn't changed (for caching purposes)
    if (prevMs === effectiveCacheDayMs) return;

    // Effective cache day changed (it's now past 2 AM Pacific)!
    prevEffectiveCacheDayMsRef.current = effectiveCacheDayMs;

    // Clear the in-memory data caches (forecast, tides, daily conditions)
    clearDataCaches();
    
    // Clear UI-related caches that depend on the current day
    clearCachedHourSliderTrackGradient();

    // Invalidate queries that include date-sensitive data
    // This forces a refetch on next access with fresh data for the new day
    queryClient.invalidateQueries({ queryKey: ["forecast"] });
    queryClient.invalidateQueries({ queryKey: ["tides"] });
    queryClient.invalidateQueries({ queryKey: ["daily-conditions"] });
    queryClient.invalidateQueries({ queryKey: ["current-conditions"] });
    queryClient.invalidateQueries({ queryKey: ["surf-intensity"] });

    // Clear the entire React Query cache to ensure no stale previous-day data lingers
    queryClient.clear();

    console.log(
      `[DataUpdateCacheInvalidator] Past ${DATA_UPDATE_COMPLETE_HOUR} AM Pacific, cleared all cached queries for fresh data`
    );
  }, [effectiveCacheDayMs, queryClient]);

  return <>{children}</>;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <DataUpdateCacheInvalidator queryClient={queryClient}>
        {children}
      </DataUpdateCacheInvalidator>
    </QueryClientProvider>
  );
}
