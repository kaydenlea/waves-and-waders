"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useReducer,
} from "react";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  ReferenceLine,
  Customized,
  LabelList,
  LabelProps,
} from "recharts";
import { Sunrise, Sunset, Waves as TideIcon } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  useDateContext,
  useHoveredHour,
} from "@/components/context/DateContext";
import { useTideData } from "@/components/context/TideDataContext";
import { useTideWindowData } from "@/lib/hooks/useTideWindow";
import {
  buildSunSegments,
  parseSunTimeToHour,
} from "@/components/graphs/sunSegments";
import { cn, getPacificMidnightUTC } from "@/lib/utils";
import { useChartTheme } from "@/components/graphs/useChartTheme";
import { useIsTouchOnlyDevice } from "./useIsTouchOnlyDevice";
import {
  buildLinearYAxisTicks,
  buildYAxisTicks,
} from "@/components/graphs/yAxisTicks";
import { useOptionalOverviewChartLoading } from "@/components/context/OverviewChartsLoadingContext";
import {
  applyForecastShadingOpacity,
  buildForecastPlotShadingBackgroundPercent,
} from "@/components/graphs/forecastShadingBackground";
import HoverOverlayLine from "@/components/graphs/HoverOverlayLine";
import ForecastTooltipHandle from "./ForecastTooltipHandle";

const HOURS_TO_MS = 60 * 60 * 1000;

// Overview charts (single-day): keep the Y-axis inside the shaded plot container.
const CHART_LEFT_MARGIN = 5;
const CHART_TOP_MARGIN = 10;
// Keep the plot shading aligned to the X scale (the line chart uses `margin.right: 0`).
const CHART_RIGHT_MARGIN = 0;
const Y_AXIS_WIDTH = 30;
const X_AXIS_SHADE_EXCLUDE_PX = 34;
const HOVER_LINE_END_INSET_PX = 7.5;
const TOUCH_INSPECT_LONG_PRESS_MS = 320;
const TOUCH_INSPECT_MOVE_TOLERANCE_PX = 10;
const TOUCH_HANDLE_MAX_WIDTH = 640;
const TOUCH_HANDLE_RADIUS_PX = 18;
const TOUCH_HANDLE_GUTTER_PX = 26;
const Y_AXIS_TICK = {
  fill: "var(--foreground)",
  fontWeight: 500,
  filter: "drop-shadow(0 0 4px var(--background))",
} as const;

const TideTooltipIcon = () => <TideIcon className="h-3 w-3" />;
const TIDE_LINE_COLOR = "#aaaaaaff";

const chartConfig: ChartConfig = {
  tide: {
    label: "Tide",
    color: "#3b82f6",
    icon: TideTooltipIcon,
  },
};

type ExternalTidePoint = { x: number; tide: number; isPeak?: number };

type TidePoint = {
  timestamp: number;
  hour: number;
  tide: number;
  isPeak?: number;
};
type YAxisTickProps = {
  x?: number;
  y?: number;
  payload?: { value?: number | string };
  textAnchor?: string;
  fontSize?: number;
};
type ChartMouseEvent = { activeLabel?: number | string | null };
type CustomizedOffsetProps = {
  offset?: { left?: number; width?: number; top?: number; height?: number };
};

type TideChartProps = {
  preview?: boolean;
  beachId?: string;
  hours?: number;
  chartData?: ExternalTidePoint[];
  date?: Date;
  sunSegments?: {
    dayAreas: { x1: number; x2: number }[];
    nightAreas: { x1: number; x2?: number }[];
    sunrise?: string | null;
    sunset?: string | null;
  };
};

// Cached formatter - created once, reused
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Los_Angeles",
});

const formatTime = (timestamp: number) => timeFormatter.format(timestamp);

// Consolidated chart state to reduce re-renders
type ChartState = {
  chartData: TidePoint[];
  windowStart: number | null;
  dayAreas: { x1: number; x2: number }[];
  nightAreas: { x1: number; x2?: number }[];
  sunMarkers: { hour: number; type: "sunrise" | "sunset" }[];
};

type ChartAction =
  | {
      type: "SET_TIDE_DATA";
      chartData: TidePoint[];
      windowStart: number | null;
    }
  | {
      type: "SET_SUN_DATA";
      dayAreas: ChartState["dayAreas"];
      nightAreas: ChartState["nightAreas"];
      sunMarkers: ChartState["sunMarkers"];
    }
  | { type: "RESET" };

const initialChartState: ChartState = {
  chartData: [],
  windowStart: null,
  dayAreas: [],
  nightAreas: [],
  sunMarkers: [],
};

function chartReducer(state: ChartState, action: ChartAction): ChartState {
  switch (action.type) {
    case "SET_TIDE_DATA":
      return {
        ...state,
        chartData: action.chartData,
        windowStart: action.windowStart,
      };
    case "SET_SUN_DATA":
      return {
        ...state,
        dayAreas: action.dayAreas,
        nightAreas: action.nightAreas,
        sunMarkers: action.sunMarkers,
      };
    case "RESET":
      return initialChartState;
    default:
      return state;
  }
}

const formatHourTick = (value: number) => {
  const normalized = ((value % 24) + 24) % 24;
  return normalized % 3 === 0
    ? String(normalized % 12 === 0 ? 12 : normalized % 12)
    : "";
};

