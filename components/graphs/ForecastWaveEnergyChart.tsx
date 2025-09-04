"use client";

import React from "react";

import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceArea,
  LabelList,
  LabelProps,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import DaySlider from "../general/DaySlider";

import { Sun, Sunrise, Sunset } from "lucide-react";

const chartData = [
  { hour: 0, energy: 1 },
  { hour: 1, energy: 2 },
  { hour: 2, energy: 2 },
  { hour: 3, energy: 2 },
  { hour: 4, energy: 2 },
  { hour: 5, energy: 2 },
  { hour: 6, energy: 2 },
  { hour: 7, energy: 3 },
  { hour: 8, energy: 3 },
  { hour: 9, energy: 3 },
  { hour: 10, energy: 2 },
  { hour: 11, energy: 2 },
  { hour: 12, energy: 2 },
  { hour: 13, energy: 2 },
  { hour: 14, energy: 2 },
  { hour: 15, energy: 3 },
  { hour: 16, energy: 3 },
  { hour: 17, energy: 3 },
  { hour: 18, energy: 2 },
  { hour: 19, energy: 2 },
  { hour: 20, energy: 2 },
  { hour: 21, energy: 1 },
  { hour: 22, energy: 1 },
  { hour: 23, energy: 1 },
  { hour: 24, energy: 1 },
  { hour: 25, energy: 1 },
  { hour: 26, energy: 1 },
  { hour: 27, energy: 2 },
  { hour: 28, energy: 2 },
  { hour: 29, energy: 2 },
  { hour: 30, energy: 2 },
  { hour: 31, energy: 2 },
  { hour: 32, energy: 2 },
  { hour: 33, energy: 3 },
  { hour: 34, energy: 3 },
  { hour: 35, energy: 3 },
  { hour: 36, energy: 2 },
  { hour: 37, energy: 2 },
  { hour: 38, energy: 2 },
  { hour: 39, energy: 3 },
  { hour: 40, energy: 3 },
  { hour: 41, energy: 3 },
  { hour: 42, energy: 2 },
  { hour: 43, energy: 2 },
  { hour: 44, energy: 2 },
  { hour: 45, energy: 1 },
  { hour: 46, energy: 1 },
  { hour: 47, energy: 1 },
  { hour: 48, energy: 1 },
  { hour: 49, energy: 1 },
  { hour: 50, energy: 1 },
  { hour: 51, energy: 2 },
  { hour: 52, energy: 2 },
  { hour: 53, energy: 2 },
  { hour: 54, energy: 2 },
  { hour: 55, energy: 2 },
  { hour: 56, energy: 2 },
  { hour: 57, energy: 3 },
  { hour: 58, energy: 3 },
  { hour: 59, energy: 3 },
  { hour: 60, energy: 2 },
  { hour: 61, energy: 2 },
  { hour: 62, energy: 2 },
  { hour: 63, energy: 3 },
  { hour: 64, energy: 3 },
  { hour: 65, energy: 3 },
  { hour: 66, energy: 2 },
  { hour: 67, energy: 2 },
  { hour: 68, energy: 2 },
  { hour: 69, energy: 1 },
  { hour: 70, energy: 1 },
  { hour: 71, energy: 1 },
  { hour: 72, energy: 1 },
  { hour: 73, energy: 1 },
  { hour: 74, energy: 1 },
  { hour: 75, energy: 2 },
  { hour: 76, energy: 2 },
  { hour: 77, energy: 2 },
  { hour: 78, energy: 2 },
  { hour: 79, energy: 2 },
  { hour: 80, energy: 2 },
  { hour: 81, energy: 3 },
  { hour: 82, energy: 3 },
  { hour: 83, energy: 3 },
  { hour: 84, energy: 2 },
  { hour: 85, energy: 2 },
  { hour: 86, energy: 2 },
  { hour: 87, energy: 3 },
  { hour: 88, energy: 3 },
  { hour: 89, energy: 3 },
  { hour: 90, energy: 2 },
  { hour: 91, energy: 2 },
  { hour: 92, energy: 2 },
  { hour: 93, energy: 1 },
  { hour: 94, energy: 2 },
  { hour: 95, energy: 2 },
  { hour: 96, energy: 1 },
];

const sunRises = new Set([6, 31, 55, 79]);
const sunSets = new Set([20, 45, 69, 93]);

const chartConfig = {
  energy: {
    label: "Energy (kJ)",
    color: "#616161ff",
  },
} satisfies ChartConfig;

type WavePoint = {
  hour: number;
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

const ForecastWaveEnergyChart = () => {
  const [startIndex, setStartIndex] = React.useState(0);
  const [windowSize, setWindowSize] = React.useState(0);

  React.useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector("#content");
      const width = container ? container.clientWidth : 0;

      if (width < 550) {
        setWindowSize(25);
      } else if (width < 750) {
        setWindowSize(49);
      } else {
        setWindowSize(73);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleNext = () => {
    if (startIndex + windowSize < chartData.length) {
      setStartIndex((prev) => prev + 24);
    }
  };

  const handleBack = () => {
    if (startIndex > 0) {
      setStartIndex((prev) => prev - 24);
    }
  };

  const visibleData = chartData.slice(startIndex, startIndex + windowSize);
  let start = startIndex;

  const stops = React.useMemo(
    () => buildTrendStops(visibleData, "var(--green)", "var(--red)"),
    [visibleData]
  );

  return (
    <>
      <DaySlider
        handleBack={handleBack}
        handleNext={handleNext}
        startIndex={startIndex}
        windowSize={windowSize}
        length={chartData.length}
        days="Wed, 8/15 - Fri, 8/17"
      />
      <ChartContainer
        config={chartConfig}
        className="@min-md:aspect-auto @min-md:h-[250px] w-full"
      >
        <AreaChart
          accessibilityLayer
          data={visibleData}
          margin={{
            left: -35,
            right: 15,
            bottom: 5,
          }}
          syncId="anyId"
        >
          {visibleData.map(
            (entry) =>
              entry.hour % 24 === 0 && (
                <ReferenceLine
                  key={entry.hour}
                  x={entry.hour}
                  stroke="#c2c2c2ff"
                  strokeWidth={0.5}
                />
              )
          )}

          {visibleData.map((entry, index) => {
            if (sunRises.has(entry.hour) || index === windowSize - 1) {
              const prev = start;
              start = entry.hour;
              return (
                <ReferenceArea
                  key={`${prev}-${start}`}
                  x1={prev}
                  x2={start}
                  fill="#ccc1ffff"
                  fillOpacity={0.2}
                />
              );
            } else if (sunSets.has(entry.hour)) {
              const prev = start;
              start = entry.hour;
              return (
                <ReferenceArea
                  key={`${prev}-${start}`}
                  x1={prev}
                  x2={start}
                  fill="#FFE58F"
                  fillOpacity={0.2}
                />
              );
            }
          })}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--foreground)"
            strokeWidth={0.1}
            vertical={false}
          />
          <XAxis
            dataKey="hour"
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
            dataKey="energy"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={11}
            domain={[
              0,
              (dataMax: number) => Math.max(Math.ceil(dataMax) + 1, 8),
            ]}
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
          />
          {/* <Line
            dataKey="energy"
            type="natural"
            stroke="var(--color-energy)"
            strokeWidth={2}
            dot={false}
          ></Line> */}
        </AreaChart>
      </ChartContainer>
    </>
  );
};

export default ForecastWaveEnergyChart;
