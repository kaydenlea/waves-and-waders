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
  /**
   * Monotonically increasing version that bumps whenever the cache
   * contents change (either via prefetchSnapshots or primeSnapshots).
   * Consumers can subscribe to this to react to stats availability
   * without triggering additional fetches.
   */
  version: number;
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
const PREFETCH_BATCH_SIZE = 100;
const PREFETCH_CONCURRENCY = 4;
const makeInflightKey = (
  beachId: string | number,
  dateKey: string,
  hourKey: string | number
) => `${beachId}:${dateKey}:${hourKey}`;
const chunkQueue = (input: string[], size: number) => {
  const queue: string[][] = [];
  for (let i = 0; i < input.length; i += size) {
    queue.push(input.slice(i, i + size));
  }
  return queue;
};

export function BeachStatsCacheProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cache, setCache] = React.useState<Record<string, CacheEntry>>({});
  const [version, setVersion] = React.useState(0);
  const inFlightRef = React.useRef<Record<string, Promise<void> | undefined>>(
    {}
  );

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
        .filter((id) => {
          const cacheKey = makeCacheKey(id, dateKey, hourKey);
          if (cache[cacheKey]) return false;
          if (inFlightRef.current[makeInflightKey(id, dateKey, hourKey)]) {
            return false;
          }
          return true;
        });
      if (!missing.length) return;

      const chunks = chunkQueue(missing, PREFETCH_BATCH_SIZE);
      const workerCount = Math.min(PREFETCH_CONCURRENCY, chunks.length);
      const runWorker = async () => {
        while (chunks.length) {
          const chunk = chunks.shift();
          if (!chunk?.length) continue;
          const sortedChunk = [...chunk].sort();
          const inflightKeys = sortedChunk.map((id) =>
            makeInflightKey(id, dateKey, hourKey)
          );
          const inflightPromises = inflightKeys
            .map((key) => inFlightRef.current[key])
            .filter(Boolean);
          if (inflightPromises.length) {
            await Promise.all(inflightPromises);
            continue;
          }
          const request = fetchBeachStatsBatchAPI(sortedChunk, {
            date: options?.date ?? undefined,
            hour: typeof options?.hour === "number" ? options.hour : undefined,
          })
            .then((data) => {
              setCache((prev) => {
                const next = { ...prev };
                sortedChunk.forEach((id) => {
                  next[makeCacheKey(id, dateKey, hourKey)] = {
                    data: data?.[id] ?? null,
                    dateKey,
                    hourKey,
                  };
                });
                return next;
              });
              setVersion((prev) => prev + 1);
            })
            .finally(() => {
              inflightKeys.forEach((key) => {
                delete inFlightRef.current[key];
              });
            });
          inflightKeys.forEach((key) => {
            inFlightRef.current[key] = request;
          });
          await request;
        }
      };
      await Promise.all(
        Array.from({ length: workerCount || 1 }, () => runWorker())
      );
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
          next[key] = {
            data: snapshot ?? null,
            dateKey,
            hourKey,
          };
        });
        return next;
      });
      setVersion((prev) => prev + 1);
    },
    []
  );

  return (
    <BeachStatsCacheContext.Provider
      value={{
        getSnapshot,
        prefetchSnapshots,
        primeSnapshots,
        version,
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
