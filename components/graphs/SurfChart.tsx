"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  LabelList,
  YAxis,
  LabelProps,
  ReferenceArea,
} from "recharts";
import { MousePointer2 as ArrowIcon } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartData = [
  { hour: 0, tide: 2 },
  { hour: 1, tide: 3 },
  { hour: 2, tide: 1 },
  { hour: 3, tide: 1 },
  { hour: 4, tide: 4 },
  { hour: 5, tide: 2 },
  { hour: 6, tide: 2 },
];
const chartConfig = {
  tide: {
    label: "Tide (ft)",
    color: "#95c5ffff",
  },
} satisfies ChartConfig;

const SurfChart = () => {
  return (
    <ChartContainer
      config={chartConfig}
      className="@min-lg:aspect-auto @min-lg:h-[300px] w-full"
    >
      <BarChart
        margin={{
          top: 5,
          right: 10,
          left: -28,
          bottom: 5,
        }}
        accessibilityLayer
        data={chartData}
        syncId="anyId"
      >
        <ReferenceArea x2={1} fill="#ccc1ffff" fillOpacity={0.2} />
        <ReferenceArea x1={2} x2={5} fill="#FFE58F" fillOpacity={0.2} />
        <ReferenceArea x1={6} fill="#ccc1ffff" fillOpacity={0.2} />
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--foreground)"
          strokeWidth={0.1}
          vertical={false}
        />
        <XAxis
          dataKey="hour"
          orientation="bottom"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          domain={[0, 6]}
        />
        <YAxis
          dataKey="tide"
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          domain={[0, (dataMax: number) => Math.ceil(dataMax * 2)]}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="tide"
          fill="var(--color-tide)"
          radius={4}
          stroke="#0000006e"
          strokeWidth={0.5}
        >
          <LabelList
            dataKey="tide"
            position="top"
            content={(props: LabelProps) => {
              const safeX = typeof props.x === "number" ? props.x : 0;
              const safeY = typeof props.y === "number" ? props.y : 0;
              const safeWidth =
                typeof props.width === "number" ? props.width : 0;
              const iconSize = Math.min(20, safeWidth * 0.6);
              return (
                <g>
                  <ArrowIcon
                    size={iconSize}
                    x={safeX + (safeWidth - iconSize) / 2}
                    // y={safeY - iconSize - iconSize}
                    y={iconSize / 2}
                    fill="#8bd668ff"
                    color="#8bd668ff"
                  />
                </g>
              );
            }}
          />
          <LabelList
            dataKey="tide"
            position="middle"
            content={(props: LabelProps) => {
              const safeX = typeof props.x === "number" ? props.x : 0;
              const safeY = typeof props.y === "number" ? props.y : 0;
              const safeWidth =
                typeof props.width === "number" ? props.width : 0;
              const safeHeight =
                typeof props.height === "number" ? props.height : 0;
              const fontSize = Math.max(10, safeWidth * 0.15);
              if (typeof props.value === "number") {
                return (
                  <g>
                    <text
                      x={safeX + safeWidth / 2}
                      y={
                        safeY +
                        safeHeight / 2 +
                        (props.value < 1 ? 0 : fontSize / 3)
                      }
                      fill="#2c2c2cff"
                      textAnchor="middle"
                      fontWeight="bold"
                      fontSize={fontSize}
                    >
                      {`${props.value}-${props.value + 1}`}
                    </text>
                  </g>
                );
              }
            }}
            fill="black"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
};

export default SurfChart;
