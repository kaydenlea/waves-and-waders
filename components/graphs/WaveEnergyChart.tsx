"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceArea,
  AreaChart,
  Area,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  ChartTooltipContent,
} from "@/components/ui/chart";

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

type Props = { beachId?: string; hours?: number };
type EnergyPoint = { time: number; energy: number };

import { fetchBeachForecast } from "@/lib/supabase";

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

const WaveEnergyChart = ({ beachId, hours = 24 }: Props) => {
  const [series, setSeries] = useState<EnergyPoint[]>([]);
  useEffect(() => {
    const load = async () => {
      try {
        if (!beachId) {
          setSeries([
            { time: 0, energy: 1 },
            { time: 3, energy: 2 },
            { time: 6, energy: 2 },
            { time: 9, energy: 3 },
            { time: 12, energy: 2 },
            { time: 15, energy: 3 },
            { time: 18, energy: 2 },
            { time: 21, energy: 1 },
          ]);
          return;
        }
        const start = new Date();
        const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
        const rows = await fetchBeachForecast(beachId, start, end);
        const baseHour = start.getHours();
        setSeries(
          rows.map((r, idx) => ({
            time: (baseHour + idx) % 24,
            energy: r.surf.waveEnergy ?? 0,
          }))
        );
      } catch (e) {
        console.error("Failed to load wave energy", e);
      }
    };
    load();
  }, [beachId, hours]);

  const stops = useMemo(
    () => buildTrendStops(series, "var(--green)", "var(--red)"),
    [series]
  );
  return (
    <ChartContainer
      config={chartConfig}
      className="@min-lg:aspect-auto @min-lg:h-[300px] w-full"
    >
      <AreaChart
        accessibilityLayer
        data={series}
        margin={{
          top: 5,
          right: 10,
          left: -28,
          bottom: 5,
        }}
        syncId="anyId"
      >
        <ReferenceArea x2={6} fill="#ccc1ffff" fillOpacity={0.2} />
        <ReferenceArea x1={6} x2={18} fill="#FFE58F" fillOpacity={0.2} />
        <ReferenceArea x1={18} x2={21} fill="#ccc1ffff" fillOpacity={0.2} />
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--foreground)"
          strokeWidth={0.1}
          vertical={false}
        />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={0}
          fontSize={11}
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
        />
        <ChartLegend content={<ChartLegendContent />} />
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
                stopOpacity={1}
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
        />
      </AreaChart>
    </ChartContainer>
  );
};

export default WaveEnergyChart;
