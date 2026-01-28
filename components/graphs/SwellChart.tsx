"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
  AreaChart,
  Area,
  Customized,
} from "recharts";
import { getPacificHour } from "@/lib/utils";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  ChartTooltipContent,
} from "@/components/ui/chart";

import {
  MousePointer2 as ArrowIcon,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { getWindDirection } from "@/lib/supabase";
import {
  useDateContext,
  useHoveredHour,
} from "@/components/context/DateContext";
import { useSunData } from "@/components/context/SunDataContext";
import { buildSunSegments } from "@/components/graphs/sunSegments";
import { syncToNearestThirdHour } from "@/components/graphs/chartSync";
import { useForecastWindowData } from "@/lib/hooks/useForecastWindow";
import type { SharedSunSegments } from "./sharedSunSegments";
import { buildYAxisTicks } from "@/components/graphs/yAxisTicks";
import { useChartTheme } from "@/components/graphs/useChartTheme";
import { useOptionalOverviewChartLoading } from "@/components/context/OverviewChartsLoadingContext";
import { useIsTouchOnlyDevice } from "./useIsTouchOnlyDevice";
import {
  useMobileChartTouch,
  MobileChartTooltip,
  type MobileTooltipDataPoint,
} from "./MobileChartTooltip";
import {
  applyForecastShadingOpacity,
  buildForecastPlotShadingBackgroundPercent,
} from "@/components/graphs/forecastShadingBackground";
import HoverOverlayLine from "@/components/graphs/HoverOverlayLine";

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

// Overview charts (single-day): keep the Y-axis inside the shaded plot container.
const CHART_LEFT_MARGIN = 5;
const CHART_TOP_MARGIN = 10;
// Keep the plot shading aligned to the X scale (the area chart uses `margin.right: 0`).
const CHART_RIGHT_MARGIN = 0;
const Y_AXIS_WIDTH = 30;
const X_AXIS_SHADE_EXCLUDE_PX = 34;
const HOVER_LINE_END_INSET_PX = 7.5;
const TOUCH_INSPECT_LONG_PRESS_MS = 320;
const TOUCH_INSPECT_MOVE_TOLERANCE_PX = 10;
const Y_AXIS_TICK = {
  fill: "var(--foreground)",
  fontWeight: 500,
  filter: "drop-shadow(0 0 4px var(--background))",
} as const;

type Props = {
  beachId?: string;
  hours?: number;
  date?: Date;
  sunSegments?: SharedSunSegments;
};
type Row = {
  time: number;
  primary: number;
  secondary: number;
  tertiary: number;
  primaryDir?: number;
  secondaryDir?: number;
  tertiaryDir?: number;
  primaryPeriod?: number;
  secondaryPeriod?: number;
  tertiaryPeriod?: number;
};
type YAxisTickProps = {
  x?: number;
  y?: number;
  payload?: { value?: number | string };
  textAnchor?: string;
  fontSize?: number;
};
type TooltipPayload = Array<{ payload?: Row }>;
type TooltipItem = {
  dataKey?: string | number;
  payload?: Record<string, unknown>;
};
type TooltipValue = number | string | Array<number | string>;
type ChartMouseEvent = { activeLabel?: number | string | null };
type ClipProps = {
  width?: number;
  offset?: { left?: number; width?: number; top?: number; height?: number };
};
type DotProps = { payload?: Row; cx?: number; cy?: number; index?: number };

export const SwellStatsHeader = ({
  beachId,
  hours = 24,
  date,
}: {
  beachId?: string;
  hours?: number;
  date?: Date;
}) => {
  const { rows } = useForecastWindowData({ beachId, hours, date });
  const { highSwell, lowSwell } = React.useMemo(() => {
    if (!beachId || !rows.length) {
      return { highSwell: null, lowSwell: null };
    }
    const swellValues = rows
      .map((r) => r.swell.primary.height)
      .filter(
        (v): v is number =>
          typeof v === "number" && !Number.isNaN(v) && v !== null,
      );
    if (!swellValues.length) {
      return { highSwell: null, lowSwell: null };
    }
    return {
      highSwell: Math.max(...swellValues).toFixed(1),
      lowSwell: Math.min(...swellValues).toFixed(1),
    };
  }, [beachId, rows]);

  return (
    <div className="grid grid-cols-[60px_1fr] grid-rows-2 gap-y-0.5 items-center rounded-xl border border-border/25 bg-highlight-7/70 px-2.5 py-2 text-xs uppercase tracking-wide leading-tight text-muted-foreground shadow-even supports-[backdrop-filter]:bg-highlight-7/40 supports-[backdrop-filter]:backdrop-blur-md">
      <span className="flex gap-2 items-center">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <span className="block font-medium">High</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {highSwell ?? "--"} <span className="inline-block">ft</span>
      </span>
      <span className="flex gap-2 items-center">
        <TrendingDown className="h-4 w-4 text-muted-foreground" />
        <span className="block -mb-0.5 font-medium">Low</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {lowSwell ?? "--"} <span className="inline-block">ft</span>
      </span>
    </div>
  );
};

const SwellChart = ({ beachId, hours = 24, date, sunSegments }: Props) => {
  const { hour: selectedHour, setHoveredHour } = useDateContext();
  const { getSunData } = useSunData();
  const chartTheme = useChartTheme();
  const hoveredHour = useHoveredHour();
  const isTouchOnlyDevice = useIsTouchOnlyDevice();
  const { setReady: setOverviewReady } =
    useOptionalOverviewChartLoading("overview-swell");
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    [],
  );
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const mobileChartId = "overview-swell";
  const [isTouchInspecting, setIsTouchInspecting] = useState(false);
  const [touchDefaultIndex, setTouchDefaultIndex] = useState<number | null>(
    null,
  );
  const touchInspectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const touchInspectStartRef = useRef<{
    clientX: number;
    clientY: number;
    chartX: number;
  } | null>(null);
  const lastTouchHoveredHourRef = useRef<number | null>(null);
  const lastArrowPointRef = useRef<
    Record<
      "primary" | "secondary" | "tertiary",
      { cx: number; cy: number } | null
    >
  >({ primary: null, secondary: null, tertiary: null });

  const formatHourLabel = React.useCallback(
    (label: unknown, payload: TooltipPayload) => {
      let hour = payload?.[0]?.payload?.time;
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

  const formatSwellTooltipValue = React.useCallback(
    (value: TooltipValue, _name: string | number, item: TooltipItem) => {
      const dirKey = `${item?.dataKey}Dir`;
      const periodKey = `${item?.dataKey}Period`;
      const direction = item?.payload?.[dirKey];
      const period = item?.payload?.[periodKey];
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
    [],
  );

  const {
    rows: forecastRows,
    start: windowStart,
    loading: forecastLoading,
  } = useForecastWindowData({
    beachId,
    hours,
    date,
  });

  const overviewKey = `${beachId ?? ""}-${hours}-${
    date instanceof Date ? date.getTime() : "no-date"
  }`;
  useLayoutEffect(() => {
    setOverviewReady(false);
  }, [overviewKey, setOverviewReady]);
  const windowStartMs = windowStart.getTime();

  const overviewReady = Boolean(beachId && !forecastLoading);
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

  const clearTouchInspectTimer = React.useCallback(() => {
    if (touchInspectTimerRef.current) {
      clearTimeout(touchInspectTimerRef.current);
      touchInspectTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTouchInspectTimer(), [clearTouchInspectTimer]);

  const placeholderData = useMemo(
    () =>
      Array.from({ length: 9 }, (_, idx) => {
        const time = idx * 3;
        return {
          time,
          primary: Number((2 + Math.sin((time / 24) * Math.PI)).toFixed(1)),
          secondary: Number((1 + Math.cos((time / 24) * Math.PI)).toFixed(1)),
          tertiary: Number(
            (0.5 + Math.sin((time / 12) * Math.PI) * 0.3).toFixed(1),
          ),
          primaryDir: (time * 15) % 360,
          secondaryDir: (time * 20) % 360,
          tertiaryDir: (time * 25) % 360,
          primaryPeriod: Math.round(12 + Math.sin((time / 24) * Math.PI) * 2),
          secondaryPeriod: Math.round(10 + Math.cos((time / 24) * Math.PI) * 2),
          tertiaryPeriod: Math.round(8 + Math.sin((time / 12) * Math.PI) * 1),
        };
      }),
    [],
  );

  const data = useMemo<Row[]>(() => {
    if (!beachId) {
      return placeholderData;
    }
    if (!forecastRows.length) {
      return [];
    }
    return forecastRows.map((r, index, arr) => ({
      time: index === arr.length - 1 ? hours : getPacificHour(r.timestamp),
      primary: Number((r.swell.primary.height ?? 0).toFixed(1)),
      secondary: Number((r.swell.secondary.height ?? 0).toFixed(1)),
      tertiary: Number((r.swell.tertiary?.height ?? 0).toFixed(1)),
      primaryDir: r.swell.primary.direction ?? undefined,
      secondaryDir: r.swell.secondary.direction ?? undefined,
      tertiaryDir: r.swell.tertiary?.direction ?? undefined,
      primaryPeriod: r.swell.primary.period ?? undefined,
      secondaryPeriod: r.swell.secondary.period ?? undefined,
      tertiaryPeriod: r.swell.tertiary?.period ?? undefined,
    }));
  }, [beachId, forecastRows, hours, placeholderData]);

  useEffect(() => {
    if (
      sunSegments &&
      (sunSegments.dayAreas?.length ||
        sunSegments.sunrise ||
        sunSegments.sunset)
    ) {
      setDayAreas(sunSegments.dayAreas ?? []);
      setNightAreas(sunSegments.nightAreas ?? []);
      return;
    }
    if (!beachId) {
      setDayAreas([]);
      setNightAreas([]);
      return;
    }
    let cancelled = false;

    const hydrateShading = async () => {
      try {
        const sunData = await getSunData(
          String(beachId),
          new Date(windowStartMs),
        );
        const segments = buildSunSegments(
          hours,
          sunData?.sunrise ?? null,
          sunData?.sunset ?? null,
        );
        if (!cancelled) {
          setDayAreas(segments.dayAreas);
          setNightAreas(segments.nightAreas);
        }
      } catch (e) {
        if (!cancelled) {
          setDayAreas([]);
          setNightAreas([{ x1: 0, x2: hours }]);
        }
      }
    };

    void hydrateShading();

    return () => {
      cancelled = true;
    };
  }, [beachId, getSunData, hours, sunSegments, windowStartMs]);

  const hourTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let v = 0; v <= hours; v += 3) {
      ticks.push(v);
    }
    if (ticks[ticks.length - 1] !== hours) {
      ticks.push(hours);
    }
    return ticks;
  }, [hours]);

  const swellTicks = useMemo(
    () =>
      buildYAxisTicks(
        data
          .flatMap((row) => [row.primary, row.secondary, row.tertiary])
          .filter(
            (v): v is number => typeof v === "number" && Number.isFinite(v),
          ),
        0,
        4,
        0.2,
      ),
    [data],
  );
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
    [swellTicks],
  );

  const yAxisInsetPx = CHART_LEFT_MARGIN + Y_AXIS_WIDTH;
  const plotWidthPx = useMemo(
    () => Math.max(0, containerWidth - yAxisInsetPx - CHART_RIGHT_MARGIN),
    [containerWidth, yAxisInsetPx],
  );

  const getTouchActivationFromChartX = React.useCallback(
    (chartX: number) => {
      if (!(plotWidthPx > 0) || data.length === 0) return null;
      if (!Number.isFinite(chartX)) return null;

      const plotX = chartX - yAxisInsetPx;
      const clampedPlotX = Math.max(0, Math.min(plotX, plotWidthPx));
      const timeAtX = (clampedPlotX / plotWidthPx) * hours;
      const clampedTimeAtX = Math.max(0, Math.min(hours, timeAtX));

      let bestIndex = -1;
      let bestDiff = Infinity;
      for (let i = 0; i < data.length; i++) {
        const pointTime = data[i]?.time;
        if (typeof pointTime !== "number" || !Number.isFinite(pointTime)) {
          continue;
        }
        const diff = Math.abs(pointTime - clampedTimeAtX);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIndex = i;
        }
      }
      if (bestIndex < 0) return null;

      const nearestTime = data[bestIndex]?.time;
      if (typeof nearestTime !== "number" || !Number.isFinite(nearestTime)) {
        return null;
      }
      const hoveredHour = Math.max(
        0,
        Math.min(hours, Math.round(nearestTime / 3) * 3),
      );

      return { defaultIndex: bestIndex, hoveredHour };
    },
    [data, hours, plotWidthPx, yAxisInsetPx],
  );

  const plotClipIdRaw = React.useId();
  const plotClipId = useMemo(
    () => `overview-swell-plot-clip-${plotClipIdRaw.replace(/:/g, "")}`,
    [plotClipIdRaw],
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
    ],
  );
  const edgeFill = useMemo(() => {
    const isDayAt = (h: number) =>
      dayAreas.some((a) => h >= a.x1 && h <= (a.x2 ?? hours));
    const leftIsDay = isDayAt(0.0001);
    const rightIsDay = isDayAt(Math.max(0, hours - 0.0001));
    const left = applyForecastShadingOpacity(
      leftIsDay ? chartTheme.dayShading : chartTheme.nightShading,
      chartTheme.shadingOpacity,
    );
    const right = applyForecastShadingOpacity(
      rightIsDay ? chartTheme.dayShading : chartTheme.nightShading,
      chartTheme.shadingOpacity,
    );
    return { left, right };
  }, [
    dayAreas,
    hours,
    chartTheme.dayShading,
    chartTheme.nightShading,
    chartTheme.shadingOpacity,
  ]);

  const lastHoveredRef = React.useRef<number | null>(null);
  const hoverRafRef = React.useRef<number | null>(null);
  const pendingHoverRef = React.useRef<number | null>(null);

  const handleMouseMove = (e: ChartMouseEvent) => {
    if (isTouchOnlyDevice && !isTouchInspecting) return;
    if (e && e.activeLabel !== undefined) {
      const hour = Number(e.activeLabel);
      if (!isNaN(hour)) {
        const rounded = Math.round(hour / 3) * 3;
        const clamped = Math.max(0, Math.min(hours, rounded));
        if (lastHoveredRef.current === clamped) return;
        pendingHoverRef.current = clamped;
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

  const onPointerDown = (ev: React.PointerEvent) => {
    if (!isTouchOnlyDevice || ev.pointerType === "mouse") return;

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
        setHoveredHour(activation.hoveredHour);
      }
      setIsTouchInspecting(true);
    }, TOUCH_INSPECT_LONG_PRESS_MS);
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    if (!isTouchOnlyDevice || ev.pointerType === "mouse") return;

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

    clearTouchInspectTimer();
    setIsTouchInspecting(false);
    setTouchDefaultIndex(null);
    touchInspectStartRef.current = null;
    lastTouchHoveredHourRef.current = null;
    setHoveredHour(null);
  };

  // Arrow dots are shifted left at the very last x-value to avoid right-edge clipping.
  // When shifted, project them along the final curve segment so they still sit on the line.
  useEffect(() => {
    lastArrowPointRef.current = {
      primary: null,
      secondary: null,
      tertiary: null,
    };
  }, [data, hours]);

  const projectArrowAlongLastSegment = React.useCallback(
    (
      key: "primary" | "secondary" | "tertiary",
      cx: number,
      cy: number,
      dx: number,
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
    [],
  );

  // Mobile touch tooltip callbacks
  const getIndexFromChartX = React.useCallback(
    (chartX: number): number => {
      if (!plotWidthPx) return 0;
      const plotX = Math.max(0, Math.min(chartX - yAxisInsetPx, plotWidthPx));
      const t = plotWidthPx > 0 ? plotX / plotWidthPx : 0;
      const hour = t * hours;
      const roundedHour = Math.round(hour / 3) * 3;
      const clampedHour = Math.max(0, Math.min(roundedHour, hours));
      return Math.round(clampedHour / 3);
    },
    [plotWidthPx, yAxisInsetPx, hours],
  );

  const getMobileTooltipDataPoint = React.useCallback(
    (index: number): MobileTooltipDataPoint | null => {
      if (index < 0 || index >= data.length) return null;
      const point = data[index];
      const hour = point.time;
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
        hour: point.time,
        label: `${displayHour} ${ampm}`,
        value: point.primary,
        unit: "ft",
        formattedValue,
        labelSpacing: "spacious",
      };
    },
    [data],
  );

  const getDataPointForHour = React.useCallback(
    (hour: number): MobileTooltipDataPoint | null => {
      const index = Math.round(hour / 3);
      if (index < 0 || index >= data.length) return null;
      const point = data[index];
      const normalized = ((point.time % 24) + 24) % 24;
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
        hour: point.time,
        label: `${displayHour} ${ampm}`,
        value: point.primary,
        unit: "ft",
        formattedValue,
        labelSpacing: "spacious",
      };
    },
    [data, getWindDirection],
  );

  const getXPositionForHour = React.useCallback(
    (hour: number): number | null => {
      if (!plotWidthPx || plotWidthPx <= 0) return null;
      if (hours <= 0) return null;
      const t = hour / hours;
      if (t < 0 || t > 1) return null;
      return yAxisInsetPx + t * plotWidthPx;
    },
    [plotWidthPx, yAxisInsetPx, hours],
  );

  const handleMobileInspect = React.useCallback(
    (_index: number, hour: number) => {
      setHoveredHour(hour);
    },
    [setHoveredHour],
  );

  const handleMobileInspectEnd = React.useCallback(() => {
    setHoveredHour(null);
  }, [setHoveredHour]);

  const { handlers: mobileHandlers, styles: mobileStyles } =
    useMobileChartTouch({
      chartId: mobileChartId,
      containerRef,
      dataLength: data.length,
      getIndexFromX: getIndexFromChartX,
      onInspect: handleMobileInspect,
      onInspectEnd: handleMobileInspectEnd,
      enabled: isTouchOnlyDevice,
    });

  return (
    <div
      ref={containerRef}
      {...mobileHandlers}
      className="chart-touch-no-select relative aspect-auto h-[250px] @min-3xl:h-[280px] @min-4xl:h-[300px] w-full"
      style={mobileStyles}
    >
      {/* Shade only the plot area (not the X-axis label band), matching prior ReferenceArea behavior. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: CHART_TOP_MARGIN,
          right: 0,
          bottom: X_AXIS_SHADE_EXCLUDE_PX,
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
            bottom: X_AXIS_SHADE_EXCLUDE_PX,
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
          bottom: X_AXIS_SHADE_EXCLUDE_PX,
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
          <AreaChart
            accessibilityLayer={false}
            data={[{ x: 0 }]}
            margin={{
              left: CHART_LEFT_MARGIN,
              right: 0,
              top: CHART_TOP_MARGIN,
              bottom: 0,
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

      <div style={{ position: "relative", zIndex: 1, height: "100%" }}>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-full w-full"
        >
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              top: CHART_TOP_MARGIN,
              right: 0,
              left: yAxisInsetPx,
              bottom: 0,
            }}
            syncId="allCharts"
            syncMethod={syncToNearestThirdHour}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Clip filled areas to the same rounded plot bounds as the day/night shading (keeps bottom-right corner premium). */}
            <Customized
              component={(p: ClipProps) => {
                const offset = p?.offset;
                const fullWidth = typeof p?.width === "number" ? p.width : 0;
                const clipWidth =
                  (typeof offset?.left === "number" ? offset.left : 0) +
                  (typeof offset?.width === "number" ? offset.width : 0);
                const height =
                  typeof offset?.height === "number" ? offset.height : 0;
                const top = typeof offset?.top === "number" ? offset.top : 0;
                if (
                  !offset ||
                  !(fullWidth > 0) ||
                  !(clipWidth > 0) ||
                  !(height > 0)
                ) {
                  return null;
                }
                return (
                  <defs>
                    <clipPath id={plotClipId}>
                      <rect
                        x={0}
                        y={top}
                        width={Math.min(fullWidth, clipWidth)}
                        height={height}
                        rx={8}
                        ry={8}
                      />
                    </clipPath>
                  </defs>
                );
              }}
            />
            {/* <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--foreground)"
          strokeWidth={0.1}
          vertical={false}
        /> */}
            <XAxis
              dataKey="time"
              domain={[0, hours]}
              type="number"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={0}
              fontSize={11}
              height={X_AXIS_SHADE_EXCLUDE_PX}
              ticks={hourTicks}
              tickFormatter={(value) =>
                value % 3 === 0
                  ? (value % 12 === 0 ? 12 : value % 12).toString()
                  : ""
              }
            />
            <YAxis
              hide
              width={0}
              domain={[
                swellTicks[0] ?? 0,
                swellTicks[swellTicks.length - 1] ?? 6,
              ]}
              ticks={swellTicks}
            />
            {/* Hour indicator line */}
            <ReferenceLine
              x={selectedHour}
              stroke="var(--foreground)"
              // strokeWidth={2}
              strokeDasharray="3 3"
            />
            {/* <ChartLegend content={<ChartLegendContent />} /> */}
            {!isTouchOnlyDevice && (
              <ChartTooltip
                content={() => null}
                cursor={false}
                wrapperStyle={{ visibility: "hidden" }}
                animationDuration={0}
                isAnimationActive={false}
              />
            )}

            <Area
              type="monotone"
              dataKey="primary"
              activeDot={false}
              stroke="#023e8a"
              fill="#0077b6"
              strokeWidth={1.5}
              fillOpacity={0.2}
              clipPath={`url(#${plotClipId})`}
              isAnimationActive={false}
              animationDuration={0}
              animationBegin={0}
              dot={({ payload, cx, cy, index }: DotProps) => {
                const iconSize = 15;
                const cxNum = typeof cx === "number" ? cx : Number(cx);
                const cyNum = typeof cy === "number" ? cy : Number(cy);
                if (!Number.isFinite(cxNum) || !Number.isFinite(cyNum)) {
                  return <g key={`primary-${index}`} />;
                }
                const isLastPoint = payload?.time === hours;
                const dx = isLastPoint ? -iconSize / 2 : 0;
                const projected = projectArrowAlongLastSegment(
                  "primary",
                  cxNum,
                  cyNum,
                  dx,
                );
                const direction = payload?.primaryDir ?? 0;
                const rotation = direction - 315; // Arrow points at 315° by default

                return (
                  <g key={`primary-${index}`}>
                    <g transform={`translate(${projected.x}, ${projected.y})`}>
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
              fill="#48cae4"
              strokeWidth={1.5}
              fillOpacity={0.2}
              clipPath={`url(#${plotClipId})`}
              isAnimationActive={false}
              animationDuration={0}
              animationBegin={0}
              dot={({ payload, cx, cy, index }: DotProps) => {
                const iconSize = 15;
                const cxNum = typeof cx === "number" ? cx : Number(cx);
                const cyNum = typeof cy === "number" ? cy : Number(cy);
                if (!Number.isFinite(cxNum) || !Number.isFinite(cyNum)) {
                  return <g key={`secondary-${index}`} />;
                }
                const isLastPoint = payload?.time === hours;
                const dx = isLastPoint ? -iconSize / 2 : 0;
                const projected = projectArrowAlongLastSegment(
                  "secondary",
                  cxNum,
                  cyNum,
                  dx,
                );
                const direction = payload?.secondaryDir ?? 0;
                const rotation = direction - 315;

                return (
                  <g key={`secondary-${index}`}>
                    <g transform={`translate(${projected.x}, ${projected.y})`}>
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
              fill="#adf1ffff"
              strokeWidth={1.5}
              fillOpacity={0.2}
              clipPath={`url(#${plotClipId})`}
              isAnimationActive={false}
              animationDuration={0}
              animationBegin={0}
              dot={({ payload, cx, cy, index }: DotProps) => {
                const iconSize = 15;
                const cxNum = typeof cx === "number" ? cx : Number(cx);
                const cyNum = typeof cy === "number" ? cy : Number(cy);
                if (!Number.isFinite(cxNum) || !Number.isFinite(cyNum)) {
                  return <g key={`tertiary-${index}`} />;
                }
                const isLastPoint = payload?.time === hours;
                const dx = isLastPoint ? -iconSize / 2 : 0;
                const projected = projectArrowAlongLastSegment(
                  "tertiary",
                  cxNum,
                  cyNum,
                  dx,
                );
                const direction = payload?.tertiaryDir ?? 0;
                const rotation = direction - 315;

                return (
                  <g key={`tertiary-${index}`}>
                    <g transform={`translate(${projected.x}, ${projected.y})`}>
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
      <MobileChartTooltip
        chartId={mobileChartId}
        getDataPoint={getMobileTooltipDataPoint}
        getDataPointForHour={getDataPointForHour}
        anchorRef={containerRef}
        getXPositionForHour={getXPositionForHour}
        positionInside
      />
    </div>
  );
};

export default React.memo(SwellChart);
