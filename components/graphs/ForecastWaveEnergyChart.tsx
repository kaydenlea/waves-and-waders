"use client";

import React, { useMemo, useState } from "react";

import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  LabelList,
  LabelProps,
  ReferenceLine,
  Area,
  AreaChart,
  ReferenceArea,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import DaySlider from "../general/DaySlider";
import { Slider } from "@/components/ui/slider";

const chartData = [
  { hour: 0, energy: 1 },
  { hour: 1, energy: 2 },
  { hour: 2, energy: 2 },
  { hour: 3, energy: 2 },
  { hour: 4, energy: 2 },
  { hour: 5, energy: 2 },
  { hour: 6, energy: 2 },
  { hour: 7, energy: 3 },
  { hour: 8, energy: 3 },
  { hour: 9, energy: 3 },
  { hour: 10, energy: 2 },
  { hour: 11, energy: 2 },
  { hour: 12, energy: 2 },
  { hour: 13, energy: 2 },
  { hour: 14, energy: 2 },
  { hour: 15, energy: 3 },
  { hour: 16, energy: 3 },
  { hour: 17, energy: 3 },
  { hour: 18, energy: 2 },
  { hour: 19, energy: 2 },
  { hour: 20, energy: 2 },
  { hour: 21, energy: 1 },
  { hour: 22, energy: 1 },
  { hour: 23, energy: 1 },
  { hour: 24, energy: 1 },
  { hour: 25, energy: 1 },
  { hour: 26, energy: 1 },
  { hour: 27, energy: 2 },
  { hour: 28, energy: 2 },
  { hour: 29, energy: 2 },
  { hour: 30, energy: 2 },
  { hour: 31, energy: 2 },
  { hour: 32, energy: 2 },
  { hour: 33, energy: 3 },
  { hour: 34, energy: 3 },
  { hour: 35, energy: 3 },
  { hour: 36, energy: 2 },
  { hour: 37, energy: 2 },
  { hour: 38, energy: 2 },
  { hour: 39, energy: 3 },
  { hour: 40, energy: 3 },
  { hour: 41, energy: 3 },
  { hour: 42, energy: 2 },
  { hour: 43, energy: 2 },
  { hour: 44, energy: 2 },
  { hour: 45, energy: 1 },
  { hour: 46, energy: 1 },
  { hour: 47, energy: 1 },
  { hour: 48, energy: 1 },
  { hour: 49, energy: 1 },
  { hour: 50, energy: 1 },
  { hour: 51, energy: 2 },
  { hour: 52, energy: 2 },
  { hour: 53, energy: 2 },
  { hour: 54, energy: 2 },
  { hour: 55, energy: 2 },
  { hour: 56, energy: 2 },
  { hour: 57, energy: 3 },
  { hour: 58, energy: 3 },
  { hour: 59, energy: 3 },
  { hour: 60, energy: 2 },
  { hour: 61, energy: 2 },
  { hour: 62, energy: 2 },
  { hour: 63, energy: 3 },
  { hour: 64, energy: 3 },
  { hour: 65, energy: 3 },
  { hour: 66, energy: 2 },
  { hour: 67, energy: 2 },
  { hour: 68, energy: 2 },
  { hour: 69, energy: 1 },
  { hour: 70, energy: 1 },
  { hour: 71, energy: 1 },
  { hour: 72, energy: 1 },
  { hour: 73, energy: 1 },
  { hour: 74, energy: 1 },
  { hour: 75, energy: 2 },
  { hour: 76, energy: 2 },
  { hour: 77, energy: 2 },
  { hour: 78, energy: 2 },
  { hour: 79, energy: 2 },
  { hour: 80, energy: 2 },
  { hour: 81, energy: 3 },
  { hour: 82, energy: 3 },
  { hour: 83, energy: 3 },
  { hour: 84, energy: 2 },
  { hour: 85, energy: 2 },
  { hour: 86, energy: 2 },
  { hour: 87, energy: 3 },
  { hour: 88, energy: 3 },
  { hour: 89, energy: 3 },
  { hour: 90, energy: 2 },
  { hour: 91, energy: 2 },
  { hour: 92, energy: 2 },
  { hour: 93, energy: 1 },
  { hour: 94, energy: 2 },
  { hour: 95, energy: 2 },
  { hour: 96, energy: 1 },
];

