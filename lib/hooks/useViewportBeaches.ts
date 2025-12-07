"use client";

import * as React from "react";
import {
  fetchBeachesInBoundsAPI,
  type ApiBeachRecord,
} from "@/lib/api";
import type {
  BeachPoint,
  VisibleMapBounds,
} from "@/components/context/MapFilterContext";

type Status = "idle" | "loading" | "success" | "error";

type Options = {
  bounds: VisibleMapBounds;
  filters: Set<string>;
  favoriteIds: Set<string>;
  selectedTab?: string | null;
  debounceMs?: number;
  requestId?: number;
};

const normalizeBeachRecord = (beach: ApiBeachRecord): BeachPoint => ({
  id: beach.id,
  name: beach.name ?? "",
  county: beach.county ?? "",
  latitude: Number(beach.latitude ?? (beach as any).LATITUDE),
  longitude: Number(beach.longitude ?? (beach as any).LONGITUDE),
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
}: Options) {
  const [beaches, setBeaches] = React.useState<BeachPoint[]>([]);
  const [status, setStatus] = React.useState<Status>("idle");
  const [error, setError] = React.useState<Error | null>(null);
  const latestRequestIdRef = React.useRef(requestId);
  const lastSignatureRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    latestRequestIdRef.current = requestId;
  }, [requestId]);

  React.useEffect(() => {
    if (!bounds) {
      lastSignatureRef.current = null;
      return;
    }

    const serializeBounds = (value: VisibleMapBounds) =>
      `${value.south}:${value.north}:${value.west}:${value.east}:${
        value.crossesAntimeridian ? 1 : 0
      }`;
    const filtersKey = JSON.stringify(Array.from(filters ?? []));
    const favoritesKey = JSON.stringify(Array.from(favoriteIds ?? []));
    const signature = JSON.stringify({
      bounds: serializeBounds(bounds),
      filters: filtersKey,
      favorites: favoritesKey,
      selectedTab,
      requestId,
    });

    if (lastSignatureRef.current === signature) {
      return;
    }
    lastSignatureRef.current = signature;

    let isActive = true;
    const controller = new AbortController();
    const filterList = Array.from(filters ?? []);
    const favoriteList = Array.from(favoriteIds ?? []);

    setStatus((prev) => (prev === "loading" ? prev : "loading"));
    setError((prev) => (prev === null ? prev : null));

    const timeoutId = window.setTimeout(() => {
      fetchBeachesInBoundsAPI(
        {
          ...bounds,
          filters: filterList,
          favoriteIds:
            selectedTab === "saved" ? favoriteList : undefined,
        },
        controller.signal
      )
        .then((records) => {
          if (controller.signal.aborted || !isActive) {
            return;
          }
          if (requestId !== latestRequestIdRef.current) {
            return;
          }
          setBeaches(records.map(normalizeBeachRecord));
          setStatus("success");
        })
        .catch((err) => {
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
    };
  }, [bounds, filters, favoriteIds, selectedTab, debounceMs, requestId]);

  return { beaches, status, error };
}
