"use client";

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

import { MousePointer2 as ArrowIcon } from "lucide-react";

const chartConfig = {
  primary: {
    label: "Primary",
    color: "#0077b6",
  },
  secondary: {
    label: "Secondary",
    color: "#48cae4",
  },
  tertiary: {
    label: "tertiary",
    color: "#adf1ffff",
  },
} satisfies ChartConfig;

const mockSwellData = [
  { time: 0, primary: 1.2, secondary: 0.6, tertiary: 0.3 },
  { time: 3, primary: 1.5, secondary: 0.7, tertiary: 0.4 },
  { time: 6, primary: 1.8, secondary: 0.9, tertiary: 0.7 },
  { time: 9, primary: 1.4, secondary: 0.8, tertiary: 0.6 },
  { time: 12, primary: 1.1, secondary: 0.5, tertiary: 0.4 },
  { time: 15, primary: 1.6, secondary: 0.7, tertiary: 0.6 },
  { time: 18, primary: 1.9, secondary: 1.0, tertiary: 0.8 },
  { time: 21, primary: 1.3, secondary: 0.6, tertiary: 0.5 },
];

const SwellChart = () => {
  return (
    <ChartContainer
      config={chartConfig}
      className="@min-lg:aspect-auto @min-lg:h-[300px] w-full"
    >
      <AreaChart
        accessibilityLayer
        data={mockSwellData}
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

        <Area
          type="monotone"
          dataKey="primary"
          stackId="1"
          activeDot={false}
          stroke="#023e8a"
          fill="#0077b6"
          fillOpacity={0.2}
          dot={({ payload, cx, cy }) => {
            const iconSize = 15;
            return (
              <ArrowIcon
                key={`swell-${cx}-${cy}`}
                size={iconSize}
                x={cx - iconSize / 2}
                y={cy - iconSize / 2}
                // fill="var(--color-primary)"
                // fill="#37f2ffff"
                fill="var(--swell-primary)"
                color="var(--color-highlight-2)"
              />
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="secondary"
          stackId="1"
          activeDot={false}
          stroke="#0096c7"
          fill="#48cae4"
          fillOpacity={0.2}
          dot={({ payload, cx, cy }) => {
            const iconSize = 15;
            return (
              <ArrowIcon
                key={`swell-${cx}-${cy}`}
                size={iconSize}
                x={cx - iconSize / 2}
                y={cy - iconSize / 2}
                // fill="var(--color-primary)"
                // fill="#37f2ffff"
                fill="var(--swell-primary)"
                color="var(--color-highlight-2)"
              />
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="tertiary"
          stackId="1"
          activeDot={false}
          stroke="#70ccebff"
          fill="#adf1ffff"
          fillOpacity={0.2}
          dot={({ payload, cx, cy }) => {
            const iconSize = 15;
            return (
              <ArrowIcon
                key={`swell-${cx}-${cy}`}
                size={iconSize}
                x={cx - iconSize / 2}
                y={cy - iconSize / 2}
                // fill="var(--color-primary)"
                // fill="#37f2ffff"
                fill="var(--swell-primary)"
                color="var(--color-highlight-2)"
              />
            );
          }}
        />
      </AreaChart>
    </ChartContainer>
  );
};

export default SwellChart;
