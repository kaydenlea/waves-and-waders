"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  LabelList,
  YAxis,
  LabelProps,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import {
  MousePointer2 as ArrowIcon,
  TrendingUp,
  TrendingDown,
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
import {
  useDateContext,
  useHoveredHour,
} from "@/components/context/DateContext";
import { useSunData } from "@/components/context/SunDataContext";
import { buildSunSegments } from "@/components/graphs/sunSegments";
import { syncToNearestThirdHour } from "@/components/graphs/chartSync";
import { buildYAxisTicks } from "@/components/graphs/yAxisTicks";
import { useForecastWindowData } from "@/lib/hooks/useForecastWindow";
import type { SharedSunSegments } from "./sharedSunSegments";

type Props = {
  beachId?: string;
  hours?: number;
  date?: Date;
  sunSegments?: SharedSunSegments;
};
const chartConfig = {
  wind: {
    label: "Wind (mph)",
    color: "#95c5ffff",
  },
} satisfies ChartConfig;

const DATA_STEP_HOURS = 3;
const HALF_STEP_HOURS = DATA_STEP_HOURS / 2;

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
    <div className="grid rounded-md bg-highlight-5 grid-cols-[60px_1fr] grid-rows-2 gap-y-0.5 items-center text-xs text-muted-foreground uppercase tracking-wide leading-tight px-2 py-1.5">
      <span className="flex gap-2 items-center">
        <TrendingUp
          fill="#353535ff"
          className="stroke-muted-foreground w-4 h-4"
        />
        <span className="block font-medium">High</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {highWind ?? "--"} <span className="inline-block">mph</span>
      </span>
      <span className="flex gap-2 items-center">
        <TrendingDown
          fill="#353535ff"
          className="stroke-muted-foreground w-4 h-4"
        />
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
  const hoveredHour = useHoveredHour();
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2?: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );
  const [buffer, setBuffer] = useState<number>(0);
  const [width, setWidth] = useState<number>(0);
  const chartRef = React.useRef<HTMLDivElement>(null);

  const { rows: forecastRows, start: windowStart } = useForecastWindowData({
    beachId,
    hours,
    date,
  });
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
    const chart = chartRef.current;
    if (!chart) return;

    const adjustData = () => {
      const width = chart.clientWidth;
      setWidth(width);
      setBuffer(0);
    };

    const observer = new ResizeObserver(adjustData);
    observer.observe(chart);

    adjustData();

    return () => observer.disconnect();
  }, []);

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
      const quantized =
        Math.round(hour / DATA_STEP_HOURS) * DATA_STEP_HOURS;
      const minX = domainMin + HALF_STEP_HOURS;
      const maxX = Math.max(minX, domainMax - HALF_STEP_HOURS);
      return Math.min(maxX, Math.max(minX, quantized + HALF_STEP_HOURS));
    },
    [domainMin, domainMax]
  );

  const centeredSelectedHour = centerDomainHour(selectedHour);
  const centeredHoveredHour =
    hoveredHour !== null ? centerDomainHour(hoveredHour) : null;

  // const EDGE_GUTTER_PX = 35;
  const closeTo = (a: number, b: number, tolerance = 0.05) =>
    Math.abs(a - b) <= tolerance;
  const windTicks = useMemo(
    () =>
      buildYAxisTicks(
        chartData.map((d) => d.wind),
        0,
        6,
        0.2,
        10
      ),
    [chartData]
  );
  const formatHourLabel = useCallback((label: unknown, payload: any[]) => {
    let hour = payload?.[0]?.payload?.hour;
    if (typeof hour !== "number" && typeof label === "number") {
      hour = label;
    }
    if (typeof hour !== "number") return "";
    const nearestSlot =
      Math.round(hour / DATA_STEP_HOURS) * DATA_STEP_HOURS;
    const normalized = ((nearestSlot % 24) + 24) % 24;
    const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;
    const ampm = normalized >= 12 ? "PM" : "AM";
    return `${displayHour} ${ampm}`;
  }, []);
  const formatWindTooltipValue = useCallback(
    (value: number, _name: string, item: any) => {
      const direction = item?.payload?.direction;
      const directionLabel = getWindDirection(
        typeof direction === "number" ? direction : 0
      );
      const dirText =
        typeof direction === "number"
          ? `${directionLabel} (${Math.round(direction)}°)`
          : directionLabel;
      const speed = Number.isFinite(value) ? Math.round(value) : value ?? "--";
      return (
        <div className="flex flex-col items-end gap-0.5 text-right">
          <span className="font-semibold">{`${speed} mph`}</span>
          <span className="text-[0.72rem] text-muted-foreground">{dirText}</span>
        </div>
      );
    },
    [getWindDirection]
  );
  const makeAreaShape = (
    color: string,
    touchesLeft: boolean,
    touchesRight: boolean
  ) => {
    const AreaShape = (props: any) => {
      const x = typeof props.x === "number" ? props.x : 0;
      const y = typeof props.y === "number" ? props.y : 0;
      const width = typeof props.width === "number" ? props.width : 0;
      const height = typeof props.height === "number" ? props.height : 0;
      const leftPad = touchesLeft ? buffer : 0;
      const rightPad = touchesRight ? buffer : 0;
      return (
        <rect
          x={x - leftPad}
          y={y}
          width={width + leftPad + rightPad}
          height={height}
          fill={color}
          fillOpacity={0.2}
          pointerEvents="none"
        />
      );
    };

    AreaShape.displayName = `AreaShape(${color})`;
    return AreaShape;
  };

  const lastHoveredRef = React.useRef<number | null>(null);

  const handleMouseMove = (e: any) => {
    if (e && e.activeLabel !== undefined) {
      const labelValue = Number(e.activeLabel);
      if (!isNaN(labelValue)) {
        const normalized =
          Math.round(labelValue / DATA_STEP_HOURS) * DATA_STEP_HOURS;
        const clamped = Math.min(domainEnd, Math.max(domainStart, normalized));
        if (lastHoveredRef.current !== clamped) {
          lastHoveredRef.current = clamped;
          setHoveredHour(clamped);
        }
      }
    }
  };

  const handleMouseLeave = () => {
    lastHoveredRef.current = null;
    setHoveredHour(null);
  };

  const renderTooltipCursor = useCallback((cursorProps: any) => {
    if (!cursorProps) return null;
    const baseX =
      typeof cursorProps.x === "number"
        ? cursorProps.x
        : cursorProps?.points?.[0]?.x;
    const width = typeof cursorProps.width === "number" ? cursorProps.width : 0;
    const y = typeof cursorProps.y === "number" ? cursorProps.y : 0;
    const height =
      typeof cursorProps.height === "number" ? cursorProps.height : 0;
    if (typeof baseX !== "number" || height <= 0) {
      return null;
    }
    const cx = baseX + width / 2;
    return (
      <line
        x1={cx}
        x2={cx}
        y1={y}
        y2={y + height}
        stroke="var(--foreground)"
        strokeWidth={0.75}
        strokeDasharray="3 3"
        strokeOpacity={0.5}
      />
    );
  }, []);

  return (
    <ChartContainer
      ref={chartRef}
      config={chartConfig}
      className="aspect-auto h-[250px] @min-3xl:h-[280px] @min-4xl:h-[300px] w-full mb-3"
    >
      <BarChart
        margin={{ top: 10, right: 15, left: -30, bottom: 0 }}
        accessibilityLayer
        data={chartData}
        barCategoryGap="15%"
        maxBarSize={40}
        syncId="allCharts"
        syncMethod={syncToNearestThirdHour}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {dayAreas.map((area, idx) => {
          const x1 = area.x1 <= 0 ? domainMin : area.x1;
          const x2 = (area.x2 ?? hours) >= hours ? domainMax : (area.x2 ?? hours);
          return (
            <ReferenceArea
              key={`day-${idx}`}
              x1={x1}
              x2={x2}
              fill="#FFE58F"
              fillOpacity={0.2}
            />
          );
        })}
        {nightAreas.map((area, idx) => {
          const x1 = area.x1 <= 0 ? domainMin : area.x1;
          const x2 = (area.x2 ?? hours) >= hours ? domainMax : (area.x2 ?? hours);
          return (
            <ReferenceArea
              key={`night-${idx}`}
              x1={x1}
              x2={x2}
              fill="#ccc1ffff"
              fillOpacity={0.2}
            />
          );
        })}
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
          dataKey="wind"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
          domain={[windTicks[0] ?? 0, windTicks[windTicks.length - 1] ?? 20]}
          ticks={windTicks}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              className="min-w-[14rem]"
              labelFormatter={formatHourLabel}
              formatter={formatWindTooltipValue as any}
            />
          }
          cursor={renderTooltipCursor as any}
          animationDuration={0}
        />
        {/* Hour indicator line */}
        {centeredSelectedHour !== null && (
          <ReferenceLine
            x={centeredSelectedHour}
            stroke="var(--foreground)"
            strokeDasharray="3 3"
          />
        )}
        {/* Hover indicator line - always rendered to avoid re-mount */}
        {centeredHoveredHour !== null && (
          <ReferenceLine
            x={centeredHoveredHour}
            stroke="var(--foreground)"
            strokeWidth={1}
            strokeOpacity={
              centeredSelectedHour === null ||
              centeredHoveredHour !== centeredSelectedHour
                ? 0.5
                : 0
            }
            strokeDasharray="5 5"
          />
        )}
        <Bar
          dataKey="wind"
          fill="var(--color-wind)"
          radius={4}
          stroke="#0000006e"
          strokeWidth={0.5}
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
                <g>
                  <title>{`Wind Direction: ${directionLabel} (${Math.round(
                    direction
                  )}Â°)`}</title>
                  <g transform={`translate(${centerX}, ${centerY})`}>
                    <g transform={`rotate(${rotation}, 0, 0)`}>
                      <ArrowIcon
                        size={iconSize}
                        x={-iconSize / 2}
                        y={-iconSize / 2}
                        // fill="#8bd668ff"
                        // color="#8bd668ff"
                        className="fill-foreground/20 text-foreground/50"
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
                      rx={4}
                      stroke="#0000006e"
                      strokeWidth={0.5}
                    />
                    <text
                      x={safeX + safeWidth / 2}
                      y={safeY + safeHeight / 2 + fontSize / 3}
                      fill="#2c2c2cff"
                      textAnchor="middle"
                      fontWeight="bold"
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
  );
};

export default React.memo(WindChart);
