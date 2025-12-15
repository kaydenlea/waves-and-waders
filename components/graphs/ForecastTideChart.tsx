"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
  LabelList,
} from "recharts";
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunrise,
  Sunset,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { fetchBeachByIdLoose, fetchBeachDetails } from "@/lib/supabase";
import { getForecastCached, getTidesCached } from "@/lib/dataCache";
import DaySlider from "../general/DaySlider";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import {
  useDateContext,
  useHoveredHour,
} from "@/components/context/DateContext";
import { useForecastChartContext } from "@/components/context/ForecastChartContext";
import { useSunData } from "@/components/context/SunDataContext";
import {
  useForecastChartLoading,
  useForecastChartsBusyState,
} from "../context/ForecastChartsLoadingContext";
import { ForecastChartSkeleton } from "./ForecastChartSkeleton";

const VISIBLE_DAYS = 4;
const HOURS_PER_DAY = 24;
const VISIBLE_HOURS = VISIBLE_DAYS * HOURS_PER_DAY;
const FETCH_DAYS = VISIBLE_DAYS; // fetch one extra day to allow forward pan
const MIN_DAY_PX = 275; // minimum pixels per day to keep UI usable on tiny screens
const CHART_LEFT_MARGIN = 0;
const CHART_RIGHT_MARGIN = 0;
const Y_AXIS_WIDTH = 30;
const DAY_LABEL_INSET = 6;
const Y_AXIS_OFFSET_VAR = "--forecast-y-axis-offset";
const Y_AXIS_TICK = {
  fill: "var(--foreground)",
  fontWeight: 700,
  filter: "drop-shadow(0 0 4px var(--background))",
} as const;

type Props = { beachId?: string; date?: Date; days?: Date[] };
type TidePoint = { hour: number; tide: number; isPeak?: number };
type ChartState = {
  data: TidePoint[];
  dayAreas: { x1: number; x2: number }[];
  nightAreas: { x1: number; x2?: number }[];
  sunMarkers: { hour: number; type: "sunrise" | "sunset" }[];
  tideStats: { dayIndex: number; high: number; low: number }[];
};

