"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  LabelList,
  YAxis,
  LabelProps,
  ReferenceLine,
} from "recharts";
import { Droplets, TrendingUp, TrendingDown } from "lucide-react";
import { getPacificHour } from "@/lib/utils";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useForecastWindowData } from "@/lib/hooks/useForecastWindow";
import { useDateContext, useHoveredHour } from "@/components/context/DateContext";
import { useSunData } from "@/components/context/SunDataContext";
import { buildSunSegments } from "@/components/graphs/sunSegments";
import { syncToNearestThirdHour } from "@/components/graphs/chartSync";
import { buildYAxisTicks } from "@/components/graphs/yAxisTicks";
import { useChartTheme } from "@/components/graphs/useChartTheme";
import { buildForecastShadingBackground } from "@/components/graphs/forecastShadingBackground";
import { useOptionalOverviewChartLoading } from "@/components/context/OverviewChartsLoadingContext";
import type { SharedSunSegments } from "./sharedSunSegments";
import { useIsTouchOnlyDevice } from "./useIsTouchOnlyDevice";
import ForecastTooltipHandle from "./ForecastTooltipHandle";

type Props = {
  beachId?: string;
  hours?: number;
  date?: Date;
  sunSegments?: SharedSunSegments;
};
type Row = {
  hour: number;
  surf: number;
  min: number | null;
  max: number | null;
  rangeLabel: string;
};
type YAxisTickProps = {
  x?: number;
  y?: number;
  payload?: { value?: number | string };
  textAnchor?: string;
  fontSize?: number;
};
type ChartMouseEvent = {
  activeLabel?: number | string;
};

const SurfTooltipIcon = () => <Droplets className="h-3 w-3" />;

const chartConfig = {
  surf: {
    label: "Surf",
    color: "#38bdf8",
    icon: SurfTooltipIcon,
  },
} satisfies ChartConfig;

const DATA_STEP_HOURS = 3;
const HALF_STEP_HOURS = DATA_STEP_HOURS / 2;
const TOUCH_HANDLE_MAX_WIDTH = 640;
const TOUCH_HANDLE_RADIUS_PX = 18;
const TOUCH_HANDLE_GUTTER_PX = 26;

// Overview charts (single-day): keep the Y-axis inside the shaded plot container.
const CHART_LEFT_MARGIN = 5;
const CHART_TOP_MARGIN = 10;
const CHART_RIGHT_MARGIN = 10;
const Y_AXIS_WIDTH = 30;
const X_AXIS_SHADE_EXCLUDE_PX = 34;
const Y_AXIS_TICK = {
  fill: "var(--foreground)",
  fontWeight: 500,
  filter: "drop-shadow(0 0 4px var(--background))",
} as const;

export const SurfStatsHeader = ({
  beachId,
  hours = 24,
  date,
}: {
  beachId?: string;
  hours?: number;
  date?: Date;
}) => {
  const { rows } = useForecastWindowData({ beachId, hours, date });
  const { highSurf, lowSurf } = React.useMemo(() => {
    if (!beachId || !rows.length) {
      return { highSurf: null, lowSurf: null };
    }
    const surfValues = rows
      .map((r) => r.surf.heightMax)
      .filter((v): v is number => typeof v === "number" && !isNaN(v));

    if (!surfValues.length) {
      return { highSurf: null, lowSurf: null };
    }

    const high = Math.max(...surfValues);
    const low = Math.min(...surfValues);
    return {
      highSurf: high.toFixed(1),
      lowSurf: low.toFixed(1),
    };
  }, [beachId, rows]);

  return (
    <div className="grid grid-cols-[60px_1fr] grid-rows-2 gap-y-0.5 items-center rounded-xl border border-border/25 bg-highlight-7/70 px-2.5 py-2 text-xs uppercase tracking-wide leading-tight text-muted-foreground shadow-even supports-[backdrop-filter]:bg-highlight-7/40 supports-[backdrop-filter]:backdrop-blur-md">
      <span className="flex gap-2 items-center">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <span className="block font-medium">High</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {highSurf ?? "--"} <span className="inline-block">ft</span>
      </span>
      <span className="flex gap-2 items-center">
        <TrendingDown className="h-4 w-4 text-muted-foreground" />
        <span className="block -mb-0.5 font-medium">Low</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {lowSurf ?? "--"} <span className="inline-block">ft</span>
      </span>
    </div>
  );
};

