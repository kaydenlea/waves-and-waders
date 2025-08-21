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

const chartConfig = {
  tide: {
    label: "Tide",
    color: "#6e6e6eff",
  },
} satisfies ChartConfig;

const TideChart = ({
  chartData,
}: {
  chartData: { hour: number; tide: number; isPeak?: number }[];
}) => {
  return (
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
          stroke="#eee"
          strokeWidth={0.5}
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
            (dataMax: number) => Math.max(Math.ceil(dataMax) + 1, 10),
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
  );
};

export default TideChart;
