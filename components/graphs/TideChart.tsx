"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceArea,
  LabelList,
  LabelProps,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { Sun } from "lucide-react";
import TideSun from "../general/Stats/TideSun";

const chartConfig = {
  tide: {
    label: "Tide",
    color: "#6e6e6eff",
  },
} satisfies ChartConfig;

import React, { useEffect, useState } from "react";
import { fetchBeachTides } from "@/lib/supabase";

type TidePoint = { hour: number; tide: number; isPeak?: number };

const TideChart = ({ beachId, hours = 24, chartData: chartDataProp }: { beachId?: string; hours?: number; chartData?: TidePoint[] }) => {
  const [chartData, setChartData] = useState<TidePoint[]>(chartDataProp ?? []);

  useEffect(() => {
    if (chartDataProp || !beachId) return; // allow override or skip without id
    const load = async () => {
      try {
        const start = new Date();
        const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
        const points = await fetchBeachTides(beachId, start, end);
        const baseHour = start.getHours();
        const data = points.map((p, idx) => ({
          hour: (baseHour + idx) % 24,
          tide: p.tideLevelFt ?? 0,
        }));
        setChartData(data);
      } catch (e) {
        console.error("Failed to load tide data", e);
      }
    };
    load();
  }, [beachId, hours, chartDataProp]);
  return (
    <>
      <ChartContainer
        className="@min-lg:aspect-auto @min-lg:h-[250px] w-full"
        config={chartConfig}
      >
        <LineChart
          accessibilityLayer
          data={chartData}
          syncId="anyId"
          margin={{
            left: -30,
            right: 15,
          }}
        >
          <ReferenceArea x1={0} x2={6} fill="#ccc1ffff" fillOpacity={0.2} />
          <ReferenceArea x1={6} x2={20} fill="#FFE58F" fillOpacity={0.2} />
          <ReferenceArea x1={20} x2={24} fill="#ccc1ffff" fillOpacity={0.2} />
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
              if (payload.hour === 6 || payload.hour === 20) {
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
                return (
                  <g>
                    {(props.index === 6 || props.index === 20) && (
                      <Sun
                        size={20}
                        x={safeX - 12}
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
      {/* <figcaption className="flex justify-between ml-10 mr-8 mt-2">
        <TideSun chartData={chartData} />
      </figcaption> */}
    </>
  );
};

export default TideChart;
