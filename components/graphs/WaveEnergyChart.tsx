"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
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
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Atom } from "lucide-react";
import {
  useDateContext,
  useHoveredHour,
} from "@/components/context/DateContext";
import { useSunData } from "@/components/context/SunDataContext";
import { buildSunSegments } from "@/components/graphs/sunSegments";
import { syncToNearestThirdHour } from "@/components/graphs/chartSync";
import { useForecastWindowData } from "@/lib/hooks/useForecastWindow";
import { useChartTheme } from "@/components/graphs/useChartTheme";
import type { SharedSunSegments } from "./sharedSunSegments";
import { buildYAxisTicks } from "@/components/graphs/yAxisTicks";
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

const EnergyTooltipIcon = () => <Atom className="h-3 w-3" />;

const chartConfig = {
  energy: {
    label: "Energy",
    color: "#f97316",
    icon: EnergyTooltipIcon,
  },
  //   secondary: {
  //     label: "Secondary",
  //     color: "#95c5ffff",
  //   },
  //   tertiary: {
  //     label: "tertiary",
  //     color: "#2564b8ff",
  //   },
} satisfies ChartConfig;

type Props = {
  beachId?: string;
  hours?: number;
  date?: Date;
  sunSegments?: SharedSunSegments;
};
type EnergyPoint = { hour: number; energy: number };
type YAxisTickProps = {
  x?: number;
  y?: number;
  payload?: { value?: number | string };
  textAnchor?: string;
  fontSize?: number;
};
type ChartMouseEvent = { activeLabel?: number | string | null };
type ClipProps = {
  width?: number;
  offset?: { left?: number; width?: number; top?: number; height?: number };
};

const HOURS_TO_MS = 60 * 60 * 1000;

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

function buildTrendStops(
  series: EnergyPoint[],
  incColor: string,
  decColor: string
) {
  if (series.length < 2) {
    return [
      { offset: "0%", color: incColor },
      { offset: "100%", color: incColor },
    ];
  }

  const segInc: boolean[] = [];
  for (let i = 1; i < series.length; i++) {
    segInc.push(series[i].energy >= series[i - 1].energy);
  }

  const stops: { offset: string; color: string }[] = [];
  const colorOf = (inc: boolean) => (inc ? incColor : decColor);

  stops.push({ offset: "0%", color: colorOf(segInc[0]) });

  for (let i = 1; i < segInc.length; i++) {
    if (segInc[i] !== segInc[i - 1]) {
      const frac = (i / (series.length - 1)) * 100;
      const pct = `${frac}%`;
      // hard transition: duplicate stop with new color
      stops.push({ offset: pct, color: colorOf(segInc[i - 1]) });
      stops.push({ offset: pct, color: colorOf(segInc[i]) });
    }
  }

  stops.push({ offset: "100%", color: colorOf(segInc[segInc.length - 1]) });
  return stops;
}

