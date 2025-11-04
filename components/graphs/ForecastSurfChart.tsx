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
  ReferenceLine,
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
import { getPacificHour } from "@/lib/utils";

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
      avgMin: number;
      avgMax: number;
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
            month: "numeric",
            day: "numeric",
            timeZone: "America/Los_Angeles",
          });
          const pick = (target: number) => {
            const near = arr.reduce((best, cur) => {
              const h = getPacificHour(cur.timestamp);
              const dist = Math.abs(h - target);

              // Calculate surf height using swell data (like SurfChart does)
              const h1 = cur.swell.primary.height ?? 0;
              const p1 = cur.swell.primary.period ?? 10;
              const h2 = cur.swell.secondary.height ?? 0;
              const p2 = cur.swell.secondary.period ?? 10;
              const h3 = cur.swell.tertiary?.height ?? 0;
              const p3 = cur.swell.tertiary?.period ?? 10;
              const s1 = h1 * Math.sqrt(Math.max(0, p1) / 10);
              const s2 = h2 * Math.sqrt(Math.max(0, p2) / 10);
              const s3 = h3 * Math.sqrt(Math.max(0, p3) / 10);
              const w1 = 1.0, w2 = 0.6, w3 = 0.3;
              const combined = Math.sqrt(
                Math.pow(w1 * s1, 2) + Math.pow(w2 * s2, 2) + Math.pow(w3 * s3, 2)
              );
              const wind = cur.conditions.windSpeed ?? 0;
              const windPenalty = Math.min(0.5, Math.max(0, (wind - 5) / 35));
              const effective = Math.max(0, combined * (1 - windPenalty));

              const heightMax = cur.surf.heightMax ?? 0;
              let representative = effective;

              if (!Number.isFinite(representative) || representative <= 0) {
                representative = heightMax > 0 ? heightMax : 0;
              } else if (heightMax > 0) {
                representative = representative * 0.7 + heightMax * 0.3;
              }

              const val = Number(Math.max(0, representative).toFixed(1));
              if (!best || dist < best.dist) return { dist, v: val };
              return best;
            }, null as any);
            return near ? near.v : 0;
          };
          // Calculate average heightMin and heightMax for the day (like Summary does)
          const heightMins = arr
            .map((r) => r.surf?.heightMin)
            .filter((v): v is number => typeof v === "number" && !isNaN(v));
          const heightMaxes = arr
            .map((r) => r.surf?.heightMax)
            .filter((v): v is number => typeof v === "number" && !isNaN(v));

          const avgMin = heightMins.length > 0
            ? heightMins.reduce((sum, v) => sum + v, 0) / heightMins.length
            : 0;
          const avgMax = heightMaxes.length > 0
            ? heightMaxes.reduce((sum, v) => sum + v, 0) / heightMaxes.length
            : 0;

          out.push({
            day: dayName,
            dateKey,
            dateMs: firstTsMs,
            tide1: pick(6),
            tide2: pick(12),
            tide3: pick(18),
            avgMin,
            avgMax,
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

  const visibleData = React.useMemo(
    () => source.slice(startDayIdx, startDayIdx + windowSize),
    [source, startDayIdx, windowSize]
  );
  const indexedData = React.useMemo(
    () =>
      visibleData.map((entry, idx) => ({
        ...entry,
        __index: idx,
      })),
    [visibleData]
  );
  const daySeparators = React.useMemo(() => {
    if (indexedData.length < 2) return [];
    return indexedData.slice(1).map((entry) => entry.__index - 0.5);
  }, [indexedData]);
  const separatorDomain = React.useMemo<[number, number]>(() => {
    if (!indexedData.length) return [0, 1];
    return [-0.5, indexedData.length - 0.5];
  }, [indexedData.length]);
  const windowDays =
    Array.isArray(days) && days.length > 0
      ? days.map((d) =>
          d.toLocaleDateString("en-US", {
            weekday: "short",
            month: "numeric",
            day: "numeric",
            timeZone: "America/Los_Angeles",
          })
        )
      : null;
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
      <div
        className="w-[calc(100%-30px)] flex justify-between"
        style={{
          position: "relative",
          zIndex: 40,
          // right: 15,
          left: 25,
          top: 0,
          // gap: 8,
          // paddingLeft: 8,
          // paddingRight: 8,
          boxSizing: "border-box",
          pointerEvents: "none",
        }}
      >
        {windowDays?.map((label, idx) => (
          <div
            key={idx}
            className=""
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: "center",
              // background: "linear-gradient(180deg,#f8fafc,#eef2ff)",
              borderRadius: 8,
              padding: "6px 6px",
              // boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
              // border: "1px solid rgba(0,0,0,0.06)",
              fontWeight: 700,
              fontSize: 13,
              color: "var(--foreground)",
              pointerEvents: "none",
            }}
          >
            {/* <div className="flex flex-col @min-sm:whitespace-nowrap max-w-15 mx-auto p-1 pt-1.5 rounded-xl bg-highlight-5">
              <span className="text-xs font-medium">{label.split(",")[1]}</span>
              <span className="text-sm font-bold">{label.split(",")[0]}</span>
            </div> */}
            <div className="flex flex-col @min-sm:whitespace-nowrap mx-auto p-1 pt-1.5 rounded-lg bg-highlight-5">
              <span className="text-xs font-medium">{label.split(",")[1]}</span>
              <span className="text-sm font-bold">{label.split(",")[0]}</span>
            </div>
          </div>
        ))}
      </div>
      <ChartContainer
        ref={chartRef}
        config={chartConfig}
        className="aspect-auto h-[235px] w-full"
      >
        <BarChart
          margin={{
            top: 5,
            right: 0,
            left: -38,
            bottom: 10,
          }}
          syncId="barId"
          accessibilityLayer
          data={indexedData}
        >
          {/* <ReferenceArea x1={0} x2={1} fill="#ccc1ffff" fillOpacity={0.2} />
          <ReferenceArea x1={2} x2={5} fill="#FFE58F" fillOpacity={0.2} />
          <ReferenceArea x1={6} x2={6} fill="#ccc1ffff" fillOpacity={0.2} /> */}
          {/* <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--foreground)"
            strokeWidth={0.1}
            vertical={false}
          /> */}
          <XAxis
            dataKey="day"
            orientation="bottom"
            tickLine={false}
            tick={(props) => {
              const safeX = typeof props.x === "number" ? props.x : 0;
              const safeY = typeof props.y === "number" ? props.y : 0;
              const safeIdx = typeof props.index === "number" ? props.index : 0;
              const safeOffset =
                typeof props.payload.offset === "number"
                  ? props.payload.offset
                  : 0;
              // Use indexedData[safeIdx] for accurate lookup
              const dayData = indexedData[safeIdx];

              // Use average min/max for the day (same as Summary.tsx)
              const avgMin = dayData?.avgMin ?? 0;
              const avgMax = dayData?.avgMax ?? 0;

              // Calculate surf range using the same logic as Summary.tsx
              let surfVal = "";
              if (dayData) {
                let minRounded = Math.round(avgMin);
                let maxRounded = Math.round(avgMax);
                // Ensure min <= max
                if (minRounded > maxRounded) {
                  [minRounded, maxRounded] = [maxRounded, minRounded];
                }
                // If they're equal, subtract 1 from min
                if (minRounded === maxRounded) {
                  minRounded = Math.max(0, maxRounded - 1);
                }
                surfVal = `${minRounded}-${maxRounded}`;
              }
              return (
                <g>
                  <rect
                    x={safeX - safeOffset + 4}
                    y={safeY - 15}
                    width={safeOffset * 2 - 10}
                    height={26}
                    fill="var(--blue)"
                    rx={6}
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
                </g>
              );
            }}
            tickMargin={10}
            axisLine={false}
          />
          <XAxis
            xAxisId="separator"
            type="number"
            dataKey="__index"
            hide
            domain={separatorDomain}
            allowDecimals={false}
          />
          {daySeparators.map((position, idx) => (
            <ReferenceLine
              key={`day-divider-${idx}`}
              xAxisId="separator"
              x={position}
              stroke="var(--muted-foreground)"
              strokeWidth={0.25}
              // strokeDasharray="4 3"
              ifOverflow="extendDomain"
            />
          ))}
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
            <LabelList
              dataKey="tide1"
              position="middle"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                const safeY = typeof props.y === "number" ? props.y : 0;
                const safeWidth =
                  typeof props.width === "number" ? props.width : 0;
                const safeHeight =
                  typeof props.height === "number" ? props.height : 0;
                const fontSize = Math.max(10, safeWidth * 0.15);
                const label =
                  typeof props.value === "number" ? props.value.toFixed(1) : "";

                if (label) {
                  return (
                    <g>
                      <text
                        x={safeX + safeWidth / 2}
                        y={safeY + safeHeight / 2 + fontSize / 3}
                        fill="#2c2c2cff"
                        textAnchor="middle"
                        fontWeight="bold"
                        fontSize={fontSize}
                      >
                        {label === "0.0" ? "0" : label}
                      </text>
                    </g>
                  );
                }
                return null;
              }}
              fill="black"
            />
          </Bar>
          <Bar
            dataKey="tide2"
            fill="var(--color-tide2)"
            radius={4}
            stroke="#5f5f5fff"
            strokeWidth={0.5}
            minPointSize={10}
          >
            <LabelList
              dataKey="tide2"
              position="middle"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                const safeY = typeof props.y === "number" ? props.y : 0;
                const safeWidth =
                  typeof props.width === "number" ? props.width : 0;
                const safeHeight =
                  typeof props.height === "number" ? props.height : 0;
                const fontSize = Math.max(10, safeWidth * 0.15);
                const label =
                  typeof props.value === "number" ? props.value.toFixed(1) : "";

                if (label) {
                  return (
                    <g>
                      <text
                        x={safeX + safeWidth / 2}
                        y={safeY + safeHeight / 2 + fontSize / 3}
                        fill="#2c2c2cff"
                        textAnchor="middle"
                        fontWeight="bold"
                        fontSize={fontSize}
                      >
                        {label === "0.0" ? "0" : label}
                      </text>
                    </g>
                  );
                }
                return null;
              }}
              fill="black"
            />
          </Bar>
          <Bar
            dataKey="tide3"
            fill="var(--color-tide3)"
            radius={4}
            stroke="#5f5f5fff"
            strokeWidth={0.5}
            minPointSize={10}
          >
            <LabelList
              dataKey="tide3"
              position="middle"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                const safeY = typeof props.y === "number" ? props.y : 0;
                const safeWidth =
                  typeof props.width === "number" ? props.width : 0;
                const safeHeight =
                  typeof props.height === "number" ? props.height : 0;
                const fontSize = Math.max(10, safeWidth * 0.15);
                const label =
                  typeof props.value === "number" ? props.value.toFixed(1) : "";

                if (label) {
                  return (
                    <g>
                      <text
                        x={safeX + safeWidth / 2}
                        y={safeY + safeHeight / 2 + fontSize / 3}
                        fill="#2c2c2cff"
                        textAnchor="middle"
                        fontWeight="bold"
                        fontSize={fontSize}
                      >
                        {label === "0.0" ? "0" : label}
                      </text>
                    </g>
                  );
                }
                return null;
              }}
              fill="black"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </>
  );
};

export default ForecastSurfChart;
