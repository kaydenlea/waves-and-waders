"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
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
  ReferenceLine,
  LabelList,
  LabelProps,
} from "recharts";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunrise,
  Sunset,
  Waves as TideIcon,
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
import { useChartTheme } from "@/components/graphs/useChartTheme";
import {
  buildLinearYAxisTicks,
  buildYAxisTicks,
  limitYAxisTicks,
} from "@/components/graphs/yAxisTicks";
import { getForecastDayHeaderLayout } from "./forecastDayHeaderLayout";
import { buildForecastShadingBackground } from "@/components/graphs/forecastShadingBackground";

const TideTooltipIcon = () => <TideIcon className="h-3 w-3" />;
const TIDE_LINE_COLOR = "#6e6e6eff";

const VISIBLE_DAYS = 4;
const HOURS_PER_DAY = 24;
const VISIBLE_HOURS = VISIBLE_DAYS * HOURS_PER_DAY;
const FETCH_DAYS = VISIBLE_DAYS; // fetch one extra day to allow forward pan
const MIN_DAY_PX = 275; // minimum pixels per day to keep UI usable on tiny screens
const CHART_LEFT_MARGIN = 5;
const CHART_RIGHT_MARGIN = 0;
const Y_AXIS_WIDTH = 30;
const DAY_LABEL_INSET = 6;
const Y_AXIS_OFFSET_VAR = "--forecast-y-axis-offset";
const X_AXIS_SHADE_EXCLUDE_PX = 34;
const Y_AXIS_TICK = {
  fill: "var(--foreground)",
  fontWeight: 500,
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

type YAxisTickProps = {
  x?: number;
  y?: number;
  payload?: { value?: number };
  textAnchor?: string;
  fontSize?: number;
};

type TooltipPayload = Array<{ payload?: { hour?: number } }>;

type ChartMouseEvent = { activeLabel?: number | string | null };

type TideDotProps = { payload?: TidePoint; cx?: number; cy?: number };

export default React.memo(function ForecastTideChart({
  beachId,
  date,
  days,
}: Props) {
  const chartTheme = useChartTheme();

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
        markerTargets: { hour: number; type: "sunrise" | "sunset" }[];
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
  const daysReady = Array.isArray(days) && days.length > 0;
  const rangeSignature = useMemo(() => {
    if (!beachId) return "";
    const daySig = Array.isArray(days)
      ? days
          .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()))
          .map((d) => d.getTime())
          .sort((a, b) => a - b)
          .map(String)
          .join(",")
      : "";
    return `${beachId}:${startMs}:${daySig}`;
  }, [beachId, days, startMs]);
  const dashboardBusy = useForecastChartsBusyState();
  const wasBusyRef = useRef(dashboardBusy);

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

  // When the visible day range changes (user adjusts the forecast date range),
  // pessimistically mark this widget as not ready so the global forecast overlay
  // turns on before any chart content updates are painted.
  useLayoutEffect(() => {
    if (!rangeSignature) return;
    setReady(false);
  }, [rangeSignature, setReady]);

  // Mark this widget as not ready until the day range exists (day headers depend on it).
  useEffect(() => {
    if (!daysReady) {
      setReady(false);
    }
  }, [daysReady, setReady]);

  // Mark this widget as not ready whenever its sun/shading pipeline is not ready.
  useEffect(() => {
    if (!shadingReady) {
      setReady(false);
    }
  }, [shadingReady, setReady]);

  // Mark this widget as not ready whenever its local loading flag is true.
  useEffect(() => {
    if (loading) {
      setReady(false);
    }
  }, [loading, setReady]);
  // Mark ready only after data and shading are fully ready.
  useEffect(() => {
    if (daysReady && !loading && shadingReady) {
      setReady(true);
    }
  }, [daysReady, loading, shadingReady, setReady]);
  useEffect(() => {
    if (dashboardBusy && !wasBusyRef.current) {
      setStableSelectedHour(selectedHour ?? null);
    }
    if (!dashboardBusy && wasBusyRef.current) {
      setStableSelectedHour(null);
    }
    wasBusyRef.current = dashboardBusy;
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
    // Day width is derived from the visible container width (4 days shown) with a floor,
    // so each 24h segment keeps a stable pixel width and stays aligned across charts.
    if (!containerWidth) return MIN_DAY_PX;
    const fillPerDay = containerWidth / VISIBLE_DAYS;
    // clamp so days don't become tiny
    return Math.max(MIN_DAY_PX, Math.floor(fillPerDay));
  }, [containerWidth]);

  const chartInnerWidth = useMemo(
    () => totalFetchedDays * dayPx,
    [totalFetchedDays, dayPx]
  );
  // Header alignment: this matches Recharts' inner plot rect (chart width minus margins + axis gutter),
  // keeping each header column pixel-aligned with the 24h day boundaries. The axis gutter doubles as an
  // in-plot inset so series never render beneath the sticky Y-axis labels.
  const dataAreaWidth =
    chartInnerWidth - CHART_LEFT_MARGIN - CHART_RIGHT_MARGIN - Y_AXIS_WIDTH;
  const dayLabelLeftOffset = CHART_LEFT_MARGIN + Y_AXIS_WIDTH;
  const domainMin = 0;
  const domainMax = totalFetchedDays * HOURS_PER_DAY;
  const dayHeaderLayout = useMemo(
    () =>
      getForecastDayHeaderLayout({
        leftOffsetPx: dayLabelLeftOffset,
        dataAreaWidthPx: dataAreaWidth,
        totalDays: totalFetchedDays,
        domainMinHours: domainMin,
        domainMaxHours: domainMax,
        hoursPerDay: HOURS_PER_DAY,
      }),
    [dayLabelLeftOffset, dataAreaWidth, totalFetchedDays, domainMax]
  );

  const shadingBackground = useMemo(
    () =>
      buildForecastShadingBackground({
        dayAreas,
        nightAreas,
        domainMin,
        domainMax,
        // `chartWidthPx` is where the X-scale ends (last X value), so day/night transitions stop before the right margin.
        chartWidthPx: chartInnerWidth - CHART_RIGHT_MARGIN,
        plotLeftPx: dayLabelLeftOffset,
        plotWidthPx: dataAreaWidth,
        dayColor: chartTheme.dayShading,
        nightColor: chartTheme.nightShading,
        opacity: chartTheme.shadingOpacity,
      }),
    [
      dayAreas,
      nightAreas,
      domainMin,
      domainMax,
      chartInnerWidth,
      dayLabelLeftOffset,
      dataAreaWidth,
      chartTheme.dayShading,
      chartTheme.nightShading,
      chartTheme.shadingOpacity,
    ]
  );

  const viewportWidth = useMemo(
    () => Math.min(containerWidth || 0, dayPx * VISIBLE_DAYS),
    [containerWidth, dayPx]
  );
  const isScrollable = chartInnerWidth > viewportWidth + 1;
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
      // Keep a CSS var for HTML overlays, and pin the SVG Y-axis via an imperative transform.
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

        const series = (seriesRaw ?? [])
          .filter((p) => p.hour >= 0 && p.hour <= fetchHours)
          .sort((a, b) => a.hour - b.hour);
        const last = series[series.length - 1];
        if (last && last.hour < fetchHours) {
          series.push({ hour: fetchHours, tide: last.tide });
        }

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
    const snapSunMarkersToData = (
      targets: { hour: number; type: "sunrise" | "sunset" }[],
      data: TidePoint[]
    ) => {
      if (!targets.length) return [];
      if (!data.length) return targets;

      const usedHours = new Set<number>();
      const snapped: { hour: number; type: "sunrise" | "sunset" }[] = [];

      for (const target of targets) {
        let best: TidePoint | null = null;
        let bestDiff = Number.POSITIVE_INFINITY;
        for (const point of data) {
          if (usedHours.has(point.hour)) continue;
          const diff = Math.abs(point.hour - target.hour);
          if (diff < bestDiff) {
            bestDiff = diff;
            best = point;
          }
        }
        if (best) {
          usedHours.add(best.hour);
          snapped.push({ hour: best.hour, type: target.type });
        } else {
          snapped.push(target);
        }
      }

      return snapped;
    };
    (async () => {
      if (!beachId) return;
      const cacheKey = `${beachId}-${startMs}`;
      const cached = sunCacheRef.current.get(cacheKey);
      if (cached) {
        // Always re-snap cached targets to the latest tide series so the sunrise/sunset
        // icons match an actual x-value in the rendered data (prevents "missing" icons
        // on first client navigation where sun data can resolve before tide points).
        setChartState((prev) => {
          const markers = snapSunMarkersToData(cached.markerTargets, prev.data);
          return {
            ...prev,
            dayAreas: cached.dayAreas,
            nightAreas: cached.nightAreas,
            sunMarkers: markers,
          };
        });
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

        if (!cancelled) {
          setChartState((prev) => {
            const markers = snapSunMarkersToData(markerTargets, prev.data);
            const next = {
              ...prev,
              dayAreas: dayAreasBuild,
              nightAreas: nightAreasBuild,
              sunMarkers: markers,
            };
            sunCacheRef.current.set(cacheKey, {
              dayAreas: dayAreasBuild,
              nightAreas: nightAreasBuild,
              markerTargets,
              sunMarkers: markers,
            });
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
            sunCacheRef.current.set(cacheKey, {
              dayAreas: [],
              nightAreas: [],
              markerTargets: [],
              sunMarkers: [],
            });
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

  const tideTicks = useMemo(() => {
    const values = data
      .map((p) => p.tide)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (!values.length)
      return limitYAxisTicks(buildYAxisTicks([0], -2, 4, 0.2), 4);

    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1e-6, max - min);

    // Add headroom/footroom so labels/icons never collide with the curve.
    const bottomPad = Math.max(1, span * 0.12);
    const topPad = Math.max(4, span * 0.2);
    const paddedMin = Math.floor(min - bottomPad);
    const paddedMax = Math.ceil(max + topPad);

    const axisMin = Math.floor(paddedMin);
    const axisMax = Math.ceil(paddedMax);
    return buildLinearYAxisTicks(axisMin, axisMax, 4, true);
  }, [data]);
  const yAxisTick = useCallback(
    (props: YAxisTickProps) => {
      const { x, y, payload, textAnchor, fontSize } = props ?? {};
      const xNum = typeof x === "number" ? x : Number(x);
      const yNum = typeof y === "number" ? y : Number(y);
      if (!Number.isFinite(xNum) || !Number.isFinite(yNum)) return <text />;

      const value = payload?.value;
      const minTick = tideTicks[0] ?? -2;
      const maxTick = tideTicks[tideTicks.length - 1] ?? minTick;
      const valueNum = typeof value === "number" ? value : Number(value);
      const isMinTick =
        Number.isFinite(valueNum) && Math.abs(valueNum - minTick) < 1e-6;
      const isMaxTick =
        Number.isFinite(valueNum) && Math.abs(valueNum - maxTick) < 1e-6;

      return (
        <text
          x={xNum + 6}
          y={yNum}
          // Nudge the bottom tick up so it stays visually contained within the shaded plot area.
          dy={isMinTick ? -8 : isMaxTick ? 8 : 0}
          textAnchor={textAnchor ?? "end"}
          dominantBaseline="central"
          fontSize={typeof fontSize === "number" ? fontSize : 11}
          {...Y_AXIS_TICK}
        >
          {value}
        </text>
      );
    },
    [tideTicks]
  );
  const formatHourLabel = useCallback(
    (label: unknown, payload: TooltipPayload) => {
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
    },
    []
  );

  // Hover sync handlers - DateContext handles RAF batching
  const lastHoveredRef = React.useRef<number | null>(null);

  const handleMouseMove = React.useCallback(
    (e: ChartMouseEvent) => {
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
        strokeOpacity={0.75}
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
              "absolute left-1 top-[55%] -translate-y-1/2 z-50 rounded-full bg-highlight-7/90 p-1 shadow border border-border/30 shadow-even backdrop-blur-xl",
              (!isScrollable || dayOffset === 0) && "hidden"
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            aria-label="Next one day"
            onClick={handleNext}
            className={cn(
              "absolute right-1 top-[55%] -translate-y-1/2 z-50 rounded-full bg-highlight-7/90 p-1 shadow border border-border/30 shadow-even backdrop-blur-xl",
              (!isScrollable || isAtRightEdge) && "hidden"
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
              marginTop: 60,
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
              className="rounded-t-md overflow-hidden border border-border/20 border-b-0 bg-highlight-5/40 backdrop-blur-md"
              style={{
                position: "absolute",
                zIndex: 40,
                top: -58,
                left: 0,
                width: chartInnerWidth,
                display: "flex",
                pointerEvents: "none",
                backgroundImage: `linear-gradient(to bottom, color-mix(in oklab, ${chartTheme.dayShading} 14%, transparent), hsl(var(--background) / 0.75))`,
              }}
            >
              <div
                className="h-14 p-1"
                style={{ width: dayHeaderLayout.left, flex: "0 0 auto" }}
              >
                <div className="h-full rounded-md bg-highlight-3/40 dark:bg-highlight-5/50" />
              </div>
              <div
                style={{
                  width: dayHeaderLayout.width,
                  display: "grid",
                  gridTemplateColumns: dayHeaderLayout.gridTemplateColumns,
                }}
              >
                {dayLabels?.map((label, idx) => (
                  <div
                    key={idx}
                    className="h-14 p-1"
                    style={{
                      boxSizing: "border-box",
                      width: "100%",
                      color: "var(--foreground)",
                      pointerEvents: "none",
                    }}
                  >
                    <div className="flex h-full items-center justify-between gap-3 rounded-md bg-highlight-3/50 dark:bg-highlight-5/50 px-3 py-2">
                      {(() => {
                        const [weekdayRaw, monthDayRaw] = label.split(",");
                        const weekday = (weekdayRaw ?? label).trim();
                        const monthDay = (monthDayRaw ?? "").trim();
                        const high = tideStats[idx]?.high;
                        const low = tideStats[idx]?.low;

                        return (
                          <>
                            <div className="flex flex-col min-w-0 leading-tight">
                              <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                                {weekday}
                              </span>
                              <span className="text-sm font-semibold truncate">
                                {monthDay || label}
                              </span>
                            </div>
                            <div className="flex flex-col items-end gap-0.5 whitespace-nowrap text-[0.72rem] text-muted-foreground rounded-md bg-foreground/5 pl-1 py-1">
                              <div className="grid grid-cols-[14px_18px_32px_16px] items-center gap-x-1 leading-none">
                                <ArrowUp className="h-3 w-3 text-emerald-500/80" />
                                <span className="mt-0.5 text-[0.68rem] font-semibold text-muted-foreground">
                                  Hi
                                </span>
                                <span className="mt-0.5 tabular-nums text-right text-foreground font-semibold">
                                  {typeof high === "number"
                                    ? high.toFixed(1)
                                    : "--"}
                                </span>
                                <span className="text-[0.7rem] text-muted-foreground">
                                  ft
                                </span>
                              </div>
                              <div className="grid grid-cols-[14px_18px_32px_16px] items-center gap-x-1 leading-none">
                                <ArrowDown className="h-3 w-3 text-rose-500/80" />
                                <span className="mt-0.5 text-[0.68rem] font-semibold text-muted-foreground">
                                  Lo
                                </span>
                                <span className="mt-0.5 tabular-nums text-right text-foreground font-semibold">
                                  {typeof low === "number"
                                    ? low.toFixed(1)
                                    : "--"}
                                </span>
                                <span className="mt-0.5 text-[0.7rem] text-muted-foreground">
                                  ft
                                </span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {containerWidth > 0 && (
              <div className="relative w-full overflow-hidden rounded-b-md border border-border/20 border-t-0 border-x-0">
                {/* Shade only the plot area (not the X-axis label band), matching prior ReferenceArea behavior. */}
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    right: CHART_RIGHT_MARGIN,
                    bottom: X_AXIS_SHADE_EXCLUDE_PX,
                    backgroundImage: shadingBackground,
                    backgroundRepeat: "no-repeat",
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    borderBottomLeftRadius: 8,
                    borderBottomRightRadius: 8,
                    pointerEvents: "none",
                  }}
                />
                {/* Left divider clipped to shaded plot height (stops above X-axis labels). */}
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: X_AXIS_SHADE_EXCLUDE_PX,
                    left: dayLabelLeftOffset,
                    width: 1,
                    backgroundColor: "var(--border)",
                    opacity: 0.85,
                    pointerEvents: "none",
                    transform: `translateX(var(${Y_AXIS_OFFSET_VAR}, 0px))`,
                    zIndex: 2,
                  }}
                />
                {/* Sticky in-plot Y-axis (separate overlay chart) to avoid mutating Recharts' SVG output. */}
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: dayLabelLeftOffset,
                    pointerEvents: "none",
                    // Counter-translate by the same px as the pan transform (set on `innerRef`)
                    // so the Y-axis stays pinned while the chart content drags underneath.
                    transform: `translateX(var(${Y_AXIS_OFFSET_VAR}, 0px))`,
                    zIndex: 3,
                  }}
                >
                  <ChartContainer
                    config={
                      {
                        tide: {
                          label: "Tide",
                          color: "#3b82f6",
                          icon: TideTooltipIcon,
                        },
                      } as ChartConfig
                    }
                    className="aspect-auto h-[250px] w-full !justify-start"
                  >
                    <LineChart
                      accessibilityLayer={false}
                      width={dayLabelLeftOffset}
                      height={250}
                      data={[{ x: 0 }]}
                      margin={{
                        left: CHART_LEFT_MARGIN,
                        right: 0,
                        bottom: 5,
                        top: 0,
                      }}
                    >
                      <XAxis
                        dataKey="x"
                        type="number"
                        domain={[0, 1]}
                        ticks={[]}
                        tick={false}
                        tickLine={false}
                        axisLine={false}
                        height={X_AXIS_SHADE_EXCLUDE_PX}
                      />
                      <YAxis
                        dataKey="tide"
                        width={Y_AXIS_WIDTH}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        fontSize={11}
                        tick={yAxisTick}
                        domain={[
                          tideTicks[0] ?? -2,
                          tideTicks[tideTicks.length - 1] ?? 8,
                        ]}
                        ticks={tideTicks}
                      />
                    </LineChart>
                  </ChartContainer>
                </div>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <ChartContainer
                    config={
                      {
                        tide: {
                          label: "Tide",
                          color: "#3b82f6",
                          icon: TideTooltipIcon,
                        },
                      } as ChartConfig
                    }
                    className="forecast-tide-chart-container aspect-auto h-[250px] w-full"
                  >
                    <LineChart
                      accessibilityLayer={false}
                      width={chartInnerWidth}
                      // height={200}
                      data={data}
                      margin={{
                        left: dayLabelLeftOffset,
                        right: CHART_RIGHT_MARGIN,
                        bottom: 5,
                        top: 0,
                      }}
                      syncId="allCharts"
                      syncMethod="value"
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                    >
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
                      {/* Selected hour marker */}
                      {(() => {
                        try {
                          const effectiveHour = dashboardBusy
                            ? stableSelectedHour ?? selectedHour ?? null
                            : selectedHour ?? null;
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
                          <ChartTooltipContent
                            labelFormatter={formatHourLabel}
                          />
                        }
                        cursor={{
                          stroke: "var(--foreground)",
                          strokeWidth: 1,
                          strokeDasharray: "3 3",
                          strokeOpacity: 0.75,
                        }}
                        animationDuration={0}
                        isAnimationActive={false}
                      />

                      <Line
                        dataKey="tide"
                        type="natural"
                        stroke={TIDE_LINE_COLOR}
                        strokeWidth={2}
                        isAnimationActive={false}
                        animationDuration={0}
                        animationBegin={0}
                        dot={({ payload, cx, cy }: TideDotProps) => {
                          if (!payload) {
                            return <g />;
                          }
                          const hour = payload.hour as number;
                          // Exact match for sun markers (no duplicates)
                          const sunMarker = sunMarkers.find(
                            (m) => m.hour === hour
                          );
                          if (sunMarker) {
                            return (
                              <circle
                                key={hour}
                                cx={cx}
                                cy={cy}
                                r={4}
                                fill="orange"
                                stroke={TIDE_LINE_COLOR}
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
                                stroke={TIDE_LINE_COLOR}
                                strokeWidth={1}
                              />
                            );
                          }
                          return <g key={payload.hour} />;
                        }}
                      >
                        <LabelList
                          dataKey="tide"
                          content={(props: LabelProps) => {
                            const safeX =
                              typeof props.x === "number" ? props.x : 0;
                            const hour = data[props.index ?? -1]?.hour;
                            const marker = sunMarkers.find(
                              (m) => m.hour === hour
                            );
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
                          content={(props: LabelProps) => {
                            const safeX =
                              typeof props.x === "number" ? props.x : 0;
                            const safeY =
                              typeof props.y === "number" ? props.y : 0;
                            if (
                              props.value !== undefined &&
                              props.value !== null &&
                              typeof props.index === "number"
                            ) {
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
                              const yOffset =
                                labelPositions.get(props.index) ?? -32;

                              // Calculate boundaries - Y-axis is approximately 30px wide
                              const Y_AXIS_WIDTH = 30;
                              const LEFT_BOUNDARY = Y_AXIS_WIDTH + 5; // Just past Y-axis
                              const LABEL_HALF_WIDTH = 35; // Approximate half-width of label text

                              // Determine text anchor and adjusted x position based on boundaries
                              let textAnchor: "start" | "middle" | "end" =
                                "middle";
                              let adjustedX = safeX;

                              // Check if label would bleed off the left edge (Y-axis wall)
                              if (safeX - LABEL_HALF_WIDTH < LEFT_BOUNDARY) {
                                textAnchor = "start";
                                adjustedX = Math.max(safeX, LEFT_BOUNDARY);
                              }
                              // Check if label would bleed off the right edge
                              else {
                                const hourMod24 = h % 24;
                                if (hourMod24 >= 23) {
                                  textAnchor = "end";
                                }
                              }

                              return (
                                <g>
                                  <text
                                    x={adjustedX}
                                    y={safeY + yOffset}
                                    fill="var(--foreground)"
                                    textAnchor={textAnchor}
                                    fontWeight={450}
                                    dominantBaseline="middle"
                                    fontSize={10}
                                    style={{
                                      paintOrder: "stroke",
                                      stroke: "var(--background)",
                                      strokeWidth: 1,
                                      strokeLinejoin: "round",
                                    }}
                                  >
                                    {lbl}
                                  </text>
                                  <text
                                    x={adjustedX}
                                    y={safeY + yOffset + 15}
                                    fill="var(--foreground)"
                                    textAnchor={textAnchor}
                                    fontWeight="bold"
                                    fontSize={12}
                                    style={{
                                      paintOrder: "stroke",
                                      stroke: "var(--background)",
                                      strokeWidth: 1,
                                      strokeLinejoin: "round",
                                    }}
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
                      <YAxis
                        dataKey="tide"
                        hide
                        width={0}
                        domain={[
                          tideTicks[0] ?? -2,
                          tideTicks[tideTicks.length - 1] ?? 8,
                        ]}
                        ticks={tideTicks}
                      />
                    </LineChart>
                  </ChartContainer>
                </div>
              </div>
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
