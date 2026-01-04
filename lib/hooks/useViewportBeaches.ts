"use client";

import * as React from "react";
import {
  fetchBeachesInBoundsAPI,
  type ApiBeachRecord,
  type ViewportBeachesStatsPayload,
} from "@/lib/api";
import type { BeachPoint } from "@/components/context/MapFilterContext";
import type { VisibleMapBounds } from "@/components/context/MapViewportContext";

type Status = "idle" | "loading" | "success" | "error";

type Options = {
  bounds: VisibleMapBounds;
  filters: Set<string>;
  favoriteIds: Set<string>;
  selectedTab?: string | null;
  debounceMs?: number;
  requestId?: number;
  limit?: number;
  includeStats?: boolean;
  statsLimit?: number;
  statsDate?: Date | null;
  statsHour?: number | null;
};

const normalizeBeachRecord = (beach: ApiBeachRecord): BeachPoint => ({
  id: beach.id,
  name: beach.name ?? "",
  county: beach.county ?? "",
  latitude: Number(beach.latitude ?? beach.LATITUDE),
  longitude: Number(beach.longitude ?? beach.LONGITUDE),
  grid_id: beach.grid_id ?? null,
  features: beach.features,
});

export function useViewportBeaches({
  bounds,
  filters,
  favoriteIds,
  selectedTab,
  debounceMs = 200,
  requestId = 0,
  limit,
  includeStats = false,
  statsLimit,
  statsDate,
  statsHour,
}: Options) {
  const [beaches, setBeaches] = React.useState<BeachPoint[]>([]);
  const [stats, setStats] =
    React.useState<ViewportBeachesStatsPayload | null>(null);
  const [status, setStatus] = React.useState<Status>("idle");
  const [error, setError] = React.useState<Error | null>(null);
  const latestRequestIdRef = React.useRef(requestId);
  const boundsKey = bounds
    ? `${bounds.south}:${bounds.north}:${bounds.west}:${bounds.east}:${
        bounds.crossesAntimeridian ? 1 : 0
      }`
    : null;
  const filtersKey = JSON.stringify(Array.from(filters ?? []).sort());
  const favoritesKey = JSON.stringify(Array.from(favoriteIds ?? []).sort());
  const statsDateKey =
    statsDate instanceof Date && !Number.isNaN(statsDate.getTime())
      ? statsDate.toISOString()
      : null;

  React.useEffect(() => {
    latestRequestIdRef.current = requestId;
  }, [requestId]);

  React.useEffect(() => {
    if (!boundsKey || !bounds) {
      setStatus("idle");
      setError((prev) => (prev === null ? prev : null));
      return;
    }

    let isActive = true;
    let didFinish = false;
    const controller = new AbortController();
    const filterList = Array.from(filters ?? []);
    const favoriteList = Array.from(favoriteIds ?? []);

    setStatus((prev) => (prev === "loading" ? prev : "loading"));
    setError((prev) => (prev === null ? prev : null));
    setStats(null);

    const timeoutId = window.setTimeout(() => {
      fetchBeachesInBoundsAPI(
        {
          ...bounds,
          filters: filterList,
          favoriteIds:
            selectedTab === "saved" ? favoriteList : undefined,
          limit,
          includeStats,
          statsLimit,
          statsDate,
          statsHour,
        },
        controller.signal
      )
        .then((response) => {
          didFinish = true;
          if (controller.signal.aborted || !isActive) {
            return;
          }
          if (requestId !== latestRequestIdRef.current) {
            return;
          }
          const records = Array.isArray(response)
            ? response
            : response?.beaches ?? [];
          const normalized = records.map(normalizeBeachRecord);
          setBeaches(normalized);
          if (!Array.isArray(response)) {
            setStats(response?.stats ?? null);
          } else {
            setStats(null);
          }
          setStatus("success");
        })
        .catch((err) => {
          didFinish = true;
          if (controller.signal.aborted || !isActive) {
            return;
          }
          if (requestId !== latestRequestIdRef.current) {
            return;
          }
          setError(err instanceof Error ? err : new Error("Failed to load beaches"));
          setStatus("error");
        });
    }, debounceMs);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
      controller.abort();
      if (!didFinish) {
        setStatus("idle");
      }
    };
  }, [
    boundsKey,
    filtersKey,
    favoritesKey,
    selectedTab,
    debounceMs,
    requestId,
    includeStats,
    statsLimit,
    statsDateKey,
    statsHour,
  ]);

  return { beaches, stats, status, error };
}