const SurfChart = ({ beachId, hours = 24, date, sunSegments }: Props) => {
  const {
    hour: selectedHour,
    setHoveredHour,
    hoveredHourRef,
    subscribeToHover,
  } = useDateContext();
  const hoveredHour = useHoveredHour();
  const isTouchOnlyDevice = useIsTouchOnlyDevice();
  const { getSunData } = useSunData();
  const chartTheme = useChartTheme();
  const { setReady: setOverviewReady } =
    useOptionalOverviewChartLoading("overview-surf");
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]); // sunrise-sunset (hours)
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rechartsMoveTargetRef = React.useRef<HTMLElement | null>(null);
  const [touchHandleHour, setTouchHandleHour] = useState<number | null>(null);

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

  const chartData = useMemo<Row[]>(() => {
    if (!beachId || !forecastRows.length) {
      return [];
    }

    const trimmedRows =
      forecastRows.length > 1 &&
      getPacificHour(forecastRows[forecastRows.length - 1].timestamp) === 0
        ? forecastRows.slice(0, -1)
        : forecastRows;

    if (!trimmedRows.length) {
      return [];
    }

    const quantizeHour = (rawHour: number) => {
      const rounded = Math.round(rawHour / DATA_STEP_HOURS) * DATA_STEP_HOURS;
      return Math.min(hours, Math.max(0, rounded));
    };

    const formatSurfRange = (
      min: number | null | undefined,
      max: number | null | undefined
    ) => {
      const safeMin =
        typeof min === "number" && Number.isFinite(min) ? min : null;
      const safeMax =
        typeof max === "number" && Number.isFinite(max) ? max : null;

      if (safeMin === null && safeMax === null) {
        return {
          min: null,
          max: null,
          label: "--",
          estimate: 0,
        };
      }

      let effectiveMin = safeMin ?? safeMax ?? 0;
      let effectiveMax = safeMax ?? safeMin ?? 0;

      if (effectiveMin > effectiveMax) {
        [effectiveMin, effectiveMax] = [effectiveMax, effectiveMin];
      }

      const minRounded = Math.round(Math.max(0, effectiveMin));
      const maxRounded = Math.round(Math.max(0, effectiveMax));

      let label = "";
      if (minRounded === 0 && maxRounded === 0) {
        label = "--";
      } else if (minRounded === maxRounded) {
        label = String(maxRounded);
      } else {
        label = `${minRounded}-${maxRounded}`;
      }

      return {
        min: Math.max(0, effectiveMin),
        max: Math.max(0, effectiveMax),
        label,
        estimate: Math.max(
          0,
          safeMin !== null && safeMax !== null
            ? (effectiveMin + effectiveMax) / 2
            : effectiveMax
        ),
      };
    };

    const mapped = trimmedRows.map((r) => {
      const h1 = r.swell.primary.height ?? 0;
      const p1 = r.swell.primary.period ?? 10;
      const h2 = r.swell.secondary.height ?? 0;
      const p2 = r.swell.secondary.period ?? 10;
      const h3 = r.swell.tertiary?.height ?? 0;
      const p3 = r.swell.tertiary?.period ?? 10;
      const s1 = h1 * Math.sqrt(Math.max(0, p1) / 10);
      const s2 = h2 * Math.sqrt(Math.max(0, p2) / 10);
      const s3 = h3 * Math.sqrt(Math.max(0, p3) / 10);
      const w1 = 1.0,
        w2 = 0.6,
        w3 = 0.3;
      const combined = Math.sqrt(
        Math.pow(w1 * s1, 2) + Math.pow(w2 * s2, 2) + Math.pow(w3 * s3, 2)
      );
      const wind = r.conditions.windSpeed ?? 0;
      const windPenalty = Math.min(0.5, Math.max(0, (wind - 5) / 35));
      const effective = Math.max(0, combined * (1 - windPenalty));

      const { min, max, label, estimate } = formatSurfRange(
        r.surf.heightMin,
        r.surf.heightMax
      );

      let representative = effective;

      if (!Number.isFinite(representative) || representative <= 0) {
        representative = estimate > 0 ? estimate : 0;
      } else if (estimate > 0) {
        representative = representative * 0.7 + estimate * 0.3;
      }

      const centeredHour = quantizeHour(getPacificHour(r.timestamp));

      return {
        hour: centeredHour,
        surf: Number(Math.max(0, representative).toFixed(1)),
        min,
        max,
        rangeLabel: label,
      };
    });

    // Ensure we have a terminal slot at the window end so midnight renders
    const last = mapped[mapped.length - 1];
    if (last && last.hour < hours) {
      mapped.push({ ...last, hour: hours });
    }

    return mapped;
  }, [beachId, forecastRows, hours]);

  // Function to get color based on surf height intensity
  const getSurfColor = (value: number): string => {
    // Define thresholds and colors (light to dark blue)
    if (value >= 5) return "#74b0ffff"; // Very dark blue for 5+ ft
    if (value >= 3) return "#86bbffff"; // Dark blue for 3-5 ft
    if (value >= 1.5) return "#9ccaffff"; // Medium blue for 1.5-3 ft
    return "#b8d9ffff"; // Light blue for < 1.5 ft
  };

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const update = () => setContainerWidth(node.clientWidth);
    const observer = new ResizeObserver(update);
    observer.observe(node);
    update();

    return () => observer.disconnect();
  }, []);

  const overviewReady = Boolean(
    beachId && !forecastLoading && containerWidth > 0
  );
  useEffect(() => {
    setOverviewReady(overviewReady);
  }, [overviewKey, overviewReady, setOverviewReady]);

  const windowStartMs = windowStart.getTime();

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
      } catch (_) {
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

  const domainStart = 0;
  const domainEnd = hours;
  const domainMin = -HALF_STEP_HOURS;
  const domainMax = domainEnd + HALF_STEP_HOURS;
  const surfTicks = useMemo(
    () =>
      buildYAxisTicks(
        chartData.map((d) => d.surf),
        0,
        4,
        0.2,
        5
      ),
    [chartData]
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
      const minTick = surfTicks[0] ?? 0;
      const maxTick = surfTicks[surfTicks.length - 1] ?? minTick;
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
    [surfTicks]
  );

  const yAxisInsetPx = CHART_LEFT_MARGIN + Y_AXIS_WIDTH;
  const plotWidthPx = useMemo(
    () => Math.max(0, containerWidth - yAxisInsetPx - CHART_RIGHT_MARGIN),
    [containerWidth, yAxisInsetPx]
  );
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

    const update = () => {
      const next = hoveredHourRef.current;
      if (next == null) return;
      setTouchHandleHour((prev) => (prev === next ? prev : next));
    };

    update();
    return subscribeToHover(update);
  }, [hoveredHourRef, isTouchHandleMode, subscribeToHover]);
  const shadingBackground = useMemo(
    () =>
      buildForecastShadingBackground({
        dayAreas,
        nightAreas,
        domainMin,
        domainMax,
        // Stop the shading at the last X value (exclude the right margin reserved for label breathing room).
        chartWidthPx: Math.max(0, containerWidth - CHART_RIGHT_MARGIN),
        plotLeftPx: yAxisInsetPx,
        plotWidthPx,
        dayColor: chartTheme.dayShading,
        nightColor: chartTheme.nightShading,
        opacity: chartTheme.shadingOpacity,
      }),
    [
      dayAreas,
      nightAreas,
      domainMin,
      domainMax,
      containerWidth,
      yAxisInsetPx,
      plotWidthPx,
      chartTheme.dayShading,
      chartTheme.nightShading,
      chartTheme.shadingOpacity,
    ]
  );

  const hourTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let v = 0; v <= hours; v += DATA_STEP_HOURS) {
      ticks.push(v);
    }
    return ticks;
  }, [hours]);

  const centerDomainHour = useCallback(
    (hour: number | null) => {
      if (hour == null) return null;
      const quantized = Math.round(hour / DATA_STEP_HOURS) * DATA_STEP_HOURS;
      const minX = domainMin + HALF_STEP_HOURS;
      const maxX = Math.max(minX, domainMax - HALF_STEP_HOURS);
      return Math.min(maxX, Math.max(minX, quantized));
    },
    [domainMin, domainMax]
  );

  const centeredSelectedHour = centerDomainHour(selectedHour);
  const lastHoveredRef = React.useRef<number | null>(null);
  const hoverRafRef = React.useRef<number | null>(null);
  const pendingHoverRef = React.useRef<number | null>(null);

  const handleMouseMove = (e: ChartMouseEvent) => {
    if (e && e.activeLabel !== undefined) {
      const labelValue = Number(e.activeLabel);
      if (!isNaN(labelValue)) {
        const normalized =
          Math.round(labelValue / DATA_STEP_HOURS) * DATA_STEP_HOURS;
        const clamped = Math.min(domainEnd, Math.max(domainStart, normalized));
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
    if (hoverRafRef.current) {
      cancelAnimationFrame(hoverRafRef.current);
      hoverRafRef.current = null;
    }
    pendingHoverRef.current = null;
    lastHoveredRef.current = null;
    setHoveredHour(null);
  };

  const tooltipCursor = useMemo(
    () => ({
      fill: "var(--foreground)",
      fillOpacity: chartTheme.hoverOpacity,
      stroke: "var(--foreground)",
      strokeOpacity: Math.min(0.28, chartTheme.hoverOpacity + 0.08),
      strokeWidth: 1,
    }),
    [chartTheme.hoverOpacity]
  );
  const touchDefaultIndexFromHover = useMemo(() => {
    if (hoveredHour == null || chartData.length === 0) return undefined;
    const quantized =
      Math.round(hoveredHour / DATA_STEP_HOURS) * DATA_STEP_HOURS;
    const clamped = Math.min(domainMax, Math.max(domainMin, quantized));
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < chartData.length; i++) {
      const pointHour = chartData[i]?.hour;
      if (typeof pointHour !== "number") continue;
      const diff = Math.abs(pointHour - clamped);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, [chartData, domainMax, domainMin, hoveredHour]);

  const handleScrub = useCallback(
    (clientX: number, clientY: number) => {
      const host = containerRef.current;
      if (!host) return;
      const bounds = host.getBoundingClientRect();
      const chartX = clientX - bounds.left;
      if (!plotWidthPx) return;
      const plotX = Math.max(
        0,
        Math.min(chartX - yAxisInsetPx, plotWidthPx)
      );
      const t = plotWidthPx > 0 ? plotX / plotWidthPx : 0;
      const hour = domainMin + t * (domainMax - domainMin);
      const quantized = Math.round(hour / DATA_STEP_HOURS) * DATA_STEP_HOURS;
      const clamped = Math.min(domainEnd, Math.max(domainStart, quantized));
      setTouchHandleHour(clamped);
      setHoveredHour(clamped);
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
    [
      domainEnd,
      domainMax,
      domainMin,
      domainStart,
      plotWidthPx,
      setHoveredHour,
      yAxisInsetPx,
    ]
  );

  const handleLeftPx = useMemo(() => {
    if (!isTouchHandleMode || !containerWidth || !plotWidthPx) return null;
    const fallbackHour = chartData[0]?.hour ?? null;
    const rawHour = touchHandleHour ?? selectedHour ?? fallbackHour;
    if (rawHour == null || !Number.isFinite(rawHour)) return null;
    const t = (rawHour - domainMin) / (domainMax - domainMin);
    const plotX = yAxisInsetPx + t * plotWidthPx;
    const clamped = Math.max(
      TOUCH_HANDLE_RADIUS_PX,
      Math.min(containerWidth - TOUCH_HANDLE_RADIUS_PX, plotX)
    );
    return Number.isFinite(clamped) ? clamped : null;
  }, [
    chartData,
    containerWidth,
    domainMax,
    domainMin,
    isTouchHandleMode,
    plotWidthPx,
    selectedHour,
    touchHandleHour,
    yAxisInsetPx,
  ]);

  return (
    <div
      ref={containerRef}
      className="chart-touch-no-select relative aspect-auto h-[250px] @min-3xl:h-[280px] @min-4xl:h-[300px] w-full !justify-start"
      style={{
        overflowX: "hidden",
        overflowY: "hidden",
        height: isTouchHandleMode ? 360 + TOUCH_HANDLE_GUTTER_PX : undefined,
        touchAction: "pan-y",
        overscrollBehavior: "contain",
      }}
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
          backgroundImage: shadingBackground,
          backgroundRepeat: "no-repeat",
          borderRadius: 8,
          pointerEvents: "none",
        }}
      />
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
            <BarChart
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
              domain={[surfTicks[0] ?? 0, surfTicks[surfTicks.length - 1] ?? 6]}
              ticks={surfTicks}
            />
          </BarChart>
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
          className="aspect-auto h-full w-full !justify-start"
        >
            <BarChart
              margin={{
                top: CHART_TOP_MARGIN,
                right: CHART_RIGHT_MARGIN,
                left: yAxisInsetPx,
                bottom: handleGutterPx,
              }}
            accessibilityLayer
            data={chartData}
            barCategoryGap="15%"
            maxBarSize={55}
            syncId="allCharts"
            syncMethod={syncToNearestThirdHour}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--foreground)"
          strokeWidth={0.1}
          vertical={false}
        /> */}
            <XAxis
              dataKey="hour"
              type="number"
              orientation="bottom"
              tickLine={false}
              tickMargin={10}
              fontSize={11}
              axisLine={false}
              height={X_AXIS_SHADE_EXCLUDE_PX}
              // padding={{ left: buffer, right: buffer }}
              domain={[domainMin, domainMax]}
              ticks={hourTicks}
              scale="linear"
              tickFormatter={(value: number) => {
                const num = Number(value);
                if (!Number.isFinite(num)) return "";
                const nearestSlot =
                  Math.round(num / DATA_STEP_HOURS) * DATA_STEP_HOURS;
                const normalized = ((nearestSlot % 24) + 24) % 24;
                const labelHour = normalized % 12 === 0 ? 12 : normalized % 12;
                return String(labelHour);
              }}
            />
            <YAxis
              hide
              width={0}
              dataKey="surf"
              domain={[surfTicks[0] ?? 0, surfTicks[surfTicks.length - 1] ?? 6]}
              ticks={surfTicks}
            />
            {isTouchOnlyDevice ? (
              hoveredHour != null ? (
                <ChartTooltip
                  defaultIndex={touchDefaultIndexFromHover}
                  content={<ChartTooltipContent />}
                  cursor={tooltipCursor}
                  animationDuration={0}
                />
              ) : null
            ) : (
              <ChartTooltip
                content={<ChartTooltipContent />}
                cursor={tooltipCursor}
                animationDuration={0}
              />
            )}
            {/* Hour indicator line */}
            {centeredSelectedHour !== null && (
              <ReferenceLine
                x={centeredSelectedHour}
                stroke="var(--foreground)"
                strokeDasharray="3 3"
              />
            )}
            <Bar
              dataKey="surf"
              fill="var(--color-surf, var(--color-tide))"
              radius={6}
              // stroke="#0000006e"
              // strokeWidth={0.5}
              minPointSize={15}
              isAnimationActive={false}
              animationDuration={0}
              animationBegin={0}
            >
              <LabelList
                dataKey="surf"
                position="middle"
                content={(props: LabelProps) => {
                  const safeX = typeof props.x === "number" ? props.x : 0;
                  const safeY = typeof props.y === "number" ? props.y : 0;
                  const safeWidth =
                    typeof props.width === "number" ? props.width : 0;
                  const safeHeight =
                    typeof props.height === "number" ? props.height : 0;
                  const fontSize = Math.max(10, safeWidth * 0.15);
                  const label =
                    typeof props.value === "number"
                      ? props.value.toFixed(1)
                      : "";

                  // Get color based on surf value
                  const surfValue =
                    typeof props.value === "number" ? props.value : 0;
                  const barColor = getSurfColor(surfValue);
                  // const surfLabel =
                  //   containerWidth > 400 ? label : Math.round(Number(label));

                  if (label) {
                    return (
                      <g>
                        {/* Render the colored bar */}
                        <rect
                          x={safeX}
                          y={safeY}
                          width={safeWidth}
                          height={safeHeight}
                          fill={barColor}
                          rx={6}
                          // stroke="#0000006e"
                          // strokeWidth={0.5}
                        />
                        <text
                          x={safeX + safeWidth / 2}
                          y={safeY + safeHeight / 2 + fontSize / 3}
                          fill="#2c2c2cff"
                          textAnchor="middle"
                          fontWeight="600"
                          fontSize={fontSize}
                        >
                          {label === "0.0" ? "0" : label}
                        </text>
                      </g>
                    );
                  }
                  return null;
                }}
                fill="black"
              />
            </Bar>
          </BarChart>
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

export default React.memo(SurfChart);
