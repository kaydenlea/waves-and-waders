"use client";

import React, {
  useMemo,
  useState,
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "react";
import { safeFlushSync } from "@/components/graphs/safeFlushSync";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
  AreaChart,
  Area,
  Customized,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  ChartTooltipViewportContent,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useIsTouchOnlyDevice } from "./useIsTouchOnlyDevice";
import {
  useMobileChartTouch,
  MobileChartTooltip,
  type MobileTooltipDataPoint,
} from "./MobileChartTooltip";
import {
  MousePointer2 as ArrowIcon,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { fetchBeachByIdLoose, getWindDirection } from "@/lib/supabase";
import { cn, getPacificMidnightUTC } from "@/lib/utils";
import { getForecastCached } from "@/lib/dataCache";
import { useForecastData } from "@/components/context/ForecastDataContext";
import { syncToNearestThirdHour } from "@/components/graphs/chartSync";
import HoverOverlayLine from "@/components/graphs/HoverOverlayLine";
import { useDateContext } from "@/components/context/DateContext";
import { useForecastChartContext } from "@/components/context/ForecastChartContext";
import { useSunData } from "@/components/context/SunDataContext";
import { buildSunSegmentsForRange } from "@/components/graphs/sunSegments";
import { buildForecastShadingBackground } from "@/components/graphs/forecastShadingBackground";
import { getForecastDayHeaderLayout } from "./forecastDayHeaderLayout";
import {
  useForecastChartLoading,
  useForecastChartsBusyState,
} from "../context/ForecastChartsLoadingContext";
import { useChartTheme } from "@/components/graphs/useChartTheme";
import type { ForecastData } from "@/lib/supabase";
import {
  buildYAxisTicks,
  limitYAxisTicks,
} from "@/components/graphs/yAxisTicks";

const chartConfig = {
  primary: {
    label: "Primary",
    color: "#0077b6",
  },
  secondary: {
    label: "Second",
    color: "#48cae4",
  },
  tertiary: {
    label: "Tertiary",
    color: "#adf1ffff",
  },
} satisfies ChartConfig;

type SwellPoint = {
  hour: number;
  primary: number;
  secondary: number;
  tertiary: number;
  primaryDir?: number;
  secondaryDir?: number;
  tertiaryDir?: number;
  primaryPeriod?: number;
  secondaryPeriod?: number;
  tertiaryPeriod?: number;
  _terminal?: boolean;
};

type Props = { beachId?: string; days?: Date[] | null };

type YAxisTickProps = {
  x?: number;
  y?: number;
  payload?: { value?: number };
  textAnchor?: string;
  fontSize?: number;
};

type TooltipPayload = Array<{ payload?: { hour?: number } }>;

type TooltipItem = {
  dataKey?: string | number;
  payload?: Record<string, unknown>;
};

type TooltipValue = number | string | Array<number | string>;

type ChartMouseEvent = { activeLabel?: number | string | null };

type CustomizedProps = {
  offset?: { left?: number; width?: number; height?: number; top?: number };
  width?: number;
};

const HOURS_PER_DAY = 24;
const VISIBLE_DAYS = 4;
const MIN_DAY_PX = 275; // minimum pixels per day to keep UI usable
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

const ForecastSwellChart: React.FC<Props> = ({ beachId, days }) => {
  const { setPanFraction, subscribePan } = useForecastChartContext();
  const myId = React.useId();
  const {
    hour: selectedHour,
    setHoveredHour,
    hoveredHourRef,
    subscribeToHover,
  } = useDateContext();
  const { getSunData } = useSunData();
  const chartTheme = useChartTheme();
  const [loading, setLoading] = useState(true);
  const [sunReady, setSunReady] = useState(false);
  const { rows: sharedRows } = useForecastData();
  const [swellData, setSwellData] = useState<SwellPoint[]>([]);
  const [baseStartMs, setBaseStartMs] = useState<number | null>(null);
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );
  const lastArrowPointRef = useRef<
    Record<
      "primary" | "secondary" | "tertiary",
      { cx: number; cy: number } | null
    >
  >({ primary: null, secondary: null, tertiary: null });

  // Scrollable state
  const [dayOffset, setDayOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isAtRightEdge, setIsAtRightEdge] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { selected: selectedDate } = useDateContext();
  const isTouchOnlyDevice = useIsTouchOnlyDevice();
  const mobileChartId = React.useId();

  // Normalize and sort incoming days so fetch windows stay aligned
  const normalizedDays = useMemo(() => {
    if (!days || days.length === 0) return null;
    return [...days]
      .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
  }, [days]);
  const displayDays = normalizedDays ?? days ?? null;

  // Pointer & animation refs
  const currentTranslateRef = useRef(0);
  const pointerStateRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startTranslate: number;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const pendingTranslateRef = useRef<number | null>(null);

  // Derived dimensions - use normalized days length if available
  const totalFetchedDays = useMemo(() => {
    return normalizedDays && normalizedDays.length > 0
      ? normalizedDays.length
      : VISIBLE_DAYS;
  }, [normalizedDays]);
  const dayPx = useMemo(() => {
    // Day width is derived from the visible container width (4 days shown) with a floor,
    // so each 24h segment keeps a stable pixel width and stays aligned across charts.
    if (!containerWidth) return MIN_DAY_PX;
    const fillPerDay = containerWidth / VISIBLE_DAYS;
    return Math.max(MIN_DAY_PX, Math.floor(fillPerDay));
  }, [containerWidth]);

  const chartInnerWidth = useMemo(
    () => totalFetchedDays * dayPx,
    [totalFetchedDays, dayPx]
  );

  const viewportWidth = useMemo(
    () => Math.min(containerWidth || 0, dayPx * VISIBLE_DAYS),
    [containerWidth, dayPx]
  );
  const isScrollable = chartInnerWidth > viewportWidth + 1;

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

  // helpers: clamp translate (px)
  const clampTranslatePx = useCallback(
    (px: number) => {
      const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
      return Math.max(0, Math.min(px, maxTranslate));
    },
    [chartInnerWidth, viewportWidth]
  );

  // set transform imperatively
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
    },
    []
  );

  // animate to target px
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
        const ease = 1 - Math.pow(1 - p, 3);
        const v = start + delta * ease;
        setInnerTranslatePx(clampTranslatePx(v), false);
        if (p < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          setInnerTranslatePx(clampTranslatePx(targetPx), true);
          rafRef.current = null;
          onEnd?.();
        }
      };

      rafRef.current = requestAnimationFrame(step);
    },
    [clampTranslatePx, setInnerTranslatePx]
  );

  // Pointer handlers
  const onPan = useCallback(
    (dx: number) => {
      // Logic for chart panning
      const base =
        typeof pendingTranslateRef.current === "number"
          ? pendingTranslateRef.current
          : currentTranslateRef.current;
      if (typeof base !== "number") return;
      const next = clampTranslatePx(base - dx);
      pendingTranslateRef.current = next;

      if (!dragRafRef.current) {
        dragRafRef.current = requestAnimationFrame(() => {
          dragRafRef.current = null;
          const pendingPx = pendingTranslateRef.current;
          if (typeof pendingPx !== "number") return;
          setInnerTranslatePx(pendingPx, false);
          setPanFraction(pendingPx / dayPx, myId, "drag");
        });
      }
    },
    [clampTranslatePx, dayPx, myId, setInnerTranslatePx, setPanFraction],
  );

  const onPanEnd = useCallback(() => {
    if (dragRafRef.current) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
    if (typeof pendingTranslateRef.current === "number") {
      setInnerTranslatePx(pendingTranslateRef.current, false);
      pendingTranslateRef.current = null;
    }

    const finalPx = clampTranslatePx(currentTranslateRef.current);
    const fractionalDayOffset = finalPx / dayPx;
    setDayOffset(fractionalDayOffset);
    setInnerTranslatePx(finalPx, false);
    setPanFraction(fractionalDayOffset, myId, "animate");

    const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
    setIsAtRightEdge(finalPx >= maxTranslate - 1);
  }, [clampTranslatePx, dayPx, myId, setInnerTranslatePx, setPanFraction, chartInnerWidth, viewportWidth]);

  // Desktop pointer handlers for drag panning (mouse only)
  const startDrag = useCallback((ev: React.PointerEvent) => {
    const node = ev.currentTarget as Element;
    node.setPointerCapture?.(ev.pointerId);
    if (pointerStateRef.current) {
      pointerStateRef.current.dragging = true;
    }
    setIsDragging(true);
    document.body.style.userSelect = "none";
  }, []);

  const onPointerDown = useCallback(
    (ev: React.PointerEvent) => {
      if (ev.pointerType !== "mouse") return;
      pointerStateRef.current = {
        dragging: false,
        startX: ev.clientX,
        startY: ev.clientY,
        startTranslate: currentTranslateRef.current,
      };
      setInnerTranslatePx(currentTranslateRef.current, false);
    },
    [setInnerTranslatePx]
  );

  const onPointerMove = useCallback(
    (ev: React.PointerEvent) => {
      if (ev.pointerType !== "mouse") return;
      const ps = pointerStateRef.current;
      if (!ps) return;
      const deltaX = ev.clientX - ps.startX;
      const deltaY = ev.clientY - ps.startY;
      if (!ps.dragging) {
        if (
          Math.abs(deltaX) < DRAG_THRESHOLD_PX ||
          Math.abs(deltaX) < Math.abs(deltaY)
        ) {
          return;
        }
        startDrag(ev);
      }
      if (!pointerStateRef.current?.dragging) return;
      const next = clampTranslatePx(ps.startTranslate - deltaX);
      pendingTranslateRef.current = next;
      if (!dragRafRef.current) {
        dragRafRef.current = requestAnimationFrame(() => {
          dragRafRef.current = null;
          const pendingPx = pendingTranslateRef.current;
          if (typeof pendingPx !== "number") return;
          setInnerTranslatePx(pendingPx, false);
          setPanFraction(pendingPx / dayPx, myId, "drag");
        });
      }
    },
    [
      clampTranslatePx,
      dayPx,
      myId,
      setInnerTranslatePx,
      setPanFraction,
      startDrag,
    ]
  );

  const onPointerUp = useCallback(
    (ev: React.PointerEvent) => {
      if (ev.pointerType !== "mouse") return;
      const node = ev.currentTarget as Element;
      node.releasePointerCapture?.(ev.pointerId);
      const ps = pointerStateRef.current;
      pointerStateRef.current = null;
      setIsDragging(false);
      if (!ps?.dragging) return;
      document.body.style.userSelect = "";
      if (dragRafRef.current) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      if (typeof pendingTranslateRef.current === "number") {
        setInnerTranslatePx(pendingTranslateRef.current, false);
        pendingTranslateRef.current = null;
      }
      const finalPx = clampTranslatePx(currentTranslateRef.current);
      const fractionalDayOffset = finalPx / dayPx;
      setDayOffset(fractionalDayOffset);
      setInnerTranslatePx(finalPx, false);
      setPanFraction(fractionalDayOffset, myId, "animate");
      const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
      setIsAtRightEdge(finalPx >= maxTranslate - 1);
    },
    [
      clampTranslatePx,
      dayPx,
      myId,
      setInnerTranslatePx,
      setPanFraction,
      chartInnerWidth,
      viewportWidth,
    ]
  );
  // Rename for consistency with new mobile touch system
  const getIndexFromChartX = useCallback(
    (chartX: number): number => {
      if (!Number.isFinite(chartX) || !dataAreaWidth) return 0;
      const plotX = Math.max(
        0,
        Math.min(chartX - dayLabelLeftOffset, dataAreaWidth)
      );
      const t = dataAreaWidth > 0 ? plotX / dataAreaWidth : 0;
      const hour = domainMin + t * (domainMax - domainMin);
      const roundedHour = Math.round(hour / DATA_STEP_HOURS) * DATA_STEP_HOURS;
      const clampedHour = Math.max(0, Math.min(roundedHour, totalFetchedDays * HOURS_PER_DAY));
      return Math.round(clampedHour / DATA_STEP_HOURS);
    },
    [dataAreaWidth, dayLabelLeftOffset, domainMin, domainMax, totalFetchedDays]
  );

  const getMobileTooltipDataPoint = useCallback(
    (index: number): MobileTooltipDataPoint | null => {
      if (index < 0 || index >= swellData.length) return null;
      const point = swellData[index];
      const hour = point.hour;
      const normalized = ((hour % 24) + 24) % 24;
      const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;
      const ampm = normalized >= 12 ? "PM" : "AM";
      
      const dirLabel = (direction?: number) =>
        typeof direction === "number" ? getWindDirection(direction) : "--";
      const formattedValue = (
        <div className="mx-auto grid w-fit max-w-full grid-cols-3 gap-x-3">
          <div className="min-w-0 flex flex-col items-center gap-1 text-center">
            <div className="inline-flex items-baseline justify-center gap-1 whitespace-nowrap leading-none">
            <span
              className="text-[0.62rem] font-bold tabular-nums"
              style={{ color: chartConfig.primary.color }}
            >
              1
            </span>
              <span className="text-[0.82rem] font-semibold tabular-nums leading-none text-foreground">
              {point.primary.toFixed(1)}
            </span>
              <span className="text-[0.62rem] font-medium text-muted-foreground leading-none">
              ft
            </span>
              <span className="text-[0.62rem] font-medium text-muted-foreground tabular-nums leading-none">
                ·{" "}
                {typeof point.primaryPeriod === "number"
                  ? `${Math.round(point.primaryPeriod)}s`
                  : "--s"}
            </span>
            </div>
            <div className="inline-flex items-center justify-center gap-1 whitespace-nowrap text-[0.62rem] leading-none text-muted-foreground">
              {typeof point.primaryDir === "number" ? (
              <ArrowIcon
                size={10}
                className="fill-foreground/15 text-foreground/60"
                style={{
                  transform: `rotate(${point.primaryDir - 315}deg)`,
                  transformOrigin: "50% 50%",
                }}
              />
            ) : null}
              <span className="font-medium leading-none">
                {dirLabel(point.primaryDir)}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex flex-col items-center gap-1 text-center">
            <div className="inline-flex items-baseline justify-center gap-1 whitespace-nowrap leading-none">
            <span
              className="text-[0.62rem] font-bold tabular-nums"
              style={{ color: chartConfig.secondary.color }}
            >
              2
            </span>
              <span className="text-[0.82rem] font-semibold tabular-nums leading-none text-foreground">
              {point.secondary.toFixed(1)}
            </span>
              <span className="text-[0.62rem] font-medium text-muted-foreground leading-none">
              ft
            </span>
              <span className="text-[0.62rem] font-medium text-muted-foreground tabular-nums leading-none">
                ·{" "}
                {typeof point.secondaryPeriod === "number"
                  ? `${Math.round(point.secondaryPeriod)}s`
                  : "--s"}
            </span>
            </div>
            <div className="inline-flex items-center justify-center gap-1 whitespace-nowrap text-[0.62rem] leading-none text-muted-foreground">
              {typeof point.secondaryDir === "number" ? (
              <ArrowIcon
                size={10}
                className="fill-foreground/15 text-foreground/60"
                style={{
                  transform: `rotate(${point.secondaryDir - 315}deg)`,
                  transformOrigin: "50% 50%",
                }}
              />
            ) : null}
              <span className="font-medium leading-none">
                {dirLabel(point.secondaryDir)}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex flex-col items-center gap-1 text-center">
            <div className="inline-flex items-baseline justify-center gap-1 whitespace-nowrap leading-none">
            <span
              className="text-[0.62rem] font-bold tabular-nums"
              style={{ color: chartConfig.tertiary.color }}
            >
              3
            </span>
              <span className="text-[0.82rem] font-semibold tabular-nums leading-none text-foreground">
              {point.tertiary.toFixed(1)}
            </span>
              <span className="text-[0.62rem] font-medium text-muted-foreground leading-none">
              ft
            </span>
              <span className="text-[0.62rem] font-medium text-muted-foreground tabular-nums leading-none">
                ·{" "}
                {typeof point.tertiaryPeriod === "number"
                  ? `${Math.round(point.tertiaryPeriod)}s`
                  : "--s"}
            </span>
            </div>
            <div className="inline-flex items-center justify-center gap-1 whitespace-nowrap text-[0.62rem] leading-none text-muted-foreground">
              {typeof point.tertiaryDir === "number" ? (
              <ArrowIcon
                size={10}
                className="fill-foreground/15 text-foreground/60"
                style={{
                  transform: `rotate(${point.tertiaryDir - 315}deg)`,
                  transformOrigin: "50% 50%",
                }}
              />
            ) : null}
              <span className="font-medium leading-none">
                {dirLabel(point.tertiaryDir)}
              </span>
            </div>
          </div>
        </div>
      );
      
      return {
        hour: point.hour,
        label: `${displayHour} ${ampm}`,
        value: point.primary, // Still need a numeric value for interface
        unit: "ft",
        formattedValue,
        labelSpacing: "spacious",
      };
    },
    [swellData]
  );

  // Get data point for a given hour (for synced tooltip display on this chart)
  const getDataPointForHour = useCallback(
    (hour: number): MobileTooltipDataPoint | null => {
      // Hour is already rounded to 3-hour intervals
      const index = Math.round(hour / DATA_STEP_HOURS);
      if (index < 0 || index >= swellData.length) return null;
      const point = swellData[index];
      const normalized = ((point.hour % 24) + 24) % 24;
      const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;
      const ampm = normalized >= 12 ? "PM" : "AM";
      
      const dirLabel = (direction?: number) =>
        typeof direction === "number" ? getWindDirection(direction) : "--";
      const formattedValue = (
        <div className="mx-auto grid w-fit max-w-full grid-cols-3 gap-x-3">
          <div className="min-w-0 flex flex-col items-center gap-1 text-center">
            <div className="inline-flex items-baseline justify-center gap-1 whitespace-nowrap leading-none">
            <span
              className="text-[0.62rem] font-bold tabular-nums"
              style={{ color: chartConfig.primary.color }}
            >
              1
            </span>
              <span className="text-[0.82rem] font-semibold tabular-nums leading-none text-foreground">
              {point.primary.toFixed(1)}
            </span>
              <span className="text-[0.62rem] font-medium text-muted-foreground leading-none">
              ft
            </span>
              <span className="text-[0.62rem] font-medium text-muted-foreground tabular-nums leading-none">
                ·{" "}
                {typeof point.primaryPeriod === "number"
                  ? `${Math.round(point.primaryPeriod)}s`
                  : "--s"}
            </span>
            </div>
            <div className="inline-flex items-center justify-center gap-1 whitespace-nowrap text-[0.62rem] leading-none text-muted-foreground">
              {typeof point.primaryDir === "number" ? (
              <ArrowIcon
                size={10}
                className="fill-foreground/15 text-foreground/60"
                style={{
                  transform: `rotate(${point.primaryDir - 315}deg)`,
                  transformOrigin: "50% 50%",
                }}
              />
            ) : null}
              <span className="font-medium leading-none">
                {dirLabel(point.primaryDir)}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex flex-col items-center gap-1 text-center">
            <div className="inline-flex items-baseline justify-center gap-1 whitespace-nowrap leading-none">
            <span
              className="text-[0.62rem] font-bold tabular-nums"
              style={{ color: chartConfig.secondary.color }}
            >
              2
            </span>
              <span className="text-[0.82rem] font-semibold tabular-nums leading-none text-foreground">
              {point.secondary.toFixed(1)}
            </span>
              <span className="text-[0.62rem] font-medium text-muted-foreground leading-none">
              ft
            </span>
              <span className="text-[0.62rem] font-medium text-muted-foreground tabular-nums leading-none">
                ·{" "}
                {typeof point.secondaryPeriod === "number"
                  ? `${Math.round(point.secondaryPeriod)}s`
                  : "--s"}
            </span>
            </div>
            <div className="inline-flex items-center justify-center gap-1 whitespace-nowrap text-[0.62rem] leading-none text-muted-foreground">
              {typeof point.secondaryDir === "number" ? (
              <ArrowIcon
                size={10}
                className="fill-foreground/15 text-foreground/60"
                style={{
                  transform: `rotate(${point.secondaryDir - 315}deg)`,
                  transformOrigin: "50% 50%",
                }}
              />
            ) : null}
              <span className="font-medium leading-none">
                {dirLabel(point.secondaryDir)}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex flex-col items-center gap-1 text-center">
            <div className="inline-flex items-baseline justify-center gap-1 whitespace-nowrap leading-none">
            <span
              className="text-[0.62rem] font-bold tabular-nums"
              style={{ color: chartConfig.tertiary.color }}
            >
              3
            </span>
              <span className="text-[0.82rem] font-semibold tabular-nums leading-none text-foreground">
              {point.tertiary.toFixed(1)}
            </span>
              <span className="text-[0.62rem] font-medium text-muted-foreground leading-none">
              ft
            </span>
              <span className="text-[0.62rem] font-medium text-muted-foreground tabular-nums leading-none">
                ·{" "}
                {typeof point.tertiaryPeriod === "number"
                  ? `${Math.round(point.tertiaryPeriod)}s`
                  : "--s"}
            </span>
            </div>
            <div className="inline-flex items-center justify-center gap-1 whitespace-nowrap text-[0.62rem] leading-none text-muted-foreground">
              {typeof point.tertiaryDir === "number" ? (
              <ArrowIcon
                size={10}
                className="fill-foreground/15 text-foreground/60"
                style={{
                  transform: `rotate(${point.tertiaryDir - 315}deg)`,
                  transformOrigin: "50% 50%",
                }}
              />
            ) : null}
              <span className="font-medium leading-none">
                {dirLabel(point.tertiaryDir)}
              </span>
            </div>
          </div>
        </div>
      );
      
      return {
        hour: point.hour,
        label: `${displayHour} ${ampm}`,
        value: point.primary,
        unit: "ft",
        formattedValue,
        labelSpacing: "spacious",
      };
    },
    [swellData, getWindDirection]
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
    [dataAreaWidth, dayLabelLeftOffset, domainMin, domainMax]
  );

  const handleMobileInspect = useCallback(
    (_index: number, hour: number) => {
      setHoveredHour(hour);
    },
    [setHoveredHour]
  );

  const handleMobileInspectEnd = useCallback(() => {
    setHoveredHour(null);
  }, [setHoveredHour]);


  // Button controls
  const handleNext = useCallback(() => {
    const maxOffset = Math.max(0, totalFetchedDays - 1);
    const currentFractionalOffset = currentTranslateRef.current / dayPx;
    const newOffset = Math.min(maxOffset, currentFractionalOffset + 1);
    const targetPx = newOffset * dayPx;
    setPanFraction(newOffset, myId, "animate");
    animateToPx(targetPx, () => {
      setDayOffset(newOffset);
      const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
      setIsAtRightEdge(targetPx >= maxTranslate - 1);
      setPanFraction(newOffset, myId);
    });
  }, [animateToPx, dayPx, totalFetchedDays, chartInnerWidth, viewportWidth]);

  const handleBack = useCallback(() => {
    const currentFractionalOffset = currentTranslateRef.current / dayPx;
    const newOffset = Math.max(0, currentFractionalOffset - 1);
    const targetPx = newOffset * dayPx;
    setPanFraction(newOffset, myId, "animate");
    animateToPx(targetPx, () => {
      setDayOffset(newOffset);
      const maxTranslate = Math.max(0, chartInnerWidth - viewportWidth);
      setIsAtRightEdge(targetPx >= maxTranslate - 1);
      setPanFraction(newOffset, myId);
    });
  }, [animateToPx, dayPx, chartInnerWidth, viewportWidth]);

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
  }, [
    subscribePan,
    myId,
    dayPx,
    clampTranslatePx,
    setInnerTranslatePx,
    animateToPx,
  ]);

  // Update transform when dayOffset changes
  useEffect(() => {
    if (pointerStateRef.current?.dragging) return;
    const px = clampTranslatePx(dayOffset * dayPx);
    setInnerTranslatePx(px, true);
  }, [dayOffset, dayPx, clampTranslatePx, setInnerTranslatePx]);

  // ResizeObserver for container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.floor(e.contentRect.width);
        const apply = () => {
          setContainerWidth(w);
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

    const maxTranslateOnMount = Math.max(0, chartInnerWidth - viewportWidth);
    setIsAtRightEdge(currentTranslateRef.current >= maxTranslateOnMount - 1);

    return () => ro.disconnect();
  }, [chartInnerWidth, dayPx, viewportWidth]);

  // Hydrate sun shading immediately (in parallel with data fetch)
  useEffect(() => {
    let cancelled = false;
    const hydrateSun = async () => {
      const totalDays =
        normalizedDays && normalizedDays.length > 0
          ? normalizedDays.length
          : VISIBLE_DAYS;
      if (!beachId || totalDays <= 0) {
        setDayAreas([]);
        setNightAreas([]);
        if (!cancelled) {
          setSunReady(true);
        }
        return;
      }

      const baseDate =
        normalizedDays && normalizedDays.length > 0
          ? normalizedDays[0]
          : new Date();
      const startDate = getPacificMidnightUTC(baseDate);

      try {
        const segments = await buildSunSegmentsForRange({
          fetchSun: (date) => getSunData(String(beachId), date),
          startDate,
          days: totalDays,
          hourSnap: 3,
        });
        if (!cancelled) {
          setDayAreas(segments.dayAreas);
          setNightAreas(segments.nightAreas);
        }
      } catch {
        if (!cancelled) {
          setDayAreas([]);
          setNightAreas([{ x1: 0, x2: totalDays * HOURS_PER_DAY }]);
        }
      }
      if (!cancelled) {
        setSunReady(true);
      }
    };

    void hydrateSun();

    return () => {
      cancelled = true;
      setSunReady(false);
    };
  }, [beachId, normalizedDays, getSunData]);

  // Build swell series from forecast rows
  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        if (!beachId) {
          if (!cancelled) {
            setSwellData([]);
            setBaseStartMs(null);
            setLoading(false);
          }
          return;
        }

        const numDaysToFetch =
          normalizedDays && normalizedDays.length > 0
            ? normalizedDays.length
            : VISIBLE_DAYS;
        const baseDateValue =
          normalizedDays && normalizedDays.length > 0
            ? normalizedDays[0]
            : new Date();
        const start = getPacificMidnightUTC(baseDateValue);
        const end = new Date(
          start.getTime() + numDaysToFetch * 24 * 60 * 60 * 1000
        );
        const startMs = start.getTime();
        const endMs = end.getTime();
        const coverageToleranceMs = 3 * 60 * 60 * 1000;

        const filterSharedRows = (): ForecastData[] => {
          if (!sharedRows?.length) {
            return [];
          }
          const filtered =
            sharedRows
              .filter((row) => {
                const ts = new Date(row.timestamp).getTime();
                return ts >= startMs && ts <= endMs;
              })
              .sort(
                (a, b) =>
                  new Date(a.timestamp).getTime() -
                  new Date(b.timestamp).getTime()
              ) ?? [];
          if (!filtered.length) {
            return [];
          }
          const firstTs = new Date(filtered[0].timestamp).getTime();
          const lastTs = new Date(
            filtered[filtered.length - 1].timestamp
          ).getTime();
          const coversStart = firstTs <= startMs + coverageToleranceMs;
          const coversEnd = lastTs >= endMs - coverageToleranceMs;
          return coversStart && coversEnd ? filtered : [];
        };

        let rows: ForecastData[] = filterSharedRows();
        if (!rows?.length) {
          const resolved = await fetchBeachByIdLoose(beachId);
          const id = resolved?.id ?? beachId;

          if (!id) {
            if (!cancelled) {
              setSwellData([]);
              setBaseStartMs(null);
            }
            return;
          }

          rows = await getForecastCached(String(id), start, end);
        }

        if (!rows || !rows.length) {
          if (!cancelled) {
            setSwellData([]);
            setBaseStartMs(null);
            setLoading(false);
          }
          return;
        }

        // Sort rows
        rows.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Use today's date (or the first selected day) as the base, not the earliest data point
        const shadingBaseDate = baseDateValue;

        // Get midnight in Pacific timezone for the base date (DST-aware)
        const dateFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const dateParts = dateFormatter.formatToParts(shadingBaseDate);
        const year = parseInt(
          dateParts.find((p) => p.type === "year")?.value || "0"
        );
        const month =
          parseInt(dateParts.find((p) => p.type === "month")?.value || "1") - 1;
        const day = parseInt(
          dateParts.find((p) => p.type === "day")?.value || "1"
        );

        // Calculate UTC timestamp for Pacific midnight using offset at noon
        const noonUTC = Date.UTC(year, month, day, 12, 0, 0, 0);
        const noonDate = new Date(noonUTC);
        const noonFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          hour: "2-digit",
          hour12: false,
        });
        const pacificNoonHour = parseInt(noonFormatter.format(noonDate));
        const offsetHours = pacificNoonHour - 12;

        const baseMs = Date.UTC(year, month, day, -offsetHours, 0, 0, 0);
        if (!cancelled) {
          setBaseStartMs(baseMs);
        }

        const series: SwellPoint[] = [];
        const maxHour = numDaysToFetch * 24; // Maximum hour based on days to fetch
        for (const r of rows) {
          const ts = new Date(r.timestamp).getTime();
          const hour = Math.round((ts - baseMs) / 3600000);
          // Only include data points within the valid range
          if (hour >= 0 && hour <= maxHour) {
            series.push({
              hour,
              primary: Number((r.swell.primary.height ?? 0).toFixed(1)),
              secondary: Number((r.swell.secondary.height ?? 0).toFixed(1)),
              tertiary: Number((r.swell.tertiary?.height ?? 0).toFixed(1)),
              primaryDir: r.swell.primary.direction ?? undefined,
              secondaryDir: r.swell.secondary.direction ?? undefined,
              tertiaryDir: r.swell.tertiary?.direction ?? undefined,
              primaryPeriod: r.swell.primary.period ?? undefined,
              secondaryPeriod: r.swell.secondary.period ?? undefined,
              tertiaryPeriod: r.swell.tertiary?.period ?? undefined,
            });
          }
        }

        series.sort((a, b) => a.hour - b.hour);
        const last = series[series.length - 1];
        if (last && last.hour < maxHour) {
          series.push({
            ...last,
            hour: maxHour,
            _terminal: true,
            primaryDir: undefined,
            secondaryDir: undefined,
            tertiaryDir: undefined,
            primaryPeriod: undefined,
            secondaryPeriod: undefined,
            tertiaryPeriod: undefined,
          });
        }
        if (!cancelled) {
          setSwellData(series);
          setLoading(false);
        }
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to load swell data", e);
        }
        if (!cancelled) {
          setSwellData([]);
          setBaseStartMs(null);
          setDayAreas([]);
          setNightAreas([]);
          setLoading(false);
        }
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [beachId, normalizedDays]);

  const dayStats = React.useMemo(() => {
    if (!swellData.length) return [];

    const stats: { high: number; low: number }[] = [];
    const hoursPerDay = 24;

    for (let dayIdx = 0; dayIdx < totalFetchedDays; dayIdx++) {
      const dayStartHour = dayIdx * hoursPerDay;
      const dayEndHour = dayStartHour + hoursPerDay;

      const dayData = swellData.filter(
        (point) => point.hour >= dayStartHour && point.hour < dayEndHour
      );

      if (dayData.length > 0) {
        const primaryValues = dayData.map((p) => p.primary);
        const high = Math.max(...primaryValues);
        const low = Math.min(...primaryValues);
        stats.push({
          high: Math.round(high * 10) / 10,
          low: Math.round(low * 10) / 10,
        });
      } else {
        stats.push({ high: 0, low: 0 });
      }
    }

    return stats;
  }, [swellData, totalFetchedDays]);

  const dayLabels =
    Array.isArray(displayDays) && displayDays.length > 0
      ? displayDays.map((d) =>
          d.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            timeZone: "America/Los_Angeles",
          })
        )
      : null;

  // Generate ticks for every hour
  const hourTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let v = 0; v <= 24 * totalFetchedDays; v += 1) {
      ticks.push(v);
    }
    return ticks;
  }, [totalFetchedDays]);

  const swellTicks = useMemo(
    () =>
      limitYAxisTicks(
        buildYAxisTicks(
          swellData
            .flatMap((row) => [row.primary, row.secondary, row.tertiary])
            .filter(
              (v): v is number => typeof v === "number" && Number.isFinite(v)
            ),
          0,
          4,
          0.2
        ),
        4
      ),
    [swellData]
  );

  // Y-axis domain for line proximity detection
  const yMin = swellTicks[0] ?? 0;
  const yMax = swellTicks[swellTicks.length - 1] ?? 6;

  // Check if touch coordinates are near any of the swell lines
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
      
      // Find which data point this X corresponds to
      const t = plotX / dataAreaWidth;
      const hour = domainMin + t * (domainMax - domainMin);
      const nearestIndex = Math.round(hour / DATA_STEP_HOURS);
      const clampedIndex = Math.max(0, Math.min(nearestIndex, swellData.length - 1));
      const point = swellData[clampedIndex];
      if (!point) return false;
      
      // Get the Y values for all three swell lines at this point
      const lineValues = [point.primary, point.secondary, point.tertiary].filter(
        (v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0
      );
      
      if (lineValues.length === 0) return false;
      
      // Convert touch Y to data value
      // Y=0 is top (yMax), Y=lineAreaHeight is bottom (yMin)
      const touchValueRatio = 1 - (chartY / lineAreaHeight);
      const touchValue = yMin + touchValueRatio * (yMax - yMin);
      
      // Check if touch is within tolerance of any line value
      const toleranceInDataUnits = (yMax - yMin) * 0.15; // 15% of Y range
      
      for (const lineValue of lineValues) {
        if (Math.abs(touchValue - lineValue) <= toleranceInDataUnits) {
          return true;
        }
      }
      
      return false;
    },
    [dataAreaWidth, dayLabelLeftOffset, domainMin, domainMax, swellData, yMin, yMax]
  );

  const { handlers: mobileHandlers, styles: mobileStyles } = useMobileChartTouch({
    chartId: mobileChartId,
    containerRef: innerRef,
    dataLength: swellData.length,
    getIndexFromX: getIndexFromChartX,
    isOnBar: isOnLine,
    onPan,
    onPanEnd,
    onInspect: handleMobileInspect,
    onInspectEnd: handleMobileInspectEnd,
    enabled: isTouchOnlyDevice,
  });
  const mergedHandlers = {
    onPointerDown: (ev: React.PointerEvent) => {
      if (isTouchOnlyDevice) {
        mobileHandlers.onPointerDown?.(ev);
      } else {
        onPointerDown(ev);
      }
    },
    onPointerMove: (ev: React.PointerEvent) => {
      if (isTouchOnlyDevice) {
        mobileHandlers.onPointerMove?.(ev);
      } else {
        onPointerMove(ev);
      }
    },
    onPointerUp: (ev: React.PointerEvent) => {
      if (isTouchOnlyDevice) {
        mobileHandlers.onPointerUp?.(ev);
      } else {
        onPointerUp(ev);
      }
    },
    onPointerCancel: (ev: React.PointerEvent) => {
      if (isTouchOnlyDevice) {
        mobileHandlers.onPointerCancel?.(ev);
      } else {
        onPointerUp(ev);
      }
    },
  };

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
      const minTick = swellTicks[0] ?? 0;
      const maxTick = swellTicks[swellTicks.length - 1] ?? minTick;
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
    [swellTicks]
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
  const formatSwellTooltipValue = useCallback(
    (value: TooltipValue, _name: string | number, item: TooltipItem) => {
      const dirKey = `${item?.dataKey}Dir`;
      const periodKey = `${item?.dataKey}Period`;
      const payload = item?.payload ?? {};
      const direction = payload[dirKey];
      const period = payload[periodKey];
      const periodValue =
        typeof period === "number" && Number.isFinite(period)
          ? Math.round(period)
          : null;
      const dirLabel =
        typeof direction === "number"
          ? `${getWindDirection(direction)} (${Math.round(direction)}°)`
          : "N/A";
      const valueNum =
        typeof value === "number"
          ? value
          : typeof value === "string"
          ? Number(value)
          : Number.NaN;
      const heightValue = Number.isFinite(valueNum)
        ? valueNum.toFixed(1)
        : Array.isArray(value)
        ? value.join(", ")
        : `${value ?? "--"}`;
      const dirLabelDisplay = dirLabel
        .replaceAll("\u00C2\u00B0", "\u00B0")
        .replaceAll("A\u0173", "\u00B0")
        .replaceAll("Aų", "\u00B0")
        .replaceAll("\u0173", "\u00B0");
      return (
        <div className="grid justify-items-end gap-1 text-right">
          <div className="bg-foreground/10 text-foreground inline-flex items-baseline gap-1 rounded-md px-2 py-1 font-medium tabular-nums">
            <span className="text-xs font-semibold leading-none">
              {heightValue}
            </span>
            <span className="text-[0.68rem] font-medium leading-none text-muted-foreground">
              ft
            </span>
            {periodValue !== null ? (
              <>
                <span className="text-muted-foreground/60">•</span>
                <span className="text-xs font-semibold leading-none">
                  {periodValue}
                </span>
                <span className="text-[0.68rem] font-medium leading-none text-muted-foreground">
                  s
                </span>
              </>
            ) : null}
          </div>
          <div className="inline-flex items-center gap-1 text-[0.65rem] leading-none text-muted-foreground">
            {typeof direction === "number" ? (
              <ArrowIcon
                size={13}
                className="fill-foreground/15 text-foreground/60"
                style={{
                  transform: `rotate(${direction - 315}deg)`,
                  transformOrigin: "50% 50%",
                }}
              />
            ) : null}
            <span>{dirLabelDisplay}</span>
          </div>
        </div>
      );
    },
    [getWindDirection]
  );

  const plotClipIdRaw = React.useId();
  const plotClipId = useMemo(
    () => `forecast-swell-plot-clip-${plotClipIdRaw.replace(/:/g, "")}`,
    [plotClipIdRaw]
  );

  // Hover sync handlers
  const lastHoveredRef = React.useRef<number | null>(null);

  const handleMouseMove = React.useCallback(
    (e: ChartMouseEvent) => {
      // Don't process hover events while loading
      if (loading) return;
      // On touch devices, we use MobileChartTooltip instead
      if (isTouchOnlyDevice) return;
      if (e && e.activeLabel !== undefined) {
        const hour = Number(e.activeLabel);
        if (!isNaN(hour)) {
          // Round to nearest 3-hour increment
          const roundedHour = Math.round(hour / 3) * 3;

          if (lastHoveredRef.current !== roundedHour) {
            lastHoveredRef.current = roundedHour;
            setHoveredHour(roundedHour);
          }
        }
      }
    },
    [loading, isTouchOnlyDevice, setHoveredHour]
  );

  const handleMouseLeave = React.useCallback(() => {
    if (isTouchOnlyDevice) return;
    lastHoveredRef.current = null;
    setHoveredHour(null);
  }, [isTouchOnlyDevice, setHoveredHour]);

  // Arrow dots are shifted left at the very last x-value to avoid right-edge clipping.
  // When shifted, project them along the final curve segment so they still sit on the line.
  useEffect(() => {
    lastArrowPointRef.current = {
      primary: null,
      secondary: null,
      tertiary: null,
    };
  }, [swellData, totalFetchedDays]);

  const projectArrowAlongLastSegment = useCallback(
    (
      key: "primary" | "secondary" | "tertiary",
      cx: number,
      cy: number,
      dx: number
    ) => {
      const prev = lastArrowPointRef.current[key];
      lastArrowPointRef.current[key] = { cx, cy };

      if (!dx || !prev) return { x: cx + dx, y: cy };

      const vx = cx - prev.cx;
      const vy = cy - prev.cy;
      if (!Number.isFinite(vx) || !Number.isFinite(vy) || Math.abs(vx) < 1e-6) {
        return { x: cx + dx, y: cy };
      }

      const t = Math.max(-1, Math.min(0, dx / vx));
      return { x: cx + dx, y: cy + t * vy };
    },
    []
  );
  const tooltipViewport = useMemo(
    () => ({
      x: clampTranslatePx(dayOffset * dayPx),
      y: 0,
      width: viewportWidth,
      height: Math.max(0, 250 - X_AXIS_SHADE_EXCLUDE_PX),
    }),
    [clampTranslatePx, dayOffset, dayPx, viewportWidth]
  );

  const [stableSelectedHour, setStableSelectedHour] = useState<number | null>(
    null
  );
  const { setReady } = useForecastChartLoading("forecast-swell");
  const daysReady = Array.isArray(days) && days.length > 0;
  const rangeSignature = useMemo(() => {
    if (!beachId || !Array.isArray(days) || days.length === 0) return "";
    return [
      beachId,
      ...days
        .filter(
          (d): d is Date => d instanceof Date && !Number.isNaN(d.getTime())
        )
        .map((d) => d.getTime())
        .sort((a, b) => a - b)
        .map(String),
    ].join(":");
  }, [beachId, days]);
  const dashboardBusy = useForecastChartsBusyState();
  const wasBusyRef = useRef(dashboardBusy);

  // Report ready state: chart is ready when days exist, data is loaded, and sun shading is complete
  useEffect(() => {
    const ready = daysReady && !loading && sunReady;
    setReady(ready);
  }, [daysReady, loading, sunReady, setReady]);

  useEffect(() => {
    if (dashboardBusy && !wasBusyRef.current) {
      setStableSelectedHour(selectedHour ?? null);
    }
    if (!dashboardBusy && wasBusyRef.current) {
      setStableSelectedHour(null);
    }
    wasBusyRef.current = dashboardBusy;
  }, [dashboardBusy, selectedHour]);

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

        {/* moving inner (chart + day labels) */}
        <div
          ref={innerRef}
          {...mergedHandlers}
          className="chart-touch-no-select"
          data-dragging={isDragging ? "true" : "false"}
          style={{
            marginTop: 60,
            position: "absolute",
            left: 0,
            width: chartInnerWidth,
            height: 250,
            display: "block",
            willChange: "transform",
            ...mobileStyles,
          }}
        >
          {/* Day label bar */}
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
                      const high = dayStats[idx]?.high;
                      const low = dayStats[idx]?.low;

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
                          <div className="flex flex-col items-end gap-0.5 whitespace-nowrap text-[0.72rem] text-muted-foreground rounded-md py-1 pl-1 bg-foreground/5">
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
                  key={`swell-axis-${chartInnerWidth}`}
                  config={chartConfig}
                  className="aspect-auto h-[250px] w-full !justify-start"
                >
                  <AreaChart
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
                      width={Y_AXIS_WIDTH}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      fontSize={11}
                      tick={yAxisTick}
                      domain={[
                        swellTicks[0] ?? 0,
                        swellTicks[swellTicks.length - 1] ?? 6,
                      ]}
                      ticks={swellTicks}
                    />
                  </AreaChart>
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
                  days={displayDays}
                  selectedDate={selectedDate}
                  selectedHour={
                    dashboardBusy ? stableSelectedHour : selectedHour
                  }
                />
                <ChartContainer
                  key={chartInnerWidth}
                  config={chartConfig}
                  className="forecast-swell-chart-container aspect-auto h-[250px] w-full"
                >
                  <AreaChart
                    accessibilityLayer={false}
                    width={chartInnerWidth}
                    data={swellData}
                    margin={{
                      left: dayLabelLeftOffset,
                      right: CHART_RIGHT_MARGIN,
                      bottom: 5,
                      top: 0,
                    }}
                    syncId={isTouchOnlyDevice ? undefined : "allCharts"}
                    syncMethod={syncToNearestThirdHour}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  >
                    {/* Clip filled areas to the same rounded plot bounds as the day/night shading. */}
                    <Customized
                      component={(p: CustomizedProps) => {
                        const offset = p?.offset;
                        const fullWidth =
                          typeof p?.width === "number" ? p.width : 0;
                        const clipWidth =
                          (typeof offset?.left === "number" ? offset.left : 0) +
                          (typeof offset?.width === "number"
                            ? offset.width
                            : 0);
                        const height =
                          typeof offset?.height === "number"
                            ? offset.height
                            : 0;
                        const top =
                          typeof offset?.top === "number" ? offset.top : 0;
                        if (
                          !offset ||
                          !(fullWidth > 0) ||
                          !(clipWidth > 0) ||
                          !(height > 0)
                        ) {
                          return null;
                        }
                        const w = Math.min(fullWidth, clipWidth);
                        const h = height;
                        const r = Math.min(8, h / 2, w / 2);
                        const y0 = top;
                        const y1 = y0 + h;
                        const d = `M0,${y0}H${w}V${y1 - r}Q${w},${y1} ${
                          w - r
                        },${y1}H${r}Q0,${y1} 0,${y1 - r}V${y0}Z`;
                        return (
                          <defs>
                            <clipPath id={plotClipId}>
                              <path d={d} />
                            </clipPath>
                          </defs>
                        );
                      }}
                    />
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
                        const base =
                          displayDays && displayDays.length > 0
                            ? displayDays[0]
                            : null;
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
                    <YAxis
                      hide
                      width={0}
                      domain={[
                        swellTicks[0] ?? 0,
                        swellTicks[swellTicks.length - 1] ?? 6,
                      ]}
                      ticks={swellTicks}
                    />
                    {/* <ChartLegend content={<ChartLegendContent />} /> */}
                    {/* Mobile: Use custom MobileChartTooltip rendered via portal */}
                    {isTouchOnlyDevice ? null : (
                      <ChartTooltip
                        content={
                          <ChartTooltipViewportContent
                            viewport={tooltipViewport}
                            labelFormatter={formatHourLabel}
                            formatter={formatSwellTooltipValue}
                          />
                        }
                        cursor={false}
                        wrapperStyle={{ display: "none" }}
                        animationDuration={0}
                        isAnimationActive={false}
                      />
                    )}

                    <Area
                      type="monotone"
                      dataKey="primary"
                      activeDot={false}
                      stroke="#023e8a"
                      strokeWidth={1.5}
                      fill="#0077b6"
                      fillOpacity={0.2}
                      clipPath={`url(#${plotClipId})`}
                      isAnimationActive={false}
                      animationDuration={0}
                      animationBegin={0}
                      dot={({
                        payload,
                        cx,
                        cy,
                        index,
                      }: {
                        payload?: SwellPoint;
                        cx?: number;
                        cy?: number;
                        index?: number;
                      }) => {
                        if (payload?._terminal) {
                          return <g key={`primary-terminal-${index}`} />;
                        }
                        const iconSize = 15;
                        const cxNum = typeof cx === "number" ? cx : Number(cx);
                        const cyNum = typeof cy === "number" ? cy : Number(cy);
                        if (
                          !Number.isFinite(cxNum) ||
                          !Number.isFinite(cyNum)
                        ) {
                          return <g key={`primary-${index}`} />;
                        }
                        const isAtRightEdge =
                          typeof payload?.hour === "number" &&
                          Math.abs(payload.hour - totalFetchedDays * 24) < 1e-6;
                        const dx = isAtRightEdge ? -iconSize / 2 : 0;
                        const projected = projectArrowAlongLastSegment(
                          "primary",
                          cxNum,
                          cyNum,
                          dx
                        );
                        const direction = payload?.primaryDir ?? 0;
                        const rotation = direction - 315;

                        return (
                          <g key={`primary-${index}`}>
                            <g
                              transform={`translate(${projected.x}, ${projected.y})`}
                            >
                              <g transform={`rotate(${rotation}, 0, 0)`}>
                                <ArrowIcon
                                  size={iconSize}
                                  x={-iconSize / 2}
                                  y={-iconSize / 2}
                                  fill={chartConfig.primary.color}
                                  color={chartConfig.primary.color}
                                />
                              </g>
                            </g>
                          </g>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="secondary"
                      activeDot={false}
                      stroke="#0096c7"
                      strokeWidth={1.5}
                      fill="#48cae4"
                      fillOpacity={0.2}
                      clipPath={`url(#${plotClipId})`}
                      isAnimationActive={false}
                      animationDuration={0}
                      animationBegin={0}
                      dot={({
                        payload,
                        cx,
                        cy,
                        index,
                      }: {
                        payload?: SwellPoint;
                        cx?: number;
                        cy?: number;
                        index?: number;
                      }) => {
                        if (payload?._terminal) {
                          return <g key={`secondary-terminal-${index}`} />;
                        }
                        const iconSize = 15;
                        const cxNum = typeof cx === "number" ? cx : Number(cx);
                        const cyNum = typeof cy === "number" ? cy : Number(cy);
                        if (
                          !Number.isFinite(cxNum) ||
                          !Number.isFinite(cyNum)
                        ) {
                          return <g key={`secondary-${index}`} />;
                        }
                        const isAtRightEdge =
                          typeof payload?.hour === "number" &&
                          Math.abs(payload.hour - totalFetchedDays * 24) < 1e-6;
                        const dx = isAtRightEdge ? -iconSize / 2 : 0;
                        const projected = projectArrowAlongLastSegment(
                          "secondary",
                          cxNum,
                          cyNum,
                          dx
                        );
                        const direction = payload?.secondaryDir ?? 0;
                        const rotation = direction - 315;

                        return (
                          <g key={`secondary-${index}`}>
                            <g
                              transform={`translate(${projected.x}, ${projected.y})`}
                            >
                              <g transform={`rotate(${rotation}, 0, 0)`}>
                                <ArrowIcon
                                  size={iconSize}
                                  x={-iconSize / 2}
                                  y={-iconSize / 2}
                                  fill={chartConfig.secondary.color}
                                  color={chartConfig.secondary.color}
                                />
                              </g>
                            </g>
                          </g>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="tertiary"
                      activeDot={false}
                      stroke="#70ccebff"
                      strokeWidth={1.5}
                      fill="#adf1ffff"
                      fillOpacity={0.2}
                      clipPath={`url(#${plotClipId})`}
                      isAnimationActive={false}
                      animationDuration={0}
                      animationBegin={0}
                      dot={({
                        payload,
                        cx,
                        cy,
                        index,
                      }: {
                        payload?: SwellPoint;
                        cx?: number;
                        cy?: number;
                        index?: number;
                      }) => {
                        if (payload?._terminal) {
                          return <g key={`tertiary-terminal-${index}`} />;
                        }
                        const iconSize = 15;
                        const cxNum = typeof cx === "number" ? cx : Number(cx);
                        const cyNum = typeof cy === "number" ? cy : Number(cy);
                        if (
                          !Number.isFinite(cxNum) ||
                          !Number.isFinite(cyNum)
                        ) {
                          return <g key={`tertiary-${index}`} />;
                        }
                        const isAtRightEdge =
                          typeof payload?.hour === "number" &&
                          Math.abs(payload.hour - totalFetchedDays * 24) < 1e-6;
                        const dx = isAtRightEdge ? -iconSize / 2 : 0;
                        const projected = projectArrowAlongLastSegment(
                          "tertiary",
                          cxNum,
                          cyNum,
                          dx
                        );
                        const direction = payload?.tertiaryDir ?? 0;
                        const rotation = direction - 315;

                        return (
                          <g key={`tertiary-${index}`}>
                            <g
                              transform={`translate(${projected.x}, ${projected.y})`}
                            >
                              <g transform={`rotate(${rotation}, 0, 0)`}>
                                <ArrowIcon
                                  size={iconSize}
                                  x={-iconSize / 2}
                                  y={-iconSize / 2}
                                  fill={chartConfig.tertiary.color}
                                  color={chartConfig.tertiary.color}
                                />
                              </g>
                            </g>
                          </g>
                        );
                      }}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            </div>
          )}
        </div>

        {/* invisible overlay to prevent pointer events leaking */}
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
  );
};

export default React.memo(ForecastSwellChart);
