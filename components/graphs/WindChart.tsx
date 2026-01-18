"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
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
import {
  MousePointer2 as ArrowIcon,
  TrendingUp,
  TrendingDown,
  Wind as WindIcon,
} from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { getPacificHour } from "@/lib/utils";
import { getWindDirection } from "@/lib/supabase";
import { useDateContext } from "@/components/context/DateContext";
import { useSunData } from "@/components/context/SunDataContext";
import { buildSunSegments } from "@/components/graphs/sunSegments";
import { syncToNearestThirdHour } from "@/components/graphs/chartSync";
import { buildYAxisTicks } from "@/components/graphs/yAxisTicks";
import { useForecastWindowData } from "@/lib/hooks/useForecastWindow";
import { useChartTheme } from "@/components/graphs/useChartTheme";
import { buildForecastShadingBackground } from "@/components/graphs/forecastShadingBackground";
import { useOptionalOverviewChartLoading } from "@/components/context/OverviewChartsLoadingContext";
import type { SharedSunSegments } from "./sharedSunSegments";

type Props = {
  beachId?: string;
  hours?: number;
  date?: Date;
  sunSegments?: SharedSunSegments;
};
type YAxisTickProps = {
  x?: number;
  y?: number;
  payload?: { value?: number | string };
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
const WindTooltipIcon = () => <WindIcon className="h-3 w-3" />;

const chartConfig = {
  wind: {
    label: "Wind",
    color: "#a78bfa",
    icon: WindTooltipIcon,
  },
} satisfies ChartConfig;

const DATA_STEP_HOURS = 3;
const HALF_STEP_HOURS = DATA_STEP_HOURS / 2;

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

export const WindStatsHeader = ({
  beachId,
  hours = 24,
  date,
}: {
  beachId?: string;
  hours?: number;
  date?: Date;
}) => {
  const { rows } = useForecastWindowData({ beachId, hours, date });
  const { highWind, lowWind } = React.useMemo(() => {
    if (!beachId || !rows.length) {
      return { highWind: null, lowWind: null };
    }
    const windValues = rows
      .map((r) => r.conditions.windSpeed)
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
    if (!windValues.length) {
      return { highWind: null, lowWind: null };
    }
    return {
      highWind: Math.max(...windValues).toFixed(0),
      lowWind: Math.min(...windValues).toFixed(0),
    };
  }, [beachId, rows]);

  return (
    <div className="grid grid-cols-[60px_1fr] grid-rows-2 gap-y-0.5 items-center rounded-xl border border-border/25 bg-highlight-7/70 px-2.5 py-2 text-xs uppercase tracking-wide leading-tight text-muted-foreground shadow-even supports-[backdrop-filter]:bg-highlight-7/40 supports-[backdrop-filter]:backdrop-blur-md">
      <span className="flex gap-2 items-center">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <span className="block font-medium">High</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {highWind ?? "--"} <span className="inline-block">mph</span>
      </span>
      <span className="flex gap-2 items-center">
        <TrendingDown className="h-4 w-4 text-muted-foreground" />
        <span className="block -mb-0.5 font-medium">Low</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {lowWind ?? "--"} <span className="inline-block">mph</span>
      </span>
    </div>
  );
};

const WindChart = ({ beachId, hours = 24, date, sunSegments }: Props) => {
  const { hour: selectedHour, setHoveredHour } = useDateContext();
  const { getSunData } = useSunData();
  const chartTheme = useChartTheme();
  const { setReady: setOverviewReady } =
    useOptionalOverviewChartLoading("overview-wind");
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2?: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

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
  const domainStart = 0;
  const domainEnd = hours;
  const domainMin = -HALF_STEP_HOURS;
  const domainMax = domainEnd + HALF_STEP_HOURS;

  const placeholderData = useMemo(() => {
    const count = Math.max(1, Math.ceil(hours / DATA_STEP_HOURS) + 1);
    return Array.from({ length: count }, (_, idx) => {
      const rawHour = Math.min(hours, idx * DATA_STEP_HOURS);
      return {
        hour: rawHour,
        wind: Number(
          Math.max(
            0,
            3 + Math.sin(((rawHour % 24) / 24) * Math.PI * 2) * 2
          ).toFixed(1)
        ),
        direction: (rawHour * 15) % 360,
      };
    });
  }, [hours]);

  const chartData = useMemo(() => {
    if (!beachId) {
      return placeholderData;
    }
    if (!forecastRows.length) {
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

    const mapped = trimmedRows.map((row) => {
      const roundedHour =
        Math.round(getPacificHour(row.timestamp) / DATA_STEP_HOURS) *
        DATA_STEP_HOURS;
      const centeredHour = Math.min(hours, Math.max(0, roundedHour));
      return {
        hour: centeredHour,
        wind: Math.round(row.conditions.windSpeed ?? 0),
        direction: row.conditions.windDirection ?? undefined,
      };
    });

    const last = mapped[mapped.length - 1];
    if (last && last.hour < hours) {
      mapped.push({ ...last, hour: hours });
    }

    return mapped;
  }, [beachId, forecastRows, hours, placeholderData]);

  // Function to get color based on wind speed intensity
  const getWindColor = (value: number): string => {
    // Define thresholds and colors (light to dark blue)
    if (value >= 20) return "#74b0ffff"; // Very dark blue for 20+ mph
    if (value >= 15) return "#86bbffff"; // Dark blue for 15-20 mph
    if (value >= 10) return "#9ccaffff"; // Medium blue for 10-15 mph
    return "#b8d9ffff"; // Light blue for < 10 mph
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
  }, [overviewReady, setOverviewReady]);

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

  const hourTicks = useMemo(() => {
    return Array.from(
      { length: Math.floor(hours / DATA_STEP_HOURS) + 1 },
      (_, i) => Math.min(hours, i * DATA_STEP_HOURS)
    );
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
  const windTicks = useMemo(
    () =>
      buildYAxisTicks(
        chartData.map((d) => d.wind),
        0,
        4,
        0.2,
        10
      ),
    [chartData]
  );
  const yAxisTick = React.useCallback(
    (props: YAxisTickProps) => {
      const { x, y, payload, textAnchor, fontSize } = props ?? {};
      const xNum = typeof x === "number" ? x : Number(x);
      const yNum = typeof y === "number" ? y : Number(y);
      if (!Number.isFinite(xNum) || !Number.isFinite(yNum)) return <text />;

      const value = payload?.value;
      const minTick = windTicks[0] ?? 0;
      const maxTick = windTicks[windTicks.length - 1] ?? minTick;
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
          textAnchor={textAnchor ?? "end"}
          dominantBaseline="central"
          fontSize={typeof fontSize === "number" ? fontSize : 11}
          {...Y_AXIS_TICK}
        >
          {value}
        </text>
      );
    },
    [windTicks]
  );

  const yAxisInsetPx = CHART_LEFT_MARGIN + Y_AXIS_WIDTH;
  const plotWidthPx = useMemo(
    () => Math.max(0, containerWidth - yAxisInsetPx - CHART_RIGHT_MARGIN),
    [containerWidth, yAxisInsetPx]
  );
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
  const formatHourLabel = useCallback(
    (label: unknown, payload: TooltipPayload) => {
      let hour = payload?.[0]?.payload?.hour;
      if (typeof hour !== "number" && typeof label === "number") {
        hour = label;
      }
      if (typeof hour !== "number") return "";
      const nearestSlot = Math.round(hour / DATA_STEP_HOURS) * DATA_STEP_HOURS;
      const normalized = ((nearestSlot % 24) + 24) % 24;
      const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;
      const ampm = normalized >= 12 ? "PM" : "AM";
      return `${displayHour} ${ampm}`;
    },
    []
  );
  const formatWindTooltipValue = useCallback(
    (value: TooltipValue, _name: string | number, item: TooltipItem) => {
      const direction = item?.payload?.direction;
      const directionLabel = getWindDirection(
        typeof direction === "number" ? direction : 0
      );
      const dirText =
        typeof direction === "number"
          ? `${directionLabel} (${Math.round(direction)}°)`
          : directionLabel;
      const numericValue =
        typeof value === "number"
          ? value
          : typeof value === "string"
          ? Number(value)
          : Number.NaN;
      const speed = Number.isFinite(numericValue)
        ? Math.round(numericValue)
        : Array.isArray(value)
        ? value.join(", ")
        : value ?? "--";
      const dirTextDisplay = dirText
        .replaceAll("\u00C2\u00B0", "\u00B0")
        .replaceAll("A\u0173", "\u00B0")
        .replaceAll("Aų", "\u00B0")
        .replaceAll("\u0173", "\u00B0");
      return (
        <div className="grid justify-items-end gap-1 text-right">
          <div className="bg-foreground/10 text-foreground inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium tabular-nums">
            <span className="inline-flex items-baseline gap-1">
              <span className="text-xs font-semibold leading-none">
                {speed}
              </span>
              <span className="text-[0.68rem] font-medium leading-none text-muted-foreground">
                mph
              </span>
            </span>
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
          </div>
          <div className="text-[0.65rem] leading-none text-muted-foreground">
            {dirTextDisplay}
          </div>
        </div>
      );
    },
    [getWindDirection]
  );

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

  return (
    <div
      ref={containerRef}
      className="chart-touch-no-select relative aspect-auto h-[250px] @min-3xl:h-[280px] @min-4xl:h-[300px] w-full"
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
          <BarChart
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
                windTicks[0] ?? 0,
                windTicks[windTicks.length - 1] ?? 20,
              ]}
              ticks={windTicks}
            />
          </BarChart>
        </ChartContainer>
      </div>

      <div style={{ position: "relative", zIndex: 1, height: "100%" }}>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-full w-full"
        >
          <BarChart
            margin={{
              top: CHART_TOP_MARGIN,
              right: CHART_RIGHT_MARGIN,
              left: yAxisInsetPx,
              bottom: 0,
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
              dataKey="wind"
              domain={[
                windTicks[0] ?? 0,
                windTicks[windTicks.length - 1] ?? 20,
              ]}
              ticks={windTicks}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              cursor={tooltipCursor}
              animationDuration={0}
              isAnimationActive={false}
            />
            {/* <ChartTooltip
              content={
                <ChartTooltipContent
                  className="min-w-[14rem]"
                  labelFormatter={formatHourLabel}
                  formatter={formatWindTooltipValue}
                />
              }
              cursor={tooltipCursor}
              animationDuration={0}
            /> */}
            {/* Hour indicator line */}
            {centeredSelectedHour !== null && (
              <ReferenceLine
                x={centeredSelectedHour}
                stroke="var(--foreground)"
                strokeDasharray="3 3"
                isFront={false}
              />
            )}
            <Bar
              dataKey="wind"
              fill="var(--color-wind)"
              radius={6}
              // stroke="#0000006e"
              // strokeWidth={0.5}
              minPointSize={15}
              isAnimationActive={false}
              animationDuration={0}
              animationBegin={0}
            >
              <LabelList
                dataKey="wind"
                position="top"
                content={(props: LabelProps) => {
                  const safeX = typeof props.x === "number" ? props.x : 0;
                  const safeY = typeof props.y === "number" ? props.y : 0;
                  const safeWidth =
                    typeof props.width === "number" ? props.width : 0;
                  const safeHeight =
                    typeof props.height === "number" ? props.height : 0;
                  const iconSize = Math.min(20, safeWidth * 0.8);

                  // Get wind direction from the data point
                  const dataPoint = chartData[props.index ?? 0];
                  const direction = dataPoint?.direction ?? 0;
                  const directionLabel = getWindDirection(direction);
                  // Arrow points at 315Â° by default, adjust rotation
                  const rotation = direction - 315;

                  // Calculate center point for rotation - position on top of bar
                  const centerX = safeX + safeWidth / 2;
                  const centerY = safeY - iconSize / 2 - 7; // Position above the bar

                  return (
                    <g pointerEvents="none">
                      <g transform={`translate(${centerX}, ${centerY})`}>
                        <g transform={`rotate(${rotation}, 0, 0)`}>
                          <ArrowIcon
                            size={iconSize}
                            x={-iconSize / 2}
                            y={-iconSize / 2}
                            className="fill-[#CECECE] dark:fill-[#606060] text-foreground/50"
                          />
                        </g>
                      </g>
                    </g>
                  );
                }}
              />
              <LabelList
                dataKey="wind"
                position="middle"
                content={(props: LabelProps) => {
                  const safeX = typeof props.x === "number" ? props.x : 0;
                  const safeY = typeof props.y === "number" ? props.y : 0;
                  const safeWidth =
                    typeof props.width === "number" ? props.width : 0;
                  const safeHeight =
                    typeof props.height === "number" ? props.height : 0;
                  const fontSize = Math.max(10, safeWidth * 0.15);

                  // Get color based on wind value
                  const windValue =
                    typeof props.value === "number" ? props.value : 0;
                  const barColor = getWindColor(windValue);

                  if (typeof props.value === "number") {
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
                          {`${Math.round(props.value)}`}
                        </text>
                      </g>
                    );
                  }
                }}
                fill="black"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
};

export default React.memo(WindChart);
