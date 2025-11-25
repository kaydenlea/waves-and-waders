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
import { useSunData } from "@/components/context/SunDataContext";
import { buildSunSegments } from "@/components/graphs/sunSegments";
import { syncToNearestThirdHour } from "@/components/graphs/chartSync";
import { useForecastWindowData } from "@/lib/hooks/useForecastWindow";
import type { SharedSunSegments } from "./sharedSunSegments";

const chartConfig = {
  energy: {
    label: "Energy (kJ)",
    color: "#616161ff",
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

const HOURS_TO_MS = 60 * 60 * 1000;

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
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2: number }[]>(
    []
  );
  const { rows: forecastRows, start: windowStart } = useForecastWindowData({
    beachId,
    date,
    hours,
  });
  const windowStartMs = windowStart.getTime();

  const placeholderSeries = useMemo(
    () => [
      { hour: 0, energy: 1 },
      { hour: 3, energy: 2 },
      { hour: 6, energy: 2 },
      { hour: 9, energy: 3 },
      { hour: 12, energy: 2 },
      { hour: 15, energy: 3 },
      { hour: 18, energy: 2 },
      { hour: 21, energy: 1 },
    ],
    []
  );

  const series = useMemo<EnergyPoint[]>(() => {
    if (!beachId) {
      return placeholderSeries;
    }
    if (!forecastRows.length) {
      return [];
    }
    return forecastRows.map((r) => ({
      hour: Math.max(
        0,
        Math.min(
          hours,
          (new Date(r.timestamp).getTime() - windowStartMs) / HOURS_TO_MS
        )
      ),
      energy: r.surf.waveEnergy ?? 0,
    }));
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

  const stops = useMemo(
    () => buildTrendStops(series, "var(--green)", "var(--red)"),
    [series]
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
      className="aspect-auto h-[250px] @min-3xl:h-[280px] @min-4xl:h-[300px] w-full [&_.recharts-legend-wrapper]:hidden mb-3"
    >
      <AreaChart
        accessibilityLayer
        data={series}
        margin={{
          top: 10,
          right: 15,
          left: -30,
        }}
        syncId="allCharts"
        syncMethod={syncToNearestThirdHour}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {dayAreas.map((area, idx) => (
          <ReferenceArea
            key={`day-${idx}`}
            x1={area.x1}
            x2={area.x2}
            fill="#FFE58F"
            fillOpacity={0.2}
          />
        ))}
        {nightAreas.map((area, idx) => (
          <ReferenceArea
            key={`night-${idx}`}
            x1={area.x1}
            x2={area.x2}
            fill="#ccc1ffff"
            fillOpacity={0.2}
          />
        ))}
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
          ticks={hourTicks}
          tickFormatter={(value) =>
            value % 3 === 0
              ? (value % 12 === 0 ? 12 : value % 12).toString()
              : ""
          }
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
          domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.5)]}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <defs>
          <linearGradient id="splitColor" x1="0" y1="0" x2="1" y2="0">
            {/* <stop offset={off} stopColor="green" stopOpacity={1} />
            <stop offset={off} stopColor="red" stopOpacity={1} /> */}
            {stops.map((s, i) => (
              <stop
                key={i}
                offset={s.offset}
                stopColor={s.color}
                stopOpacity={0.7}
              />
            ))}
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="energy"
          stackId="1"
          stroke="#818181ff"
          //   fill="#adf1ffff"
          fill="url(#splitColor)"
          fillOpacity={1}
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
  );
};

export default React.memo(WaveEnergyChart);
