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

  useEffect(() => {
    if (!enabled || !beachId) {
      setData([]);
      return;
    }

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
  }, [beachId, start.getTime(), end.getTime(), enabled]);

  return { data, loading, error };
}
