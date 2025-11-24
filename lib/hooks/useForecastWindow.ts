"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getPacificMidnightUTC } from "@/lib/utils";
import { getForecastCached } from "@/lib/dataCache";
import type { ForecastData } from "@/lib/supabase";
import { useForecastData } from "@/components/context/ForecastDataContext";

const HOUR_MS = 60 * 60 * 1000;
const MATCH_TOLERANCE_MS = 30 * 60 * 1000;

type Options = {
  beachId?: string;
  date?: Date;
  hours?: number;
};

type UseForecastWindowResult = {
  rows: ForecastData[];
  loading: boolean;
  start: Date;
  end: Date;
  usingShared: boolean;
};

export function useForecastWindowData({
  beachId,
  date,
  hours = 24,
}: Options): UseForecastWindowResult {
  const {
    rows: sharedRows,
    start: sharedStart,
    end: sharedEnd,
    loading: sharedLoading,
  } = useForecastData();
  const [localRows, setLocalRows] = useState<ForecastData[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const requestIdRef = useRef(0);
  const lastBeachRef = useRef<string | undefined>(undefined);

  const dateKey = date instanceof Date ? date.getTime() : null;

  const targetStartMs = useMemo(() => {
    const basis = dateKey != null ? new Date(dateKey) : new Date();
    return getPacificMidnightUTC(basis).getTime();
  }, [dateKey]);

  const targetEndMs = useMemo(
    () => targetStartMs + hours * HOUR_MS,
    [targetStartMs, hours]
  );

  const targetStart = useMemo(() => new Date(targetStartMs), [targetStartMs]);
  const targetEnd = useMemo(() => new Date(targetEndMs), [targetEndMs]);

  useEffect(() => {
    const normalized = beachId ? String(beachId) : undefined;
    if (normalized !== lastBeachRef.current) {
      lastBeachRef.current = normalized;
      setLocalRows([]);
    }
  }, [beachId]);

  const sharedStartMs = sharedStart?.getTime();
  const sharedEndMs = sharedEnd?.getTime();

  const canUseShared = useMemo(() => {
    if (
      !beachId ||
      !sharedRows?.length ||
      sharedStartMs == null ||
      sharedEndMs == null
    ) {
      return false;
    }
    const startAligned =
      Math.abs(sharedStartMs - targetStartMs) <= MATCH_TOLERANCE_MS;
    const endCovers = sharedEndMs >= targetEndMs - MATCH_TOLERANCE_MS;
    return startAligned && endCovers;
  }, [
    beachId,
    sharedRows,
    sharedStartMs,
    sharedEndMs,
    targetStartMs,
    targetEndMs,
  ]);

  // Populate local cache when a shared slice is available.
  useEffect(() => {
    if (!canUseShared || !sharedRows) {
      return;
    }
    const slice = sharedRows
      .filter((row) => {
        const ts = new Date(row.timestamp).getTime();
        return ts >= targetStartMs && ts <= targetEndMs;
      })
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    setLocalRows(slice);
  }, [canUseShared, sharedRows, targetStartMs, targetEndMs]);

  // Fetch when shared data does not satisfy the requested window.
  useEffect(() => {
    if (!beachId || canUseShared) {
      setLocalLoading(false);
      return;
    }

    let cancelled = false;
    const requestId = ++requestIdRef.current;
    setLocalLoading(true);

    const startDate = new Date(targetStartMs);
    const endDate = new Date(targetEndMs);

    getForecastCached(String(beachId), startDate, endDate)
      .then((rows) => {
        if (cancelled || requestId !== requestIdRef.current) return;
        setLocalRows(rows);
      })
      .catch((error) => {
        if (!cancelled && requestId === requestIdRef.current) {
          console.error(
            "useForecastWindowData: failed to load forecast",
            error
          );
        }
      })
      .finally(() => {
        if (!cancelled && requestId === requestIdRef.current) {
          setLocalLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [beachId, canUseShared, targetStartMs, targetEndMs]);

  const loading = canUseShared ? sharedLoading : localLoading;

  return {
    rows: localRows,
    loading: Boolean(loading),
    start: targetStart,
    end: targetEnd,
    usingShared: canUseShared,
  };
}