const chartConfig = {
  energy: {
    label: "Energy (kJ)",
    color: "#616161ff",
  },
} satisfies ChartConfig;

type WavePoint = {
  hour: number;
  energy: number;
};

const HOURS_PER_DAY = 24;

function buildTrendStops(
  series: WavePoint[],
  incColor: string,
  decColor: string
) {
  if (series.length < 2) {
    return [
      { offset: "0%", color: incColor },
      { offset: "100%", color: incColor },
    ];
  }

  const segInc: boolean[] = [];
  for (let i = 1; i < series.length; i++) {
    segInc.push(series[i].energy >= series[i - 1].energy);
  }

  const stops: { offset: string; color: string }[] = [];
  const colorOf = (inc: boolean) => (inc ? incColor : decColor);

  stops.push({ offset: "0%", color: colorOf(segInc[0]) });

  for (let i = 1; i < segInc.length; i++) {
    if (segInc[i] !== segInc[i - 1]) {
      const frac = (i / (series.length - 1)) * 100;
      const pct = `${frac}%`;
      // hard transition: duplicate stop with new color
      stops.push({ offset: pct, color: colorOf(segInc[i - 1]) });
      stops.push({ offset: pct, color: colorOf(segInc[i]) });
    }
  }

  stops.push({ offset: "100%", color: colorOf(segInc[segInc.length - 1]) });
  return stops;
}

import {
  fetchWeeklyForecast,
  fetchBeachByIdLoose,
  fetchBeachDetails,
  fetchDailyConditions,
} from "@/lib/supabase";
import dayjs from "dayjs";
import { TrendingDown, TrendingUp } from "lucide-react";

type Props = { beachId?: string; days?: Date[] | null };

