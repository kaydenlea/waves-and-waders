"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import {
  applyForecastShadingOpacity,
  buildForecastPlotShadingBackgroundPercent,
} from "@/components/graphs/forecastShadingBackground";

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
const CHART_RIGHT_MARGIN = 10;
const Y_AXIS_WIDTH = 30;
const X_AXIS_SHADE_EXCLUDE_PX = 34;
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
  const { rows: forecastRows, start: windowStart } = useForecastWindowData({
    beachId,
    date,
    hours,
  });
  const windowStartMs = windowStart.getTime();

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
        console.error("Failed to load wave energy", e);
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
          textAnchor={textAnchor ?? "end"}
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

  const handleMouseMove = (e: ChartMouseEvent) => {
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
    <div className="relative aspect-auto h-[250px] @min-3xl:h-[280px] @min-4xl:h-[300px] w-full [&_.recharts-legend-wrapper]:hidden">
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
                const offsetHeight = typeof offset?.height === "number" ? offset.height : 0;
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
            <ChartTooltip
              content={<ChartTooltipContent />}
              cursor={{
                stroke: "var(--foreground)",
                strokeWidth: 1,
                strokeDasharray: "3 3",
                strokeOpacity: 0.5,
              }}
              animationDuration={0}
              isAnimationActive={false}
            />
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
      </div>
    </div>
  );
};

export default React.memo(WaveEnergyChart);
