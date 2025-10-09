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
import DaySlider from "../general/DaySlider";

import { MousePointer2 as ArrowIcon } from "lucide-react";

const chartData = [
  { day: "Mon", wind1: 2, wind2: 4, wind3: 1 },
  { day: "Tues", wind1: 3, wind2: 3, wind3: 5 },
  { day: "Wed", wind1: 2, wind2: 2, wind3: 1 },
  { day: "Thurs", wind1: 2, wind2: 4, wind3: 1 },
  { day: "Fri", wind1: 3, wind2: 3, wind3: 5 },
  { day: "Sat", wind1: 2, wind2: 2, wind3: 1 },
  { day: "Sun", wind1: 2, wind2: 4, wind3: 1 },
];
const chartConfig = {
  wind1: {
    label: "6 AM",
    color: "#2563eb",
  },
  wind2: {
    label: "12 PM",
    color: "#95c5ffff",
  },
  wind3: {
    label: "6 PM",
    color: "#3584e6ff",
  },
} satisfies ChartConfig;

import { fetchWeeklyForecast, type ForecastData } from "@/lib/supabase";
import { useForecastChartContext } from "../context/ForecastChartContext";

type Props = { beachId?: string; days?: Date[] | null };

const ForecastWindChart: React.FC<Props> = ({ beachId, days }) => {
  const {
    startIndex,
    windowSize,
    setWindowSize,
    length,
    setLength,
    setDaysLabel,
  } = useForecastChartContext();
  const [data, setData] = React.useState<
    {
      day: string;
      dateMs: number;
      wind1: number;
      wind2: number;
      wind3: number;
    }[]
  >([]);

  const chartRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // const adjustData = () => {
    //   const width = chart.clientWidth;
    //   if (width < 500) {
    //     setWindowSize(3);
    //   } else if (width < 750) {
    //     setWindowSize(5);
    //   } else {
    //     setWindowSize(7);
    //   }
    // };

    const adjustData = () => {
      const width = chart.clientWidth;
      if (width < 500) {
        setWindowSize(4);
      } else {
        setWindowSize(4);
      }
    };

    const observer = new ResizeObserver(adjustData);
    observer.observe(chart);

    adjustData();

    return () => observer.disconnect();
  }, []);

  // Load weekly forecast and build 3 samples per day (06:00, 12:00, 18:00)
  React.useEffect(() => {
    const load = async () => {
      try {
        if (!beachId) return;
        const rows = await fetchWeeklyForecast(beachId);
        const byDay = new Map<string, ForecastData[]>();
        for (const r of rows) {
          const d = new Date(r.timestamp);
          const key = d.toLocaleDateString("en-US", {
            weekday: "short",
            timeZone: "America/Los_Angeles",
          });
          const arr = byDay.get(key) ?? [];
          arr.push(r);
          byDay.set(key, arr);
        }
        const out: {
          day: string;
          dateMs: number;
          wind1: number;
          wind2: number;
          wind3: number;
        }[] = [];
        for (const [day, arr] of byDay.entries()) {
          // sort by hour
          arr.sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          const firstTs = new Date(arr[0]?.timestamp ?? Date.now()).getTime();
          const pick = (target: number) => {
            const near = arr.reduce((best, cur) => {
              const h = new Date(cur.timestamp).getHours();
              const dist = Math.abs(h - target);
              if (!best || dist < best.dist)
                return { dist, v: Math.round(cur.conditions.windSpeed ?? 0) };
              return best;
            }, null as any);
            return near ? near.v : 0;
          };
          out.push({
            day,
            dateMs: firstTs,
            wind1: pick(6),
            wind2: pick(12),
            wind3: pick(18),
          });
        }
        // Sort chronologically so we can cap the slider range.
        out.sort((a, b) => a.dateMs - b.dateMs);
        const trimmed = out.slice(0, 7);
        setData(trimmed);
      } catch (e) {
        console.error("Failed to load weekly wind", e);
      }
    };
    load();
  }, [beachId]);

  React.useEffect(() => {
    setLength(data.length ? data.length : chartData.length);
  }, [data.length, setLength]);
  // const totalLength = data.length ? data.length : chartData.length;

  const source = data.length ? data : chartData;
  const windowDays = days?.map((d) =>
    d.toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: "America/Los_Angeles",
    })
  );
  const startDay = windowDays
    ? windowDays[0]
    : new Date().toLocaleDateString("en-US", {
        weekday: "short",
        timeZone: "America/Los_Angeles",
      });
  const startDayIdx = source.findIndex((entry) => entry.day === startDay);
  const visibleData = source.slice(startDayIdx, startDayIdx + windowSize);
  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString("en-US", {
      weekday: "short",
      month: "numeric",
      day: "numeric",
      timeZone: "America/Los_Angeles",
    });
  // const daysLabel = visibleData.length
  //   ? `${fmt(visibleData[0].dateMs)} - ${fmt(
  //       visibleData[visibleData.length - 1].dateMs
  //     )}`
  //   : "";
  React.useEffect(() => {
    setDaysLabel(
      visibleData.length
        ? `${fmt(visibleData[0].dateMs)} - ${fmt(
            visibleData[visibleData.length - 1].dateMs
          )}`
        : ""
    );
  }, [visibleData, setDaysLabel]);
  const showSlider = windowSize > 0 && windowSize < length;
  return (
    <>
      {/* {showSlider && <DaySlider />} */}
      <ChartContainer
        ref={chartRef}
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
          syncId="barId"
          accessibilityLayer
          data={visibleData}
        >
          <ReferenceArea x1={0} x2={1} fill="#ccc1ffff" fillOpacity={0.2} />
          <ReferenceArea x1={2} x2={5} fill="#FFE58F" fillOpacity={0.2} />
          <ReferenceArea x1={6} x2={6} fill="#ccc1ffff" fillOpacity={0.2} />
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--foreground)"
            strokeWidth={0.1}
            vertical={false}
          />
          <XAxis
            dataKey="day"
            orientation="bottom"
            tickLine={false}
            // tick={(props) => {
            //   const safeX = typeof props.x === "number" ? props.x : 0;
            //   const safeY = typeof props.y === "number" ? props.y : 0;
            //   const label = String(props.payload?.value ?? "");
            //   return (
            //     <g>
            //       <text
            //         x={safeX}
            //         y={safeY + 5}
            //         textAnchor="middle"
            //         fill="var(--foreground)"
            //         fontSize={13}
            //         fontWeight={600}
            //       >
            //         {label}
            //       </text>
            //     </g>
            //   );
            // }}
            tick={(props) => {
              const safeX = typeof props.x === "number" ? props.x : 0;
              const safeY = typeof props.y === "number" ? props.y : 0;
              const safeIdx = typeof props.index === "number" ? props.index : 0;
              const safeDay =
                typeof props.payload.value === "string"
                  ? props.payload.value
                  : "";
              const safeOffset =
                typeof props.payload.offset === "number"
                  ? props.payload.offset
                  : 0;
              const dayData = data.find((entry) => entry.day === safeDay);
              const minWind = dayData
                ? Math.min(dayData.wind1, dayData.wind2, dayData.wind3)
                : 0;
              const maxWind = dayData
                ? Math.max(dayData.wind1, dayData.wind2, dayData.wind3)
                : 0;
              const windVal = dayData
                ? minWind === maxWind
                  ? `${minWind}`
                  : `${minWind}-${maxWind}`
                : "";
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
                    y={safeY + 2}
                    textAnchor="middle"
                    fill="var(--foreground)"
                    fontSize={13}
                    fontWeight={600}
                  >
                    {`${windVal}`}
                  </text>
                  <rect
                    x={safeX - safeOffset + 4}
                    y={safeY - 15 + 25}
                    width={safeOffset * 2 - 10}
                    height={24}
                    fill="var(--highlight-2)"
                    stroke="#cacacaff"
                    strokeWidth={0.3}
                    rx={4}
                  />
                  {/* <text
                    x={safeX}
                    y={safeY + 25}
                    textAnchor="middle"
                    fill="var(--foreground)"
                    fontSize={11}
                  >
                    8/10
                  </text> */}
                  <text
                    x={safeX}
                    y={safeY + 25}
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
            domain={[0, (dataMax: number) => Math.ceil(dataMax + 5)]}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="wind1"
            fill="var(--color-wind1)"
            radius={4}
            stroke="#5f5f5fff"
            strokeWidth={0.5}
          >
            <LabelList
              dataKey="wind1"
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
            dataKey="wind2"
            fill="var(--color-wind2)"
            radius={4}
            stroke="#5f5f5fff"
            strokeWidth={0.5}
          >
            <LabelList
              dataKey="wind2"
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
            dataKey="wind3"
            fill="var(--color-wind3)"
            radius={4}
            stroke="#5f5f5fff"
            strokeWidth={0.5}
          >
            <LabelList
              dataKey="wind3"
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

export default ForecastWindChart;