const ForecastWaveEnergyChart: React.FC<Props> = ({ beachId, days }) => {
  const [startIndex, setStartIndex] = React.useState(0);
  const [dayWindow, setDayWindow] = React.useState(4);
  const [energyData, setEnergyData] = React.useState<WavePoint[]>([]);
  const [baseStartMs, setBaseStartMs] = React.useState<number | null>(null);
  const [dayAreas, setDayAreas] = useState<{ x1: number; x2: number }[]>([]);
  const [nightAreas, setNightAreas] = useState<{ x1: number; x2?: number }[]>(
    []
  );

  // Build energy series from forecast rows (wave_energy_kj or surf.waveEnergy)
  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!beachId) {
          if (!cancelled) {
            setEnergyData([]);
            setBaseStartMs(null);
          }
          return;
        }
        const resolved = await fetchBeachByIdLoose(beachId);
        const id = resolved?.id ?? beachId;
        const rows = await fetchWeeklyForecast(String(id), 3);
        console.log("RAW ENERGY", rows);
        if (!rows || !rows.length) {
          if (!cancelled) {
            setEnergyData([]);
            setBaseStartMs(null);
          }
          return;
        }
        // Sort rows and determine Pacific midnight of the earliest row (DST-aware)
        rows.sort(
          (a: any, b: any) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const earliest = new Date(rows[0].timestamp);

        // Get midnight in Pacific timezone for the earliest row's date
        const dateFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const dateParts = dateFormatter.formatToParts(earliest);
        const year = parseInt(dateParts.find((p) => p.type === "year")?.value || "0");
        const month = parseInt(dateParts.find((p) => p.type === "month")?.value || "1") - 1;
        const day = parseInt(dateParts.find((p) => p.type === "day")?.value || "1");

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

        const series: WavePoint[] = [];
        for (const r of rows) {
          const ts = new Date(r.timestamp).getTime();
          const hour = Math.round((ts - baseMs) / 3600000);
          const v =
            (r as any)?.surf?.waveEnergy ?? (r as any)?.wave_energy_kj ?? 0;
          series.push({ hour, energy: Number(v) || 0 });
        }
        // Keep within a reasonable window (e.g., first 96 hours)
        series.sort((a, b) => a.hour - b.hour);
        console.log("SORTED ENERGY", series);
        if (!cancelled) {
          setEnergyData(series);
        }
        const start = days ? days[0] : new Date();

        // Get midnight in Pacific timezone (DST-aware) - same logic as above
        const startFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const startParts = startFormatter.formatToParts(start);
        const startYear = parseInt(startParts.find((p) => p.type === "year")?.value || "0");
        const startMonth = parseInt(startParts.find((p) => p.type === "month")?.value || "1") - 1;
        const startDay = parseInt(startParts.find((p) => p.type === "day")?.value || "1");

        const startNoonUTC = Date.UTC(startYear, startMonth, startDay, 12, 0, 0, 0);
        const startNoonDate = new Date(startNoonUTC);
        const startNoonFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Los_Angeles",
          hour: "2-digit",
          hour12: false,
        });
        const startPacificNoonHour = parseInt(startNoonFormatter.format(startNoonDate));
        const startOffsetHours = startPacificNoonHour - 12;

        const startMs = Date.UTC(startYear, startMonth, startDay, -startOffsetHours, 0, 0, 0);
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
          const markers: number[] = [];
          let nightStart = 0;
          for (let di = 0; di < 7; di++) {
            const cond = await fetchDailyConditions(
              county,
              new Date(startMs + di * 24 * 60 * 60 * 1000)
            );
            const rise = parseHM(cond?.sunrise ?? null);
            const setv = parseHM(cond?.sunset ?? null);
            if (!rise || !setv) {
              // fallback mark whole day
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
            markers.push(rH, sH);
          }
          nightAreasBuild.push({ x1: nightStart });
          if (!cancelled) {
            setDayAreas(dayAreasBuild);
            setNightAreas(nightAreasBuild);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setEnergyData([]);
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
  }, [beachId, dayWindow, days]);

  const source = energyData.length ? energyData : chartData;
  const pointsPerDay = React.useMemo(() => {
    if (source.length < 2) {
      return HOURS_PER_DAY;
    }
    let minStep = Infinity;
    for (let i = 1; i < source.length; i++) {
      const diff = Math.abs(source[i].hour - source[i - 1].hour);
      if (diff > 0 && diff < minStep) {
        minStep = diff;
      }
    }
    if (!Number.isFinite(minStep) || minStep <= 0) {
      return HOURS_PER_DAY;
    }
    return Math.max(1, Math.ceil(HOURS_PER_DAY / minStep));
  }, [source]);
  const totalLength = source.length;

  const maxSelectableDays = React.useMemo(() => {
    if (!totalLength || !pointsPerDay) {
      return 1;
    }
    const available = Math.floor(totalLength / pointsPerDay);
    const capped = Math.min(4, available > 0 ? available : 1);
    return Math.max(1, capped);
  }, [pointsPerDay, totalLength]);

  const effectiveDayWindow = Math.min(dayWindow, maxSelectableDays);
  const windowSize = pointsPerDay * effectiveDayWindow;
  const maxStartIndex = Math.max(0, totalLength - windowSize);

  React.useEffect(() => {
    if (dayWindow > maxSelectableDays) {
      setDayWindow(maxSelectableDays);
    }
  }, [dayWindow, maxSelectableDays]);

  React.useEffect(() => {
    setStartIndex((prev) => Math.min(prev, maxStartIndex));
  }, [maxStartIndex]);

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
  const currentDay = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "America/Los_Angeles",
  });
  const getIndex = (d: string) =>
    dayjs().day(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(d));
  const getRelativeIndex = (current: string, selected: string) =>
    (getIndex(selected).day() - getIndex(current).day() + 7) % 7;
  const dayOffset = getRelativeIndex(currentDay, startDay);
  const startDayIdx = dayOffset * (HOURS_PER_DAY / 3);
  const visibleData = source.slice(startDayIdx, startDayIdx + windowSize + 1);
  console.log(
    "NUMS",
    windowDays,
    source,
    visibleData,
    startDay,
    currentDay,
    getRelativeIndex(currentDay, startDay),
    dayOffset,
    startDayIdx,
    startDayIdx + windowSize
  );
  // const visibleData = source.slice(startIndex, startIndex + windowSize);

  const stops = React.useMemo(
    () => buildTrendStops(visibleData, "var(--green)", "var(--red)"),
    [visibleData]
  );

  const pacificMidnight = React.useMemo(() => {
    if (baseStartMs != null) return baseStartMs;
    const now = new Date();
    const local = new Date(
      now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
    );
    local.setHours(0, 0, 0, 0);
    return local.getTime();
  }, [baseStartMs]);

  const fmtRange = React.useMemo(() => {
    if (!visibleData.length) return "";
    const startMs = pacificMidnight + visibleData[0].hour * 3600 * 1000;
    const endMs =
      pacificMidnight + visibleData[visibleData.length - 1].hour * 3600 * 1000;
    const fmt = (ms: number) =>
      new Date(ms).toLocaleDateString("en-US", {
        weekday: "short",
        month: "numeric",
        day: "numeric",
        timeZone: "America/Los_Angeles",
      });
    return `${fmt(startMs)} - ${fmt(endMs)}`;
  }, [visibleData, pacificMidnight]);

  const handleNext = () => {
    if (startIndex < maxStartIndex) {
      setStartIndex((prev) => Math.min(prev + pointsPerDay, maxStartIndex));
    }
  };

  const handleBack = () => {
    if (startIndex > 0) {
      setStartIndex((prev) => Math.max(prev - pointsPerDay, 0));
    }
  };

  const handleDayWindowChange = React.useCallback(
    (value: number[]) => {
      const raw = value?.[0];
      const candidate = raw == null ? effectiveDayWindow : raw;
      const next = Math.min(
        Math.max(Math.round(candidate), 1),
        maxSelectableDays
      );
      setDayWindow(next);
      setStartIndex(0);
    },
    [effectiveDayWindow, maxSelectableDays]
  );
  // Prepare day label texts for the *visible 4 days* starting at dayOffset
  // const dayLabels = useMemo(() => {
  //   const base = days instanceof Date ? new Date(days) : new Date();
  //   const startLocal = new Date(
  //     base.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  //   );
  //   startLocal.setHours(0, 0, 0, 0);
  //   const labels = [];
  //   for (let i = 0; i < effectiveDayWindow; i++) {
  //     const d = new Date(
  //       startLocal.getTime() + (dayOffset + i) * 24 * 60 * 60 * 1000
  //     );
  //     labels.push(
  //       d.toLocaleDateString(undefined, {
  //         weekday: "short",
  //         month: "numeric",
  //         day: "numeric",
  //       })
  //     );
  //   }
  //   return labels;
  // }, [dayOffset, days, effectiveDayWindow]);
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
  console.log(
    "WINDOWS",
    days,
    dayLabels,
    dayOffset * 24,
    (dayOffset + dayWindow) * 24,
    dayAreas,
    nightAreas,
    visibleDayAreas,
    visibleNightAreas,
    visibleData
  );
  return (
    <>
      {/* <div className="mb-4 mx-4">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Range</span>
          <span>
            {effectiveDayWindow} {effectiveDayWindow === 1 ? "day" : "days"}
          </span>
        </div>
        <Slider
          value={[effectiveDayWindow]}
          min={1}
          max={maxSelectableDays}
          step={1}
          onValueChange={handleDayWindowChange}
          className="mt-2"
        />
      </div> */}
      {/* <DaySlider
        chartHandleBack={handleBack}
        chartHandleNext={handleNext}
        chartStartIndex={startIndex}
        chartWindowSize={windowSize}
        chartLength={totalLength}
        chartDays={fmtRange}
      /> */}
      {/* <DaySlider
        chartHandleBack={handleBack}
        chartHandleNext={handleNext}
        chartStartIndex={startIndex}
        chartWindowSize={windowSize}
        chartLength={totalLength}
        chartDays={fmtRange}
      /> */}
      <div
        // className="w-[86%] @min-sm:w-[90%] @min-md:w-[92%] @min-lg:w-[92%] @min-xl:w-[94%] @min-3xl:w-[96%] flex justify-between"
        // style={{
        //   position: "relative",
        //   zIndex: 40,
        //   right: 15,
        //   left: 25,
        //   top: 0,
        //   // gap: 8,
        //   // paddingLeft: 8,
        //   // paddingRight: 8,
        //   boxSizing: "border-box",
        //   pointerEvents: "none",
        // }}
        className="@container w-[calc(100%-60px)] flex justify-between"
        style={{
          position: "relative",
          zIndex: 40,
          // right: 15,
          left: 40,
          top: 0,
          // gap: 8,
          // paddingLeft: 8,
          // paddingRight: 8,
          boxSizing: "border-box",
          pointerEvents: "none",
        }}
      >
        {dayLabels?.map((label, idx) => (
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
            <div className="flex justify-center @min-lg:justify-between whitespace-nowrap px-3 py-2 rounded-lg bg-highlight-5">
              <span className="flex flex-col @min-lg:items-start">
                <span className="text-xs font-medium">
                  {label.split(",")[1]}
                </span>
                <span className="text-sm font-bold">{label.split(",")[0]}</span>
              </span>
              <div className="hidden @min-lg:grid rounded-md bg-highlight-6 grid-cols-[auto_1fr] @min-3xl:grid-cols-[60px_1fr] grid-rows-2 space-y-0.5 items-center text-xs text-muted-foreground uppercase tracking-wide leading-tight">
                <span className="flex gap-2 items-center">
                  <TrendingUp
                    fill="#353535ff"
                    className="stroke-muted-foreground w-4 h-4"
                  />
                  <span className="hidden @min-3xl:block font-medium">
                    High
                  </span>
                </span>
                <span className="ml-1 text-foreground normal-case font-medium">
                  100 <span className="hidden @min-xl:inline-block">kJ</span>
                </span>
                <span className="flex gap-2 items-center">
                  <TrendingDown
                    fill="#353535ff"
                    className="stroke-muted-foreground w-4 h-4"
                  />
                  <span className="hidden @min-3xl:block -mb-0.5 font-medium">
                    Low
                  </span>
                </span>
                <span className="ml-1 text-foreground normal-case font-medium">
                  20 <span className="hidden @min-xl:inline-block">kJ</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[235px] w-full"
      >
        <AreaChart
          accessibilityLayer
          data={visibleData}
          margin={{
            left: -25,
            right: 15,
            bottom: 5,
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
              fillOpacity={0.18}
            />
          ))}
          {visibleNightAreas.map((a, idx) => (
            <ReferenceArea
              key={`night-${idx}`}
              x1={idx === 0 ? undefined : a.x1}
              x2={idx === visibleNightAreas.length - 1 ? undefined : a.x2}
              fill="#ccc1ffff"
              fillOpacity={0.12}
            />
          ))}

          {/* <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--foreground)"
            strokeWidth={0.1}
            vertical={false}
          /> */}
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
            dataKey="energy"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={11}
            domain={[
              0,
              (dataMax: number) =>
                Math.max(Math.round(Math.ceil(dataMax) * 1.5), 8),
            ]}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <defs>
            <linearGradient id="splitColor" x1="0" y1="0" x2="1" y2="0">
              {/* <stop offset={off} stopColor="green" stopOpacity={1} />
                      <stop offset={off} stopColor="red" stopOpacity={1} /> */}
              {stops.map((s, i) => (
                <stop
                  key={i}
                  offset={s.offset}
                  stopColor={s.color}
                  stopOpacity={0.8}
                />
              ))}
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="energy"
            stackId="1"
            stroke="#818181ff"
            //   fill="#adf1ffff"
            fill="url(#splitColor)"
            fillOpacity={1}
          />
          {/* <Line
            dataKey="energy"
            type="natural"
            stroke="var(--color-energy)"
            strokeWidth={2}
            dot={false}
          ></Line> */}
        </AreaChart>
      </ChartContainer>
    </>
  );
};

export default ForecastWaveEnergyChart;
