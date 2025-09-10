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
  { hour: 0, tide: 5, isPeak: 5 },
  { hour: 1, tide: 4 },
  { hour: 2, tide: 3.1 },
  { hour: 3, tide: 2.4 },
  { hour: 4, tide: 1.9 },
  { hour: 5, tide: 1.5 },
  { hour: 6, tide: 1, isPeak: 1 },
  { hour: 7, tide: 1.5 },
  { hour: 8, tide: 1.9 },
  { hour: 9, tide: 2.4 },
  { hour: 10, tide: 2.5 },
  { hour: 11, tide: 2.6 },
  { hour: 12, tide: 2.8 },
  { hour: 13, tide: 3 },
  { hour: 14, tide: 3.2 },
  { hour: 15, tide: 3.8 },
  { hour: 16, tide: 4 },
  { hour: 17, tide: 4.1 },
  { hour: 18, tide: 4.3, isPeak: 4.3 },
  { hour: 19, tide: 4 },
  { hour: 20, tide: 3.2 },
  { hour: 21, tide: 3 },
  { hour: 22, tide: 3 },
  { hour: 23, tide: 2.9 },
  { hour: 24, tide: 2.8, isPeak: 2.8 },
  { hour: 25, tide: 2.9 },
  { hour: 26, tide: 3.1 },
  //   { hour: 26, tide: 3.1, isPeak: 3.1 },
  { hour: 27, tide: 2.4 },
  { hour: 28, tide: 1.9 },
  { hour: 29, tide: 1.5 },
  { hour: 30, tide: 1, isPeak: 1 },
  { hour: 31, tide: 1.5 },
  { hour: 32, tide: 1.9 },
  { hour: 33, tide: 2.4 },
  { hour: 34, tide: 2.5 },
  { hour: 35, tide: 2.6 },
  { hour: 36, tide: 2.8 },
  { hour: 37, tide: 3 },
  { hour: 38, tide: 3.2 },
  { hour: 39, tide: 3.8 },
  { hour: 40, tide: 4 },
  { hour: 41, tide: 4.1 },
  { hour: 42, tide: 4.3, isPeak: 4.3 },
  { hour: 43, tide: 4 },
  { hour: 44, tide: 3.2 },
  { hour: 45, tide: 3 },
  { hour: 46, tide: 3 },
  { hour: 47, tide: 2.9 },
  { hour: 48, tide: 2.8, isPeak: 2.8 },
  { hour: 49, tide: 2.9 },
  { hour: 50, tide: 3.1 },
  //   { hour: 50, tide: 3.1, isPeak: 3.1 },
  { hour: 51, tide: 2.4 },
  { hour: 52, tide: 1.9 },
  { hour: 53, tide: 1.5 },
  { hour: 54, tide: 1, isPeak: 1 },
  { hour: 55, tide: 1.5 },
  { hour: 56, tide: 1.9 },
  { hour: 57, tide: 2.4 },
  { hour: 58, tide: 2.5 },
  { hour: 59, tide: 2.6 },
  { hour: 60, tide: 2.8 },
  { hour: 61, tide: 3 },
  { hour: 62, tide: 3.2 },
  { hour: 63, tide: 3.8 },
  { hour: 64, tide: 4 },
  { hour: 65, tide: 4.1 },
  { hour: 66, tide: 4.3, isPeak: 4.3 },
  { hour: 67, tide: 4 },
  { hour: 68, tide: 3.2 },
  { hour: 69, tide: 3 },
  { hour: 70, tide: 3 },
  { hour: 71, tide: 2.9 },
  { hour: 72, tide: 2.8, isPeak: 2.8 },
  { hour: 73, tide: 2.9 },
  { hour: 74, tide: 3.1 },
  //   { hour: 50, tide: 3.1, isPeak: 3.1 },
  { hour: 75, tide: 2.4 },
  { hour: 76, tide: 1.9 },
  { hour: 77, tide: 1.5 },
  { hour: 78, tide: 1, isPeak: 1 },
  { hour: 79, tide: 1.5 },
  { hour: 80, tide: 1.9 },
  { hour: 81, tide: 2.4 },
  { hour: 82, tide: 2.5 },
  { hour: 83, tide: 2.6 },
  { hour: 84, tide: 2.8 },
  { hour: 85, tide: 3 },
  { hour: 86, tide: 3.2 },
  { hour: 87, tide: 3.8 },
  { hour: 88, tide: 4 },
  { hour: 89, tide: 4.1 },
  { hour: 90, tide: 4.3, isPeak: 4.3 },
  { hour: 91, tide: 4 },
  { hour: 92, tide: 3.2 },
  { hour: 93, tide: 3 },
  { hour: 94, tide: 3 },
  { hour: 95, tide: 2.9 },
  { hour: 96, tide: 2.8, isPeak: 2.8 },
];

const sunRises = new Set([6, 31, 55, 79]);
const sunSets = new Set([20, 45, 69, 93]);

