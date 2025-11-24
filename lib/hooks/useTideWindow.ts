"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getForecastCached, getTidesCached } from "@/lib/dataCache";
import { fetchBeachByIdLoose } from "@/lib/supabase";
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

const resolvePacificMidnightMs = (basis: Date) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(basis);
  const year = parseInt(parts.find((p) => p.type === "year")?.value || "0");
  const month =
    parseInt(parts.find((p) => p.type === "month")?.value || "1") - 1;
  const day = parseInt(parts.find((p) => p.type === "day")?.value || "1");

  const noonUTC = Date.UTC(year, month, day, 12, 0, 0, 0);
  const noonDate = new Date(noonUTC);
  const noonFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    hour12: false,
  });
  const pacificNoonHour = parseInt(noonFormatter.format(noonDate));
  const offsetHours = pacificNoonHour - 12;

  return Date.UTC(year, month, day, -offsetHours, 0, 0, 0);
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
  const windowStartMs = useMemo(
    () => resolvePacificMidnightMs(targetDate),
    [targetDate]
  );

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
        const startDate = new Date(windowStartMs - bufferHours * HOURS_TO_MS);
        const endDate = new Date(
          windowStartMs + (hours + bufferHours) * HOURS_TO_MS
        );

        const loadSun = getSunData(resolvedId, new Date(windowStartMs))
          .then((sunData) => {
            if (!cancelled && requestId === requestIdRef.current) {
              setSunTimes(sunData);
              setSunWindowStart(windowStartMs);
              setSunStatus("ready");
            }
            return sunData;
          })
          .catch((error) => {
            console.warn("Failed to load sun data for tide window", error);
            if (!cancelled && requestId === requestIdRef.current) {
              setSunTimes(null);
              setSunWindowStart(windowStartMs);
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
          setStartMs(windowStartMs);
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
  }, [enabled, beachId, bufferHours, hours, windowStartMs, getSunData]);

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
