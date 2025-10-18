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
  {
    day: "Mon",
    wind1: 2,
    wind1Dir: (2 * 15) % 360,
    wind2: 4,
    wind2Dir: (4 * 15) % 360,
    wind3: 1,
    wind3Dir: (1 * 15) % 360,
  },
  {
    day: "Tues",
    wind1: 2,
    wind1Dir: (2 * 15) % 360,
    wind2: 4,
    wind2Dir: (4 * 15) % 360,
    wind3: 1,
    wind3Dir: (1 * 15) % 360,
  },
  {
    day: "Wed",
    wind1: 2,
    wind1Dir: (2 * 15) % 360,
    wind2: 4,
    wind2Dir: (4 * 15) % 360,
    wind3: 1,
    wind3Dir: (1 * 15) % 360,
  },
  {
    day: "Thurs",
    wind1: 2,
    wind1Dir: (2 * 15) % 360,
    wind2: 4,
    wind2Dir: (4 * 15) % 360,
    wind3: 1,
    wind3Dir: (1 * 15) % 360,
  },
  {
    day: "Fri",
    wind1: 2,
    wind1Dir: (2 * 15) % 360,
    wind2: 4,
    wind2Dir: (4 * 15) % 360,
    wind3: 1,
    wind3Dir: (1 * 15) % 360,
  },
  {
    day: "Sat",
    wind1: 2,
    wind1Dir: (2 * 15) % 360,
    wind2: 4,
    wind2Dir: (4 * 15) % 360,
    wind3: 1,
    wind3Dir: (1 * 15) % 360,
  },
  {
    day: "Sun",
    wind1: 2,
    wind1Dir: (2 * 15) % 360,
    wind2: 4,
    wind2Dir: (4 * 15) % 360,
    wind3: 1,
    wind3Dir: (1 * 15) % 360,
  },
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

