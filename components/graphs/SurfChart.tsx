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
import {
  BsArrowDownCircleFill as SArrowIcon,
  BsArrowDownLeftCircleFill as SWArrowIcon,
  BsArrowLeftCircleFill as WArrowIcon,
  BsArrowUpLeftCircleFill as NWArrowIcon,
  BsArrowUpCircleFill as NArrowIcon,
  BsArrowUpRightCircleFill as NEArrowIcon,
  BsArrowRightCircleFill as EArrowIcon,
  BsArrowDownRightCircleFill as SEArrowIcon,
} from "react-icons/bs";
import {
  ChartConfig,
  ChartContainer,
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
    <div className="h-full bg-background border border-border p-2 rounded-md shadow-sm">
      <header className="mx-2 mb-4 mt-2">
        <h3 className="leading-none font-semibold">
          Surf <span className="text-base font-medium">(ft)</span>
        </h3>
        <span className="text-muted-foreground text-sm">
          Showing the surf for the day
        </span>
      </header>
      <ChartContainer
        config={chartConfig}
        className="@min-lg:aspect-auto @min-lg:h-[250px] w-full"
      >
        <BarChart
          margin={{
            top: 5,
            right: 5,
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
            stroke="#eee"
            strokeWidth={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="hour"
            orientation="bottom"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            domain={[0, 6]}
            // tickFormatter={(value) => value.slice(0, 3)}
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
          {/* <ChartLegend content={<ChartLegendContent />} /> */}
          <Bar
            dataKey="tide"
            fill="var(--color-tide)"
            radius={4}
            stroke="#5f5f5fff"
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
                    <SEArrowIcon
                      size={iconSize}
                      x={safeX + (safeWidth - iconSize) / 2}
                      y={safeY - iconSize - iconSize}
                      fill="#8bd668ff"
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
    </div>
  );
};

export default SurfChart;
