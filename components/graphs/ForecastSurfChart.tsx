"use client";

import * as React from "react";
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
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Button } from "../ui/button";

import {
  ArrowLeft,
  ArrowRight,
  MousePointer2 as ArrowIcon,
} from "lucide-react";

const chartData = [
  { day: "Mon", tide1: 2, tide2: 4, tide3: 1 },
  { day: "Tues", tide1: 3, tide2: 3, tide3: 5 },
  { day: "Wed", tide1: 2, tide2: 2, tide3: 1 },
  { day: "Thurs", tide1: 2, tide2: 4, tide3: 1 },
  { day: "Fri", tide1: 3, tide2: 3, tide3: 5 },
  { day: "Sat", tide1: 2, tide2: 2, tide3: 1 },
  { day: "Sun", tide1: 2, tide2: 4, tide3: 1 },
];
const chartConfig = {
  tide1: {
    label: "6 AM",
    color: "#2563eb",
  },
  tide2: {
    label: "12 PM",
    color: "#95c5ffff",
  },
  tide3: {
    label: "6 PM",
    color: "#3584e6ff",
  },
} satisfies ChartConfig;

const ForecastSurfChart = () => {
  const [startIndex, setStartIndex] = React.useState(0);
  const [windowSize, setWindowSize] = React.useState(0);

  React.useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector("#content-container");
      const width = container ? container.clientWidth : 0;

      if (width < 500) {
        setWindowSize(3);
      } else if (width < 750) {
        setWindowSize(5);
      } else {
        setWindowSize(7);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleNext = () => {
    if (startIndex + windowSize < chartData.length) {
      setStartIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (startIndex > 0) {
      setStartIndex((prev) => prev - 1);
    }
  };

  const visibleData = chartData.slice(startIndex, startIndex + windowSize);
  return (
    <>
      {windowSize !== 7 && (
        <div className="flex gap-2 items-center justify-center mb-2">
          <Button
            aria-label="previous slide"
            size="icon"
            variant="outline"
            className="border border-border bg-background rounded-full drop-shadow-sm"
            onClick={handleBack}
            disabled={startIndex === 0}
          >
            <ArrowLeft />
          </Button>
          <span className="font-semibold text-sm bg-background border border-border drop-shadow-sm px-4 py-2 rounded-2xl">
            Wed, 8/15 - Fri, 8/17
          </span>
          <Button
            aria-label="next slide"
            size="icon"
            variant="outline"
            className="border border-border bg-background rounded-full drop-shadow-sm"
            onClick={handleNext}
            disabled={startIndex + windowSize >= chartData.length}
          >
            <ArrowRight />
          </Button>
        </div>
      )}
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[250px] w-full"
      >
        <BarChart
          margin={{
            top: 5,
            right: 0,
            left: -38,
            bottom: 50,
          }}
          accessibilityLayer
          data={visibleData}
          syncId="anyId"
        >
          <ReferenceArea x1={0} x2={1} fill="#ccc1ffff" fillOpacity={0.2} />
          <ReferenceArea x1={2} x2={5} fill="#FFE58F" fillOpacity={0.2} />
          <ReferenceArea x1={6} x2={6} fill="#ccc1ffff" fillOpacity={0.2} />
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="day"
            orientation="bottom"
            tickLine={false}
            tick={(props) => {
              const safeX = typeof props.x === "number" ? props.x : 0;
              const safeY = typeof props.y === "number" ? props.y : 0;
              const safeOffset =
                typeof props.payload.offset === "number"
                  ? props.payload.offset
                  : 0;

              return (
                <g>
                  <rect
                    x={safeX - safeOffset + 4}
                    y={safeY - 15}
                    width={safeOffset * 2 - 10}
                    height={24}
                    fill="var(--blue)"
                    stroke="#cacacaff"
                    strokeWidth={0.3}
                    rx={4}
                  />
                  <text
                    x={safeX}
                    y={safeY + 1}
                    textAnchor="middle"
                    fill="var(--foreground)"
                    fontSize={13}
                    fontWeight={600}
                  >
                    2-3 ft
                  </text>
                  <rect
                    x={safeX - safeOffset + 4}
                    y={safeY - 15 + 25}
                    width={safeOffset * 2 - 10}
                    height={24 + 15}
                    fill="var(--highlight-2)"
                    stroke="#cacacaff"
                    strokeWidth={0.3}
                    rx={4}
                  />
                  <text
                    x={safeX}
                    y={safeY + 25}
                    textAnchor="middle"
                    fill="var(--foreground)"
                    fontSize={11}
                  >
                    8/10
                  </text>
                  <text
                    x={safeX}
                    y={safeY + 25 + 15}
                    textAnchor="middle"
                    fill="var(--foreground)"
                    fontSize={11}
                    fontWeight={500}
                  >
                    {props.payload.value}
                  </text>
                </g>
              );
            }}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tickMargin={0}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="tide1"
            fill="var(--color-tide1)"
            radius={2}
            stroke="#5f5f5fff"
            strokeWidth={0.5}
          >
            <LabelList
              dataKey="tide1"
              position="top"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                const safeY = typeof props.y === "number" ? props.y : 0;
                const safeWidth =
                  typeof props.width === "number" ? props.width : 0;
                const iconSize = Math.max(16, safeWidth * 0.3);
                return (
                  <g>
                    <ArrowIcon
                      size={iconSize}
                      x={safeX + (safeWidth - iconSize) / 2}
                      y={safeY - iconSize - iconSize / 2}
                      fill="#8bd668ff"
                      color="#8bd668ff"
                    />
                  </g>
                );
              }}
            />
          </Bar>
          <Bar
            dataKey="tide2"
            fill="var(--color-tide2)"
            radius={2}
            stroke="#5f5f5fff"
            strokeWidth={0.5}
          >
            <LabelList
              dataKey="tide2"
              position="top"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                const safeY = typeof props.y === "number" ? props.y : 0;
                const safeWidth =
                  typeof props.width === "number" ? props.width : 0;
                const iconSize = Math.max(16, safeWidth * 0.3);
                return (
                  <g>
                    <ArrowIcon
                      size={iconSize}
                      x={safeX + (safeWidth - iconSize) / 2}
                      y={safeY - iconSize - iconSize / 2}
                      fill="#8bd668ff"
                      color="#8bd668ff"
                    />
                  </g>
                );
              }}
            />
          </Bar>
          <Bar
            dataKey="tide3"
            fill="var(--color-tide3)"
            radius={2}
            stroke="#5f5f5fff"
            strokeWidth={0.5}
          >
            <LabelList
              dataKey="tide3"
              position="top"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                const safeY = typeof props.y === "number" ? props.y : 0;
                const safeWidth =
                  typeof props.width === "number" ? props.width : 0;
                const iconSize = Math.max(16, safeWidth * 0.3);
                return (
                  <g>
                    <ArrowIcon
                      size={iconSize}
                      x={safeX + (safeWidth - iconSize) / 2}
                      y={safeY - iconSize - iconSize / 2}
                      fill="#8bd668ff"
                      color="#8bd668ff"
                    />
                  </g>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </>
  );
};

export default ForecastSurfChart;
