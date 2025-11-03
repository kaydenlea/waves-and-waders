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
  ReferenceLine,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import DaySlider from "../general/DaySlider";

import { MousePointer2 as ArrowIcon } from "lucide-react";

type WindDay = {
  day: string;
  dateMs: number;
  wind1: number;
  wind1Dir: number;
  wind2: number;
  wind2Dir: number;
  wind3: number;
  wind3Dir: number;
};

type IndexedWindDay = WindDay & { __index: number };

const fallbackStart = new Date();
fallbackStart.setHours(0, 0, 0, 0);
const fallbackDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const chartData: WindDay[] = fallbackDays.map((label, idx) => {
  const dateMs = fallbackStart.getTime() + idx * 24 * 60 * 60 * 1000;
  const base = (idx % 3) + 2;
  return {
    day: label,
    dateMs,
    wind1: base,
    wind1Dir: (base * 40) % 360,
    wind2: base + 2,
    wind2Dir: ((base + 2) * 35) % 360,
    wind3: base - 1,
    wind3Dir: ((base - 1) * 45) % 360,
  };
});
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
  const [data, setData] = React.useState<WindDay[]>([]);

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
            month: "numeric",
            day: "numeric",
            timeZone: "America/Los_Angeles",
          });
          const arr = byDay.get(key) ?? [];
          arr.push(r);
          byDay.set(key, arr);
        }
        const out: WindDay[] = [];
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
  const startDay =
    windowDays && windowDays.length > 0
      ? windowDays[0]
      : new Date().toLocaleDateString("en-US", {
          weekday: "short",
          month: "numeric",
          day: "numeric",
          timeZone: "America/Los_Angeles",
        });
  const startDayIdxRaw = source.findIndex((entry) => entry.day === startDay);
  const startDayIdx = startDayIdxRaw >= 0 ? startDayIdxRaw : 0;
  const visibleData = React.useMemo(
    () => source.slice(startDayIdx, startDayIdx + windowSize),
    [source, startDayIdx, windowSize]
  );
  const indexedData = React.useMemo<IndexedWindDay[]>(
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
  const xAxisDomain = React.useMemo<[number, number]>(() => {
    if (!indexedData.length) return [0, 1];
    return [-0.5, indexedData.length - 0.5];
  }, [indexedData.length]);
  const renderTick = React.useCallback(
    (props: any): React.ReactElement<SVGElement> => {
      const safeX = typeof props.x === "number" ? props.x : 0;
      const safeY = typeof props.y === "number" ? props.y : 0;
      const safeIdx = typeof props.index === "number" ? props.index : 0;
      const safeOffset =
        typeof props.payload?.offset === "number" ? props.payload.offset : 0;
      const dayData = indexedData[safeIdx];
      if (!dayData) {
        return <g />;
      }
      const minWind = Math.min(dayData.wind1, dayData.wind2, dayData.wind3);
      const maxWind = Math.max(dayData.wind1, dayData.wind2, dayData.wind3);
      const windVal =
        minWind === maxWind ? `${minWind}` : `${minWind}-${maxWind}`;
      const badgeWidth = Math.max(60, safeOffset * 2 - 10);
      const rectX =
        safeOffset > 0 ? safeX - safeOffset + 4 : safeX - badgeWidth / 2;

      return (
        <g>
          <rect
            x={rectX}
            y={safeY - 16}
            width={badgeWidth}
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
            {`${windVal}`}
          </text>
        </g>
      );
    },
    [indexedData]
  );
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
        {windowDays?.map((label, idx) => {
          const parts = label.split(",").map((part) => part.trim());
          const primary = parts[0] ?? "";
          const secondary = parts[1] ?? "";
          return (
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
                <span className="text-xs font-medium">{secondary}</span>
                <span className="text-sm font-bold">{primary}</span>
              </div> */}
              <div className="flex flex-col @min-sm:whitespace-nowrap mx-auto p-1 pt-1.5 rounded-lg bg-highlight-5">
                <span className="text-xs font-medium">{secondary}</span>
                <span className="text-sm font-bold">{primary}</span>
              </div>
            </div>
          );
        })}
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
            tick={renderTick}
            tickMargin={10}
            axisLine={false}
          />
          <XAxis
            xAxisId="separator"
            type="number"
            dataKey="__index"
            hide
            domain={xAxisDomain}
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
                const iconSize = Math.min(20, safeWidth);

                // Get wind direction from the data point
                const dataPoint = indexedData[props.index ?? 0];
                if (!dataPoint) return null;
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
                          fill="#b3b3b3ff"
                          // color="#b3b3b3ff"
                          strokeWidth={0.7}
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
                const iconSize = Math.min(20, safeWidth);

                // Get wind direction from the data point
                const dataPoint = indexedData[props.index ?? 0];
                if (!dataPoint) return null;
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
                          fill="#b3b3b3ff"
                          strokeWidth={0.7}
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
                const iconSize = Math.min(20, safeWidth);

                // Get wind direction from the data point
                const dataPoint = indexedData[props.index ?? 0];
                if (!dataPoint) return null;
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
                          fill="#b3b3b3ff"
                          strokeWidth={0.7}
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
