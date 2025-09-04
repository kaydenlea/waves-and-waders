"use client";

import React from "react";
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

const mockEnergyData = [
  { time: 0, energy: 1 },
  { time: 3, energy: 2 },
  { time: 6, energy: 2 },
  { time: 9, energy: 3 },
  { time: 12, energy: 2 },
  { time: 15, energy: 3 },
  { time: 18, energy: 2 },
  { time: 21, energy: 1 },
];

const gradientOffset = () => {
  const dataMax = Math.max(...mockEnergyData.map((i) => i.energy));
  const dataMin = Math.min(...mockEnergyData.map((i) => i.energy));

  if (dataMax <= 0) {
    return 0;
  }
  if (dataMin >= 0) {
    return 1;
  }

  return dataMax / (dataMax - dataMin);
};

type WavePoint = {
  time: number;
  energy: number;
};

function buildTrendStops(
  series: WavePoint[],
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

// const off = buildTrendStops(mockEnergyData, 'green', 'red');

const WaveEnergyChart = () => {
  const stops = React.useMemo(
    () => buildTrendStops(mockEnergyData, "var(--green)", "var(--red)"),
    []
  );
  return (
    <ChartContainer
      config={chartConfig}
      className="@min-lg:aspect-auto @min-lg:h-[300px] w-full"
    >
      <AreaChart
        accessibilityLayer
        data={mockEnergyData}
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
