"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
  AreaChart,
  Area,
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
import { useChartTheme } from "@/components/graphs/useChartTheme";

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
          typeof v === "number" && !Number.isNaN(v) && v !== null
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
  const hoveredHour = useHoveredHour();
  const chartTheme = useChartTheme();
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );

  const formatHourLabel = React.useCallback(
    (label: unknown, payload: any[]) => {
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
    []
  );

  const formatSwellTooltipValue = React.useCallback(
    (value: number, _name: string, item: any) => {
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
      const heightValue =
        typeof value === "number" ? value.toFixed(1) : `${value ?? "--"}`;
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
    []
  );

  const { rows: forecastRows, start: windowStart } = useForecastWindowData({
    beachId,
    hours,
    date,
  });
  const windowStartMs = windowStart.getTime();

  const placeholderData = useMemo(
    () =>
      Array.from({ length: 9 }, (_, idx) => {
        const time = idx * 3;
        return {
          time,
          primary: Number((2 + Math.sin((time / 24) * Math.PI)).toFixed(1)),
          secondary: Number((1 + Math.cos((time / 24) * Math.PI)).toFixed(1)),
          tertiary: Number(
            (0.5 + Math.sin((time / 12) * Math.PI) * 0.3).toFixed(1)
          ),
          primaryDir: (time * 15) % 360,
          secondaryDir: (time * 20) % 360,
          tertiaryDir: (time * 25) % 360,
          primaryPeriod: Math.round(12 + Math.sin((time / 24) * Math.PI) * 2),
          secondaryPeriod: Math.round(10 + Math.cos((time / 24) * Math.PI) * 2),
          tertiaryPeriod: Math.round(8 + Math.sin((time / 12) * Math.PI) * 1),
        };
      }),
    []
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
            (v): v is number => typeof v === "number" && Number.isFinite(v)
          ),
        0,
        6,
        0.2
      ),
    [data]
  );

  const lastHoveredRef = React.useRef<number | null>(null);

  const handleMouseMove = (e: any) => {
    if (e && e.activeLabel !== undefined) {
      const hour = Number(e.activeLabel);
      if (!isNaN(hour)) {
        // Only update if the hour changed (throttle updates)
        if (lastHoveredRef.current !== hour) {
          lastHoveredRef.current = hour;
          setHoveredHour(hour);
        }
      }
    }
  };

  const handleMouseLeave = () => {
    lastHoveredRef.current = null;
    setHoveredHour(null);
  };

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[250px] @min-3xl:h-[280px] @min-4xl:h-[300px] w-full"
    >
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{
          top: 10,
          right: 15,
          left: -25,
        }}
        syncId="allCharts"
        syncMethod={syncToNearestThirdHour}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {dayAreas.map((a, idx) => (
          <ReferenceArea
            key={`day-${idx}`}
            x1={a.x1}
            x2={a.x2}
            fill={chartTheme.dayShading}
            fillOpacity={chartTheme.shadingOpacity}
          />
        ))}
        {nightAreas.map((a, idx) => (
          <ReferenceArea
            key={`night-${idx}`}
            x1={a.x1}
            x2={a.x2}
            fill={chartTheme.nightShading}
            fillOpacity={chartTheme.shadingOpacity}
          />
        ))}
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
          ticks={hourTicks}
          tickFormatter={(value) =>
            value % 3 === 0
              ? (value % 12 === 0 ? 12 : value % 12).toString()
              : ""
          }
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
          domain={[swellTicks[0] ?? 0, swellTicks[swellTicks.length - 1] ?? 6]}
          ticks={swellTicks}
        />
        {/* <ChartLegend content={<ChartLegendContent />} /> */}
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={formatHourLabel}
              formatter={formatSwellTooltipValue as any}
            />
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

        <Area
          type="monotone"
          dataKey="primary"
          activeDot={false}
          stroke="#023e8a"
          fill="#0077b6"
          strokeWidth={1.5}
          fillOpacity={0.2}
          isAnimationActive={false}
          animationDuration={0}
          animationBegin={0}
          dot={({ payload, cx, cy, index }) => {
            const iconSize = 15;
            const direction = payload.primaryDir ?? 0;
            const rotation = direction - 315; // Arrow points at 315° by default

            return (
              <g key={`primary-${index}`}>
                <g transform={`translate(${cx}, ${cy})`}>
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
          isAnimationActive={false}
          animationDuration={0}
          animationBegin={0}
          dot={({ payload, cx, cy, index }) => {
            const iconSize = 15;
            const direction = payload.secondaryDir ?? 0;
            const rotation = direction - 315;

            return (
              <g key={`secondary-${index}`}>
                <g transform={`translate(${cx}, ${cy})`}>
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
          isAnimationActive={false}
          animationDuration={0}
          animationBegin={0}
          dot={({ payload, cx, cy, index }) => {
            const iconSize = 15;
            const direction = payload.tertiaryDir ?? 0;
            const rotation = direction - 315;

            return (
              <g key={`tertiary-${index}`}>
                <g transform={`translate(${cx}, ${cy})`}>
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
        {/* Hour indicator line */}
        <ReferenceLine
          x={selectedHour}
          stroke="var(--foreground)"
          // strokeWidth={2}
          strokeDasharray="3 3"
        />
        {/* Hover indicator line - only show when hovering on any chart */}
        {hoveredHour !== null && hoveredHour !== selectedHour && (
          <ReferenceLine
            x={hoveredHour}
            stroke="var(--foreground)"
            strokeWidth={1}
            strokeOpacity={0.5}
            strokeDasharray="5 5"
          />
        )}
      </AreaChart>
    </ChartContainer>
  );
};

export default React.memo(SwellChart);
