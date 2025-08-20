"use client";

import {
  Area,
  AreaChart,
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  LabelList,
  LabelProps,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { FaSun } from "react-icons/fa";
import { FiSunrise, FiSunset } from "react-icons/fi";

const previewChartData = [
  { hour: 0, tide: 80 },
  { hour: 3, tide: 200 },
  { hour: 6, tide: 120 },
  { hour: 9, tide: 190 },
  { hour: 12, tide: 130 },
];
const previewChartConfig = {
  tide: {
    label: "Tide",
    color: "#499effff",
  },
} satisfies ChartConfig;

export const TidePreview = () => {
  return (
    <ChartContainer
      className="aspect-auto h-[60px] w-full"
      config={previewChartConfig}
    >
      <AreaChart
        accessibilityLayer
        data={previewChartData}
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

const chartData = [
  { hour: 0, tide: 5, isPeak: 5 },
  { hour: 1, tide: 4.5 },
  { hour: 2, tide: 4.3 },
  { hour: 3, tide: 4.1 },
  { hour: 4, tide: 3 },
  { hour: 5, tide: 2 },
  { hour: 6, tide: 1, isPeak: 1 },
  { hour: 7, tide: 2 },
  { hour: 8, tide: 2.5 },
  { hour: 9, tide: 2.8 },
  { hour: 10, tide: 3 },
  { hour: 11, tide: 4.5 },
  { hour: 12, tide: 5 },
  { hour: 13, tide: 5.1 },
  { hour: 14, tide: 5.2 },
  { hour: 15, tide: 5.3 },
  { hour: 16, tide: 5.5 },
  { hour: 17, tide: 5.3 },
  { hour: 18, tide: 5.5, isPeak: 5.5 },
  { hour: 19, tide: 5 },
  { hour: 20, tide: 4.5 },
  { hour: 21, tide: 4.3 },
  { hour: 22, tide: 3 },
  { hour: 23, tide: 2 },
  { hour: 24, tide: 1, isPeak: 1 },
];
const chartConfig = {
  tide: {
    label: "Tide",
    color: "#6e6e6eff",
  },
} satisfies ChartConfig;

export const TideChart = () => {
  return (
    <div className="h-full bg-background border border-border p-2 rounded-md shadow-sm">
      <header className="mx-2 mb-4 mt-2">
        <h3 className="leading-none font-semibold">
          Tide <span className="text-base font-medium">(ft)</span>
        </h3>
        <span className="text-muted-foreground text-sm">
          Showing the tides for the day
        </span>
      </header>
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
          {/* <ChartTooltip formatter={(v) => `${v} ft`} /> */}
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
                      <FaSun x={safeX - 5} y={0} fill="#ff9946ff" />
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
                      {(props.index === 6 || props.index === 20) && (
                        <FaSun x={safeX - 5} y={0} fill="#ff9946ff" />
                      )}
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
      <figcaption className="flex justify-between ml-10 mr-8">
        {chartData
          .filter((d) => d.hour === 6 || d.hour === 20)
          .map((entry) => {
            const sunStatus =
              entry.hour === 6
                ? ["Sunrise", "First Light"]
                : ["Sunset", "Last Light"];
            const times =
              entry.hour === 6
                ? ["6:30 AM", "6:10 AM"]
                : ["8:00 PM", "8:30 PM"];
            return (
              <div
                className="text-center gap-8 bg-highlight-1 py-1 px-3 ring-1 ring-slate-900/5 rounded-sm"
                key={entry.hour}
              >
                <div className="flex gap-4 items-center">
                  <span className="flex flex-col text-left">
                    <span className="font-medium text-xs">{sunStatus[0]}</span>
                    <span className="text-[11px]">{times[0]}</span>
                  </span>
                  {entry.hour === 6 ? (
                    <FiSunrise fill={"#ff9946ff"} size={20} />
                  ) : (
                    <FiSunset fill={"#ff9946ff"} size={20} />
                  )}
                </div>
                <span className="flex flex-col text-left">
                  <span className="font-medium text-xs">{sunStatus[1]}</span>
                  <span className="text-[11px]">{times[1]}</span>
                </span>
              </div>
            );
          })}
      </figcaption>
    </div>
  );
};
