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
import { TrendingUp, TrendingDown } from "lucide-react";
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
import {
  useDateContext,
  useHoveredHour,
} from "@/components/context/DateContext";
import { useSunData } from "@/components/context/SunDataContext";
import { buildSunSegments } from "@/components/graphs/sunSegments";
import { syncToNearestThirdHour } from "@/components/graphs/chartSync";
import { buildYAxisTicks } from "@/components/graphs/yAxisTicks";
import type { SharedSunSegments } from "./sharedSunSegments";

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

const chartConfig = {
  surf: {
    label: "Surf (ft)",
    color: "#95c5ffff",
  },
} satisfies ChartConfig;

const DATA_STEP_HOURS = 3;
const HALF_STEP_HOURS = DATA_STEP_HOURS / 2;

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
    <div className="grid rounded-md bg-highlight-5 grid-cols-[60px_1fr] grid-rows-2 gap-y-0.5 items-center text-xs text-muted-foreground uppercase tracking-wide leading-tight px-2 py-1.5">
      <span className="flex gap-2 items-center">
        <TrendingUp
          fill="#353535ff"
          className="stroke-muted-foreground w-4 h-4"
        />
        <span className="block font-medium">High</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {highSurf ?? "--"} <span className="inline-block">ft</span>
      </span>
      <span className="flex gap-2 items-center">
        <TrendingDown
          fill="#353535ff"
          className="stroke-muted-foreground w-4 h-4"
        />
        <span className="block -mb-0.5 font-medium">Low</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {lowSurf ?? "--"} <span className="inline-block">ft</span>
      </span>
    </div>
  );
};

const SurfChart = ({ beachId, hours = 24, date, sunSegments }: Props) => {
  const { hour: selectedHour, setHoveredHour } = useDateContext();
  const { getSunData } = useSunData();
  const hoveredHour = useHoveredHour();
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]); // sunrise-sunset (hours)
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );

  const [buffer, setBuffer] = useState<number>(0);
  const [width, setWidth] = useState<number>(0);
  const chartRef = React.useRef<HTMLDivElement>(null);

  const { rows: forecastRows, start: windowStart } = useForecastWindowData({
    beachId,
    date,
    hours,
  });

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
      const rounded =
        Math.round(rawHour / DATA_STEP_HOURS) * DATA_STEP_HOURS;
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
        6,
        0.2,
        5
      ),
    [chartData]
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

    // Assign a display name for debugging & ESLint
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
      className="aspect-auto h-[250px] @min-3xl:h-[280px] @min-4xl:h-[300px] w-full !justify-start mb-3"
    >
      <BarChart
        margin={{
          top: 10,
          right: 15,
          left: -30,
          bottom: 0,
        }}
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
          const x2 = area.x2 >= hours ? domainMax : area.x2;
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
          dataKey="surf"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
          domain={[surfTicks[0] ?? 0, surfTicks[surfTicks.length - 1] ?? 6]}
          ticks={surfTicks}
        />
        <ChartTooltip
          content={<ChartTooltipContent />}
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
          dataKey="surf"
          fill="var(--color-surf, var(--color-tide))"
          radius={4}
          stroke="#0000006e"
          strokeWidth={0.5}
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
                typeof props.value === "number" ? props.value.toFixed(1) : "";

              // Get color based on surf value
              const surfValue =
                typeof props.value === "number" ? props.value : 0;
              const barColor = getSurfColor(surfValue);
              const surfLabel = width > 400 ? label : Math.round(Number(label));

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
                      {label === "0.0" ? "0" : surfLabel}
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
  );
};

export default React.memo(SurfChart);
