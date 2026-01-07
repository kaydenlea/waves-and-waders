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
  enabled?: boolean;
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
  enabled = true,
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
  const boundsPayload = React.useMemo<VisibleMapBounds>(
    () =>
      boundsKey && bounds
        ? {
            south: bounds.south,
            north: bounds.north,
            west: bounds.west,
            east: bounds.east,
            crossesAntimeridian: bounds.crossesAntimeridian,
          }
        : null,
    // Intentionally key off the value-derived string to avoid reruns on referential changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boundsKey]
  );
  const filtersKey = JSON.stringify(Array.from(filters ?? []).sort());
  const filterList = React.useMemo(
    () => Array.from(filters ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtersKey]
  );
  const favoritesKey = JSON.stringify(Array.from(favoriteIds ?? []).sort());
  const favoriteList = React.useMemo(
    () => Array.from(favoriteIds ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [favoritesKey]
  );
  const statsDateKey =
    statsDate instanceof Date && !Number.isNaN(statsDate.getTime())
      ? statsDate.toISOString()
      : null;
  const statsDatePayload = React.useMemo(
    () => (statsDateKey ? new Date(statsDateKey) : null),
    [statsDateKey]
  );

  React.useEffect(() => {
    latestRequestIdRef.current = requestId;
  }, [requestId]);

  React.useEffect(() => {
    if (!boundsKey || !boundsPayload) {
      setStatus("idle");
      setError((prev) => (prev === null ? prev : null));
      return;
    }

    if (!enabled) {
      setStatus((prev) => (prev === "loading" ? "idle" : prev));
      return;
    }

    const debug =
      process.env.NODE_ENV !== "production" &&
      typeof window !== "undefined" &&
      (() => {
        try {
          return window.localStorage.getItem("ww:debug-viewport") === "1";
        } catch {
          return false;
        }
      })();

    let isActive = true;
    let didFinish = false;
    const controller = new AbortController();

    setStatus((prev) => (prev === "loading" ? prev : "loading"));
    setError((prev) => (prev === null ? prev : null));
    setStats(null);

    if (debug) {
      console.log("[ViewportBeaches] schedule", {
        requestId,
        boundsKey,
        debounceMs,
      });
    }

    const timeoutId = window.setTimeout(() => {
      fetchBeachesInBoundsAPI(
        {
          ...boundsPayload,
          filters: filterList,
          favoriteIds:
            selectedTab === "saved" ? favoriteList : undefined,
          limit,
          includeStats,
          statsLimit,
          statsDate: statsDatePayload,
          statsHour,
        },
        controller.signal
      )
        .then((response) => {
          didFinish = true;
          if (controller.signal.aborted || !isActive) {
            if (debug) {
              console.log("[ViewportBeaches] discard (aborted/inactive)", {
                requestId,
              });
            }
            return;
          }
          if (requestId !== latestRequestIdRef.current) {
            if (debug) {
              console.log("[ViewportBeaches] discard (stale)", {
                requestId,
                latest: latestRequestIdRef.current,
              });
            }
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
            if (debug) {
              console.log("[ViewportBeaches] discard error (aborted/inactive)", {
                requestId,
              });
            }
            return;
          }
          if (requestId !== latestRequestIdRef.current) {
            if (debug) {
              console.log("[ViewportBeaches] discard error (stale)", {
                requestId,
                latest: latestRequestIdRef.current,
              });
            }
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
      if (debug) {
        console.log("[ViewportBeaches] cancel", { requestId, didFinish });
      }
      if (!didFinish) {
        setStatus("idle");
      }
    };
  }, [
    boundsKey,
    boundsPayload,
    filterList,
    favoriteList,
    selectedTab,
    debounceMs,
    requestId,
    enabled,
    includeStats,
    limit,
    statsLimit,
    statsDateKey,
    statsDatePayload,
    statsHour,
  ]);

  return { beaches, stats, status, error };
}