const WaveEnergyChart = ({ beachId, hours = 24, date, sunSegments }: Props) => {
  const { hour: selectedHour, setHoveredHour } = useDateContext();
  const { getSunData } = useSunData();
  const hoveredHour = useHoveredHour();
  const chartTheme = useChartTheme();
  const isTouchOnlyDevice = useIsTouchOnlyDevice();
  const { setReady: setOverviewReady } =
    useOptionalOverviewChartLoading("overview-energy");
  const gradientIdRaw = React.useId();
  const fillGradientId = useMemo(
    () => `energySplitColor-${gradientIdRaw.replace(/:/g, "")}`,
    [gradientIdRaw]
  );
  const strokeGradientId = useMemo(
    () => `energySplitColorStroke-${gradientIdRaw.replace(/:/g, "")}`,
    [gradientIdRaw]
  );
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2?: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mobileChartId = "overview-energy";
  const [isTouchInspecting, setIsTouchInspecting] = useState(false);
  const [touchDefaultIndex, setTouchDefaultIndex] = useState<number | null>(
    null
  );
  const touchInspectTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const touchInspectStartRef = React.useRef<{
    clientX: number;
    clientY: number;
    chartX: number;
  } | null>(null);
  const lastTouchHoveredHourRef = React.useRef<number | null>(null);
  const {
    rows: forecastRows,
    start: windowStart,
    loading: forecastLoading,
  } = useForecastWindowData({
    beachId,
    date,
    hours,
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

  const clearTouchInspectTimer = useCallback(() => {
    if (touchInspectTimerRef.current) {
      clearTimeout(touchInspectTimerRef.current);
      touchInspectTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTouchInspectTimer(), [clearTouchInspectTimer]);

  const placeholderSeries = useMemo(() => {
    const base = [
      { hour: 0, energy: 1 },
      { hour: 3, energy: 2 },
      { hour: 6, energy: 2 },
      { hour: 9, energy: 3 },
      { hour: 12, energy: 2 },
      { hour: 15, energy: 3 },
      { hour: 18, energy: 2 },
      { hour: 21, energy: 1 },
    ];
    const last = base[base.length - 1];
    if (last && last.hour < hours) {
      base.push({ hour: hours, energy: last.energy });
    }
    return base;
  }, [hours]);

  const series = useMemo<EnergyPoint[]>(() => {
    if (!beachId) {
      return placeholderSeries;
    }
    if (!forecastRows.length) {
      return [];
    }
    const mapped = forecastRows.map((r) => ({
      hour: Math.max(
        0,
        Math.min(
          hours,
          (new Date(r.timestamp).getTime() - windowStartMs) / HOURS_TO_MS
        )
      ),
      energy: r.surf.waveEnergy ?? 0,
    }));
    const last = mapped[mapped.length - 1];
    if (last && last.hour < hours) {
      mapped.push({ hour: hours, energy: last.energy });
    }
    return mapped;
  }, [beachId, forecastRows, hours, windowStartMs, placeholderSeries]);

  const lastEnergySegmentRef = React.useRef<{
    prev: { cx: number; cy: number } | null;
    curr: { cx: number; cy: number } | null;
  }>({ prev: null, curr: null });
  React.useEffect(() => {
    lastEnergySegmentRef.current = { prev: null, curr: null };
  }, [series]);

  const trackEnergyDot = useCallback(
    (props: { cx?: number | string; cy?: number | string; index?: number }) => {
      const idx = typeof props.index === "number" ? props.index : -1;
      const key = `track-energy-${idx}`;
      if (idx < 0) return <g key={key} />;
      const cxNum = typeof props.cx === "number" ? props.cx : Number(props.cx);
      const cyNum = typeof props.cy === "number" ? props.cy : Number(props.cy);
      if (!Number.isFinite(cxNum) || !Number.isFinite(cyNum))
        return <g key={key} />;
      const last = series.length - 1;
      if (idx === last - 1) {
        lastEnergySegmentRef.current.prev = { cx: cxNum, cy: cyNum };
      } else if (idx === last) {
        lastEnergySegmentRef.current.curr = { cx: cxNum, cy: cyNum };
      }
      return <g key={key} />;
    },
    [series.length]
  );

  const energyActiveDot = useCallback(
    (props: { cx?: number | string; cy?: number | string; index?: number }) => {
      const cxNum = typeof props.cx === "number" ? props.cx : Number(props.cx);
      const cyNum = typeof props.cy === "number" ? props.cy : Number(props.cy);
      if (!Number.isFinite(cxNum) || !Number.isFinite(cyNum)) return <g />;
      const idx = typeof props.index === "number" ? props.index : -1;
      const curr = series[idx];
      if (!curr) return <g />;
      const prev = idx > 0 ? series[idx - 1] : undefined;
      const next = idx >= 0 ? series[idx + 1] : undefined;
      const inc = prev
        ? curr.energy >= prev.energy
        : next
        ? next.energy >= curr.energy
        : true;
      const color = inc ? "var(--energy-fill-inc)" : "var(--energy-fill-dec)";
      const isLastPoint = idx === series.length - 1;
      const dx = isLastPoint ? -HOVER_LINE_END_INSET_PX : 0;
      const prevPoint = lastEnergySegmentRef.current.prev;
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
          fill={color}
          stroke={color}
          strokeWidth={0}
        />
      );
    },
    [series]
  );

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
          new Date(windowStartMs)
        );
        const segments = buildSunSegments(
          hours,
          sunData?.sunrise ?? null,
          sunData?.sunset ?? null
        );
        if (!cancelled) {
          setDayAreas(segments.dayAreas);
          setNightAreas(segments.nightAreas);
        }
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to load wave energy", e);
        }
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

  const energyTicks = useMemo(
    () =>
      buildYAxisTicks(
        series
          .map((p) => p.energy)
          .filter(
            (v): v is number => typeof v === "number" && Number.isFinite(v)
          ),
        0,
        4,
        0.25
      ),
    [series]
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
      const minTick = energyTicks[0] ?? 0;
      const maxTick = energyTicks[energyTicks.length - 1] ?? minTick;
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
    [energyTicks]
  );

  const yAxisInsetPx = CHART_LEFT_MARGIN + Y_AXIS_WIDTH;
  const plotWidthPx = useMemo(
    () => Math.max(0, containerWidth - yAxisInsetPx - CHART_RIGHT_MARGIN),
    [containerWidth, yAxisInsetPx]
  );

  const getTouchActivationFromChartX = useCallback(
    (chartX: number) => {
      if (!(plotWidthPx > 0) || series.length === 0) return null;
      if (!Number.isFinite(chartX)) return null;

      const plotX = chartX - yAxisInsetPx;
      const clampedPlotX = Math.max(0, Math.min(plotX, plotWidthPx));
      const hourAtX = (clampedPlotX / plotWidthPx) * hours;
      const clampedHourAtX = Math.max(0, Math.min(hours, hourAtX));

      let bestIndex = -1;
      let bestDiff = Infinity;
      for (let i = 0; i < series.length; i++) {
        const pointHour = series[i]?.hour;
        if (typeof pointHour !== "number" || !Number.isFinite(pointHour)) {
          continue;
        }
        const diff = Math.abs(pointHour - clampedHourAtX);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIndex = i;
        }
      }
      if (bestIndex < 0) return null;

      const nearestHour = series[bestIndex]?.hour;
      if (typeof nearestHour !== "number" || !Number.isFinite(nearestHour)) {
        return null;
      }

      const hoveredHour = Math.max(
        0,
        Math.min(hours, Math.round(nearestHour / 3) * 3)
      );

      return { defaultIndex: bestIndex, hoveredHour };
    },
    [hours, plotWidthPx, series, yAxisInsetPx]
  );

  const plotClipIdRaw = React.useId();
  const plotClipId = useMemo(
    () => `overview-wave-energy-plot-clip-${plotClipIdRaw.replace(/:/g, "")}`,
    [plotClipIdRaw]
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

  const fillStops = useMemo(
    () =>
      buildTrendStops(
        series,
        "var(--energy-fill-inc)",
        "var(--energy-fill-dec)"
      ),
    [series]
  );

  const strokeStops = useMemo(
    () =>
      buildTrendStops(
        series,
        "var(--energy-stroke-inc)",
        "var(--energy-stroke-dec)"
      ),
    [series]
  );

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
    [plotWidthPx, yAxisInsetPx, hours]
  );

  const getMobileTooltipDataPoint = React.useCallback(
    (index: number): MobileTooltipDataPoint | null => {
      if (index < 0 || index >= series.length) return null;
      const point = series[index];
      const hour = point.hour;
      const normalized = ((Math.floor(hour) % 24) + 24) % 24;
      const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;
      const ampm = normalized >= 12 ? "PM" : "AM";

      return {
        hour: point.hour,
        label: `${displayHour} ${ampm}`,
        value: Number(point.energy.toFixed(1)),
        unit: "kJ/m²",
      };
    },
    [series]
  );

  const getDataPointForHour = React.useCallback(
    (hour: number): MobileTooltipDataPoint | null => {
      const index = Math.round(hour / 3);
      if (index < 0 || index >= series.length) return null;
      const point = series[index];
      const normalized = ((Math.floor(point.hour) % 24) + 24) % 24;
      const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;
      const ampm = normalized >= 12 ? "PM" : "AM";

      return {
        hour: point.hour,
        label: `${displayHour} ${ampm}`,
        value: Number(point.energy.toFixed(1)),
        unit: "kJ/m²",
      };
    },
    [series]
  );

  const getXPositionForHour = React.useCallback(
    (hour: number): number | null => {
      if (!plotWidthPx || plotWidthPx <= 0) return null;
      if (hours <= 0) return null;
      const t = hour / hours;
      if (t < 0 || t > 1) return null;
      return yAxisInsetPx + t * plotWidthPx;
    },
    [plotWidthPx, yAxisInsetPx, hours]
  );

  const handleMobileInspect = React.useCallback(
    (_index: number, hour: number) => {
      setHoveredHour(hour);
    },
    [setHoveredHour]
  );

  const handleMobileInspectEnd = React.useCallback(() => {
    setHoveredHour(null);
  }, [setHoveredHour]);

  const { handlers: mobileHandlers, styles: mobileStyles } = useMobileChartTouch({
    chartId: mobileChartId,
    containerRef,
    dataLength: series.length,
    getIndexFromX: getIndexFromChartX,
    onInspect: handleMobileInspect,
    onInspectEnd: handleMobileInspectEnd,
    enabled: isTouchOnlyDevice,
  });

  return (
    <div
      ref={containerRef}
      {...mobileHandlers}
      className="chart-touch-no-select relative aspect-auto h-[250px] @min-3xl:h-[280px] @min-4xl:h-[300px] w-full [&_.recharts-legend-wrapper]:hidden"
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
                energyTicks[0] ?? 0,
                energyTicks[energyTicks.length - 1] ?? 8,
              ]}
              ticks={energyTicks}
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
            data={series}
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
                const offsetHeight =
                  typeof offset?.height === "number" ? offset.height : 0;
                if (
                  !offset ||
                  !(fullWidth > 0) ||
                  !(clipWidth > 0) ||
                  !(offsetHeight > 0)
                ) {
                  return null;
                }
                return (
                  <defs>
                    <clipPath id={plotClipId}>
                      <rect
                        x={0}
                        y={offset.top}
                        width={Math.min(fullWidth, clipWidth)}
                        height={offsetHeight}
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
                energyTicks[0] ?? 0,
                energyTicks[energyTicks.length - 1] ?? 8,
              ]}
              ticks={energyTicks}
            />
            {/* Mobile: Use MobileChartTooltip via portal instead */}
            {!isTouchOnlyDevice && (
              <ChartTooltip
                content={<ChartTooltipContent />}
                cursor={false}
                animationDuration={0}
                isAnimationActive={false}
              />
            )}
            <defs>
              <linearGradient id={fillGradientId} x1="0" y1="0" x2="1" y2="0">
                {/* <stop offset={off} stopColor="green" stopOpacity={1} />
            <stop offset={off} stopColor="red" stopOpacity={1} /> */}
                {fillStops.map((s, i) => (
                  <stop
                    key={i}
                    offset={s.offset}
                    stopColor={s.color}
                    stopOpacity={0.7}
                  />
                ))}
              </linearGradient>
              <linearGradient id={strokeGradientId} x1="0" y1="0" x2="1" y2="0">
                {strokeStops.map((s, i) => (
                  <stop
                    key={i}
                    offset={s.offset}
                    stopColor={s.color}
                    stopOpacity={1}
                  />
                ))}
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="energy"
              stackId="1"
              stroke={`url(#${strokeGradientId})`}
              strokeWidth={2.5}
              //   fill="#adf1ffff"
              fill={`url(#${fillGradientId})`}
              fillOpacity={1}
              clipPath={`url(#${plotClipId})`}
              activeDot={energyActiveDot}
              dot={trackEnergyDot}
              isAnimationActive={false}
              animationDuration={0}
              animationBegin={0}
            />
            {/* Hour indicator line - rendered last so it appears on top */}
            <ReferenceLine
              x={selectedHour}
              stroke="var(--foreground)"
              // strokeWidth={2}
              strokeDasharray="3 3"
            />
          </AreaChart>
        </ChartContainer>
      </div>
      {isTouchOnlyDevice && (
        <MobileChartTooltip
          chartId={mobileChartId}
          getDataPoint={getMobileTooltipDataPoint}
          getDataPointForHour={getDataPointForHour}
          anchorRef={containerRef}
          getXPositionForHour={getXPositionForHour}
          positionInside
        />
      )}
    </div>
  );
};

export default React.memo(WaveEnergyChart);
