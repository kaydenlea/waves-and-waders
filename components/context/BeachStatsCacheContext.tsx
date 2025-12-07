"use client";

import React from "react";
import type { BeachStatsSnapshot } from "@/lib/beachStatsShared";
import { fetchBeachStatsBatchAPI } from "@/lib/api";
import { normalizeHour } from "@/lib/beachStatsShared";

type CacheEntry = {
  data: BeachStatsSnapshot | null;
  dateKey: string;
  hourKey: string | number;
};

type Options = {
  date?: Date | null;
  hour?: number | null;
};

type BeachStatsCacheContextValue = {
  getSnapshot: (
    beachId: string | number,
    dateKey: string,
    hourKey: string | number
  ) => BeachStatsSnapshot | null | undefined;
  prefetchSnapshots: (
    ids: Array<string | number>,
    options?: Options
  ) => Promise<void>;
  primeSnapshots: (
    data: Record<string, BeachStatsSnapshot | null>,
    dateKey: string,
    hourKey: string | number
  ) => void;
};

const BeachStatsCacheContext =
  React.createContext<BeachStatsCacheContextValue | null>(null);

const resolveKeys = (options?: Options) => {
  const dateKey =
    options?.date instanceof Date
      ? options.date.toISOString().split("T")[0]
      : "today";
  const hourKey =
    typeof options?.hour === "number"
      ? normalizeHour(options.hour)
      : options?.date instanceof Date
      ? "midday"
      : "now";
  return { dateKey, hourKey };
};

const makeCacheKey = (
  beachId: string | number,
  dateKey: string,
  hourKey: string | number
) => `${beachId}:${dateKey}:${hourKey}`;

export function BeachStatsCacheProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cache, setCache] = React.useState<Record<string, CacheEntry>>({});
  const inFlightRef = React.useRef<Record<string, Promise<void>>>({});

  const getSnapshot = React.useCallback(
    (beachId: string | number, dateKey: string, hourKey: string | number) => {
      return cache[makeCacheKey(beachId, dateKey, hourKey)]?.data;
    },
    [cache]
  );

  const prefetchSnapshots = React.useCallback(
    async (ids: Array<string | number>, options?: Options) => {
      if (!ids.length) return;
      const { dateKey, hourKey } = resolveKeys(options);
      const missing = ids
        .map((id) => String(id))
        .filter(
          (id) => !cache[makeCacheKey(id, dateKey, hourKey)]
        );
      if (!missing.length) return;

      const inflightKey = `${missing.sort().join("|")}:${dateKey}:${hourKey}`;
      if (inFlightRef.current[inflightKey]) {
        await inFlightRef.current[inflightKey];
        return;
      }

      const request = fetchBeachStatsBatchAPI(missing, {
        date: options?.date ?? undefined,
        hour: typeof options?.hour === "number" ? options.hour : undefined,
      })
        .then((data) => {
          setCache((prev) => {
            const next = { ...prev };
            missing.forEach((id) => {
              next[makeCacheKey(id, dateKey, hourKey)] = {
                data: data?.[id] ?? null,
                dateKey,
                hourKey,
              };
            });
            return next;
          });
        })
        .finally(() => {
          delete inFlightRef.current[inflightKey];
        });

      inFlightRef.current[inflightKey] = request;
      await request;
    },
    [cache]
  );

  const primeSnapshots = React.useCallback(
    (
      data: Record<string, BeachStatsSnapshot | null>,
      dateKey: string,
      hourKey: string | number
    ) => {
      if (!data || Object.keys(data).length === 0) return;
      setCache((prev) => {
        const next = { ...prev };
        Object.entries(data).forEach(([id, snapshot]) => {
          const key = makeCacheKey(id, dateKey, hourKey);
          if (next[key]) return;
          next[key] = {
            data: snapshot ?? null,
            dateKey,
            hourKey,
          };
        });
        return next;
      });
    },
    []
  );

  return (
    <BeachStatsCacheContext.Provider
      value={{
        getSnapshot,
        prefetchSnapshots,
        primeSnapshots,
      }}
    >
      {children}
    </BeachStatsCacheContext.Provider>
  );
}

export function useBeachStatsCache(): BeachStatsCacheContextValue {
  const ctx = React.useContext(BeachStatsCacheContext);
  if (!ctx) {
    throw new Error("useBeachStatsCache must be used within BeachStatsCacheProvider");
  }
  return ctx;
}