const chartConfig = {
  tide: {
    label: "Tide",
    color: "#565656",
  },
} satisfies ChartConfig;

import { fetchWeeklyForecast, type ForecastData } from "@/lib/supabase";

type Props = { beachId?: string };

const ForecastTideChart: React.FC<Props> = ({ beachId }) => {
  const [startIndex, setStartIndex] = React.useState(0);
  const [windowSize, setWindowSize] = React.useState(0);
  const [data, setData] = React.useState<{ hour: number; tide: number; isPeak?: number }[]>([]);

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

  // Load weekly forecast and map tide levels hour-by-hour
  React.useEffect(() => {
    const load = async () => {
      try {
        if (!beachId) return;
        const rows = await fetchWeeklyForecast(beachId);
        // Build sequential hourly tide series starting from first row
        const series: { hour: number; tide: number; isPeak?: number }[] = [];
        let hourIdx = 0;
        for (const r of rows) {
          const tide = r.conditions.tideLevel ?? null;
          if (tide == null) continue;
          series.push({ hour: hourIdx++, tide: Number(tide.toFixed(1)) });
        }
        setData(series);
      } catch (e) {
        console.error("Failed to load weekly tide", e);
      }
    };
    load();
  }, [beachId]);

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

  const source = data.length ? data : chartData;
  const visibleData = source.slice(startIndex, startIndex + windowSize);
  let start = startIndex;

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
        <LineChart
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
            dataKey="tide"
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
          <Line
            dataKey="tide"
            type="natural"
            stroke="var(--color-tide)"
            strokeWidth={2}
            dot={({ payload, cx, cy }) => {
              if (sunRises.has(payload.hour) || sunSets.has(payload.hour)) {
                return (
                  <circle
                    key={payload.hour}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill="orange"
                    stroke="var(--color-tide)"
                    strokeWidth={1}
                  />
                );
              } else if (payload.isPeak) {
                return (
                  <circle
                    key={payload.hour}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill="green"
                    stroke="var(--color-tide)"
                    strokeWidth={1}
                  />
                );
              } else {
                return <g key={payload.hour} />;
              }
            }}
          >
            <LabelList
              dataKey="tide"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                const hour = Number(props.index) + startIndex;
                return (
                  <g>
                    {(sunRises.has(hour) || sunSets.has(hour)) && (
                      <Sun
                        size={20}
                        x={safeX - 10}
                        y={0}
                        fill="#ff9946ff"
                        color="#ff9946ff"
                      />
                    )}
                  </g>
                );
              }}
            />
            <LabelList
              dataKey="isPeak"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                const safeY = typeof props.y === "number" ? props.y : 0;
                let xShift = 0;
                if (props.index === 0) {
                  xShift = 5;
                } else if (props.index === 24) {
                  xShift = -5;
                }
                if (props.value && typeof props.index === "number") {
                  return (
                    <g>
                      <text
                        x={safeX + xShift}
                        y={safeY - 32}
                        fill="var(--foreground)"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={10}
                      >
                        {`${props.index % 12 === 0 ? 12 : props.index % 12} ${
                          props.index >= 12 ? "PM" : "AM"
                        }`}
                      </text>
                      <text
                        x={safeX + xShift}
                        y={safeY - 17}
                        fill="var(--foreground)"
                        textAnchor="middle"
                        fontWeight="bold"
                        fontSize={12}
                      >
                        {`${props.value} ft`}
                      </text>
                    </g>
                  );
                }
              }}
            />
          </Line>
        </LineChart>
      </ChartContainer>
      <div className="flex justify-between mx-6 mt-2 mb-1">
        {visibleData
          .filter((d) => sunRises.has(d.hour) || sunSets.has(d.hour))
          .map((entry) => {
            const sunStatus = sunRises.has(entry.hour)
              ? ["Sunrise", "First Light"]
              : ["Sunset", "Last Light"];
            const times = sunRises.has(entry.hour)
              ? ["6:30 AM", "6:10 AM"]
              : ["8:00 PM", "8:30 PM"];
            return (
              <div
                className="text-center gap-8 bg-highlight-5 py-1 px-3 ring-1 ring-slate-900/5 rounded-sm"
                key={entry.hour}
              >
                <div className="flex gap-4 items-center">
                  <p className="flex flex-col text-left">
                    <span className="font-medium text-xs">{sunStatus[0]}</span>
                    <span className="text-[11px]">{times[0]}</span>
                  </p>
                  {sunRises.has(entry.hour) ? (
                    <Sunrise fill={"#ff9946ff"} size={20} />
                  ) : (
                    <Sunset fill={"#ff9946ff"} size={20} />
                  )}
                </div>
                <p className="flex flex-col text-left">
                  <span className="font-medium text-xs">{sunStatus[1]}</span>
                  <span className="text-[11px]">{times[1]}</span>
                </p>
              </div>
            );
          })}
      </div>
    </>
  );
};

export default ForecastTideChart;
