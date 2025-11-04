"use client";

import React, { useMemo, useState } from "react";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
  AreaChart,
  Area,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { MousePointer2 as ArrowIcon } from "lucide-react";
import {
  fetchWeeklyForecast,
  fetchBeachByIdLoose,
  fetchBeachDetails,
  fetchDailyConditions,
  getWindDirection,
} from "@/lib/supabase";

const chartConfig = {
  primary: {
    label: "Primary",
    color: "#0077b6",
  },
  secondary: {
    label: "Secondary",
    color: "#48cae4",
  },
  tertiary: {
    label: "Tertiary",
    color: "#adf1ffff",
  },
} satisfies ChartConfig;

type SwellPoint = {
  hour: number;
  primary: number;
  secondary: number;
  tertiary: number;
  primaryDir?: number;
  secondaryDir?: number;
  tertiaryDir?: number;
};

type Props = { beachId?: string; days?: Date[] | null };

const HOURS_PER_DAY = 24;

const ForecastSwellChart: React.FC<Props> = ({ beachId, days }) => {
  const [swellData, setSwellData] = useState<SwellPoint[]>([]);
  const [baseStartMs, setBaseStartMs] = useState<number | null>(null);
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );
  const [dayWindow] = useState(4);

  // Build swell series from forecast rows
  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!beachId) {
          if (!cancelled) {
            setSwellData([]);
            setBaseStartMs(null);
          }
          return;
        }

        const resolved = await fetchBeachByIdLoose(beachId);
        const id = resolved?.id ?? beachId;
        const rows = await fetchWeeklyForecast(String(id), 3);

        if (!rows || !rows.length) {
          if (!cancelled) {
            setSwellData([]);
            setBaseStartMs(null);
          }
          return;
        }

        // Sort rows
        rows.sort(
          (a: any, b: any) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Use today's date (or the first selected day) as the base, not the earliest data point
        const baseDate = days && days.length > 0 ? days[0] : new Date();

        // Get midnight in Pacific timezone for the base date (DST-aware)
        const dateFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const dateParts = dateFormatter.formatToParts(baseDate);
        const year = parseInt(
          dateParts.find((p) => p.type === "year")?.value || "0"
        );
        const month =
          parseInt(dateParts.find((p) => p.type === "month")?.value || "1") -
          1;
        const day = parseInt(
          dateParts.find((p) => p.type === "day")?.value || "1"
        );

        // Calculate UTC timestamp for Pacific midnight using offset at noon
        const noonUTC = Date.UTC(year, month, day, 12, 0, 0, 0);
        const noonDate = new Date(noonUTC);
        const noonFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          hour: "2-digit",
          hour12: false,
        });
        const pacificNoonHour = parseInt(noonFormatter.format(noonDate));
        const offsetHours = pacificNoonHour - 12;

        const baseMs = Date.UTC(year, month, day, -offsetHours, 0, 0, 0);
        if (!cancelled) {
          setBaseStartMs(baseMs);
        }

        const series: SwellPoint[] = [];
        for (const r of rows) {
          const ts = new Date(r.timestamp).getTime();
          const hour = Math.round((ts - baseMs) / 3600000);
          // Only include data points from midnight onwards (hour >= 0)
          if (hour >= 0) {
            series.push({
              hour,
              primary: Number((r.swell.primary.height ?? 0).toFixed(1)),
              secondary: Number((r.swell.secondary.height ?? 0).toFixed(1)),
              tertiary: Number((r.swell.tertiary?.height ?? 0).toFixed(1)),
              primaryDir: r.swell.primary.direction ?? undefined,
              secondaryDir: r.swell.secondary.direction ?? undefined,
              tertiaryDir: r.swell.tertiary?.direction ?? undefined,
            });
          }
        }

        series.sort((a, b) => a.hour - b.hour);
        if (!cancelled) {
          setSwellData(series);
        }

        const start = days ? days[0] : new Date();

        // Get midnight in Pacific timezone (DST-aware)
        const startFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const startParts = startFormatter.formatToParts(start);
        const startYear = parseInt(
          startParts.find((p) => p.type === "year")?.value || "0"
        );
        const startMonth =
          parseInt(startParts.find((p) => p.type === "month")?.value || "1") -
          1;
        const startDay = parseInt(
          startParts.find((p) => p.type === "day")?.value || "1"
        );

        const startNoonUTC = Date.UTC(
          startYear,
          startMonth,
          startDay,
          12,
          0,
          0,
          0
        );
        const startNoonDate = new Date(startNoonUTC);
        const startNoonFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          hour: "2-digit",
          hour12: false,
        });
        const startPacificNoonHour = parseInt(
          startNoonFormatter.format(startNoonDate)
        );
        const startOffsetHours = startPacificNoonHour - 12;

        const startMs = Date.UTC(
          startYear,
          startMonth,
          startDay,
          -startOffsetHours,
          0,
          0,
          0
        );

        // day/night/sun markers
        const beach = await fetchBeachDetails(String(id));
        const county = beach?.COUNTY;
        if (county) {
          const parseHM = (
            s: string | null
          ): { h: number; m: number } | null => {
            if (!s) return null;
            const m = /^(\d{1,2}):(\d{2})/.exec(s.trim());
            if (!m) return null;
            const h = Number(m[1]);
            const mm = Number(m[2]);
            if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
            return { h, m: mm };
          };

          const dayAreasBuild: { x1: number; x2: number }[] = [];
          const nightAreasBuild: { x1: number; x2?: number }[] = [];
          let nightStart = 0;
          for (let di = 0; di < 7; di++) {
            const cond = await fetchDailyConditions(
              county,
              new Date(startMs + di * 24 * 60 * 60 * 1000)
            );
            const rise = parseHM(cond?.sunrise ?? null);
            const setv = parseHM(cond?.sunset ?? null);
            if (!rise || !setv) {
              dayAreasBuild.push({ x1: di * 24, x2: di * 24 + 24 });
              nightAreasBuild.push({ x1: nightStart, x2: di * 24 });
              nightStart = di * 24 + 24;
              continue;
            }
            const offset = di * 24;
            const rH = offset + rise.h + Math.floor(rise.m / 60);
            const sH = offset + setv.h + Math.floor(setv.m / 60);
            const dayStart = Math.min(rH, sH);
            const dayEnd = Math.max(rH, sH);
            dayAreasBuild.push({
              x1: Math.round(dayStart / 3) * 3,
              x2: Math.round(dayEnd / 3) * 3,
            });
            nightAreasBuild.push({
              x1: Math.round(nightStart / 3) * 3,
              x2: Math.round(dayStart / 3) * 3,
            });
            nightStart = Math.round(dayEnd / 3) * 3;
          }
          nightAreasBuild.push({ x1: nightStart });
          if (!cancelled) {
            setDayAreas(dayAreasBuild);
            setNightAreas(nightAreasBuild);
          }
        }
      } catch (e) {
        console.error("Failed to load swell data", e);
        if (!cancelled) {
          setSwellData([]);
          setBaseStartMs(null);
          setDayAreas([]);
          setNightAreas([]);
        }
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [beachId, days]);

  const dayLabels =
    Array.isArray(days) && days.length > 0
      ? days.map((d) =>
          d.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            timeZone: "America/Los_Angeles",
          })
        )
      : null;

  const currentDay = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "America/Los_Angeles",
  });

  const startDay = dayLabels ? dayLabels[0].split(",")[0] : currentDay;

  // Calculate day offset
  const dayjs = require("dayjs");
  const getIndex = (d: string) =>
    dayjs().day(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(d));
  const getRelativeIndex = (current: string, selected: string) =>
    (getIndex(selected).day() - getIndex(current).day() + 7) % 7;
  const dayOffset = getRelativeIndex(currentDay, startDay);

  const startDayIdx = dayOffset * (HOURS_PER_DAY / 3);
  const windowSize = (HOURS_PER_DAY / 3) * dayWindow;
  const visibleData = swellData.slice(startDayIdx, startDayIdx + windowSize + 1);

  const visibleNightAreas = nightAreas.filter(
    (a) =>
      ((a.x2 && a.x2 >= dayOffset * 24) || !a.x2) &&
      a.x1 <= (dayOffset + dayWindow) * 24
  );

  const visibleDayAreas = dayAreas.filter(
    (a) =>
      a.x1 >= dayOffset * 24 &&
      ((a.x2 && a.x2 <= (dayOffset + dayWindow) * 24) || !a.x2)
  );

  return (
    <>
      <div
        className="@container w-[calc(100%-60px)] flex justify-between"
        style={{
          position: "relative",
          zIndex: 40,
          left: 40,
          top: 0,
          boxSizing: "border-box",
          pointerEvents: "none",
        }}
      >
        {dayLabels?.map((label, idx) => (
          <div
            key={idx}
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: "center",
              borderRadius: 8,
              padding: "6px 6px",
              fontWeight: 700,
              fontSize: 13,
              color: "var(--foreground)",
              pointerEvents: "none",
            }}
          >
            <div className="flex justify-center @min-lg:justify-between whitespace-nowrap px-3 py-2 rounded-lg bg-highlight-5">
              <span className="flex flex-col @min-lg:items-start">
                <span className="text-xs font-medium">
                  {label.split(",")[1]}
                </span>
                <span className="text-sm font-bold">{label.split(",")[0]}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[300px] w-full"
      >
        <AreaChart
          accessibilityLayer
          data={visibleData}
          margin={{
            top: 10,
            right: 10,
            left: -28,
          }}
          syncId="anyId"
        >
          {visibleData.map((entry, idx) =>
            entry.hour % 24 === 0 &&
            idx !== 0 &&
            idx !== visibleData.length - 1 ? (
              <ReferenceLine
                key={entry.hour}
                x={entry.hour}
                stroke="#c2c2c2ff"
                strokeWidth={0.5}
              />
            ) : null
          )}
          {visibleDayAreas.map((a, idx) => (
            <ReferenceArea
              key={`day-${idx}`}
              x1={a.x1}
              x2={a.x2}
              fill="#FFE58F"
              fillOpacity={0.2}
            />
          ))}
          {visibleNightAreas.map((a, idx) => (
            <ReferenceArea
              key={`night-${idx}`}
              x1={idx === 0 ? undefined : a.x1}
              x2={idx === visibleNightAreas.length - 1 ? undefined : a.x2}
              fill="#ccc1ffff"
              fillOpacity={0.2}
            />
          ))}
          <XAxis
            dataKey="hour"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={0}
            fontSize={11}
            tickFormatter={(value) =>
              value % 6 === 0
                ? (value % 12 === 0 ? 12 : value % 12).toString()
                : ""
            }
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={11}
            domain={[0, (dataMax: number) => Math.ceil(dataMax + 2)]}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <ChartTooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;

              const data = payload[0].payload;

              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="grid gap-2">
                    {payload.map((entry, index) => {
                      const dirKey = `${entry.dataKey}Dir` as keyof SwellPoint;
                      const direction = data[dirKey] as number | undefined;
                      const dirLabel =
                        direction != null ? getWindDirection(direction) : "N/A";

                      return (
                        <div key={index} className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            {entry.name}
                          </span>
                          <span
                            className="font-bold"
                            style={{ color: entry.color }}
                          >
                            {typeof entry.value === "number"
                              ? entry.value.toFixed(1)
                              : entry.value}{" "}
                            ft
                          </span>
                          {direction != null && (
                            <span className="text-[0.65rem] text-muted-foreground">
                              {dirLabel} ({Math.round(direction)}°)
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }}
          />

          <Area
            type="monotone"
            dataKey="primary"
            activeDot={false}
            stroke="#023e8a"
            fill="#0077b6"
            fillOpacity={0.2}
            dot={({ payload, cx, cy, index }) => {
              const iconSize = 15;
              const direction = payload.primaryDir ?? 0;
              const rotation = direction - 315;

              return (
                <g key={`primary-${index}`}>
                  <g transform={`translate(${cx}, ${cy})`}>
                    <g transform={`rotate(${rotation}, 0, 0)`}>
                      <ArrowIcon
                        size={iconSize}
                        x={-iconSize / 2}
                        y={-iconSize / 2}
                        fill="var(--swell-primary)"
                        color="var(--color-highlight-2)"
                      />
                    </g>
                  </g>
                </g>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="secondary"
            activeDot={false}
            stroke="#0096c7"
            fill="#48cae4"
            fillOpacity={0.2}
            dot={({ payload, cx, cy, index }) => {
              const iconSize = 15;
              const direction = payload.secondaryDir ?? 0;
              const rotation = direction - 315;

              return (
                <g key={`secondary-${index}`}>
                  <g transform={`translate(${cx}, ${cy})`}>
                    <g transform={`rotate(${rotation}, 0, 0)`}>
                      <ArrowIcon
                        size={iconSize}
                        x={-iconSize / 2}
                        y={-iconSize / 2}
                        fill="var(--swell-primary)"
                        color="var(--color-highlight-2)"
                      />
                    </g>
                  </g>
                </g>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="tertiary"
            activeDot={false}
            stroke="#70ccebff"
            fill="#adf1ffff"
            fillOpacity={0.2}
            dot={({ payload, cx, cy, index }) => {
              const iconSize = 15;
              const direction = payload.tertiaryDir ?? 0;
              const rotation = direction - 315;

              return (
                <g key={`tertiary-${index}`}>
                  <g transform={`translate(${cx}, ${cy})`}>
                    <g transform={`rotate(${rotation}, 0, 0)`}>
                      <ArrowIcon
                        size={iconSize}
                        x={-iconSize / 2}
                        y={-iconSize / 2}
                        fill="var(--swell-primary)"
                        color="var(--color-highlight-2)"
                      />
                    </g>
                  </g>
                </g>
              );
            }}
          />
        </AreaChart>
      </ChartContainer>
    </>
  );
};

export default ForecastSwellChart;
