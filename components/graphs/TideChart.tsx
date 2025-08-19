"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  XAxis,
} from "recharts";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";

const chartData = [
  { hour: 0, tide: 80 },
  { hour: 3, tide: 200 },
  { hour: 6, tide: 120 },
  { hour: 9, tide: 190 },
  { hour: 12, tide: 130 },
];
const chartConfig = {
  tide: {
    label: "Tide",
    color: "#499effff",
  },
} satisfies ChartConfig;

export const TidePreview = () => {
  return (
    <ChartContainer
      className="aspect-auto h-[60px] w-full"
      config={chartConfig}
    >
      <AreaChart
        accessibilityLayer
        data={chartData}
        margin={{
          left: 0,
          right: 0,
          bottom: 0,
          top: 5,
        }}
      >
        <ReferenceLine x={3} stroke="#acacacff" />
        <ReferenceDot x={3} y={200} r={3} stroke="#acacacff" />
        {/* <CartesianGrid vertical={false} /> */}
        <XAxis
          dataKey="hour"
          tickLine={false}
          axisLine={false}
          tickMargin={0}
          fontSize={10}
          hide={false}
        />
        <defs>
          <linearGradient id="fillTide" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-tide)" stopOpacity={0.8} />
            <stop
              offset="95%"
              stopColor="var(--color-tide)"
              stopOpacity={0.1}
            />
          </linearGradient>
        </defs>
        <Area
          dataKey="tide"
          type="natural"
          fill="url(#fillTide)"
          fillOpacity={0.4}
          stroke="var(--color-tide)"
          stackId="a"
        />
      </AreaChart>
    </ChartContainer>
  );
};

export const TideChart = () => {
  return (
    <>
      <h3>tide chart</h3>
      <canvas>graph</canvas>
    </>
  );
};
