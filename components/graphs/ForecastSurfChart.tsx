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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import DaySlider from "../general/DaySlider";

import { MousePointer2 as ArrowIcon } from "lucide-react";

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

import { fetchWeeklyForecast, type ForecastData } from "@/lib/supabase";
import { useForecastChartContext } from "../context/ForecastChartContext";

type Props = { beachId?: string; days: Date[] | null };

const ForecastSurfChart: React.FC<Props> = ({ beachId, days }) => {
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
      dateKey: string;
      dateMs: number;
      tide1: number;
      tide2: number;
      tide3: number;
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

  // Load weekly forecast and build 3 samples per day (06:00, 12:00, 18:00) using surf height max
  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!beachId) return;
        const rows = await fetchWeeklyForecast(beachId);
        console.log("ROWS", rows);
        const byDay = new Map<string, ForecastData[]>();
        for (const r of rows) {
          const d = new Date(r.timestamp);
          // Use ISO date string (YYYY-MM-DD) instead of weekday name to avoid collisions
          const key = d
            .toLocaleDateString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              timeZone: "America/Los_Angeles",
            })
            .split("/")
            .reverse()
            .join("-"); // Convert MM/DD/YYYY to YYYY-MM-DD
          const arr = byDay.get(key) ?? [];
          arr.push(r);
          byDay.set(key, arr);
        }
        const out: {
          day: string;
          dateKey: string;
          dateMs: number;
          tide1: number;
          tide2: number;
          tide3: number;
        }[] = [];
        for (const [dateKey, arr] of byDay.entries()) {
          arr.sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          const firstTs = new Date(arr[0]?.timestamp ?? Date.now());
          const firstTsMs = firstTs.getTime();
          // Display weekday name for UI
          const dayName = firstTs.toLocaleDateString("en-US", {
            weekday: "short",
            timeZone: "America/Los_Angeles",
          });
          const pick = (target: number) => {
            const near = arr.reduce((best, cur) => {
              const h = new Date(cur.timestamp).getHours();
              const dist = Math.abs(h - target);
              const val = Math.round(cur.surf.heightMax ?? 0);
              if (!best || dist < best.dist) return { dist, v: val };
              return best;
            }, null as any);
            return near ? near.v : 0;
          };
          out.push({
            day: dayName,
            dateKey,
            dateMs: firstTsMs,
            tide1: pick(6),
            tide2: pick(12),
            tide3: pick(18),
          });
        }
        // Sort chronologically so we can cap the slider range.
        out.sort((a, b) => a.dateMs - b.dateMs);
        const trimmed = out.slice(0, 7);
        if (!cancelled) {
          setData(trimmed);
        }
      } catch (e) {
        console.error("Failed to load weekly surf", e);
        if (!cancelled) {
          setData([]);
        }
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [beachId]);

  React.useEffect(() => {
    setLength(data.length ? data.length : chartData.length);
  }, [data.length, setLength]);
  // const totalLength = data.length ? data.length : chartData.length;

  const source = data.length ? data : chartData;

  // Convert days prop to date keys for accurate matching
  const windowDateKeys = days?.map((d) => {
    const dateStr = d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "America/Los_Angeles",
    });
    return dateStr.split("/").reverse().join("-"); // MM/DD/YYYY -> YYYY-MM-DD
  });

  // Find start index using dateKey if available, otherwise use current date
  let startDayIdx = 0;
  if (windowDateKeys && windowDateKeys.length > 0 && data.length) {
    startDayIdx = source.findIndex(
      (entry) => "dateKey" in entry && entry.dateKey === windowDateKeys[0]
    );
    if (startDayIdx === -1) startDayIdx = 0; // Fallback if not found
  }

  const visibleData = source.slice(startDayIdx, startDayIdx + windowSize);
  // const fmt = (ms: number) =>
  //   new Date(ms).toLocaleDateString("en-US", {
  //     weekday: "short",
  //     month: "numeric",
  //     day: "numeric",
  //     timeZone: "America/Los_Angeles",
  //   });
  // React.useEffect(() => {
  //   setDaysLabel(
  //     visibleData.length
  //       ? `${fmt(visibleData[0].dateMs)} - ${fmt(
  //           visibleData[visibleData.length - 1].dateMs
  //         )}`
  //       : ""
  //   );
  // }, [visibleData, setDaysLabel]);

  const showSlider = windowSize > 0 && windowSize < length;
  console.log("COMPARISON", windowSize, length, visibleData.length);
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
              // Use visibleData[safeIdx] for accurate lookup instead of searching by weekday name
              const dayData = visibleData[safeIdx];
              const minSurf = dayData
                ? Math.min(dayData.tide1, dayData.tide2, dayData.tide3)
                : 0;
              const maxSurf = dayData
                ? Math.max(dayData.tide1, dayData.tide2, dayData.tide3)
                : 0;
              const surfVal = dayData
                ? minSurf === maxSurf
                  ? `${minSurf}`
                  : `${minSurf}-${maxSurf}`
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
                    {`${surfVal} ft`}
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
            tickMargin={10}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tickMargin={0}
            domain={[
              0,
              (dataMax: number) => Math.max(4, Math.ceil(dataMax + 2)),
            ]}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          {/* <ChartLegend content={<ChartLegendContent />} /> */}
          <Bar
            dataKey="tide1"
            fill="var(--color-tide1)"
            radius={4}
            stroke="#5f5f5fff"
            strokeWidth={0.5}
            minPointSize={10}
          >
            {/* <LabelList
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
            /> */}
          </Bar>
          <Bar
            dataKey="tide2"
            fill="var(--color-tide2)"
            radius={4}
            stroke="#5f5f5fff"
            strokeWidth={0.5}
            minPointSize={10}
          >
            {/* <LabelList
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
            /> */}
          </Bar>
          <Bar
            dataKey="tide3"
            fill="var(--color-tide3)"
            radius={4}
            stroke="#5f5f5fff"
            strokeWidth={0.5}
            minPointSize={10}
          >
            {/* <LabelList
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
            /> */}
          </Bar>
        </BarChart>
      </ChartContainer>
    </>
  );
};

export default ForecastSurfChart;