import {
  fetchWeeklyForecast,
  getWindDirection,
  type ForecastData,
} from "@/lib/supabase";
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
      wind1Dir: number;
      wind2: number;
      wind2Dir: number;
      wind3: number;
      wind3Dir: number;
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
    let cancelled = false;

    // const load = async () => {
    //       try {
    //         if (!beachId) {
    //           // default placeholder 24 hours
    //           setChartData(
    //             Array.from({ length: 25 }, (_, h) => ({
    //               hour: h,
    //               wind: Number(Math.max(0, 3 + Math.sin((h / 24) * Math.PI * 2) * 2).toFixed(1)),
    //               direction: (h * 15) % 360, // rotating placeholder
    //             }))
    //           );
    //           return;
    //         }
    //         const resolved = await fetchBeachByIdLoose(beachId);
    //         const id = resolved?.id ?? beachId;
    //         let start = new Date();
    //         let end = new Date(start.getTime() + hours * 60 * 60 * 1000);
    //         if (date instanceof Date) {
    //           const d = new Date(date);
    //           d.setHours(0, 0, 0, 0);
    //           start = d;
    //           end = new Date(d.getTime() + hours * 60 * 60 * 1000);
    //         }
    //         const rows = await fetchBeachForecast(id, start, end);
    //         const data = rows.map((r, i) => ({
    //           hour:
    //             i === rows.length - 1 ? hours : new Date(r.timestamp).getHours(),
    //           wind: r.conditions.windSpeed ?? 0,
    //           direction: r.conditions.windDirection ?? undefined,
    //         }));
    //         setChartData(data);

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
        console.log("BYDAY", byDay);
        const out: {
          day: string;
          dateMs: number;
          wind1: number;
          wind1Dir: number;
          wind2: number;
          wind2Dir: number;
          wind3: number;
          wind3Dir: number;
        }[] = [];
        for (const [day, arr] of byDay.entries()) {
          // sort by hour
          arr.sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          const firstTs = new Date(arr[0]?.timestamp ?? Date.now()).getTime();
          const pick = (target: number, field: string) => {
            const near = arr.reduce((best, cur) => {
              const h = new Date(cur.timestamp).getHours();
              const dist = Math.abs(h - target);
              if (!best || dist < best.dist)
                if (field === "val") {
                  return {
                    dist,
                    v: Math.round(cur.conditions.windSpeed ?? 0),
                  };
                } else if (field === "dir") {
                  return {
                    dist,
                    direction: cur.conditions.windDirection ?? undefined,
                  };
                }
              return best;
            }, null as any);
            return near ? (field === "val" ? near.v : near.direction) : 0;
          };
          out.push({
            day,
            dateMs: firstTs,
            wind1: pick(6, "val"),
            wind1Dir: pick(6, "dir"),
            wind2: pick(12, "val"),
            wind2Dir: pick(12, "dir"),
            wind3: pick(18, "val"),
            wind3Dir: pick(18, "dir"),
          });
        }
        // Sort chronologically so we can cap the slider range.
        out.sort((a, b) => a.dateMs - b.dateMs);
        const trimmed = out.slice(0, 7);
        if (!cancelled) {
          setData(trimmed);
        }
      } catch (e) {
        console.error("Failed to load weekly wind", e);
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
            domain={[
              0,
              (dataMax: number) => Math.max(8, Math.ceil(dataMax + 5)),
            ]}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="wind1"
            fill="var(--color-wind1)"
            radius={4}
            stroke="#5f5f5fff"
            strokeWidth={0.5}
            minPointSize={10}
          >
            <LabelList
              dataKey="wind1"
              position="top"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                const safeY = typeof props.y === "number" ? props.y : 0;
                const safeWidth =
                  typeof props.width === "number" ? props.width : 0;
                const safeHeight =
                  typeof props.height === "number" ? props.height : 0;
                const iconSize = Math.min(20, safeWidth);

                // Get wind direction from the data point
                const dataPoint = data[props.index ?? 0];
                const direction = dataPoint?.wind1Dir ?? 0;
                const directionLabel = getWindDirection(direction);
                // Arrow points at 315° by default, adjust rotation
                const rotation = direction - 315;

                // Calculate center point for rotation - position on top of bar
                const centerX = safeX + safeWidth / 2;
                const centerY = safeY - iconSize / 2 - 12; // Position above the bar

                return (
                  <g>
                    <title>{`Wind Direction: ${directionLabel} (${Math.round(
                      direction
                    )}°)`}</title>
                    <g transform={`translate(${centerX}, ${centerY})`}>
                      <g transform={`rotate(${rotation}, 0, 0)`}>
                        <ArrowIcon
                          size={iconSize}
                          x={-iconSize / 2}
                          y={-iconSize / 2}
                          fill="#8bd668ff"
                          color="#8bd668ff"
                        />
                      </g>
                    </g>
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
            minPointSize={10}
          >
            <LabelList
              dataKey="wind1"
              position="top"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                const safeY = typeof props.y === "number" ? props.y : 0;
                const safeWidth =
                  typeof props.width === "number" ? props.width : 0;
                const safeHeight =
                  typeof props.height === "number" ? props.height : 0;
                const iconSize = Math.min(20, safeWidth);

                // Get wind direction from the data point
                const dataPoint = data[props.index ?? 0];
                const direction = dataPoint?.wind2Dir ?? 0;
                const directionLabel = getWindDirection(direction);
                // Arrow points at 315° by default, adjust rotation
                const rotation = direction - 315;

                // Calculate center point for rotation - position on top of bar
                const centerX = safeX + safeWidth / 2;
                const centerY = safeY - iconSize / 2 - 12; // Position above the bar

                return (
                  <g>
                    <title>{`Wind Direction: ${directionLabel} (${Math.round(
                      direction
                    )}°)`}</title>
                    <g transform={`translate(${centerX}, ${centerY})`}>
                      <g transform={`rotate(${rotation}, 0, 0)`}>
                        <ArrowIcon
                          size={iconSize}
                          x={-iconSize / 2}
                          y={-iconSize / 2}
                          fill="#8bd668ff"
                          color="#8bd668ff"
                        />
                      </g>
                    </g>
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
            minPointSize={10}
          >
            <LabelList
              dataKey="wind1"
              position="top"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                const safeY = typeof props.y === "number" ? props.y : 0;
                const safeWidth =
                  typeof props.width === "number" ? props.width : 0;
                const safeHeight =
                  typeof props.height === "number" ? props.height : 0;
                const iconSize = Math.min(20, safeWidth);

                // Get wind direction from the data point
                const dataPoint = data[props.index ?? 0];
                const direction = dataPoint?.wind3Dir ?? 0;
                const directionLabel = getWindDirection(direction);
                // Arrow points at 315° by default, adjust rotation
                const rotation = direction - 315;

                // Calculate center point for rotation - position on top of bar
                const centerX = safeX + safeWidth / 2;
                const centerY = safeY - iconSize / 2 - 12; // Position above the bar

                return (
                  <g>
                    <title>{`Wind Direction: ${directionLabel} (${Math.round(
                      direction
                    )}°)`}</title>
                    <g transform={`translate(${centerX}, ${centerY})`}>
                      <g transform={`rotate(${rotation}, 0, 0)`}>
                        <ArrowIcon
                          size={iconSize}
                          x={-iconSize / 2}
                          y={-iconSize / 2}
                          fill="#8bd668ff"
                          color="#8bd668ff"
                        />
                      </g>
                    </g>
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