const TideChart: React.FC<TideChartProps> = ({
  preview = false,
  beachId,
  hours = 24,
  chartData: chartDataProp,
  date,
  sunSegments,
}) => {
  const tideCacheRef = React.useRef<
    Map<string, { chartData: TidePoint[]; windowStart: number | null }>
  >(new Map());
  const hoveredHour = useHoveredHour();
  const { hour: selectedHour, setHoveredHour } = useDateContext();
  const chartTheme = useChartTheme();
  const isTouchOnlyDevice = useIsTouchOnlyDevice();
  const { setReady: setOverviewReady } =
    useOptionalOverviewChartLoading("overview-tide");
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rechartsMoveTargetRef = React.useRef<HTMLElement | null>(null);
  const [isTouchInspecting, setIsTouchInspecting] = useState(false);
  const [touchDefaultIndex, setTouchDefaultIndex] = useState<number | null>(
    null
  );
  const [touchHandleHour, setTouchHandleHour] = useState<number | null>(null);
  const touchInspectTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const touchInspectStartRef = React.useRef<{
    clientX: number;
    clientY: number;
    chartX: number;
  } | null>(null);
  const lastTouchHoveredHourRef = React.useRef<number | null>(null);

  const isTouchHandleMode =
    isTouchOnlyDevice &&
    containerWidth > 0 &&
    containerWidth <= TOUCH_HANDLE_MAX_WIDTH;
  const handleGutterPx = isTouchHandleMode ? TOUCH_HANDLE_GUTTER_PX : 0;
  const xAxisBottomInsetPx = X_AXIS_SHADE_EXCLUDE_PX + handleGutterPx;

  useEffect(() => {
    if (!isTouchHandleMode) {
      setTouchHandleHour(null);
      return;
    }
    if (hoveredHour == null) return;
    setTouchHandleHour((prev) => (prev === hoveredHour ? prev : hoveredHour));
  }, [hoveredHour, isTouchHandleMode]);

  // Consolidated state with reducer for fewer re-renders
  const [state, dispatch] = useReducer(chartReducer, initialChartState);
  const { chartData, windowStart, dayAreas, nightAreas, sunMarkers } = state;

  const tideContext = useTideData();
  const tideWindow = useTideWindowData({
    beachId,
    date,
    hours,
    enabled: !tideContext,
    initialRows: tideContext?.rows ?? undefined,
    initialStartMs: tideContext?.startMs ?? undefined,
  });

  const tideRows = tideContext?.rows ?? tideWindow.rows;
  const tideStartMs = tideContext?.startMs ?? tideWindow.startMs;
  const tideSunTimes = tideContext?.sunTimes ?? tideWindow.sunTimes;
  const tideSunWindowStart =
    tideContext?.sunWindowStart ?? tideWindow.sunWindowStart;
  const tideSunStatus = tideContext?.sunStatus ?? tideWindow.sunStatus;
  const tideResolved = tideContext?.resolved ?? tideWindow.resolved;
  const tideLoading = tideContext?.loading ?? tideWindow.loading;

  const overviewKey = `${preview ? "preview" : "live"}-${
    beachId ?? ""
  }-${hours}-${date instanceof Date ? date.getTime() : "no-date"}`;
  useLayoutEffect(() => {
    setOverviewReady(false);
  }, [overviewKey, setOverviewReady]);

  const overviewReady = Boolean(
    !preview && beachId && !tideLoading && tideResolved && windowStart != null
  );
  useEffect(() => {
    setOverviewReady(overviewReady);
  }, [overviewKey, overviewReady, setOverviewReady]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = entry ? Math.floor(entry.contentRect.width) : 0;
      setContainerWidth(width);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  // Keep native resolution (≈6 minute spacing) for accuracy; no downsampling.
  const clearTouchInspectTimer = React.useCallback(() => {
    if (touchInspectTimerRef.current) {
      clearTimeout(touchInspectTimerRef.current);
      touchInspectTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTouchInspectTimer(), [clearTouchInspectTimer]);

  const renderData = useMemo(() => {
    if (chartData.length < 2) return chartData;
    const last = chartData[chartData.length - 1];
    if (!last || !(last.hour < hours - 1e-6)) return chartData;
    const hoursDelta = Math.max(0, hours - last.hour);
    return [
      ...chartData,
      {
        timestamp: last.timestamp + hoursDelta * HOURS_TO_MS,
        hour: hours,
        tide: last.tide,
      },
    ];
  }, [chartData, hours]);

  const peakPoints = useMemo(
    () => renderData.filter((p) => p.isPeak != null),
    [renderData]
  );

  const lastTideSegmentRef = React.useRef<{
    prev: { cx: number; cy: number } | null;
    curr: { cx: number; cy: number } | null;
  }>({ prev: null, curr: null });
  useEffect(() => {
    lastTideSegmentRef.current = { prev: null, curr: null };
  }, [renderData]);

  const tideActiveDot = React.useCallback(
    (props: { cx?: number | string; cy?: number | string; index?: number }) => {
      const cxNum = typeof props.cx === "number" ? props.cx : Number(props.cx);
      const cyNum = typeof props.cy === "number" ? props.cy : Number(props.cy);
      if (!Number.isFinite(cxNum) || !Number.isFinite(cyNum)) return <g />;
      const idx = typeof props.index === "number" ? props.index : -1;
      if (idx < 0) return <g />;

      const isLastPoint = idx === renderData.length - 1;
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
    [renderData.length]
  );

  // Pre-compute which peaks should be placed below to avoid overlap
  const peakPlacementMap = useMemo(() => {
    const map = new Map<number, boolean>();
    const peaks = renderData.filter((p) => p.isPeak != null);

    for (let i = 1; i < peaks.length; i++) {
      const prevPeak = peaks[i - 1];
      const currPeak = peaks[i];
      // If the previous peak is within 3 hours, alternate position
      if (Math.abs(currPeak.hour - prevPeak.hour) < 3) {
        map.set(currPeak.timestamp, true);
      }
    }
    return map;
  }, [renderData]);

  // Pre-compute sun marker lookup map for O(1) access
  const sunMarkerMap = useMemo(() => {
    const map = new Map<number, "sunrise" | "sunset">();
    sunMarkers.forEach((m) => map.set(m.hour, m.type));
    return map;
  }, [sunMarkers]);

  const sunMarkerPoints = useMemo(() => {
    if (!sunMarkers.length || !renderData.length) return [];
    const tolerance = 0.6; // hours

    return sunMarkers
      .map((marker) => {
        // Optimized: binary search for closest hour
        let left = 0;
        let right = renderData.length - 1;
        let closest = renderData[0];
        let minDiff = Math.abs(renderData[0].hour - marker.hour);

        while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          const diff = Math.abs(renderData[mid].hour - marker.hour);
          if (diff < minDiff) {
            minDiff = diff;
            closest = renderData[mid];
          }
          if (renderData[mid].hour < marker.hour) {
            left = mid + 1;
          } else {
            right = mid - 1;
          }
        }

        if (Math.abs(closest.hour - marker.hour) <= tolerance) {
          return { ...closest, markerType: marker.type };
        }
        return null;
      })
      .filter(Boolean) as Array<
      TidePoint & { markerType: "sunrise" | "sunset" }
    >;
  }, [renderData, sunMarkers]);

  // Simplified buildPoints - fast peak detection like ForecastTideChart
  const buildPoints = useMemo(
    () =>
      (
        rows: ExternalTidePoint[],
        startMs: number,
        windowHours: number
      ): TidePoint[] => {
        // Fast path: map and filter in single pass
        const sorted: TidePoint[] = [];
        for (const row of rows) {
          const timestamp = typeof row.x === "number" ? row.x : Number(row.x);
          const hour = (timestamp - startMs) / HOURS_TO_MS;
          if (Number.isFinite(hour) && hour >= 0 && hour <= windowHours) {
            sorted.push({
              timestamp,
              hour,
              tide: row.tide,
              isPeak: row.isPeak,
            });
          }
        }
        sorted.sort((a, b) => a.timestamp - b.timestamp);

        // Simple peak detection (same as ForecastTideChart)
        for (let i = 1; i < sorted.length - 1; i++) {
          const prev = sorted[i - 1];
          const curr = sorted[i];
          const next = sorted[i + 1];
          if (curr.tide > prev.tide && curr.tide >= next.tide) {
            sorted[i] = { ...curr, isPeak: Number(curr.tide.toFixed(1)) };
          } else if (curr.tide < prev.tide && curr.tide <= next.tide) {
            sorted[i] = { ...curr, isPeak: Number(curr.tide.toFixed(1)) };
          }
        }

        return sorted;
      },
    []
  );

  // Memoized and optimized resolveStartMs
  const resolveStartMs = useMemo(() => {
    // Cache formatters to avoid recreating them
    const dateFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const hourFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "2-digit",
      hour12: false,
    });

    return (basis: Date) => {
      const parts = dateFormatter.formatToParts(basis);
      const year = parseInt(parts.find((p) => p.type === "year")?.value || "0");
      const month =
        parseInt(parts.find((p) => p.type === "month")?.value || "1") - 1;
      const day = parseInt(parts.find((p) => p.type === "day")?.value || "1");

      // Calculate UTC timestamp for Pacific midnight using offset at noon
      const noonUTC = Date.UTC(year, month, day, 12, 0, 0, 0);
      const noonDate = new Date(noonUTC);
      const pacificNoonHour = parseInt(hourFormatter.format(noonDate));
      const offsetHours = pacificNoonHour - 12;

      return Date.UTC(year, month, day, -offsetHours, 0, 0, 0);
    };
  }, []);

  useEffect(() => {
    // Optimized: synchronous processing, single dispatch
    try {
      const cacheKeyParts = [
        beachId ?? "default",
        hours,
        chartDataProp?.[0]?.x ?? tideStartMs ?? "",
      ];
      const cacheKey = cacheKeyParts.join("|");

      const cached = tideCacheRef.current.get(cacheKey);
      if (!chartData.length && cached) {
        dispatch({
          type: "SET_TIDE_DATA",
          chartData: cached.chartData,
          windowStart: cached.windowStart,
        });
        return;
      }

      if (chartDataProp && chartDataProp.length > 0) {
        const sorted = chartDataProp
          .map((row) => ({
            x: typeof row.x === "number" ? row.x : Number(row.x),
            tide: row.tide,
            isPeak: row.isPeak,
          }))
          .filter((row) => Number.isFinite(row.x));
        if (!sorted.length) {
          dispatch({ type: "SET_TIDE_DATA", chartData: [], windowStart: null });
          return;
        }
        const firstTimestamp = sorted[0].x;
        const baseDate = new Date(firstTimestamp);
        const startMs = resolveStartMs(baseDate);
        const built = buildPoints(sorted, startMs, hours);
        tideCacheRef.current.set(cacheKey, {
          chartData: built,
          windowStart: startMs,
        });
        dispatch({
          type: "SET_TIDE_DATA",
          chartData: built,
          windowStart: startMs,
        });
        return;
      }

      const effectiveStartMs =
        tideStartMs ??
        (tideRows.length
          ? resolveStartMs(new Date(Number(tideRows[0].x ?? Date.now())))
          : null);

      if (tideRows.length && effectiveStartMs != null) {
        const built = buildPoints(
          tideRows.map((row) => ({
            x: typeof row.x === "number" ? row.x : Number(row.x),
            tide: row.tide,
          })),
          effectiveStartMs,
          hours
        );
        tideCacheRef.current.set(cacheKey, {
          chartData: built,
          windowStart: effectiveStartMs,
        });
        dispatch({
          type: "SET_TIDE_DATA",
          chartData: built,
          windowStart: effectiveStartMs,
        });
        return;
      }

      if (!tideLoading && tideResolved) {
        dispatch({
          type: "SET_TIDE_DATA",
          chartData: [],
          windowStart: tideStartMs ?? null,
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to load tide data", error);
      }
      dispatch({ type: "SET_TIDE_DATA", chartData: [], windowStart: null });
    }
  }, [
    beachId,
    chartDataProp,
    date,
    hours,
    tideLoading,
    tideResolved,
    tideRows,
    tideStartMs,
    buildPoints,
    resolveStartMs,
  ]);

  // Optimized helper: extract binary search to avoid duplication
  const findClosestPoint = React.useCallback(
    (data: TidePoint[], target: number): TidePoint | null => {
      if (!data.length) return null;
      let left = 0;
      let right = data.length - 1;
      let closest = data[0];
      let minDiff = Math.abs(data[0].hour - target);

      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const diff = Math.abs(data[mid].hour - target);
        if (diff < minDiff) {
          minDiff = diff;
          closest = data[mid];
        }
        if (data[mid].hour < target) {
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
      return closest;
    },
    []
  );

  useEffect(() => {
    // Optimized: synchronous processing, single dispatch
    if (
      sunSegments &&
      (sunSegments.dayAreas?.length ||
        sunSegments.sunrise ||
        sunSegments.sunset)
    ) {
      const markers: { hour: number; type: "sunrise" | "sunset" }[] = [];

      // build markers from provided sunrise/sunset if data present
      if (chartData.length > 0 && (sunSegments.sunrise || sunSegments.sunset)) {
        const riseHourRaw = parseSunTimeToHour(sunSegments.sunrise ?? null);
        const setHourRaw = parseSunTimeToHour(sunSegments.sunset ?? null);

        if (riseHourRaw != null && riseHourRaw >= 0 && riseHourRaw <= hours) {
          const closest = findClosestPoint(chartData, riseHourRaw);
          if (closest && Math.abs(closest.hour - riseHourRaw) < 0.5) {
            markers.push({ hour: closest.hour, type: "sunrise" });
          }
        }
        if (
          setHourRaw != null &&
          setHourRaw >= 0 &&
          setHourRaw <= hours &&
          setHourRaw !== riseHourRaw
        ) {
          const closest = findClosestPoint(chartData, setHourRaw);
          if (closest && Math.abs(closest.hour - setHourRaw) < 0.5) {
            markers.push({ hour: closest.hour, type: "sunset" });
          }
        }
      }

      dispatch({
        type: "SET_SUN_DATA",
        dayAreas: sunSegments.dayAreas ?? [],
        nightAreas: sunSegments.nightAreas ?? [],
        sunMarkers: markers,
      });
      return;
    }

    if (
      tideSunTimes &&
      tideSunWindowStart != null &&
      windowStart != null &&
      Math.abs(tideSunWindowStart - windowStart) < 1000
    ) {
      const riseHourRaw = parseSunTimeToHour(tideSunTimes.sunrise ?? null);
      const setHourRaw = parseSunTimeToHour(tideSunTimes.sunset ?? null);

      if (riseHourRaw == null || setHourRaw == null) {
        dispatch({
          type: "SET_SUN_DATA",
          dayAreas: [],
          nightAreas: [{ x1: 0, x2: hours }],
          sunMarkers: [],
        });
        return;
      }

      const segments = buildSunSegments(
        hours,
        tideSunTimes.sunrise ?? null,
        tideSunTimes.sunset ?? null
      );

      const markers: { hour: number; type: "sunrise" | "sunset" }[] = [];
      if (chartData.length > 0) {
        if (riseHourRaw >= 0 && riseHourRaw <= hours) {
          const closest = findClosestPoint(chartData, riseHourRaw);
          if (closest && Math.abs(closest.hour - riseHourRaw) < 0.5) {
            markers.push({ hour: closest.hour, type: "sunrise" });
          }
        }
        if (
          setHourRaw >= 0 &&
          setHourRaw <= hours &&
          setHourRaw !== riseHourRaw
        ) {
          const closest = findClosestPoint(chartData, setHourRaw);
          if (closest && Math.abs(closest.hour - setHourRaw) < 0.5) {
            markers.push({ hour: closest.hour, type: "sunset" });
          }
        }
      }

      dispatch({
        type: "SET_SUN_DATA",
        dayAreas: segments.dayAreas,
        nightAreas: segments.nightAreas,
        sunMarkers: markers,
      });
      return;
    }

    if (tideSunStatus === "loading") {
      return;
    }

    dispatch({
      type: "SET_SUN_DATA",
      dayAreas: [],
      nightAreas: [{ x1: 0, x2: hours }],
      sunMarkers: [],
    });
  }, [
    chartData,
    hours,
    sunSegments,
    tideSunStatus,
    tideSunTimes,
    tideSunWindowStart,
    windowStart,
    findClosestPoint,
  ]);

  const hourTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let v = 0; v <= hours; v += 3) {
      ticks.push(v);
    }
    return ticks;
  }, [hours]);

  const tideTicks = useMemo(() => {
    const values = renderData
      .map((p) => p.tide)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (!values.length) return buildYAxisTicks([0], -2, 4, 0.2);

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
  }, [renderData]);
  const yAxisTick = React.useCallback(
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
          dy={isMinTick ? -15 : isMaxTick ? 15 : 0}
          textAnchor={resolvedTextAnchor}
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

  const yAxisInsetPx = CHART_LEFT_MARGIN + Y_AXIS_WIDTH;
  const plotWidthPx = useMemo(
    () => Math.max(0, containerWidth - yAxisInsetPx - CHART_RIGHT_MARGIN),
    [containerWidth, yAxisInsetPx]
  );

  const getTouchActivationFromChartX = React.useCallback(
    (chartX: number) => {
      if (!(plotWidthPx > 0) || renderData.length === 0) return null;
      if (!Number.isFinite(chartX)) return null;

      const plotX = chartX - yAxisInsetPx;
      const clampedPlotX = Math.max(0, Math.min(plotX, plotWidthPx));
      const hourAtX = (clampedPlotX / plotWidthPx) * hours;
      const clampedHourAtX = Math.max(0, Math.min(hours, hourAtX));
      const targetHour = Math.max(0, Math.min(hours, clampedHourAtX));

      // `renderData` is monotonic by hour; use binary search for nearest point.
      let lo = 0;
      let hi = renderData.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const midHour = renderData[mid]?.hour;
        if (typeof midHour !== "number" || !Number.isFinite(midHour)) break;
        if (midHour < targetHour) {
          lo = mid + 1;
        } else if (midHour > targetHour) {
          hi = mid - 1;
        } else {
          lo = mid;
          hi = mid - 1;
          break;
        }
      }

      const idx1 = Math.max(0, Math.min(lo, renderData.length - 1));
      const idx0 = Math.max(0, idx1 - 1);
      const h0 = renderData[idx0]?.hour;
      const h1 = renderData[idx1]?.hour;
      if (
        typeof h0 !== "number" ||
        typeof h1 !== "number" ||
        !Number.isFinite(h0) ||
        !Number.isFinite(h1)
      ) {
        return null;
      }

      const defaultIndex =
        Math.abs(h0 - targetHour) <= Math.abs(h1 - targetHour) ? idx0 : idx1;

      const syncHour = Math.max(
        0,
        Math.min(hours, Math.round(targetHour / 3) * 3)
      );
      return { defaultIndex, hoveredHour: targetHour, syncHour };
    },
    [hours, plotWidthPx, renderData, yAxisInsetPx]
  );

  const plotShading = useMemo(
    () =>
      buildForecastPlotShadingBackgroundPercent({
        dayAreas,
        nightAreas,
        domainMin: 0,
        domainMax: hours,
        dayColor: chartTheme.dayShading,
        nightColor: chartTheme.nightShading,
        opacity: chartTheme.shadingOpacity,
      }),
    [
      dayAreas,
      nightAreas,
      hours,
      chartTheme.dayShading,
      chartTheme.nightShading,
      chartTheme.shadingOpacity,
    ]
  );
  const edgeFill = useMemo(() => {
    const isDayAt = (h: number) =>
      dayAreas.some((a) => h >= a.x1 && h <= (a.x2 ?? hours));
    const leftIsDay = isDayAt(0.0001);
    const rightIsDay = isDayAt(Math.max(0, hours - 0.0001));
    const left = applyForecastShadingOpacity(
      leftIsDay ? chartTheme.dayShading : chartTheme.nightShading,
      chartTheme.shadingOpacity
    );
    const right = applyForecastShadingOpacity(
      rightIsDay ? chartTheme.dayShading : chartTheme.nightShading,
      chartTheme.shadingOpacity
    );
    return { left, right };
  }, [
    dayAreas,
    hours,
    chartTheme.dayShading,
    chartTheme.nightShading,
    chartTheme.shadingOpacity,
  ]);

  // Calculate high and low tide values from peaks
  const { highTide, lowTide } = useMemo(() => {
    const peaks = chartData.filter((p) => p.isPeak != null);
    if (peaks.length === 0) return { highTide: null, lowTide: null };

    const peakValues = peaks.map((p) => p.isPeak!);
    const high = Math.max(...peakValues);
    const low = Math.min(...peakValues);

    return {
      highTide: high > 0 ? high.toFixed(1) : null,
      lowTide: low <= 0 ? low.toFixed(1) : null,
    };
  }, [chartData]);

  const lastHoveredRef = React.useRef<number | null>(null);
  const hoverRafRef = React.useRef<number | null>(null);
  const pendingHoverRef = React.useRef<number | null>(null);

  const handleMouseMove = (e: ChartMouseEvent) => {
    if (isTouchOnlyDevice && !isTouchInspecting) return;
    if (e && e.activeLabel !== undefined) {
      const hour = Number(e.activeLabel);
      if (!isNaN(hour)) {
        // Round to nearest 3-hour interval for syncing with other charts
        const rounded = Math.round(hour / 3) * 3;
        if (lastHoveredRef.current === rounded) return;
        pendingHoverRef.current = rounded;
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
  };

  const handleMouseLeave = () => {
    if (isTouchOnlyDevice && !isTouchInspecting) return;
    if (hoverRafRef.current) {
      cancelAnimationFrame(hoverRafRef.current);
      hoverRafRef.current = null;
    }
    pendingHoverRef.current = null;
    lastHoveredRef.current = null;
    setHoveredHour(null);
  };

  const handleScrub = React.useCallback(
    (clientX: number, clientY: number) => {
      const host = containerRef.current;
      if (!host) return;
      const bounds = host.getBoundingClientRect();
      const chartX = clientX - bounds.left;
      const activation = getTouchActivationFromChartX(chartX);
      if (!activation) return;
      setTouchDefaultIndex(activation.defaultIndex);
      setTouchHandleHour(activation.hoveredHour);
      setHoveredHour(activation.syncHour);
      const target =
        rechartsMoveTargetRef.current ??
        containerRef.current?.querySelector(".recharts-wrapper");
      if (target instanceof HTMLElement) {
        rechartsMoveTargetRef.current = target;
        target.dispatchEvent(
          new MouseEvent("mousemove", {
            bubbles: true,
            cancelable: true,
            clientX,
            clientY,
          })
        );
      }
    },
    [getTouchActivationFromChartX, setHoveredHour]
  );

  const handleLeftPx = useMemo(() => {
    if (!isTouchHandleMode || !containerWidth || !plotWidthPx) return null;
    const fallbackHour = chartData[0]?.hour ?? null;
    const rawHour =
      touchHandleHour ?? hoveredHour ?? selectedHour ?? fallbackHour;
    if (rawHour == null || !Number.isFinite(rawHour)) return null;
    const t = rawHour / hours;
    const plotX = yAxisInsetPx + t * plotWidthPx;
    const clamped = Math.max(
      TOUCH_HANDLE_RADIUS_PX,
      Math.min(containerWidth - TOUCH_HANDLE_RADIUS_PX, plotX)
    );
    return Number.isFinite(clamped) ? clamped : null;
  }, [
    chartData,
    containerWidth,
    hours,
    hoveredHour,
    isTouchHandleMode,
    plotWidthPx,
    selectedHour,
    yAxisInsetPx,
  ]);
  const touchDefaultIndexFromHover = useMemo(() => {
    if (hoveredHour == null || renderData.length === 0) return undefined;
    const clamped = Math.max(0, Math.min(hours, hoveredHour));
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < renderData.length; i++) {
      const pointHour = renderData[i]?.hour;
      if (typeof pointHour !== "number") continue;
      const diff = Math.abs(pointHour - clamped);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, [hoveredHour, hours, renderData]);
  const touchDefaultIndexFromHandle = useMemo(() => {
    if (touchHandleHour == null || renderData.length === 0) return undefined;
    const clamped = Math.max(0, Math.min(hours, touchHandleHour));
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < renderData.length; i++) {
      const pointHour = renderData[i]?.hour;
      if (typeof pointHour !== "number") continue;
      const diff = Math.abs(pointHour - clamped);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, [hours, renderData, touchHandleHour]);

  const onPointerDown = (ev: React.PointerEvent) => {
    if (!isTouchOnlyDevice || ev.pointerType === "mouse") return;
    if (isTouchHandleMode) return;

    clearTouchInspectTimer();
    setIsTouchInspecting(false);
    setTouchDefaultIndex(null);
    setHoveredHour(null);
    lastTouchHoveredHourRef.current = null;

    const node = containerRef.current;
    if (!node) return;
    const bounds = node.getBoundingClientRect();
    touchInspectStartRef.current = {
      clientX: ev.clientX,
      clientY: ev.clientY,
      chartX: ev.clientX - bounds.left,
    };

    touchInspectTimerRef.current = setTimeout(() => {
      const start = touchInspectStartRef.current;
      if (!start) return;
      const activation = getTouchActivationFromChartX(start.chartX);
      if (!activation) return;

      setTouchDefaultIndex(activation.defaultIndex);
      if (lastTouchHoveredHourRef.current !== activation.hoveredHour) {
        lastTouchHoveredHourRef.current = activation.hoveredHour;
        setHoveredHour(activation.syncHour);
      }
      setIsTouchInspecting(true);
    }, TOUCH_INSPECT_LONG_PRESS_MS);
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    if (!isTouchOnlyDevice || ev.pointerType === "mouse") return;
    if (isTouchHandleMode) return;

    const start = touchInspectStartRef.current;
    if (!start) return;
    const deltaX = ev.clientX - start.clientX;
    const deltaY = ev.clientY - start.clientY;

    if (isTouchInspecting) {
      if (ev.cancelable) ev.preventDefault();
      return;
    }

    if (Math.hypot(deltaX, deltaY) > TOUCH_INSPECT_MOVE_TOLERANCE_PX) {
      clearTouchInspectTimer();
    }
  };

  const onPointerUp = (ev: React.PointerEvent) => {
    if (!isTouchOnlyDevice || ev.pointerType === "mouse") return;
    if (isTouchHandleMode) return;

    clearTouchInspectTimer();
    setIsTouchInspecting(false);
    setTouchDefaultIndex(null);
    touchInspectStartRef.current = null;
    lastTouchHoveredHourRef.current = null;
    setHoveredHour(null);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        "chart-touch-no-select relative aspect-auto w-full [&_.recharts-legend-wrapper]:hidden",
        preview
          ? "h-[300px]"
          : "h-[250px] @min-3xl:h-[280px] @min-4xl:h-[300px]"
      )}
      style={
        isTouchInspecting
          ? {
              touchAction: "none",
              overflowX: "hidden",
              overflowY: "hidden",
              height: isTouchHandleMode
                ? (preview ? 410 : 360) + TOUCH_HANDLE_GUTTER_PX
                : undefined,
              overscrollBehavior: "contain",
            }
          : {
              touchAction: "pan-y",
              overflowX: "hidden",
              overflowY: "hidden",
              height: isTouchHandleMode
                ? (preview ? 410 : 360) + TOUCH_HANDLE_GUTTER_PX
                : undefined,
              overscrollBehavior: "contain",
            }
      }
    >
      {/* Shade only the plot area (not the X-axis label band), matching prior ReferenceArea behavior. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: CHART_TOP_MARGIN,
          right: 0,
          bottom: xAxisBottomInsetPx,
          backgroundImage: [
            `linear-gradient(to right, ${edgeFill.left}, ${edgeFill.left})`,
            plotShading,
            `linear-gradient(to right, ${edgeFill.right}, ${edgeFill.right})`,
          ]
            .filter(Boolean)
            .join(", "),
          backgroundRepeat: "no-repeat",
          backgroundSize: `${yAxisInsetPx}px 100%, calc(100% - ${yAxisInsetPx}px - ${CHART_RIGHT_MARGIN}px) 100%, ${CHART_RIGHT_MARGIN}px 100%`,
          backgroundPosition: `0 0, ${yAxisInsetPx}px 0, right 0`,
          borderRadius: 8,
          pointerEvents: "none",
        }}
      />
      {plotWidthPx > 0 && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: CHART_TOP_MARGIN,
            bottom: xAxisBottomInsetPx,
            left: 0,
            right: 0,
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: 4,
          }}
        >
          <HoverOverlayLine
            domainMin={0}
            domainMax={hours}
            plotLeftPx={yAxisInsetPx}
            plotWidthPx={plotWidthPx}
            endInsetPx={HOVER_LINE_END_INSET_PX}
            days={date ? [date] : null}
            selectedDate={date ?? null}
            selectedHour={selectedHour ?? null}
            strokeOpacity={0.5}
          />
        </div>
      )}
      {/* Divider between the in-plot axis inset and the data plot. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: CHART_TOP_MARGIN,
          bottom: xAxisBottomInsetPx,
          left: yAxisInsetPx,
          width: 1,
          backgroundColor: "var(--border)",
          opacity: 0.85,
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
      {/* In-plot Y-axis overlay. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: yAxisInsetPx,
          pointerEvents: "none",
          zIndex: 3,
        }}
      >
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-full w-full !justify-start"
        >
          <LineChart
            accessibilityLayer={false}
            data={[{ x: 0 }]}
            margin={{
              left: CHART_LEFT_MARGIN,
              right: 0,
              top: CHART_TOP_MARGIN,
              bottom: handleGutterPx,
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
                tideTicks[0] ?? -2,
                tideTicks[tideTicks.length - 1] ?? 8,
              ]}
              ticks={tideTicks}
            />
          </LineChart>
        </ChartContainer>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          pointerEvents: isTouchHandleMode ? "none" : "auto",
        }}
      >
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-full w-full"
        >
          <LineChart
            accessibilityLayer
            data={renderData}
            margin={{
              top: CHART_TOP_MARGIN,
              left: yAxisInsetPx,
              right: CHART_RIGHT_MARGIN,
              bottom: handleGutterPx,
            }}
            syncId="allCharts"
            syncMethod="value"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Hour indicator line */}
            <ReferenceLine
              x={selectedHour}
              stroke="var(--foreground)"
              // strokeWidth={2}
              strokeDasharray="3 3"
              isFront={false}
            />
            {/* <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--foreground)"
          strokeWidth={0.1}
          vertical={false}
        /> */}
            <XAxis
              dataKey="hour"
              type="number"
              domain={[0, hours]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={0}
              fontSize={11}
              height={X_AXIS_SHADE_EXCLUDE_PX}
              ticks={hourTicks}
              tickFormatter={formatHourTick}
            />
            <YAxis
              hide
              width={0}
              dataKey="tide"
              domain={[
                tideTicks[0] ?? -2,
                tideTicks[tideTicks.length - 1] ?? 8,
              ]}
              ticks={tideTicks}
            />
            {isTouchOnlyDevice ? (
              hoveredHour != null ? (
                <ChartTooltip
                  defaultIndex={
                    isTouchInspecting
                      ? touchDefaultIndex ?? undefined
                      : touchHandleHour != null
                      ? touchDefaultIndexFromHandle
                      : touchDefaultIndexFromHover
                  }
                  content={<ChartTooltipContent />}
                  cursor={false}
                  labelFormatter={(_, payload) => {
                    const entry = Array.isArray(payload)
                      ? (payload[0]?.payload as TidePoint | undefined)
                      : undefined;
                    return entry ? formatTime(entry.timestamp) : "";
                  }}
                  animationDuration={0}
                  isAnimationActive={false}
                />
              ) : null
            ) : (
              <ChartTooltip
                content={<ChartTooltipContent />}
                cursor={false}
                labelFormatter={(_, payload) => {
                  const entry = Array.isArray(payload)
                    ? (payload[0]?.payload as TidePoint | undefined)
                    : undefined;
                  return entry ? formatTime(entry.timestamp) : "";
                }}
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
              dot={(props) => {
                const { payload, cx, cy, index } = props as {
                  payload?: unknown;
                  cx?: number | string;
                  cy?: number | string;
                  index?: number;
                };
                const idx = typeof index === "number" ? index : -1;
                const cxNum = typeof cx === "number" ? cx : Number(cx);
                const cyNum = typeof cy === "number" ? cy : Number(cy);
                if (idx === renderData.length - 2) {
                  if (Number.isFinite(cxNum) && Number.isFinite(cyNum)) {
                    lastTideSegmentRef.current.prev = { cx: cxNum, cy: cyNum };
                  }
                } else if (idx === renderData.length - 1) {
                  if (Number.isFinite(cxNum) && Number.isFinite(cyNum)) {
                    lastTideSegmentRef.current.curr = { cx: cxNum, cy: cyNum };
                  }
                }
                const point = payload as TidePoint;
                // Optimized: use Map lookup instead of find
                const sunMarkerType = sunMarkerMap.get(point.hour);
                if (sunMarkerType) {
                  return (
                    <circle
                      key={`sun-${point.hour}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="orange"
                      stroke={TIDE_LINE_COLOR}
                      strokeWidth={1}
                    />
                  );
                }
                // Otherwise check if it's a tide peak
                if (point.isPeak != null) {
                  const isLow = point.isPeak <= point.tide && point.isPeak <= 0;
                  return (
                    <circle
                      key={`peak-${point.timestamp}`}
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill={isLow ? "#ef4444" : "#22c55e"}
                      stroke={TIDE_LINE_COLOR}
                      strokeWidth={1}
                    />
                  );
                }
                return <g key={`empty-${point.timestamp}`} />;
              }}
            >
              <LabelList
                dataKey="hour"
                content={(props: LabelProps) => {
                  const index = props.index ?? -1;
                  const point = renderData[index];
                  // Optimized: use Map lookup instead of find
                  const markerType = point
                    ? sunMarkerMap.get(point.hour)
                    : null;
                  if (!markerType) return null;
                  const safeX = typeof props.x === "number" ? props.x : 0;

                  const IconComponent =
                    markerType === "sunrise" ? Sunrise : Sunset;
                  return (
                    <g>
                      <IconComponent
                        size={18}
                        x={safeX - 9}
                        y={15}
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
                  const index = props.index ?? -1;
                  const point = renderData[index];
                  if (!point || point.isPeak == null) return null;
                  const safeX = typeof props.x === "number" ? props.x : 0;
                  const safeY = typeof props.y === "number" ? props.y : 0;

                  // Calculate boundaries - Y-axis width is approximately 40px from left margin
                  const LEFT_BOUNDARY = yAxisInsetPx + 6; // Just past the in-plot Y-axis wall
                  const RIGHT_BOUNDARY = yAxisInsetPx + plotWidthPx - 6; // Inside plot right edge
                  const LABEL_HALF_WIDTH = 35; // Approximate half-width of label text
                  // Determine text anchor and adjusted x position based on boundaries
                  let textAnchor: "start" | "middle" | "end" = "middle";
                  let adjustedX = safeX;

                  // Check if label would bleed off the left edge
                  if (safeX - LABEL_HALF_WIDTH < LEFT_BOUNDARY) {
                    textAnchor = "start";
                    adjustedX = Math.max(safeX, LEFT_BOUNDARY);
                  }
                  // Check if label would bleed off the right edge
                  else if (safeX + LABEL_HALF_WIDTH > RIGHT_BOUNDARY) {
                    textAnchor = "end";
                    adjustedX = Math.min(safeX, RIGHT_BOUNDARY);
                  }

                  // Optimized: use pre-computed placement map
                  const placeBelow =
                    peakPlacementMap.get(point.timestamp) ?? false;

                  const timeY = placeBelow ? safeY + 25 : safeY - 32;
                  const heightY = placeBelow ? safeY + 40 : safeY - 17;

                  return (
                    <g>
                      <text
                        x={adjustedX}
                        y={timeY}
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
                          filter: "drop-shadow(0 0 2px var(--background))",
                        }}
                      >
                        {formatTime(point.timestamp)}
                      </text>
                      <text
                        x={adjustedX}
                        y={heightY}
                        fill="var(--foreground)"
                        textAnchor={textAnchor}
                        fontWeight="bold"
                        fontSize={12}
                        style={{
                          paintOrder: "stroke",
                          stroke: "var(--background)",
                          strokeWidth: 1,
                          strokeLinejoin: "round",
                          filter: "drop-shadow(0 0 2px var(--background))",
                        }}
                      >
                        {`${point.isPeak} ft`}
                      </text>
                    </g>
                  );
                }}
              />
            </Line>
          </LineChart>
        </ChartContainer>
      </div>
      {isTouchHandleMode && (
        <ForecastTooltipHandle
          enabled={isTouchHandleMode}
          leftPx={handleLeftPx}
          onScrub={handleScrub}
          onScrubEnd={() => setHoveredHour(null)}
          position="inside"
          className="translate-y-4"
          showTrack={false}
          triangleBasePx={14}
          triangleHeightPx={12}
          stopPropagation
        />
      )}
    </div>
  );
};

export default React.memo(TideChart);