export default React.memo(function ForecastTideChart({
  beachId,
  date,
  days,
}: Props) {
  // Compute Pacific midnight for the requested start date once
  const { startMs, fetchHours } = useMemo(() => {
    const startInput = date instanceof Date ? new Date(date) : new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(startInput);
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

    const start = Date.UTC(year, month, day, -offsetHours, 0, 0, 0);
    const hours = FETCH_DAYS * HOURS_PER_DAY;
    return { startMs: start, fetchHours: hours };
  }, [date]);

  const { setPanFraction, subscribePan } = useForecastChartContext();
  const { getSunData } = useSunData();
  const myId = React.useId();
  const sunCacheRef = useRef<
    Map<
      string,
      {
        dayAreas: { x1: number; x2: number }[];
        nightAreas: { x1: number; x2?: number }[];
        sunMarkers: { hour: number; type: "sunrise" | "sunset" }[];
      }
    >
  >(new Map());
  const {
    selected: selectedDate,
    hour: selectedHour,
    setHoveredHour,
  } = useDateContext();
  const hoveredHour = useHoveredHour();
  const [loading, setLoading] = useState(true);
  const [stableSelectedHour, setStableSelectedHour] = useState<number | null>(
    null
  );
  const { setReady } = useForecastChartLoading("forecast-tide");
  const dashboardBusy = useForecastChartsBusyState();

  // data loaded for FETCH_DAYS days (hours)
  const [chartState, setChartState] = useState<ChartState>({
    data: [],
    dayAreas: [],
    nightAreas: [],
    sunMarkers: [],
    tideStats: [],
  });
  const { data, dayAreas, nightAreas, sunMarkers, tideStats } = chartState;
  const shadingReady = dayAreas.length > 0 || nightAreas.length > 0;
  useEffect(() => {
    setLoading(data.length === 0);
  }, [data]);
  // Mark this widget as not ready whenever its local loading flag is true.
  useEffect(() => {
    if (loading) {
      setReady(false);
    }
  }, [loading, setReady]);
  // Mark ready only after data and shading are fully ready.
  useEffect(() => {
    if (!loading && shadingReady) {
      setReady(true);
    }
  }, [loading, shadingReady, setReady]);
  useEffect(() => {
    if (!dashboardBusy) {
      setStableSelectedHour(selectedHour ?? null);
    }
  }, [dashboardBusy, selectedHour]);

  // which day index (0..totalFetchedDays - VISIBLE_DAYS) is the first visible day
  const [dayOffset, setDayOffset] = useState(0);

  // layout
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isAtRightEdge, setIsAtRightEdge] = useState(false);

  // Derived
  const totalFetchedDays = useMemo(() => FETCH_DAYS, []); // fixed for predictability
  const dayPx = useMemo(() => {
    if (!containerWidth) return MIN_DAY_PX;
    const fillPerDay = containerWidth / VISIBLE_DAYS;
    // clamp so days don't become tiny
    return Math.max(MIN_DAY_PX, Math.floor(fillPerDay));
  }, [containerWidth]);

  const chartInnerWidth = useMemo(
    () => totalFetchedDays * dayPx,
    [totalFetchedDays, dayPx]
  );
  const dataAreaWidth =
    chartInnerWidth - CHART_LEFT_MARGIN - CHART_RIGHT_MARGIN - Y_AXIS_WIDTH;
  const dayLabelLeftOffset = CHART_LEFT_MARGIN + Y_AXIS_WIDTH;
  const dayLabelColumnWidth = dataAreaWidth / totalFetchedDays;
  const dayLabelAvailableWidth = totalFetchedDays * dayLabelColumnWidth;
  const viewportWidth = useMemo(
    () => Math.min(containerWidth || 0, dayPx * VISIBLE_DAYS),
    [containerWidth, dayPx]
  );
  const showSkeleton = loading || !shadingReady || containerWidth === 0;

  // Pointer & animation refs (imperative values to avoid re-renders)
  const currentTranslateRef = useRef(0); // px
  const pointerStateRef = useRef<{
    dragging: boolean;
    startX: number;
    startTranslate: number;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const broadcastRafRef = useRef<number | null>(null);

  // helpers: clamp translate (px)
  const clampTranslatePx = useCallback(
    (px: number) => {
      const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
      return Math.max(0, Math.min(px, maxTranslate));
    },
    [chartInnerWidth, viewportWidth]
  );

  // set transform imperatively (no setState) - removed per-frame setState here
  const setInnerTranslatePx = useCallback(
    (px: number, withTransition = false) => {
      const node = innerRef.current;
      if (!node) return;
      if (withTransition) {
        node.style.transition = "transform 360ms cubic-bezier(.2,.9,.2,1)";
      } else {
        node.style.transition = "none";
      }
      node.style.setProperty(Y_AXIS_OFFSET_VAR, `${px}px`);
      node.style.transform = `translate3d(-${px}px,0,0)`;
      currentTranslateRef.current = px;
      // IMPORTANT: intentionally do NOT call setIsAtRightEdge here to avoid re-renders per-frame
    },
    []
  );

  // animate from currentTranslateRef to targetPx with RAF (smooth)
  const animateToPx = useCallback(
    (targetPx: number, onEnd?: () => void) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const start = currentTranslateRef.current;
      const delta = targetPx - start;
      if (Math.abs(delta) < 1) {
        setInnerTranslatePx(targetPx, true);
        onEnd?.();
        return;
      }
      const duration = 320;
      const startTime = performance.now();

      const step = (t: number) => {
        const p = Math.min(1, (t - startTime) / duration);
        // easeOutCubic
        const ease = 1 - Math.pow(1 - p, 3);
        const v = start + delta * ease;
        setInnerTranslatePx(clampTranslatePx(v), false);
        if (p < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          // final snap with transition for crispness
          setInnerTranslatePx(clampTranslatePx(targetPx), true);
          rafRef.current = null;
          onEnd?.();
        }
      };

      rafRef.current = requestAnimationFrame(step);
    },
    [clampTranslatePx, setInnerTranslatePx]
  );

  // pointer handlers (imperative)
  const onPointerDown = (ev: React.PointerEvent) => {
    const node = ev.currentTarget as Element;
    node.setPointerCapture?.(ev.pointerId);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pointerStateRef.current = {
      dragging: true,
      startX: ev.clientX,
      startTranslate: currentTranslateRef.current,
    };
    // remove transition for immediate follow
    setInnerTranslatePx(currentTranslateRef.current, false);
    // prevent text selection
    document.body.style.userSelect = "none";
    document.body.style.touchAction = "none";
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    const ps = pointerStateRef.current;
    if (!ps || !ps.dragging) return;
    const delta = ev.clientX - ps.startX;
    const next = clampTranslatePx(ps.startTranslate - delta);
    // update transform imperatively (no React state)
    setInnerTranslatePx(next, false);
    if (!broadcastRafRef.current) {
      broadcastRafRef.current = requestAnimationFrame(() => {
        broadcastRafRef.current = null;
        setPanFraction(next / dayPx, myId, "drag");
      });
    }
  };

  const snapToNearestDayFromPx = useCallback(
    (px: number) => {
      const day = Math.round(px / dayPx);
      const dayClamped = Math.max(
        0,
        Math.min(day, totalFetchedDays - VISIBLE_DAYS)
      );
      return dayClamped;
    },
    [dayPx, totalFetchedDays]
  );

  const RoundToNearestDayFromPx = useCallback(
    (px: number) => {
      const day = Math.round(px / dayPx);
      const dayClamped = Math.max(
        0,
        Math.min(day, totalFetchedDays - VISIBLE_DAYS)
      );
      return dayClamped;
    },
    [dayPx, totalFetchedDays]
  );

  const onPointerUp = (ev: React.PointerEvent) => {
    const node = ev.currentTarget as Element;
    node.releasePointerCapture?.(ev.pointerId);
    const ps = pointerStateRef.current;
    if (!ps) return;
    pointerStateRef.current = null;
    document.body.style.userSelect = "";
    document.body.style.touchAction = "";
    if (broadcastRafRef.current) {
      cancelAnimationFrame(broadcastRafRef.current);
      broadcastRafRef.current = null;
    }

    // get the current pixel translation (where the user left it)
    const finalPx = clampTranslatePx(currentTranslateRef.current);

    // compute the fractional offset in days
    const fractionalDayOffset = finalPx / dayPx;

    // update logical day offset - keeps button behavior in sync
    setDayOffset(fractionalDayOffset);
    setPanFraction(fractionalDayOffset, myId, "animate");

    // do NOT animate or snap visually (user position is already correct)
    // Just ensure transform matches clamped px
    setInnerTranslatePx(finalPx, false);

    // update right-edge flag once at drag end (low frequency)
    const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
    setIsAtRightEdge(finalPx >= maxTranslate - 1);
  };

  // Button controls: animate to next/prev by one day
  const handleNext = useCallback(() => {
    const maxOffset = Math.max(0, totalFetchedDays - 1);
    const currentFractionalOffset = currentTranslateRef.current / dayPx;
    const newOffset = Math.min(maxOffset, currentFractionalOffset + 1);
    const targetPx = newOffset * dayPx;
    // broadcast target first so others animate in sync
    setPanFraction(newOffset, myId, "animate");
    animateToPx(targetPx, () => {
      setDayOffset(newOffset);
      // update isAtRightEdge after animation completes
      const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
      setIsAtRightEdge(targetPx >= maxTranslate - 1);
    });
  }, [animateToPx, dayPx, totalFetchedDays, chartInnerWidth, viewportWidth]);

  const handleBack = useCallback(() => {
    const currentFractionalOffset = currentTranslateRef.current / dayPx;
    const newOffset = Math.max(0, currentFractionalOffset - 1);
    const targetPx = newOffset * dayPx;
    setPanFraction(newOffset, myId, "animate");
    animateToPx(targetPx, () => {
      setDayOffset(newOffset);
      // update isAtRightEdge after animation completes
      const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
      setIsAtRightEdge(targetPx >= maxTranslate - 1);
    });
  }, [animateToPx, dayPx, chartInnerWidth, viewportWidth]);

  // Subscribe to external pan updates
  useEffect(() => {
    const unsub = subscribePan(
      (fraction, sourceId, mode) => {
        if (sourceId === myId) return;
        const px = clampTranslatePx(fraction * dayPx);
        if (mode === "animate") {
          const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
          setIsAtRightEdge(px >= maxTranslate - 1);
          setDayOffset(fraction);
          animateToPx(px);
        } else {
          setInnerTranslatePx(px, false);
        }
      },
      { immediate: true }
    );
    return () => unsub();
  }, [subscribePan, myId, dayPx, clampTranslatePx, setInnerTranslatePx]);

  // Update inner transform when dayOffset or dayPx changes (unless user is actively dragging)
  useEffect(() => {
    // if user is dragging, avoid snapping
    if (pointerStateRef.current?.dragging) return;
    const px = clampTranslatePx(dayOffset * dayPx);
    // animate to logical position for programmatic changes
    setInnerTranslatePx(px, true);

    // update right-edge flag once (low frequency)
    // const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
    // setIsAtRightEdge(px >= maxTranslate - 1);
  }, [
    dayOffset,
    dayPx,
    clampTranslatePx,
    setInnerTranslatePx,
    chartInnerWidth,
    viewportWidth,
  ]);

  // ResizeObserver for container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.floor(e.contentRect.width);
        setContainerWidth(w);
        // compute right-edge after resize (low frequency)
        const maxTranslate = Math.max(
          0,
          chartInnerWidth - Math.min(w || 0, dayPx * VISIBLE_DAYS)
        );
        setIsAtRightEdge(currentTranslateRef.current >= maxTranslate - 1);
      }
    });
    ro.observe(el);
    // setContainerWidth(Math.floor(el.clientWidth));

    // also set isAtRightEdge on mount
    const maxTranslateOnMount = Math.max(0, chartInnerWidth - viewportWidth);
    setIsAtRightEdge(currentTranslateRef.current >= maxTranslateOnMount - 1);

    return () => ro.disconnect();
  }, [chartInnerWidth, dayPx, viewportWidth]);

  // Fetch tide + day info for FETCH_DAYS
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!beachId) return;
      try {
        const resolved = await fetchBeachByIdLoose(beachId);
        const id = resolved?.id ?? beachId;
        const end = new Date(startMs + fetchHours * 60 * 60 * 1000);
        const seriesRaw = await (async (): Promise<TidePoint[]> => {
          const points = await getTidesCached(
            String(id),
            new Date(startMs),
            end
          );
          if (!points || points.length === 0) {
            const rows = await getForecastCached(
              String(id),
              new Date(startMs),
              end
            );
            return rows.map((r) => ({
              hour: Math.round(
                (new Date(r.timestamp).getTime() - startMs) / (60 * 60 * 1000)
              ),
              tide: r.conditions.tideLevel ?? 0,
            }));
          }
          return points.map((p) => ({
            hour:
              (new Date(p.timestamp).getTime() - startMs) / (60 * 60 * 1000),
            tide: p.tideLevelFt ?? 0,
          }));
        })();

        let series = (seriesRaw ?? [])
          .filter((p) => p.hour >= 0 && p.hour <= fetchHours)
          .sort((a, b) => a.hour - b.hour);

        if (series.length === 0) {
          if (!cancelled) {
            setChartState({
              data: [],
              tideStats: [],
              dayAreas: [],
              nightAreas: [],
              sunMarkers: [],
            });
          }
          return;
        }

        // peaks
        const out = series.map((p) => ({ ...p }));
        for (let i = 1; i < series.length - 1; i++) {
          const a = series[i - 1],
            b = series[i],
            c = series[i + 1];
          if (b.tide > a.tide && b.tide >= c.tide)
            out[i].isPeak = Number(b.tide.toFixed(1));
          else if (b.tide < a.tide && b.tide <= c.tide)
            out[i].isPeak = Number(b.tide.toFixed(1));
        }

        // Calculate tide high/low stats for each day (absolute highest and lowest)
        const tideStatsBuild: {
          dayIndex: number;
          high: number;
          low: number;
        }[] = [];
        for (let di = 0; di < FETCH_DAYS; di++) {
          const dayStart = di * 24;
          const dayEnd = (di + 1) * 24;
          const dayPoints = out.filter(
            (p) => p.hour >= dayStart && p.hour < dayEnd
          );

          if (dayPoints.length > 0) {
            const tideValues = dayPoints.map((p) => p.tide);
            const high = Math.max(...tideValues);
            const low = Math.min(...tideValues);
            tideStatsBuild.push({ dayIndex: di, high, low });
          }
        }

        if (!cancelled) {
          setChartState({
            data: out,
            tideStats: tideStatsBuild,
            dayAreas: [],
            nightAreas: [],
            sunMarkers: [],
          });
        }
      } catch (e) {
        console.error("ForecastTideChart load error:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [beachId, startMs, fetchHours]);

  // TODO(overview-perf): Align this sun/shading pipeline with buildSunSegmentsForRange so
  // tide lines and night/day shading load together and reuse the same multi-day segments.
  // Load sun/shading markers after tide data is ready so lines render sooner
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!beachId) return;
      const cacheKey = `${beachId}-${startMs}`;
      const cached = sunCacheRef.current.get(cacheKey);
      if (cached) {
        setChartState((prev) => ({
          ...prev,
          dayAreas: cached.dayAreas,
          nightAreas: cached.nightAreas,
          sunMarkers: cached.sunMarkers,
        }));
        return;
      }

      // Show a provisional daytime/nighttime split while we fetch precise times
      const approxDayAreas = Array.from({ length: FETCH_DAYS }, (_, di) => ({
        x1: di * 24 + 6,
        x2: di * 24 + 18,
      }));
      const approxNightAreas: { x1: number; x2?: number }[] = [];
      for (let di = 0; di < FETCH_DAYS; di++) {
        approxNightAreas.push({ x1: di * 24, x2: di * 24 + 6 });
        approxNightAreas.push({ x1: di * 24 + 18, x2: di * 24 + 24 });
      }
      setChartState((prev) => ({
        ...prev,
        dayAreas: approxDayAreas,
        nightAreas: approxNightAreas,
        sunMarkers: [],
      }));

      try {
        const parseHM = (s: string | null): { h: number; m: number } | null => {
          if (!s) return null;
          const m = /^(\d{1,2}):(\d{2})/.exec(s.trim());
          if (!m) return null;
          const h = Number(m[1]);
          const mm = Number(m[2]);
          if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
          return { h, m: mm };
        };

        const dayAreasBuild: { x1: number; x2: number }[] = [];
        const nightAreasBuild: { x1: number; x2?: number }[] = [];
        const markerTargets: { hour: number; type: "sunrise" | "sunset" }[] =
          [];
        let nightStart = 0;
        const sunResults = await Promise.all(
          Array.from({ length: FETCH_DAYS }, (_, di) => {
            const currentDate = new Date(startMs + di * 24 * 60 * 60 * 1000);
            return getSunData(beachId, currentDate).catch(() => null);
          })
        );

        for (let di = 0; di < FETCH_DAYS; di++) {
          const sunData = sunResults[di];
          const rise = parseHM(sunData?.sunrise ?? null);
          const setv = parseHM(sunData?.sunset ?? null);
          if (!rise || !setv) {
            dayAreasBuild.push({ x1: di * 24, x2: di * 24 + 24 });
            nightAreasBuild.push({ x1: nightStart, x2: di * 24 });
            nightStart = di * 24 + 24;
            continue;
          }
          const offset = di * 24;
          const rH = offset + rise.h + rise.m / 60;
          const sH = offset + setv.h + setv.m / 60;
          const dayStart = Math.min(rH, sH);
          const dayEnd = Math.max(rH, sH);
          dayAreasBuild.push({ x1: dayStart, x2: dayEnd });
          nightAreasBuild.push({ x1: nightStart, x2: dayStart });
          nightStart = dayEnd;
          markerTargets.push({ hour: rH, type: "sunrise" });
          markerTargets.push({ hour: sH, type: "sunset" });
        }
        nightAreasBuild.push({ x1: nightStart });

        const markers: { hour: number; type: "sunrise" | "sunset" }[] = [];
        if (markerTargets.length) {
          for (const target of markerTargets) {
            if (chartState.data.length) {
              let closest = chartState.data[0];
              let minDiff = Math.abs(chartState.data[0].hour - target.hour);
              for (const point of chartState.data) {
                const diff = Math.abs(point.hour - target.hour);
                if (diff < minDiff) {
                  minDiff = diff;
                  closest = point;
                }
              }
              const withinTolerance = minDiff < 0.17;
              const alreadyPlaced = markers.find(
                (m) => m.hour === closest.hour
              );
              if (withinTolerance && !alreadyPlaced) {
                markers.push({ hour: closest.hour, type: target.type });
                continue;
              }
            }
            // fallback: place at target hour if no tide data yet or outside tolerance
            markers.push({ hour: target.hour, type: target.type });
          }
        }

        if (!cancelled) {
          setChartState((prev) => {
            const next = {
              ...prev,
              dayAreas: dayAreasBuild,
              nightAreas: nightAreasBuild,
              sunMarkers: markers,
            };
            sunCacheRef.current.set(cacheKey, next);
            return next;
          });
        }
      } catch (e) {
        console.error("ForecastTideChart sun load error:", e);
        if (!cancelled) {
          setChartState((prev) => {
            const cleared = {
              ...prev,
              dayAreas: [],
              nightAreas: [],
              sunMarkers: [],
            };
            sunCacheRef.current.set(cacheKey, cleared);
            return cleared;
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [beachId, chartState.data, startMs, getSunData]);

  // Prepare day label texts for the *visible 4 days* starting at dayOffset
  // const dayLabels = useMemo(() => {
  //   const base = date instanceof Date ? new Date(date) : new Date();
  //   const startLocal = new Date(
  //     base.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  //   );
  //   startLocal.setHours(0, 0, 0, 0);
  //   const labels = [];
  //   for (let i = 0; i < VISIBLE_DAYS; i++) {
  //     const d = new Date(startLocal.getTime() + i * 24 * 60 * 60 * 1000);
  //     labels.push(
  //       d.toLocaleDateString(undefined, {
  //         weekday: "short",
  //         month: "numeric",
  //         day: "numeric",
  //         timeZone: "America/Los_Angeles",
  //       })
  //     );
  //   }
  //   return labels;
  // }, [date]);
  const dayLabels =
    Array.isArray(days) && days.length > 0
      ? days.map((d) =>
          d.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            timeZone: "America/Los_Angeles",
          })
        )
      : null;

  // Compute label positions with collision avoidance
  const labelPositions = useMemo(() => {
    const peaks = data
      .map((d, idx) => ({ ...d, index: idx }))
      .filter((d) => d.isPeak !== undefined && d.isPeak !== null);

    if (peaks.length === 0) return new Map<number, number>();

    const positions = new Map<number, number>(); // index -> y-offset
    const LABEL_WIDTH = 70; // Approximate width of label text (increased for better detection)

    // Sort peaks by x-position (hour)
    const sorted = [...peaks].sort((a, b) => a.hour - b.hour);

    // Calculate chart width scale (pixels per hour)
    const pxPerHour = chartInnerWidth / (totalFetchedDays * 24);

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      let baseOffset = -32; // Default offset from point (above)

      // Check for collisions with all previous labels
      for (let j = i - 1; j >= 0; j--) {
        const prev = sorted[j];
        const prevOffset = positions.get(prev.index) ?? -32;

        // Calculate horizontal distance in pixels
        const xDist = Math.abs(current.hour - prev.hour) * pxPerHour;

        // If labels overlap horizontally, alternate above/below
        if (xDist < LABEL_WIDTH) {
          // Alternate: if previous is above (negative), place current below (positive)
          if (prevOffset < 0) {
            baseOffset = 25; // Below the curve
          } else {
            baseOffset = -32; // Above the curve
          }
          break; // Only check the most recent overlapping label
        }
      }

      positions.set(current.index, baseOffset);
    }

    return positions;
  }, [data, chartInnerWidth, totalFetchedDays]);

  const hourTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let v = 0; v <= 24 * totalFetchedDays; v += 3) {
      ticks.push(v);
    }
    return ticks;
  }, [totalFetchedDays]);
  const formatHourLabel = useCallback((label: unknown, payload: any[]) => {
    let hour = payload?.[0]?.payload?.hour;
    if (typeof hour !== "number" && typeof label === "number") {
      hour = label;
    }
    if (typeof hour !== "number") return "";
    const wholeHour = Math.floor(hour);
    const minutes = Math.round((hour - wholeHour) * 60);
    const displayHour = wholeHour % 12 === 0 ? 12 : wholeHour % 12;
    const ampm = wholeHour % 24 >= 12 ? "PM" : "AM";
    return minutes > 0
      ? `${displayHour}:${minutes.toString().padStart(2, "0")} ${ampm}`
      : `${displayHour} ${ampm}`;
  }, []);

  // Hover sync handlers - DateContext handles RAF batching
  const lastHoveredRef = React.useRef<number | null>(null);

  const handleMouseMove = React.useCallback(
    (e: any) => {
      if (e && e.activeLabel !== undefined) {
        const hour = Number(e.activeLabel);
        if (!isNaN(hour)) {
          // Round to nearest 3-hour increment like overview charts
          const roundedHour = Math.round(hour / 3) * 3;

          // Only broadcast to other charts when crossing 3-hour boundaries
          if (lastHoveredRef.current !== roundedHour) {
            lastHoveredRef.current = roundedHour;
            // DateContext batches this with RAF - no need to batch here
            setHoveredHour(roundedHour);
          }
        }
      }
    },
    [setHoveredHour]
  );

  const handleMouseLeave = React.useCallback(() => {
    lastHoveredRef.current = null;
    setHoveredHour(null);
  }, [setHoveredHour]);

  // Memoize hover line to prevent unnecessary re-renders
  const hoverLine = React.useMemo(() => {
    if (hoveredHour === null) return null;
    return (
      <ReferenceLine
        x={hoveredHour}
        stroke="var(--foreground)"
        strokeWidth={1}
        strokeOpacity={0.5}
        strokeDasharray="5 5"
      />
    );
  }, [hoveredHour]);

  // Render
  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="relative w-full"
        style={{
          height: 300,
          overflow: "hidden",
          background: "transparent",
          contain: "layout style paint",
          willChange: "transform",
        }}
      >
        {showSkeleton && (
          <ForecastChartSkeleton className="absolute inset-0 z-50 h-full w-full" />
        )}
        <div
          className={cn(
            "h-full transition-opacity duration-200",
            showSkeleton ? "opacity-0" : "opacity-100"
          )}
        >
          {/* prev/next buttons */}
          <button
            aria-label="Back one day"
            onClick={handleBack}
            className={cn(
              "absolute left-4 top-[55%] -translate-y-1/2 z-50 rounded-full bg-highlight-7/90 p-1 shadow border border-border/30 shadow-even backdrop-blur-xl",
              dayOffset === 0 && "hidden"
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            aria-label="Next one day"
            onClick={handleNext}
            className={cn(
              "absolute right-4 top-[55%] -translate-y-1/2 z-50 rounded-full bg-highlight-7/90 p-1 shadow border border-border/30 shadow-even backdrop-blur-xl",
              isAtRightEdge && "hidden"
            )}
          >
            <ChevronRight className="w-5 h-5" />
          </button>

        {/* moving inner (chart + day separators) */}
        <div
          ref={innerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            marginTop: 65,
            position: "absolute",
            left: 0,
            // top: 60, // leave room for label bar
            width: chartInnerWidth,
            height: 250,
            display: "block",
            willChange: "transform",
            cursor: "grab",
            touchAction: "pan-y",
          }}
        >
          {/* Day label bar (4 filled boxes) - fixed in viewport and aligned to visible days */}
          <div
            style={{
              position: "absolute",
              zIndex: 40,
              left: dayLabelLeftOffset,
              top: -65,
              width: dayLabelAvailableWidth,
              display: "grid",
              gridTemplateColumns: `repeat(${totalFetchedDays}, ${dayLabelColumnWidth}px)`,
              pointerEvents: "none",
            }}
          >
            {dayLabels?.map((label, idx) => (
              <div
                key={idx}
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 13,
                  color: "var(--foreground)",
                  pointerEvents: "none",
                }}
              >
                <div
                  className="flex justify-between whitespace-nowrap px-3 py-2 rounded-lg bg-highlight-5"
                  style={{ width: "95%" }}
                >
                  <span className="flex flex-col items-start">
                    <span className="text-xs font-medium">
                      {label.split(",")[1]}
                    </span>
                    <span className="text-sm font-bold">
                      {label.split(",")[0]}
                    </span>
                  </span>
                  <div className="rounded-md bg-highlight-6 grid grid-cols-[60px_1fr] grid-rows-2 space-y-0.5 items-center text-xs text-muted-foreground uppercase tracking-wide leading-tight">
                    <span className="flex gap-2 items-center">
                      <TrendingUp
                        fill="#353535ff"
                        className="stroke-muted-foreground w-4 h-4"
                      />
                      <span className="font-medium">High</span>
                    </span>
                    <span className="ml-1 text-foreground normal-case font-medium">
                      {tideStats[idx]?.high.toFixed(1) ?? "--"}{" "}
                      <span className="inline-block">ft</span>
                    </span>
                    <span className="flex gap-2 items-center">
                      <TrendingDown
                        fill="#353535ff"
                        className="stroke-muted-foreground w-4 h-4"
                      />
                      <span className="-mb-0.5 font-medium">Low</span>
                    </span>
                    <span className="ml-1 text-foreground normal-case font-medium">
                      {tideStats[idx]?.low.toFixed(1) ?? "--"}{" "}
                      <span className="inline-block">ft</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {containerWidth > 0 && (
            <ChartContainer
              config={
                { tide: { label: "Tide", color: "#6e6e6eff" } } as ChartConfig
              }
              className="forecast-tide-chart-container aspect-auto h-[235px] w-full"
            >
              <LineChart
                accessibilityLayer={false}
                width={chartInnerWidth}
                // height={200}
                data={data}
                margin={{
                  left: CHART_LEFT_MARGIN,
                  right: CHART_RIGHT_MARGIN,
                  bottom: 5,
                  top: 0,
                }}
                syncId="allCharts"
                syncMethod="value"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                {dayAreas.map((a, idx) => (
                  <ReferenceArea
                    key={`day-${idx}`}
                    x1={a.x1}
                    x2={a.x2}
                    fill="#FFE58F"
                    fillOpacity={0.18}
                    ifOverflow="extendDomain"
                  />
                ))}
                {nightAreas.map((a, idx) => (
                  <ReferenceArea
                    key={`night-${idx}`}
                    x1={idx === 0 ? undefined : a.x1}
                    x2={idx === nightAreas.length - 1 ? undefined : a.x2}
                    fill="#ccc1ffff"
                    fillOpacity={0.12}
                    ifOverflow="extendDomain"
                  />
                ))}

                {/* vertical boundaries every day */}
                {Array.from({ length: totalFetchedDays + 1 }, (_, i) => {
                  if (i !== 0 && i !== totalFetchedDays) {
                    return (
                      <ReferenceLine
                        key={`boundary-${i}`}
                        x={i * 24}
                        stroke="var(--foreground)"
                        strokeOpacity={0.25}
                        strokeWidth={0.5}
                      />
                    );
                  }
                })}

                {/* <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--foreground)"
                strokeWidth={0.08}
                vertical={false}
              /> */}
                <XAxis
                  dataKey="hour"
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={0}
                  fontSize={11}
                  domain={[0, totalFetchedDays * 24]}
                  ticks={hourTicks}
                  tickFormatter={(v: number) =>
                    v % 3 === 0 ? String(v % 12 === 0 ? 12 : v % 12) : ""
                  }
                />
                <YAxis
                  dataKey="tide"
                  width={Y_AXIS_WIDTH}
                  tickLine={false}
                  axisLine={{
                    stroke: "var(--border)",
                    strokeWidth: 1.25,
                    opacity: 0.85,
                  }}
                  tickMargin={8}
                  fontSize={11}
                  tick={Y_AXIS_TICK}
                  domain={[
                    (dataMin: number) =>
                      Number.isFinite(dataMin) ? Math.floor(dataMin) - 4 : 0,
                    (dataMax: number) =>
                      Number.isFinite(dataMax)
                        ? Math.max(Math.ceil(dataMax) + 4, 8)
                        : 8,
                  ]}
                  style={{
                    transform: `translateX(var(${Y_AXIS_OFFSET_VAR}, 0px))`,
                  }}
                />
                {/* Selected hour marker */}
                {(() => {
                  try {
                    const effectiveHour =
                      stableSelectedHour ?? selectedHour ?? null;
                    const base = days && days.length > 0 ? days[0] : null;
                    if (!base || !selectedDate || effectiveHour == null)
                      return null;
                    const baseMid = new Date(
                      base.getFullYear(),
                      base.getMonth(),
                      base.getDate()
                    ).getTime();
                    const selMid = new Date(
                      selectedDate.getFullYear(),
                      selectedDate.getMonth(),
                      selectedDate.getDate()
                    ).getTime();
                    const dayDelta = Math.floor(
                      (selMid - baseMid) / (24 * 3600 * 1000)
                    );
                    const x = dayDelta * 24 + effectiveHour;
                    if (x < 0 || x > totalFetchedDays * 24) return null;
                    return (
                      <ReferenceLine
                        x={x}
                        stroke="var(--foreground)"
                        strokeDasharray="3 3"
                      />
                    );
                  } catch {
                    return null;
                  }
                })()}
                {/* Hover indicator line */}
                {hoverLine}
                <ChartTooltip
                  content={
                    <ChartTooltipContent labelFormatter={formatHourLabel} />
                  }
                  cursor={{
                    stroke: "var(--foreground)",
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                    strokeOpacity: 0.5,
                  }}
                  animationDuration={0}
                  isAnimationActive={false}
                />

                <Line
                  dataKey="tide"
                  type="natural"
                  stroke="var(--color-tide)"
                  strokeWidth={2}
                  isAnimationActive={false}
                  animationDuration={0}
                  animationBegin={0}
                  dot={({ payload, cx, cy }: any) => {
                    const hour = payload.hour as number;
                    // Exact match for sun markers (no duplicates)
                    const sunMarker = sunMarkers.find((m) => m.hour === hour);
                    if (sunMarker) {
                      return (
                        <circle
                          key={hour}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill="orange"
                          stroke="var(--color-tide)"
                          strokeWidth={1}
                        />
                      );
                    } else if (
                      payload.isPeak !== undefined &&
                      payload.isPeak !== null
                    ) {
                      const isLow =
                        typeof payload.isPeak === "number" &&
                        payload.isPeak <= (payload.tide ?? 0) &&
                        payload.isPeak <= 0;
                      return (
                        <circle
                          key={hour}
                          cx={cx}
                          cy={cy}
                          r={3}
                          fill={isLow ? "#ef4444" : "#22c55e"}
                          stroke="var(--color-tide)"
                          strokeWidth={1}
                        />
                      );
                    }
                    return <g key={payload.hour} />;
                  }}
                >
                  <LabelList
                    dataKey="tide"
                    content={(props: any) => {
                      const safeX = typeof props.x === "number" ? props.x : 0;
                      const hour = data[props.index ?? -1]?.hour;
                      const marker = sunMarkers.find((m) => m.hour === hour);
                      if (!marker) return null;

                      const IconComponent =
                        marker.type === "sunrise" ? Sunrise : Sunset;
                      return (
                        <g>
                          <IconComponent
                            size={18}
                            x={safeX - 9}
                            y={5}
                            fill="#ff9946ff"
                            color="var(--muted-foreground)"
                          />
                        </g>
                      );
                    }}
                  />
                  <LabelList
                    dataKey="isPeak"
                    content={(props: any) => {
                      const safeX = typeof props.x === "number" ? props.x : 0;
                      const safeY = typeof props.y === "number" ? props.y : 0;
                      if (props.value && typeof props.index === "number") {
                        const h = data[props.index]?.hour ?? 0;
                        const wholeHour = Math.floor(h);
                        const minutes = Math.round((h - wholeHour) * 60);
                        const displayHour =
                          wholeHour % 12 === 0 ? 12 : wholeHour % 12;
                        const ampm = wholeHour % 24 >= 12 ? "PM" : "AM";
                        // Format time as "8:30 AM" or "8 AM" if no minutes
                        const lbl =
                          minutes > 0
                            ? `${displayHour}:${minutes
                                .toString()
                                .padStart(2, "0")} ${ampm}`
                            : `${displayHour} ${ampm}`;
                        // Round tide value to 1 decimal place
                        const tideValue = Number(props.value).toFixed(1);

                        // Get collision-adjusted offset
                        const yOffset = labelPositions.get(props.index) ?? -32;

                        return (
                          <g>
                            <text
                              x={safeX}
                              y={safeY + yOffset}
                              fill="var(--foreground)"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize={10}
                            >
                              {lbl}
                            </text>
                            <text
                              x={safeX}
                              y={safeY + yOffset + 15}
                              fill="var(--foreground)"
                              textAnchor="middle"
                              fontWeight="bold"
                              fontSize={12}
                            >
                              {`${tideValue} ft`}
                            </text>
                          </g>
                        );
                      }
                      return null;
                    }}
                  />
                </Line>
              </LineChart>
            </ChartContainer>
          )}
        </div>

        {/* invisible overlay (visual viewport) to prevent pointer events leaking to inner beyond boundaries */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 56,
            width: viewportWidth,
            height: 220,
            pointerEvents: "none",
          }}
        />
        </div>
      </div>
    </div>
  );
});
