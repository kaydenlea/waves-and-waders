"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getForecastCached, getTidesCached } from "@/lib/dataCache";
import { fetchBeachByIdLoose } from "@/lib/supabase";
import { getPacificDayRange } from "@/lib/utils";
import { useSunData } from "@/components/context/SunDataContext";

const HOURS_TO_MS = 60 * 60 * 1000;

export type TideSample = { x: number; tide: number };

type Options = {
  beachId?: string;
  date?: Date;
  hours?: number;
  bufferHours?: number;
  enabled?: boolean;
  initialRows?: TideSample[];
  initialStartMs?: number | null;
};

type SunStatus = "idle" | "loading" | "ready" | "failed";

export type TideWindowData = {
  rows: TideSample[];
  startMs: number | null;
  sunTimes: {
    sunrise: string | null;
    sunset: string | null;
  } | null;
  sunWindowStart: number | null;
  sunStatus: SunStatus;
  loading: boolean;
  resolved: boolean;
};

export function useTideWindowData({
  beachId,
  date,
  hours = 24,
  bufferHours = 6,
  enabled = true,
  initialRows,
  initialStartMs,
}: Options): TideWindowData {
  const [rows, setRows] = useState<TideSample[]>(initialRows ?? []);
  const [startMs, setStartMs] = useState<number | null>(
    initialStartMs ?? null
  );
  const [loading, setLoading] = useState(!enabled && !initialRows?.length);
  const [sunTimes, setSunTimes] = useState<{
    sunrise: string | null;
    sunset: string | null;
  } | null>(null);
  const [sunWindowStart, setSunWindowStart] = useState<number | null>(null);
  const [sunStatus, setSunStatus] = useState<SunStatus>("idle");
  const [resolved, setResolved] = useState(Boolean(initialRows?.length));
  const requestIdRef = useRef(0);
  const { getSunData } = useSunData();

  const targetDate = useMemo(
    () => (date instanceof Date ? date : new Date()),
    [date]
  );
  const windowRange = useMemo(
    () => getPacificDayRange(targetDate),
    [targetDate]
  );
  const windowStartMs = windowRange.start.getTime();
  const windowEndMs = windowRange.end.getTime();

  useEffect(() => {
    if (initialRows?.length) {
      setRows(initialRows);
      setStartMs(initialStartMs ?? null);
      setResolved(true);
    }
  }, [initialRows, initialStartMs]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (!beachId) {
      setRows([]);
      setStartMs(null);
      setSunTimes(null);
      setSunWindowStart(null);
      setSunStatus("idle");
      setLoading(false);
      setResolved(true);
      return;
    }
    let cancelled = false;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setResolved(false);
    setSunStatus("loading");

    const load = async () => {
      try {
        const resolved = await fetchBeachByIdLoose(beachId);
        const resolvedId = String(resolved?.id ?? beachId);
        const baseStart = windowRange.start;
        const baseEnd = windowRange.end;
        const startDate = new Date(baseStart.getTime() - bufferHours * HOURS_TO_MS);
        const endDate = new Date(
          baseEnd.getTime() + bufferHours * HOURS_TO_MS
        );

        const loadSun = getSunData(resolvedId, new Date(baseStart))
          .then((sunData) => {
            if (!cancelled && requestId === requestIdRef.current) {
              setSunTimes(sunData);
              setSunWindowStart(baseStart.getTime());
              setSunStatus("ready");
            }
            return sunData;
          })
          .catch((error) => {
            console.warn("Failed to load sun data for tide window", error);
            if (!cancelled && requestId === requestIdRef.current) {
              setSunTimes(null);
              setSunWindowStart(baseStart.getTime());
              setSunStatus("failed");
            }
            return null;
          });

        const tideRows = await getTidesCached(resolvedId, startDate, endDate);
        let samples: TideSample[];
        if (tideRows && tideRows.length > 0) {
          samples = tideRows
            .filter((row) => row.tideLevelFt != null)
            .map((row) => ({
              x: new Date(row.timestamp).getTime(),
              tide: row.tideLevelFt ?? 0,
            }));
        } else {
          const forecastRows = await getForecastCached(
            resolvedId,
            startDate,
            endDate
          );
          samples = forecastRows.map((row) => ({
            x: new Date(row.timestamp).getTime(),
            tide: row.conditions.tideLevel ?? 0,
          }));
        }

        await loadSun;
        if (!cancelled && requestId === requestIdRef.current) {
          setRows(samples);
          setStartMs(baseStart.getTime());
          setResolved(true);
        }
      } catch (error) {
        console.error("Failed to load tide window", error);
        if (!cancelled && requestId === requestIdRef.current) {
          setRows([]);
          setStartMs(null);
          setSunTimes(null);
          setSunWindowStart(null);
          setSunStatus("failed");
          setResolved(true);
        }
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    beachId,
    bufferHours,
    hours,
    windowStartMs,
    windowEndMs,
    getSunData,
  ]);

  return {
    rows,
    startMs,
    sunTimes,
    sunWindowStart,
    sunStatus,
    loading,
    resolved,
  };
}
