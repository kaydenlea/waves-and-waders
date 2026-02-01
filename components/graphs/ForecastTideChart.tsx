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
import { safeFlushSync } from "@/components/graphs/safeFlushSync";
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
  ChartTooltipViewportContent,
} from "@/components/ui/chart";
import { useIsTouchOnlyDevice } from "./useIsTouchOnlyDevice";
import {
  useMobileChartTouch,
  MobileChartTooltip,
  type MobileTooltipDataPoint,
} from "./MobileChartTooltip";
import { cn } from "@/lib/utils";
import { useDateContext } from "@/components/context/DateContext";
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
import HoverOverlayLine from "@/components/graphs/HoverOverlayLine";

const TideTooltipIcon = () => <TideIcon className="h-3 w-3" />;
const TIDE_LINE_COLOR = "#6e6e6eff";

const VISIBLE_DAYS = 4;
const HOURS_PER_DAY = 24;
const VISIBLE_HOURS = VISIBLE_DAYS * HOURS_PER_DAY;
const FETCH_DAYS = VISIBLE_DAYS; // fetch one extra day to allow forward pan
const MIN_DAY_PX = 275; // minimum pixels per day to keep UI usable on tiny screens
const CHART_LEFT_MARGIN = 5;
const CHART_RIGHT_MARGIN = 0;
const DATA_STEP_HOURS = 3;
const Y_AXIS_WIDTH = 30;
const DAY_LABEL_INSET = 6;
const Y_AXIS_OFFSET_VAR = "--forecast-y-axis-offset";
const X_AXIS_SHADE_EXCLUDE_PX = 34;
const DRAG_THRESHOLD_PX = 8;
const TOUCH_INSPECT_LONG_PRESS_MS = 320;
const TOUCH_INSPECT_MOVE_TOLERANCE_PX = 10;
const HOVER_LINE_END_INSET_PX = 7.5;
const Y_AXIS_TICK = {
  fill: "var(--foreground)",
  fontWeight: 500,
  filter: "drop-shadow(0 0 4px var(--background))",
} as const;

type Props = {
  beachId?: string;
  date?: Date;
  days?: Date[];
  suppressSkeleton?: boolean;
};
type TidePoint = { hour: number; tide: number; isPeak?: number };
type ChartState = {
  data: TidePoint[];
  dayAreas: { x1: number; x2: number }[];
  nightAreas: { x1: number; x2?: number }[];
  sunMarkers: { hour: number; type: "sunrise" | "sunset" }[];
  tideStats: { dayIndex: number; high: number; low: number }[];
};

type TideCacheEntry = {
  data: TidePoint[];
  tideStats: { dayIndex: number; high: number; low: number }[];
  ts: number;
};

const TIDE_CACHE_TTL_MS = 10 * 60 * 1000;
const TIDE_CACHE_MAX = 12;
const tideCache = new Map<string, TideCacheEntry>();

const getFreshTideCache = (key: string) => {
  if (!key) return null;
  const cached = tideCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.ts > TIDE_CACHE_TTL_MS) {
    tideCache.delete(key);
    return null;
  }
  return cached;
};

const setTideCache = (key: string, next: Omit<TideCacheEntry, "ts">) => {
  if (!key) return;
  tideCache.set(key, { ...next, ts: Date.now() });
  if (tideCache.size <= TIDE_CACHE_MAX) return;

  const oldest = [...tideCache.entries()].sort((a, b) => a[1].ts - b[1].ts);
  for (let i = 0; i < oldest.length - TIDE_CACHE_MAX; i++) {
    const entry = oldest[i];
    if (!entry) continue;
    tideCache.delete(entry[0]);
  }
};

type SunMarkerTarget = { hour: number; type: "sunrise" | "sunset" };

type SunCacheEntry = {
  dayAreas: { x1: number; x2: number }[];
  nightAreas: { x1: number; x2?: number }[];
  markerTargets: SunMarkerTarget[];
  sunMarkers: SunMarkerTarget[];
  ts: number;
};

const SUN_CACHE_TTL_MS = 10 * 60 * 1000;
const SUN_CACHE_MAX = 12;
const sunCache = new Map<string, SunCacheEntry>();

const getFreshSunCache = (key: string) => {
  if (!key) return null;
  const cached = sunCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.ts > SUN_CACHE_TTL_MS) {
    sunCache.delete(key);
    return null;
  }
  return cached;
};

const setSunCache = (key: string, next: Omit<SunCacheEntry, "ts">) => {
  if (!key) return;
  sunCache.set(key, { ...next, ts: Date.now() });
  if (sunCache.size <= SUN_CACHE_MAX) return;

  const oldest = [...sunCache.entries()].sort((a, b) => a[1].ts - b[1].ts);
  for (let i = 0; i < oldest.length - SUN_CACHE_MAX; i++) {
    const entry = oldest[i];
    if (!entry) continue;
    sunCache.delete(entry[0]);
  }
};

