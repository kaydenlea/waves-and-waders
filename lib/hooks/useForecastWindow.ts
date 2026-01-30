"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getPacificMidnightUTC,
} from "@/lib/utils";
import { getForecastCached } from "@/lib/dataCache";
import type { ForecastData } from "@/lib/supabase";
import { useForecastData } from "@/components/context/ForecastDataContext";
import { usePacificTodayMs } from "@/lib/hooks/usePacificTodayMs";

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
  const pacificTodayMs = usePacificTodayMs();
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
    if (dateKey != null) {
      return getPacificMidnightUTC(new Date(dateKey)).getTime();
    }
    return pacificTodayMs;
  }, [dateKey, pacificTodayMs]);

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

  const sharedSlice = useMemo(() => {
    if (!canUseShared || !sharedRows) return null;
    return sharedRows
      .filter((row) => {
        const ts = new Date(row.timestamp).getTime();
        return ts >= targetStartMs && ts <= targetEndMs;
      })
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
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

  const rows = canUseShared ? (sharedSlice ?? []) : localRows;
  const loading = canUseShared ? Boolean(sharedLoading) : localLoading;

  return {
    rows,
    loading,
    start: targetStart,
    end: targetEnd,
    usingShared: canUseShared,
  };
}
