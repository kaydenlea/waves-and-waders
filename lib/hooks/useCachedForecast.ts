"use client";

import { useEffect, useRef, useState } from "react";
import type { ForecastData } from "@/lib/supabase";
import { getForecastCached } from "@/lib/dataCache";

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

  const requestIdRef = useRef(0);
  const activeKeyRef = useRef<string | null>(null);

  const requestKey =
    enabled && beachId
      ? `forecast:${beachId}:${start.toISOString()}:${end.toISOString()}`
      : null;

  // If the inputs change, surface `loading` immediately (even before the effect runs)
  // so consumers don't briefly treat stale `data` as belonging to the new request.
  const keyChanged = requestKey !== activeKeyRef.current;

  useEffect(() => {
    if (!enabled || !beachId) {
      setData([]);
      setLoading(false);
      setError(null);
      activeKeyRef.current = null;
      return;
    }

    activeKeyRef.current = requestKey;
    const requestId = ++requestIdRef.current;
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getForecastCached(beachId, start, end);

        if (cancelled || requestId !== requestIdRef.current) {
          return;
        }

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
  }, [beachId, start.getTime(), end.getTime(), enabled, requestKey]);

  return { data, loading: loading || keyChanged, error };
}