const snapSunMarkersToData = (targets: SunMarkerTarget[], data: TidePoint[]) => {
  if (!targets.length) return [];
  if (!data.length) return targets;

  const usedHours = new Set<number>();
  const snapped: SunMarkerTarget[] = [];

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

type YAxisTickProps = {
  x?: number;
  y?: number;
  payload?: { value?: number };
  textAnchor?: string;
  fontSize?: number;
};

type TooltipPayload = Array<{ payload?: { hour?: number } }>;

type ChartMouseEvent = { activeLabel?: number | string | null };

type TideDotProps = {
  payload?: TidePoint;
  cx?: number;
  cy?: number;
  index?: number;
};

export default React.memo(function ForecastTideChart({
  beachId,
  date,
  days,
  suppressSkeleton,
}: Props) {
  const chartTheme = useChartTheme();

  const lastValidStartInputRef = useRef<Date | null>(null);
  const resolvedStartInput = useMemo(() => {
    const isValidDate = (d: unknown): d is Date =>
      d instanceof Date && !Number.isNaN(d.getTime());

    const fromDate = isValidDate(date) ? date : null;
    const fromDays = Array.isArray(days)
      ? (days.find((d) => isValidDate(d)) ?? null)
      : null;

    const next = fromDate ?? fromDays ?? lastValidStartInputRef.current ?? new Date();
    if (fromDate || fromDays) lastValidStartInputRef.current = next;
    return next;
  }, [date, days]);

  // Compute Pacific midnight for the requested start date once
  const { startMs, fetchHours } = useMemo(() => {
    const startInput = resolvedStartInput;
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
  }, [resolvedStartInput]);

  const { setPanFraction, subscribePan } = useForecastChartContext();
  const { getSunData } = useSunData();
  const myId = React.useId();
  const {
    selected: selectedDate,
    hour: selectedHour,
    setHoveredHour,
    hoveredHourRef,
    subscribeToHover,
  } = useDateContext();
  const isTouchOnlyDevice = useIsTouchOnlyDevice();
  const mobileChartId = React.useId();
  const tideCacheKey = useMemo(() => {
    if (!suppressSkeleton) return "";
    if (!beachId) return "";
    return `${beachId}:${startMs}:${fetchHours}`;
  }, [beachId, fetchHours, startMs, suppressSkeleton]);
  const cachedTide = suppressSkeleton ? getFreshTideCache(tideCacheKey) : null;
  const sunCacheKey = useMemo(() => {
    if (!suppressSkeleton) return "";
    if (!beachId) return "";
    return `${beachId}-${startMs}`;
  }, [beachId, startMs, suppressSkeleton]);
  const cachedSun = suppressSkeleton ? getFreshSunCache(sunCacheKey) : null;

  const [loading, setLoading] = useState(() => {
    return cachedTide ? false : true;
  });
  const [stableSelectedHour, setStableSelectedHour] = useState<number | null>(
    null,
  );
  const { setReady } = useForecastChartLoading("forecast-tide");
  const daysReady = Array.isArray(days) && days.length > 0;
  const rangeSignature = useMemo(() => {
    if (!beachId) return "";
    const daySig = Array.isArray(days)
      ? days
          .filter(
            (d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()),
          )
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
  const [chartState, setChartState] = useState<ChartState>(() => {
    if (cachedTide) {
      const cachedSunMarkers = cachedSun
        ? snapSunMarkersToData(cachedSun.markerTargets, cachedTide.data)
        : [];
      return {
        data: cachedTide.data,
        tideStats: cachedTide.tideStats,
        dayAreas: cachedSun?.dayAreas ?? [],
        nightAreas: cachedSun?.nightAreas ?? [],
        sunMarkers: cachedSunMarkers,
      };
    }
    return {
      data: [],
      dayAreas: [],
      nightAreas: [],
      sunMarkers: [],
      tideStats: [],
    };
  });
  const { data, dayAreas, nightAreas, sunMarkers, tideStats } = chartState;
  const sunMarkerMap = useMemo(() => {
    const map = new Map<number, "sunrise" | "sunset">();
    sunMarkers.forEach((m) => map.set(m.hour, m.type));
    return map;
  }, [sunMarkers]);
  const lastTideSegmentRef = useRef<{
    prev: { cx: number; cy: number } | null;
    curr: { cx: number; cy: number } | null;
  }>({ prev: null, curr: null });
  useEffect(() => {
    lastTideSegmentRef.current = { prev: null, curr: null };
  }, [data]);

  const tideActiveDot = useCallback(
    (props: { cx?: number | string; cy?: number | string; index?: number }) => {
      const cxNum = typeof props.cx === "number" ? props.cx : Number(props.cx);
      const cyNum = typeof props.cy === "number" ? props.cy : Number(props.cy);
      if (!Number.isFinite(cxNum) || !Number.isFinite(cyNum)) return <g />;
      const idx = typeof props.index === "number" ? props.index : -1;
      if (idx < 0) return <g />;

      const isLastPoint = idx === data.length - 1;
      const dx = isLastPoint ? -HOVER_LINE_END_INSET_PX : 0;
      const prevPoint = lastTideSegmentRef.current.prev;
      const projected = (() => {
        if (!dx || !prevPoint) return { x: cxNum + dx, y: cyNum };
        const vx = cxNum - prevPoint.cx;
        const vy = cyNum - prevPoint.cy;
        if (
          !Number.isFinite(vx) ||
          !Number.isFinite(vy) ||
          Math.abs(vx) < 1e-6
        ) {
          return { x: cxNum + dx, y: cyNum };
        }
        const t = Math.max(-1, Math.min(0, dx / vx));
        return { x: cxNum + dx, y: cyNum + t * vy };
      })();

      return (
        <circle
          cx={projected.x}
          cy={projected.y}
          r={4}
          fill={TIDE_LINE_COLOR}
          stroke={TIDE_LINE_COLOR}
          strokeWidth={0}
        />
      );
    },
    [data.length],
  );
  const shadingReady = dayAreas.length > 0 || nightAreas.length > 0;

  // Report ready state: chart is ready when days exist, data is loaded, and shading is complete
  useEffect(() => {
    const ready = daysReady && !loading && shadingReady;
    setReady(ready);
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
  const [isDragging, setIsDragging] = useState(false);

  // Touch inspect timer for long-press detection (legacy - keeping for compatibility)
  const touchInspectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const clearTouchInspectTimer = useCallback(() => {
    if (touchInspectTimerRef.current) {
      clearTimeout(touchInspectTimerRef.current);
      touchInspectTimerRef.current = null;
    }
  }, []);

  // Legacy touch inspection state (used by the old pointer handlers)
  const [isTouchInspecting, setIsTouchInspecting] = useState(false);
  const [touchDefaultIndex, setTouchDefaultIndex] = useState<number | null>(
    null,
  );
  const touchInspectStartRef = useRef<{
    startChartX: number;
    chartX: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const rechartsMoveTargetRef = useRef<Element | null>(null);

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
    [totalFetchedDays, dayPx],
  );
  // Header alignment: this matches Recharts' inner plot rect (chart width minus margins + axis gutter),
  // keeping each header column pixel-aligned with the 24h day boundaries. The axis gutter doubles as an
  // in-plot inset so series never render beneath the sticky Y-axis labels.
  const dataAreaWidth =
    chartInnerWidth - CHART_LEFT_MARGIN - CHART_RIGHT_MARGIN - Y_AXIS_WIDTH;

  const dayLabelLeftOffset = CHART_LEFT_MARGIN + Y_AXIS_WIDTH;
  const domainMin = 0;
  const domainMax = totalFetchedDays * HOURS_PER_DAY;

  const getTouchActivationFromChartX = useCallback(
    (chartX: number) => {
      if (!Number.isFinite(chartX) || !dataAreaWidth) return null;
      if (data.length === 0) return null;
      const plotX = Math.max(
        0,
        Math.min(chartX - dayLabelLeftOffset, dataAreaWidth),
      );
      const t = dataAreaWidth > 0 ? plotX / dataAreaWidth : 0;
      const targetHour = domainMin + t * (domainMax - domainMin);

      // Tide data can be higher resolution than 3h (often 6 min), so compute the nearest
      // data index by hour instead of assuming a fixed step size.
      let lo = 0;
      let hi = data.length - 1;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        const midHour = data[mid]?.hour;
        if (typeof midHour !== "number") break;
        if (midHour < targetHour) lo = mid + 1;
        else hi = mid;
      }

      let closestIndex = lo;
      if (closestIndex > 0) {
        const currHour = data[closestIndex]?.hour;
        const prevHour = data[closestIndex - 1]?.hour;
        if (typeof currHour === "number" && typeof prevHour === "number") {
          if (
            Math.abs(prevHour - targetHour) <= Math.abs(currHour - targetHour)
          ) {
            closestIndex = closestIndex - 1;
          }
        }
      }

      const pointHour = data[closestIndex]?.hour;
      if (typeof pointHour !== "number") return null;
      const hoverHourRounded3h =
        Math.round(pointHour / DATA_STEP_HOURS) * DATA_STEP_HOURS;
      const hoverHourClamped = Math.max(
        0,
        Math.min(hoverHourRounded3h, totalFetchedDays * HOURS_PER_DAY),
      );
      return {
        defaultIndex: closestIndex,
        hour: hoverHourClamped,
      };
    },
    [
      dataAreaWidth,
      dayOffset,
      dayPx,
      dayLabelLeftOffset,
      domainMin,
      domainMax,
      totalFetchedDays,
      data,
    ],
  );
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
    [dayLabelLeftOffset, dataAreaWidth, totalFetchedDays, domainMax],
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
    ],
  );

  const viewportWidth = useMemo(
    () => Math.min(containerWidth || 0, dayPx * VISIBLE_DAYS),
    [containerWidth, dayPx],
  );
  const isScrollable = chartInnerWidth > viewportWidth + 1;
  const showSkeleton =
    !suppressSkeleton && (loading || !shadingReady || containerWidth === 0);

  // When the widget is "grabbed" in the dashboard editor, the card can briefly
  // remount. Measure width in a layout effect so we don't paint a 0-width frame.
  useLayoutEffect(() => {
    if (containerWidth !== 0) return;
    const el = containerRef.current;
    if (!el) return;
    const w = Math.floor(el.getBoundingClientRect().width);
    if (w > 0) {
      setContainerWidth(w);
    }
  }, [containerWidth]);

  // Pointer & animation refs (imperative values to avoid re-renders)
  const currentTranslateRef = useRef(0); // px
  const pointerStateRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startTranslate: number;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const broadcastRafRef = useRef<number | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const pendingTranslateRef = useRef<number | null>(null);

  // helpers: clamp translate (px)
  const clampTranslatePx = useCallback(
    (px: number) => {
      const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
      return Math.max(0, Math.min(px, maxTranslate));
    },
    [chartInnerWidth, viewportWidth],
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
    [],
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
    [clampTranslatePx, setInnerTranslatePx],
  );

  // pointer handlers (imperative)
  const startDrag = (ev: React.PointerEvent) => {
    const node = ev.currentTarget as Element;
    node.setPointerCapture?.(ev.pointerId);
    clearTouchInspectTimer();
    setIsTouchInspecting(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (pointerStateRef.current) {
      pointerStateRef.current.dragging = true;
    }
    setIsDragging(true);
    // prevent text selection
    document.body.style.userSelect = "none";
    document.body.style.touchAction = "none";
  };

  const onPointerDown = (ev: React.PointerEvent) => {
    pointerStateRef.current = {
      dragging: false,
      startX: ev.clientX,
      startY: ev.clientY,
      startTranslate: currentTranslateRef.current,
    };
    // remove transition for immediate follow
    setInnerTranslatePx(currentTranslateRef.current, false);
    if (isTouchOnlyDevice && ev.pointerType !== "mouse") {
      clearTouchInspectTimer();
      setIsTouchInspecting(false);
      setTouchDefaultIndex(null);
      setHoveredHour(null);
      const bounds = (ev.currentTarget as Element).getBoundingClientRect();
      const startChartX = ev.clientX - bounds.left;
      touchInspectStartRef.current = {
        startChartX,
        chartX: startChartX,
        clientX: ev.clientX,
        clientY: ev.clientY,
      };
      rechartsMoveTargetRef.current =
        innerRef.current?.querySelector(".recharts-wrapper") ?? null;
      touchInspectTimerRef.current = setTimeout(() => {
        touchInspectTimerRef.current = null;
        if (pointerStateRef.current?.dragging) return;
        const start = touchInspectStartRef.current;
        if (!start) return;
        const activation = getTouchActivationFromChartX(start.chartX);
        if (!activation) return;
        setTouchDefaultIndex((prev) =>
          prev === activation.defaultIndex ? prev : activation.defaultIndex,
        );
        if (hoveredHourRef.current !== activation.hour) {
          setHoveredHour(activation.hour);
        }
        setIsTouchInspecting(true);
        requestAnimationFrame(() => {
          const target =
            rechartsMoveTargetRef.current ??
            innerRef.current?.querySelector(".recharts-wrapper");
          if (!(target instanceof HTMLElement)) return;
          rechartsMoveTargetRef.current = target;
          target.dispatchEvent(
            new MouseEvent("mousemove", {
              bubbles: true,
              cancelable: true,
              clientX: start.clientX,
              clientY: start.clientY,
            }),
          );
        });
      }, TOUCH_INSPECT_LONG_PRESS_MS);
    }
    if (ev.pointerType === "mouse") {
      startDrag(ev);
    }
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    const ps = pointerStateRef.current;
    if (!ps) return;
    const deltaX = ev.clientX - ps.startX;
    const deltaY = ev.clientY - ps.startY;
    if (isTouchOnlyDevice && ev.pointerType !== "mouse") {
      if (isTouchInspecting) {
        const target =
          rechartsMoveTargetRef.current ??
          innerRef.current?.querySelector(".recharts-wrapper");
        if (target instanceof HTMLElement) {
          rechartsMoveTargetRef.current = target;
          target.dispatchEvent(
            new MouseEvent("mousemove", {
              bubbles: true,
              cancelable: true,
              clientX: ev.clientX,
              clientY: ev.clientY,
            }),
          );
        }
        return;
      }
      const start = touchInspectStartRef.current;
      if (touchInspectTimerRef.current && start) {
        start.chartX = start.startChartX + deltaX;
        start.clientX = ev.clientX;
        start.clientY = ev.clientY;
      }
      if (
        Math.hypot(deltaX, deltaY) >
        Math.max(DRAG_THRESHOLD_PX, TOUCH_INSPECT_MOVE_TOLERANCE_PX)
      ) {
        clearTouchInspectTimer();
      }
    }
    if (!ps.dragging) {
      if (
        Math.abs(deltaX) < DRAG_THRESHOLD_PX ||
        Math.abs(deltaX) < Math.abs(deltaY)
      ) {
        return;
      }
      clearTouchInspectTimer();
      startDrag(ev);
    }
    if (!pointerStateRef.current?.dragging) return;
    const next = clampTranslatePx(
      pointerStateRef.current.startTranslate - deltaX,
    );
    pendingTranslateRef.current = next;
    if (!dragRafRef.current) {
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = null;
        const pendingPx = pendingTranslateRef.current;
        if (typeof pendingPx !== "number") return;
        setInnerTranslatePx(pendingPx, false);
      });
    }
    if (!broadcastRafRef.current) {
      broadcastRafRef.current = requestAnimationFrame(() => {
        broadcastRafRef.current = null;
        const pendingPx = pendingTranslateRef.current;
        if (typeof pendingPx !== "number") return;
        setPanFraction(pendingPx / dayPx, myId, "drag");
      });
    }
  };

  const snapToNearestDayFromPx = useCallback(
    (px: number) => {
      const day = Math.round(px / dayPx);
      const dayClamped = Math.max(
        0,
        Math.min(day, totalFetchedDays - VISIBLE_DAYS),
      );
      return dayClamped;
    },
    [dayPx, totalFetchedDays],
  );

  const RoundToNearestDayFromPx = useCallback(
    (px: number) => {
      const day = Math.round(px / dayPx);
      const dayClamped = Math.max(
        0,
        Math.min(day, totalFetchedDays - VISIBLE_DAYS),
      );
      return dayClamped;
    },
    [dayPx, totalFetchedDays],
  );

  const onPointerUp = (ev: React.PointerEvent) => {
    const node = ev.currentTarget as Element;
    node.releasePointerCapture?.(ev.pointerId);
    clearTouchInspectTimer();
    setIsTouchInspecting(false);
    setIsDragging(false);
    if (isTouchOnlyDevice && ev.pointerType !== "mouse") {
      setTouchDefaultIndex(null);
      touchInspectStartRef.current = null;
      setHoveredHour(null);
    }
    const ps = pointerStateRef.current;
    if (!ps) return;
    pointerStateRef.current = null;
    if (!ps.dragging) return;
    document.body.style.userSelect = "";
    document.body.style.touchAction = "";
    if (broadcastRafRef.current) {
      cancelAnimationFrame(broadcastRafRef.current);
      broadcastRafRef.current = null;
    }
    if (dragRafRef.current) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
    if (typeof pendingTranslateRef.current === "number") {
      setInnerTranslatePx(pendingTranslateRef.current, false);
      pendingTranslateRef.current = null;
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

  // Mobile touch system callbacks
  const onPan = useCallback(
    (deltaPx: number) => {
      const next = clampTranslatePx(currentTranslateRef.current - deltaPx);
      setInnerTranslatePx(next, false);
      setPanFraction(next / dayPx, myId, "drag");
    },
    [clampTranslatePx, setInnerTranslatePx, setPanFraction, dayPx, myId],
  );

  const onPanEnd = useCallback(() => {
    const finalPx = clampTranslatePx(currentTranslateRef.current);
    const fractionalDayOffset = finalPx / dayPx;
    setDayOffset(fractionalDayOffset);
    setInnerTranslatePx(finalPx, false);
    setPanFraction(fractionalDayOffset, myId, "animate");
    const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
    setIsAtRightEdge(finalPx >= maxTranslate - 1);
  }, [
    clampTranslatePx,
    dayPx,
    myId,
    setInnerTranslatePx,
    setPanFraction,
    chartInnerWidth,
    viewportWidth,
  ]);

  const getIndexFromChartX = useCallback(
    (chartX: number): number => {
      if (!Number.isFinite(chartX) || !dataAreaWidth) return 0;
      if (data.length === 0) return 0;
      const plotX = Math.max(
        0,
        Math.min(chartX - dayLabelLeftOffset, dataAreaWidth),
      );
      const t = dataAreaWidth > 0 ? plotX / dataAreaWidth : 0;
      const targetHour = domainMin + t * (domainMax - domainMin);

      let lo = 0;
      let hi = data.length - 1;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        const midHour = data[mid]?.hour;
        if (typeof midHour !== "number") break;
        if (midHour < targetHour) lo = mid + 1;
        else hi = mid;
      }

      let closestIndex = lo;
      if (closestIndex > 0) {
        const currHour = data[closestIndex]?.hour;
        const prevHour = data[closestIndex - 1]?.hour;
        if (typeof currHour === "number" && typeof prevHour === "number") {
          if (
            Math.abs(prevHour - targetHour) <= Math.abs(currHour - targetHour)
          ) {
            closestIndex = closestIndex - 1;
          }
        }
      }
      return closestIndex;
    },
    [dataAreaWidth, dayLabelLeftOffset, domainMin, domainMax, data],
  );

  const getValueIconForIndex = useCallback(
    (index: number): React.ReactNode | null => {
      const point = data[index];
      if (!point) return null;

      const sunMarkerType = sunMarkerMap.get(point.hour);
      if (sunMarkerType === "sunrise") {
        return (
          <Sunrise
            className="h-3.5 w-3.5 fill-amber-500/80 stroke-muted-foreground"
            aria-hidden="true"
          />
        );
      }
      if (sunMarkerType === "sunset") {
        return (
          <Sunset
            className="h-3.5 w-3.5 fill-amber-500/80 stroke-muted-foreground"
            aria-hidden="true"
          />
        );
      }

      if (point.isPeak == null) return null;
      const prev = index > 0 ? data[index - 1] : null;
      const next = index + 1 < data.length ? data[index + 1] : null;
      if (!prev || !next) return null;

      const isHigh = point.tide >= prev.tide && point.tide >= next.tide;
      const isLow = point.tide <= prev.tide && point.tide <= next.tide;
      if (isHigh) {
        return (
          <ArrowUp
            className="h-3 w-3 text-emerald-500/80 stroke-4"
            aria-hidden="true"
          />
        );
      }
      if (isLow) {
        return (
          <ArrowDown
            className="h-3 w-3 text-rose-500/80 stroke-4"
            aria-hidden="true"
          />
        );
      }
      return null;
    },
    [data, sunMarkerMap],
  );

  const getMobileTooltipDataPoint = useCallback(
    (index: number): MobileTooltipDataPoint | null => {
      if (index < 0 || index >= data.length) return null;
      const point = data[index];
      const hour = point.hour;
      const normalized = ((hour % 24) + 24) % 24;
      const wholeHour = Math.floor(normalized);
      const minutes = Math.round((normalized - wholeHour) * 60);
      const displayHour = wholeHour % 12 === 0 ? 12 : wholeHour % 12;
      const ampm = wholeHour >= 12 ? "PM" : "AM";
      const label =
        minutes > 0
          ? `${displayHour}:${minutes.toString().padStart(2, "0")} ${ampm}`
          : `${displayHour} ${ampm}`;
      const prev = index > 0 ? data[index - 1] : null;
      const next = index + 1 < data.length ? data[index + 1] : null;
      const isHigh =
        prev && next ? point.tide >= prev.tide && point.tide >= next.tide : false;
      const isLow =
        prev && next ? point.tide <= prev.tide && point.tide <= next.tide : false;
      const rising = prev ? point.tide >= prev.tide : next ? next.tide >= point.tide : true;
      const trendLabel = isHigh
        ? "High tide"
        : isLow
          ? "Low tide"
          : rising
            ? "Rising"
            : "Falling";
      const trendColor = isHigh || rising ? "#10b981cc" : "#f43f5ecc";
      const valueIcon = getValueIconForIndex(index);
      const formattedValue = (
        <div className="mx-auto w-fit max-w-full text-center flex flex-col items-center gap-1">
          <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
            <span className="inline-flex items-baseline gap-1">
              <span className="text-[0.96rem] font-semibold tabular-nums leading-none text-foreground">
                {Number(point.tide.toFixed(1)).toString()}
              </span>
              <span className="text-[0.62rem] font-medium text-muted-foreground leading-none">
                ft
              </span>
            </span>
            {valueIcon ? (
              <span className="inline-flex items-center">{valueIcon}</span>
            ) : null}
          </div>
          <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-[0.62rem] leading-none text-muted-foreground">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: trendColor }}
            />
            <span>{trendLabel}</span>
          </div>
        </div>
      );

      return {
        hour: point.hour,
        label,
        value: point.tide,
        unit: "ft",
        icon: <TideIcon className="h-3.5 w-3.5" />,
        valueIcon: getValueIconForIndex(index),
        formattedValue,
      };
    },
    [data, getValueIconForIndex],
  );

  // Get hour from data index (for synced tooltip system)
  const getHourFromIndex = useCallback(
    (index: number): number => {
      if (index < 0 || index >= data.length) return 0;
      return data[index]?.hour ?? 0;
    },
    [data],
  );

  // Get data point for a given hour (for synced tooltip display on this chart)
  const getDataPointForHour = useCallback(
    (hour: number): MobileTooltipDataPoint | null => {
      // Find the data point closest to this hour using binary search
      if (data.length === 0) return null;

      let lo = 0;
      let hi = data.length;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        const midHour = data[mid]?.hour;
        if (typeof midHour !== "number") break;
        if (midHour < hour) lo = mid + 1;
        else hi = mid;
      }

      let closestIndex = lo;
      if (closestIndex > 0 && closestIndex < data.length) {
        const currHour = data[closestIndex]?.hour;
        const prevHour = data[closestIndex - 1]?.hour;
        if (typeof currHour === "number" && typeof prevHour === "number") {
          if (Math.abs(prevHour - hour) <= Math.abs(currHour - hour)) {
            closestIndex = closestIndex - 1;
          }
        }
      }
      closestIndex = Math.max(0, Math.min(data.length - 1, closestIndex));

      const point = data[closestIndex];
      if (!point) return null;

      const normalized = ((point.hour % 24) + 24) % 24;
      const wholeHour = Math.floor(normalized);
      const minutes = Math.round((normalized - wholeHour) * 60);
      const displayHour = wholeHour % 12 === 0 ? 12 : wholeHour % 12;
      const ampm = wholeHour >= 12 ? "PM" : "AM";
      const label =
        minutes > 0
          ? `${displayHour}:${minutes.toString().padStart(2, "0")} ${ampm}`
          : `${displayHour} ${ampm}`;
      const prev = closestIndex > 0 ? data[closestIndex - 1] : null;
      const next =
        closestIndex + 1 < data.length ? data[closestIndex + 1] : null;
      const isHigh =
        prev && next ? point.tide >= prev.tide && point.tide >= next.tide : false;
      const isLow =
        prev && next ? point.tide <= prev.tide && point.tide <= next.tide : false;
      const rising = prev ? point.tide >= prev.tide : next ? next.tide >= point.tide : true;
      const trendLabel = isHigh
        ? "High tide"
        : isLow
          ? "Low tide"
          : rising
            ? "Rising"
            : "Falling";
      const trendColor = isHigh || rising ? "#10b981cc" : "#f43f5ecc";
      const valueIcon = getValueIconForIndex(closestIndex);
      const formattedValue = (
        <div className="mx-auto w-fit max-w-full text-center flex flex-col items-center gap-1">
          <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
            <span className="inline-flex items-baseline gap-1">
              <span className="text-[0.96rem] font-semibold tabular-nums leading-none text-foreground">
                {Number(point.tide.toFixed(1)).toString()}
              </span>
              <span className="text-[0.62rem] font-medium text-muted-foreground leading-none">
                ft
              </span>
            </span>
            {valueIcon ? (
              <span className="inline-flex items-center">{valueIcon}</span>
            ) : null}
          </div>
          <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-[0.62rem] leading-none text-muted-foreground">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: trendColor }}
            />
            <span>{trendLabel}</span>
          </div>
        </div>
      );

      return {
        hour: point.hour,
        label,
        value: point.tide,
        unit: "ft",
        icon: <TideIcon className="h-3.5 w-3.5" />,
        valueIcon: getValueIconForIndex(closestIndex),
        formattedValue,
      };
    },
    [data, getValueIconForIndex],
  );

  // Get X position for a given hour (for synced tooltip positioning)
  const getXPositionForHour = useCallback(
    (hour: number): number | null => {
      if (!dataAreaWidth || dataAreaWidth <= 0) return null;
      const totalHours = domainMax - domainMin;
      if (totalHours <= 0) return null;
      const t = (hour - domainMin) / totalHours;
      if (t < 0 || t > 1) return null;
      return dayLabelLeftOffset + t * dataAreaWidth;
    },
    [dataAreaWidth, dayLabelLeftOffset, domainMin, domainMax],
  );

  const handleMobileInspect = useCallback(
    (_index: number, hour: number) => {
      setHoveredHour(hour);
    },
    [setHoveredHour],
  );

  const handleMobileInspectEnd = useCallback(() => {
    setHoveredHour(null);
  }, [setHoveredHour]);

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
      { immediate: true },
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
    let lastNonZero = containerWidth > 0 ? containerWidth : 0;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.floor(e.contentRect.width);
        const apply = () => {
          if (suppressSkeleton && w === 0 && lastNonZero > 0) {
            return;
          }
          if (w > 0) lastNonZero = w;
          setContainerWidth(w);
          // compute right-edge after resize (low frequency)
          const maxTranslate = Math.max(
            0,
            chartInnerWidth - Math.min(w || 0, dayPx * VISIBLE_DAYS),
          );
          setIsAtRightEdge(currentTranslateRef.current >= maxTranslate - 1);
        };
        if (el.closest("[data-ww-dashboard-edit-card]")) {
          safeFlushSync(apply);
        } else {
          apply();
        }
      }
    });
    ro.observe(el);
    // setContainerWidth(Math.floor(el.clientWidth));

    // also set isAtRightEdge on mount
    const maxTranslateOnMount = Math.max(0, chartInnerWidth - viewportWidth);
    setIsAtRightEdge(currentTranslateRef.current >= maxTranslateOnMount - 1);

    return () => ro.disconnect();
  }, [chartInnerWidth, dayPx, viewportWidth, containerWidth, suppressSkeleton]);

  // Fetch tide + day info for FETCH_DAYS
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) {
        if (!(suppressSkeleton && data.length > 0)) {
          setLoading(true);
        }
      }
      if (!beachId) {
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }
      try {
        const resolved = await fetchBeachByIdLoose(beachId);
        const id = resolved?.id ?? beachId;
        const end = new Date(startMs + fetchHours * 60 * 60 * 1000);
        const seriesRaw = await (async (): Promise<TidePoint[]> => {
          const points = await getTidesCached(
            String(id),
            new Date(startMs),
            end,
          );
          if (!points || points.length === 0) {
            const rows = await getForecastCached(
              String(id),
              new Date(startMs),
              end,
            );
            return rows.map((r) => ({
              hour: Math.round(
                (new Date(r.timestamp).getTime() - startMs) / (60 * 60 * 1000),
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
              dayAreas: suppressSkeleton ? dayAreas : [],
              nightAreas: suppressSkeleton ? nightAreas : [],
              sunMarkers: suppressSkeleton ? sunMarkers : [],
            });
            setLoading(false);
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
            (p) => p.hour >= dayStart && p.hour < dayEnd,
          );

          if (dayPoints.length > 0) {
            const tideValues = dayPoints.map((p) => p.tide);
            const high = Math.max(...tideValues);
            const low = Math.min(...tideValues);
            tideStatsBuild.push({ dayIndex: di, high, low });
          }
        }

        if (!cancelled) {
          setChartState((prev) => ({
            data: out,
            tideStats: tideStatsBuild,
            dayAreas: suppressSkeleton ? prev.dayAreas : [],
            nightAreas: suppressSkeleton ? prev.nightAreas : [],
            sunMarkers: suppressSkeleton ? prev.sunMarkers : [],
          }));
          setLoading(false);
          if (suppressSkeleton && tideCacheKey) {
            setTideCache(tideCacheKey, { data: out, tideStats: tideStatsBuild });
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.error("ForecastTideChart load error:", e);
        }
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [beachId, startMs, fetchHours, data.length, suppressSkeleton]);

  // TODO(overview-perf): Align this sun/shading pipeline with buildSunSegmentsForRange so
  // tide lines and night/day shading load together and reuse the same multi-day segments.
  // Load sun/shading markers after tide data is ready so lines render sooner
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!beachId) return;
      const cacheKey = `${beachId}-${startMs}`;
      const cached = getFreshSunCache(cacheKey);
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
          }),
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
            setSunCache(cacheKey, {
              dayAreas: dayAreasBuild,
              nightAreas: nightAreasBuild,
              markerTargets,
              sunMarkers: markers,
            });
            return next;
          });
        }
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.error("ForecastTideChart sun load error:", e);
        }
        if (!cancelled) {
          setChartState((prev) => {
            const cleared = {
              ...prev,
              dayAreas: [],
              nightAreas: [],
              sunMarkers: [],
            };
            setSunCache(cacheKey, {
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
          }),
        )
      : null;

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
    // The sunrise/sunset icons are positioned at y=15 and are ~18px tall, so we need
    // extra top padding to ensure the tide curve doesn't reach into that zone.
    const bottomPad = Math.max(2, span * 0.12);
    const topPad = Math.max(5, span * 0.35);
    const paddedMin = Math.floor(min - bottomPad);
    const paddedMax = Math.ceil(max + topPad);

    const axisMin = Math.floor(paddedMin);
    const axisMax = Math.ceil(paddedMax);
    return buildLinearYAxisTicks(axisMin, axisMax, 4, true);
  }, [data]);

  // Compute label positions with collision avoidance
  const labelPositions = useMemo(() => {
    const peaks = data
      .map((d, idx) => ({ ...d, index: idx }))
      .filter((d) => d.isPeak !== undefined && d.isPeak !== null);

    if (peaks.length === 0) return new Map<number, number>();

    const positions = new Map<number, number>(); // index -> y-offset
    const LABEL_WIDTH = 70; // Approximate width of label text (increased for better detection)
    const placed: Array<{ x: number; offset: number }> = [];

    // Sort peaks by x-position (hour)
    const sorted = [...peaks].sort((a, b) => a.hour - b.hour);

    // Calculate chart width scale (pixels per hour)
    const pxPerHour = chartInnerWidth / (totalFetchedDays * 24);

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      let baseOffset = -32; // Default offset from point (above)
      if (sunMarkerMap.get(current.hour)) {
        baseOffset = 25;
      }
      if (typeof current.isPeak === "number" && current.isPeak <= 0) {
        baseOffset = -32;
      }

      // Check for collisions with previous labels
      for (const prev of placed) {
        const xDist = Math.abs(prev.x - current.hour * pxPerHour);
        if (
          xDist < LABEL_WIDTH &&
          Math.sign(prev.offset) === Math.sign(baseOffset)
        ) {
          baseOffset = baseOffset < 0 ? 25 : -32;
          break;
        }
      }
      // If still colliding on the same side, stack farther
      for (const prev of placed) {
        const xDist = Math.abs(prev.x - current.hour * pxPerHour);
        if (
          xDist < LABEL_WIDTH &&
          Math.sign(prev.offset) === Math.sign(baseOffset)
        ) {
          baseOffset = baseOffset < 0 ? -52 : 45;
          break;
        }
      }

      placed.push({ x: current.hour * pxPerHour, offset: baseOffset });
      positions.set(current.index, baseOffset);
    }

    return positions;
  }, [data, chartInnerWidth, totalFetchedDays, sunMarkerMap]);

  // Y-axis domain for line proximity detection
  const yMin = tideTicks[0] ?? -2;
  const yMax = tideTicks[tideTicks.length - 1] ?? 8;

  // Check if touch coordinates are near the tide line
  const isOnLine = useCallback(
    (chartX: number, chartY: number): boolean => {
      if (!dataAreaWidth || dataAreaWidth <= 0) return false;

      const plotX = chartX - dayLabelLeftOffset;
      if (plotX < 0 || plotX > dataAreaWidth) return false;

      // Chart dimensions
      const chartHeight = 250;
      const bottomAxisHeight = 25;
      const lineAreaHeight = chartHeight - bottomAxisHeight;
      const lineAreaBottom = chartHeight - bottomAxisHeight;

      if (chartY > lineAreaBottom || chartY < 0) return false;

      // Find the nearest data point to this X
      const t = plotX / dataAreaWidth;
      const targetHour = domainMin + t * (domainMax - domainMin);

      // Binary search for closest point (tide data is high resolution)
      let lo = 0;
      let hi = data.length - 1;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        const midHour = data[mid]?.hour;
        if (typeof midHour !== "number") break;
        if (midHour < targetHour) lo = mid + 1;
        else hi = mid;
      }

      let closestIndex = lo;
      if (closestIndex > 0) {
        const currHour = data[closestIndex]?.hour;
        const prevHour = data[closestIndex - 1]?.hour;
        if (typeof currHour === "number" && typeof prevHour === "number") {
          if (
            Math.abs(prevHour - targetHour) <= Math.abs(currHour - targetHour)
          ) {
            closestIndex = closestIndex - 1;
          }
        }
      }

      const point = data[closestIndex];
      if (!point || typeof point.tide !== "number") return false;

      // Convert touch Y to data value
      const touchValueRatio = 1 - chartY / lineAreaHeight;
      const touchValue = yMin + touchValueRatio * (yMax - yMin);

      // Check if touch is within tolerance of the line value
      const toleranceInDataUnits = (yMax - yMin) * 0.15; // 15% of Y range

      return Math.abs(touchValue - point.tide) <= toleranceInDataUnits;
    },
    [dataAreaWidth, dayLabelLeftOffset, domainMin, domainMax, data, yMin, yMax],
  );

  const { handlers: mobileHandlers, styles: mobileStyles } =
    useMobileChartTouch({
      chartId: mobileChartId,
      containerRef: innerRef,
      dataLength: data.length,
      getIndexFromX: getIndexFromChartX,
      getHourFromIndex,
      isOnBar: isOnLine,
      onPan,
      onPanEnd,
      onInspect: handleMobileInspect,
      onInspectEnd: handleMobileInspectEnd,
      enabled: isTouchOnlyDevice,
    });

  const yAxisTick = useCallback(
    (props: YAxisTickProps) => {
      const { x, y, payload, textAnchor, fontSize } = props ?? {};
      const xNum = typeof x === "number" ? x : Number(x);
      const yNum = typeof y === "number" ? y : Number(y);
      if (!Number.isFinite(xNum) || !Number.isFinite(yNum)) return <text />;

      const resolvedTextAnchor: "start" | "middle" | "end" | "inherit" =
        textAnchor === "start" ||
        textAnchor === "middle" ||
        textAnchor === "end" ||
        textAnchor === "inherit"
          ? textAnchor
          : "end";

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
          textAnchor={resolvedTextAnchor}
          dominantBaseline="central"
          fontSize={typeof fontSize === "number" ? fontSize : 11}
          {...Y_AXIS_TICK}
        >
          {value}
        </text>
      );
    },
    [tideTicks],
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
    [],
  );
  const tooltipViewport = useMemo(
    () => ({
      x: clampTranslatePx(dayOffset * dayPx),
      y: 0,
      width: viewportWidth,
      height: Math.max(0, 250 - X_AXIS_SHADE_EXCLUDE_PX),
    }),
    [clampTranslatePx, dayOffset, dayPx, viewportWidth],
  );

  // Hover sync handlers
  const lastHoveredRef = React.useRef<number | null>(null);
  const hoverRafRef = React.useRef<number | null>(null);
  const pendingHoverRef = React.useRef<number | null>(null);

  const handleMouseMove = React.useCallback(
    (e: ChartMouseEvent) => {
      // Don't process hover events while loading
      if (loading) return;
      // On touch devices, we use MobileChartTooltip instead
      if (isTouchOnlyDevice) return;
      if (e && e.activeLabel !== undefined) {
        const hour = Number(e.activeLabel);
        if (!isNaN(hour)) {
          if (
            typeof lastHoveredRef.current === "number" &&
            Math.abs(lastHoveredRef.current - hour) < 1e-6
          )
            return;
          pendingHoverRef.current = hour;
          if (!hoverRafRef.current) {
            hoverRafRef.current = requestAnimationFrame(() => {
              hoverRafRef.current = null;
              const nextHour = pendingHoverRef.current;
              pendingHoverRef.current = null;
              if (typeof nextHour !== "number") return;
              if (lastHoveredRef.current !== nextHour) {
                lastHoveredRef.current = nextHour;
                setHoveredHour(nextHour);
              }
            });
          }
        }
      }
    },
    [loading, isTouchOnlyDevice, setHoveredHour],
  );

  const handleMouseLeave = React.useCallback(() => {
    if (isTouchOnlyDevice) return;
    if (hoverRafRef.current) {
      cancelAnimationFrame(hoverRafRef.current);
      hoverRafRef.current = null;
    }
    pendingHoverRef.current = null;
    lastHoveredRef.current = null;
    setHoveredHour(null);
  }, [isTouchOnlyDevice, setHoveredHour]);

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
            showSkeleton ? "opacity-0" : "opacity-100",
          )}
        >
          {/* prev/next buttons */}
          <button
            aria-label="Back one day"
            onClick={handleBack}
            className={cn(
              "absolute left-1 top-[55%] -translate-y-1/2 z-50 rounded-full bg-highlight-7/90 p-1 shadow border border-border/30 shadow-even backdrop-blur-xl",
              (!isScrollable || dayOffset === 0) && "hidden",
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            aria-label="Next one day"
            onClick={handleNext}
            className={cn(
              "absolute right-1 top-[55%] -translate-y-1/2 z-50 rounded-full bg-highlight-7/90 p-1 shadow border border-border/30 shadow-even backdrop-blur-xl",
              (!isScrollable || isAtRightEdge) && "hidden",
            )}
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* moving inner (chart + day separators) */}
          <div
            ref={innerRef}
            {...(isTouchOnlyDevice
              ? mobileHandlers
              : {
                  onPointerDown,
                  onPointerMove,
                  onPointerUp,
                  onPointerCancel: onPointerUp,
                })}
            className="chart-touch-no-select"
            data-dragging={isDragging ? "true" : "false"}
            style={{
              marginTop: 60,
              position: "absolute",
              left: 0,
              // top: 60, // leave room for label bar
              width: chartInnerWidth,
              height: 250,
              display: "block",
              willChange: "transform",
              ...(isTouchOnlyDevice ? mobileStyles : {}),
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
                  <HoverOverlayLine
                    domainMin={domainMin}
                    domainMax={domainMax}
                    plotLeftPx={dayLabelLeftOffset}
                    plotWidthPx={dataAreaWidth}
                    bottomInsetPx={X_AXIS_SHADE_EXCLUDE_PX}
                    endInsetPx={HOVER_LINE_END_INSET_PX}
                    days={days}
                    selectedDate={selectedDate}
                    selectedHour={
                      dashboardBusy ? stableSelectedHour : selectedHour
                    }
                  />
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
                      syncId={isTouchOnlyDevice ? undefined : "allCharts"}
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
                            ? (stableSelectedHour ?? selectedHour ?? null)
                            : (selectedHour ?? null);
                          const base = days && days.length > 0 ? days[0] : null;
                          if (!base || !selectedDate || effectiveHour == null)
                            return null;
                          const baseMid = new Date(
                            base.getFullYear(),
                            base.getMonth(),
                            base.getDate(),
                          ).getTime();
                          const selMid = new Date(
                            selectedDate.getFullYear(),
                            selectedDate.getMonth(),
                            selectedDate.getDate(),
                          ).getTime();
                          const dayDelta = Math.floor(
                            (selMid - baseMid) / (24 * 3600 * 1000),
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
                      {/* Mobile: Use custom MobileChartTooltip rendered via portal */}
                      {isTouchOnlyDevice ? null : (
                        <ChartTooltip
                          content={() => null}
                          cursor={false}
                          wrapperStyle={{ visibility: "hidden" }}
                          animationDuration={0}
                          isAnimationActive={false}
                        />
                      )}

                      <Line
                        dataKey="tide"
                        type="natural"
                        stroke={TIDE_LINE_COLOR}
                        strokeWidth={2}
                        isAnimationActive={false}
                        animationDuration={0}
                        animationBegin={0}
                        activeDot={tideActiveDot}
                        dot={({ payload, cx, cy, index }: TideDotProps) => {
                          if (!payload) {
                            return <g />;
                          }
                          const idx = typeof index === "number" ? index : -1;
                          const cxNum =
                            typeof cx === "number" ? cx : Number(cx);
                          const cyNum =
                            typeof cy === "number" ? cy : Number(cy);
                          if (idx === data.length - 2) {
                            if (
                              Number.isFinite(cxNum) &&
                              Number.isFinite(cyNum)
                            ) {
                              lastTideSegmentRef.current.prev = {
                                cx: cxNum,
                                cy: cyNum,
                              };
                            }
                          } else if (idx === data.length - 1) {
                            if (
                              Number.isFinite(cxNum) &&
                              Number.isFinite(cyNum)
                            ) {
                              lastTideSegmentRef.current.curr = {
                                cx: cxNum,
                                cy: cyNum,
                              };
                            }
                          }
                          const hour = payload.hour as number;
                          // Exact match for sun markers (no duplicates)
                          const sunMarker = sunMarkers.find(
                            (m) => m.hour === hour,
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
                              (m) => m.hour === hour,
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
                              let yOffset =
                                labelPositions.get(props.index) ?? -32;

                              const markerType = sunMarkerMap.get(h);
                              if (markerType && yOffset < 0) {
                                yOffset = 26;
                              }
                              // Keep labels inside the plot top edge.
                              if (safeY + yOffset < 18) {
                                yOffset = 18 - safeY;
                              }
                              const plotBottom =
                                250 - X_AXIS_SHADE_EXCLUDE_PX - 6;
                              if (safeY + yOffset + 15 > plotBottom) {
                                yOffset = -32;
                              }

                              // Calculate boundaries based on plot bounds.
                              const LEFT_BOUNDARY = dayLabelLeftOffset + 6;
                              const RIGHT_BOUNDARY =
                                dayLabelLeftOffset + dataAreaWidth - 6;
                              const LABEL_HALF_WIDTH = 35; // Approximate half-width of label text

                              // Determine text anchor and adjusted x position based on boundaries
                              let textAnchor: "start" | "middle" | "end" =
                                "middle";
                              let adjustedX = safeX;

                              if (safeX - LABEL_HALF_WIDTH < LEFT_BOUNDARY) {
                                textAnchor = "start";
                                adjustedX = LEFT_BOUNDARY;
                              } else if (
                                safeX + LABEL_HALF_WIDTH >
                                RIGHT_BOUNDARY
                              ) {
                                textAnchor = "end";
                                adjustedX = RIGHT_BOUNDARY;
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

        {/* Header tooltip (touch + desktop) - rendered via portal */}
        <MobileChartTooltip
          chartId={mobileChartId}
          getDataPoint={getMobileTooltipDataPoint}
          getDataPointForHour={getDataPointForHour}
          anchorRef={containerRef}
          getXPositionForHour={getXPositionForHour}
          positionInside
          topOffset={55}
          disabled={loading}
        />
      </div>
    </div>
  );
});
