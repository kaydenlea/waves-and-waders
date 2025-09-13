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

import { Sun } from "lucide-react";

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

type Props = { beachId?: string; date?: Date };

const ForecastTideChart: React.FC<Props> = ({ beachId, date }) => {
  const [startIndex, setStartIndex] = React.useState(0);
  const [windowSize] = React.useState(48);
  const [data, setData] = React.useState<{ hour: number; tide: number }[]>([]);
  const [baseMs, setBaseMs] = React.useState<number | null>(null);

  // Fixed 2-day window; no resize logic needed

  // Load weekly forecast; if a date is provided, filter to that day
  React.useEffect(() => {
    const load = async () => {
      try {
        if (!beachId) return;
        const rows = await fetchWeeklyForecast(beachId);
        const fmtDay = (d: Date) => d.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" });
        const selectedLabel = date instanceof Date ? fmtDay(date) : null;

        const series: { hour: number; tide: number }[] = [];
        if (selectedLabel) {
          // Only include the selected Pacific calendar day
          for (const r of rows) {
            const d = new Date(r.timestamp);
            if (fmtDay(d) !== selectedLabel) continue;
            const tide = r.conditions.tideLevel;
            if (tide == null) continue;
            const h = d.getHours();
            series.push({ hour: h, tide: Number(tide.toFixed(1)) });
          }
          const d0 = new Date(date!);
          d0.setHours(0,0,0,0);
          setBaseMs(d0.getTime());
          // also include next day to make 48h window
          const next = new Date(date!);
          next.setDate(next.getDate() + 1);
          const nextLabel = fmtDay(next);
          for (const r of rows) {
            const d = new Date(r.timestamp);
            if (fmtDay(d) !== nextLabel) continue;
            const tide = r.conditions.tideLevel;
            if (tide == null) continue;
            const h = d.getHours();
            series.push({ hour: 24 + h, tide: Number(tide.toFixed(1)) });
          }
        } else {
          // Build sequential weekly series
          let hourIdx = 0;
          let firstMs: number | null = null;
          for (const r of rows) {
            const tide = r.conditions.tideLevel ?? null;
            if (tide == null) continue;
            series.push({ hour: hourIdx++, tide: Number(tide.toFixed(1)) });
            if (firstMs == null) firstMs = new Date(r.timestamp).getTime();
          }
          if (firstMs != null) setBaseMs(firstMs);
        }
        setData(series);
      } catch (e) {
        console.error("Failed to load weekly tide", e);
      }
    };
    load();
  }, [beachId, date]);

  const handleNext = () => {
    if (date) return;
    if (startIndex + windowSize < data.length) setStartIndex((prev) => prev + 24);
  };

  const handleBack = () => {
    if (date) return;
    if (startIndex > 0) setStartIndex((prev) => Math.max(0, prev - 24));
  };

  const source = data;
  const visibleData = date ? source : source.slice(startIndex, startIndex + windowSize);
  let start = startIndex;

  return (
    <>
      <DaySlider
        handleBack={handleBack}
        handleNext={handleNext}
        startIndex={date ? 0 : startIndex}
        windowSize={windowSize}
        length={date ? windowSize : Math.max(source.length, windowSize)}
        days={(() => {
          if (!visibleData.length) return "";
          const fmt = (ms: number) => new Date(ms).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', timeZone: 'America/Los_Angeles' });
          if (date) {
            const d0 = new Date(date); d0.setHours(0,0,0,0);
            const d1 = new Date(d0.getTime() + 24*3600*1000);
            return `${fmt(d0.getTime())} - ${fmt(d1.getTime())}`;
          }
          const base = baseMs ?? Date.now();
          const sMs = base + startIndex * 3600 * 1000;
          const eMs = base + Math.max(0, (startIndex + visibleData.length - 1)) * 3600 * 1000;
          return `${fmt(sMs)} - ${fmt(eMs)}`;
        })()}
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
          {/* omit static reference lines; dynamic shading not shown here */}
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
      {/* removed static sunrise/sunset badges */}
    </>
  );
};

export default ForecastTideChart;
