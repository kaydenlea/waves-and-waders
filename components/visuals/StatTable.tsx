"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
  ArrowLeft,
  ArrowRight,
  MousePointer2 as ArrowIcon,
  Sun,
  Cloudy,
  Cloud as CloudIcon,
  CloudSun,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  Snowflake,
} from "lucide-react";
import DaySlider from "../general/DaySlider";
import {
  fetchBeachByIdLoose,
  fetchBeachForecast,
  getWindDirection,
  type ForecastData,
} from "@/lib/supabase";
import { useDateContext } from "../context/DateContext";

const SwellStat = ({
  primary = false,
  data,
}: {
  primary?: boolean;
  data?: {
    height?: number | string | null;
    period?: number | null;
    dir?: string | null;
    deg?: number | null;
  } | null;
}) => {
  const height = data?.height ?? "—";
  const period = data?.period ?? "—";
  const dir = data?.dir ?? "—";
  const deg = data?.deg ?? 0;

  // Calculate rotation for arrow (arrow points at 315° by default)
  const rotation = typeof deg === "number" ? deg - 315 : 0;

  return (
    <div
      className={cn(
        "flex-1 flex items-center justify-center space-x-2 rounded-sm p-1 h-10",
        primary ? "bg-highlight-1" : "bg-highlight-2"
      )}
    >
      <div
        className={cn(
          "flex items-center mt-0.5",
          primary ? "gap-1.5" : "gap-1.5"
        )}
      >
        <span className="flex items-baseline justify-center gap-[1px] whitespace-nowrap min-w-10">
          <span
            className={cn("font-semibold", primary ? "text-sm" : "text-sm")}
          >
            {height}
          </span>
          <span className={cn(primary ? "text-[.65rem]" : "text-[.65rem]")}>
            ft
          </span>
        </span>
        <span className="flex items-baseline gap-[1px] whitespace-nowrap min-w-8 justify-center">
          <span
            className={cn("font-semibold", primary ? "text-sm" : "text-sm")}
          >
            {period}
          </span>
          <span className={cn(primary ? "text-[.65rem]" : "text-[.65rem]")}>
            s
          </span>
        </span>
        <div
          style={{
            transform: `rotate(${rotation}deg)`,
            display: "inline-block",
          }}
          className="mr-2 @min-md:mr-0"
        >
          <ArrowIcon size={16} color="#51e72bff" fill="#51e72bff" />
        </div>
        <span className="flex items-baseline gap-[1px] whitespace-nowrap min-w-17 justify-center hidden @min-md:flex">
          <span
            className={cn("font-semibold", primary ? "text-sm" : "text-sm")}
          >
            {dir}
          </span>
          <span className={cn(primary ? "text-[.65rem]" : "text-[.65rem]")}>
            {typeof deg === "number" ? Math.round(deg) : deg}&deg;
          </span>
        </span>
      </div>
    </div>
  );
};

const getWindLevel = (
  speed?: number | null,
  gust?: number | null
): string => {
  const maxVal = Math.max(speed ?? 0, gust ?? 0);
  if (!Number.isFinite(maxVal) || maxVal <= 0) return "bg-highlight-3";
  if (maxVal >= 25) return "bg-red-400 dark:bg-red-700";
  if (maxVal >= 15) return "bg-orange-400 dark:bg-orange-700";
  return "bg-green-400 dark:bg-green-700";
};

const WindStat = ({
  data,
}: {
  data: { dir: string; speed: number; max: number; deg?: number };
}) => {
  // Calculate rotation for wind arrow (arrow points at 315° by default)
  const rotation = typeof data.deg === "number" ? data.deg - 315 : 0;
  const windLevel = getWindLevel(data.speed, data.max);

  return (
    <div className="flex items-center gap-1">
      <span
        className={cn(
          "flex-1 justify-center flex gap-1 rounded-md py-2 px-3",
          windLevel
        )}
      >
        <span className="text-lg font-medium">{data.speed}</span>
        <span className="flex flex-col -space-y-1">
          <span className="text-[0.6rem]">{data.max}</span>
          <span className="text-[0.7rem]">mph</span>
        </span>
      </span>
      <div className="shadow-sm border border-border p-1 rounded-md text-center min-w-10 flex flex-col items-center justify-center">
        <div
          style={{
            transform: `rotate(${rotation}deg)`,
            display: "inline-block",
          }}
        >
          <ArrowIcon size={16} color="#ff6a34ff" fill="#ff6a34ff" />
        </div>
        <span className="text-[.6rem] mt-0.5">{data.dir}</span>
      </div>
    </div>
  );
};

const WeatherStat = ({
  data,
}: {
  data: { condition?: string; temp: number; code?: number | null };
}) => {
  // Function to get weather icon based on WMO code
  const getWeatherIcon = (code: number | null) => {
    if (code == null)
      return <Sun className="w-4 h-4" strokeWidth={3} color="#f79e55ff" />;

    // WMO code groupings
    if (code === 0)
      return <Sun className="w-4 h-4" strokeWidth={3} color="#f79e55ff" />; // Clear
    if ([1, 2, 3].includes(code))
      return <CloudSun className="w-4 h-4" color="#bdbdbdff" />; // Partly cloudy/overcast
    if ([45, 48].includes(code))
      return <CloudIcon className="w-4 h-4" color="#bdbdbdff" />; // Fog
    if ([51, 53, 55].includes(code))
      return <CloudDrizzle className="w-4 h-4" color="#66a3ffff" />; // Drizzle
    if ([56, 57].includes(code))
      return <CloudDrizzle className="w-4 h-4" color="#66a3ffff" />; // Freezing drizzle
    if ([61, 63, 65].includes(code))
      return <CloudRain className="w-4 h-4" color="#66a3ffff" />; // Rain
    if ([66, 67].includes(code))
      return <CloudRain className="w-4 h-4" color="#66a3ffff" />; // Freezing rain
    if ([71, 73, 75].includes(code))
      return <Snowflake className="w-4 h-4" color="#8ecaffff" />; // Snow
    if (code === 77) return <Snowflake className="w-4 h-4" color="#8ecaffff" />; // Snow grains
    if ([80, 81, 82].includes(code))
      return <CloudRain className="w-4 h-4" color="#66a3ffff" />; // Showers
    if ([85, 86].includes(code))
      return <Snowflake className="w-4 h-4" color="#8ecaffff" />; // Snow showers
    if ([95, 96, 99].includes(code))
      return <CloudLightning className="w-4 h-4" color="#ff8d6bff" />; // Thunderstorm/hail

    return <CloudIcon className="w-4 h-4" color="#bdbdbdff" />;
  };

  return (
    <div className="w-full flex justify-center items-center gap-0.5">
      {getWeatherIcon(data.code ?? null)}
      <span>
        <span className="text-base font-medium">{data.temp}</span>
        <span className="text-xs">&deg;F</span>
      </span>
    </div>
  );
};

const GeneralStat = ({
  val,
  unit,
  level,
}: {
  val: number | string;
  unit: string;
  level: string;
}) => {
  return (
    <span
      className={cn(
        "text-base font-medium flex justify-center items-center text-center gap-1 whitespace-nowrap rounded-sm p-1 h-10",
        level
      )}
    >
      {val}
      <span className="text-xs hidden sm:inline">{unit}</span>
    </span>
  );
};

type TableEntry = {
  index: number;
  time: string;
  wind: {
    label: string;
    dir: string;
    speed: number;
    max: number;
    deg?: number;
  };
  surf: { label: string; height: string };
  swell: {
    label: string;
    primary: { height: number; period: number; dir: string; deg: number };
    secondary: { height: number; period: number; dir: string; deg: number }[];
  };
  pressure: { label: string; value: number };
  weather: {
    label: string;
    condition: string;
    temp: number;
    code?: number | null;
  };
  water: { label: string; temp: number };
  energy: { label: string; value: number };
};

type TableDay = { date: string; dateMs: number; vals: TableEntry[] };

type DateLike = Date | undefined | null;

const isValidDate = (value: DateLike): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

const pacificStartOfDay = (input: Date) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZoneName: "short",
  });
  const parts = formatter.formatToParts(input);
  const partValue = (type: Intl.DateTimeFormatPart["type"]) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const year = Number(partValue("year"));
  const month = Number(partValue("month")) - 1;
  const day = Number(partValue("day"));
  const tzName = partValue("timeZoneName") || "";
  let offsetMinutes = 0;
  const match = tzName.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
  if (match) {
    const rawHours = match[1] ?? "+0";
    const sign = rawHours.startsWith("-") ? -1 : 1;
    const hours = Math.abs(Number(rawHours));
    const minutes = match[2] ? Number(match[2]) : 0;
    offsetMinutes = sign * (hours * 60 + minutes);
  }
  const utcMillis =
    Date.UTC(year, month, day, 0, 0, 0) - offsetMinutes * 60 * 1000;
  return new Date(utcMillis);
};

const DAY_MS = 24 * 60 * 60 * 1000;

const StatTable = ({
  numDays,
  numHours,
  header = false,
  beachId,
  date,
}: {
  numDays: number;
  numHours: number;
  header?: boolean;
  beachId?: string;
  date?: Date;
}) => {
  const [data, setData] = React.useState<TableDay[]>([]);
  const { selectedDays } = useDateContext();

  React.useEffect(() => {
    const load = async () => {
      try {
        if (!beachId) return;
        const resolved = await fetchBeachByIdLoose(beachId);
        const resolvedId = resolved?.id ?? beachId;
        const requestedDate = isValidDate(date) ? date : undefined;
        const anchor = requestedDate ?? new Date();
        const anchorStart = pacificStartOfDay(anchor);
        const bufferBefore = requestedDate ? 1 : 0;
        const bufferAfter = requestedDate ? 1 : 0;

        // Prioritize date prop over selectedDays for consistency with other charts
        const rangeStart = requestedDate
          ? new Date(anchorStart.getTime() - bufferBefore * DAY_MS)
          : selectedDays
          ? selectedDays[0]
          : new Date(anchorStart.getTime() - bufferBefore * DAY_MS);

        const daysToFetch = Math.max(numDays, 1) + bufferAfter;

        const rangeEnd = requestedDate
          ? new Date(anchorStart.getTime() + daysToFetch * DAY_MS)
          : selectedDays
          ? selectedDays[selectedDays.length - 1]
          : new Date(anchorStart.getTime() + daysToFetch * DAY_MS);
        const weekly = await fetchBeachForecast(
          resolvedId,
          rangeStart,
          rangeEnd
        );

        const byDay = new Map<string, ForecastData[]>();
        const fmtDayLabel = (d: Date) =>
          d.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            timeZone: "America/Los_Angeles",
          });
        weekly.forEach((row) => {
          const d = new Date(row.timestamp);
          const label = fmtDayLabel(d);
          const arr = byDay.get(label) ?? [];
          arr.push(row);
          byDay.set(label, arr);
        });

        const days: TableDay[] = [];
        const entriesByDay = Array.from(byDay.entries()).sort((a, b) => {
          const ta = new Date(a[1][0]?.timestamp ?? 0).getTime();
          const tb = new Date(b[1][0]?.timestamp ?? 0).getTime();
          return ta - tb;
        });
        const onlyLabel = requestedDate ? fmtDayLabel(requestedDate) : null;
        const onlyLabels = selectedDays
          ? selectedDays.map((day) => fmtDayLabel(day))
          : null;
        let allowedLabels: Set<string> | null = null;
        const labels = entriesByDay.map(([lbl]) => lbl);

        // Prioritize date prop over selectedDays
        if (onlyLabels) {
          allowedLabels = new Set(onlyLabels);
        } else if (onlyLabel) {
          if (onlyLabel && labels.includes(onlyLabel)) {
            allowedLabels = new Set([onlyLabel]);
          } else {
            if (requestedDate) {
              const prev = fmtDayLabel(
                new Date(requestedDate.getTime() - DAY_MS)
              );
              const next = fmtDayLabel(
                new Date(requestedDate.getTime() + DAY_MS)
              );
              const cands = [prev, next].filter((l) => labels.includes(l));
              if (cands.length) allowedLabels = new Set([cands[0]]);
            }
          }
        }
        console.log("ALL DAYS", entriesByDay);
        for (const [label, rows] of entriesByDay) {
          if (allowedLabels && !allowedLabels.has(label)) continue;
          rows.sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          const pacificHour = (ts: string) => {
            try {
              const fmt = new Intl.DateTimeFormat("en-US", {
                hour: "numeric",
                hour12: false,
                timeZone: "America/Los_Angeles",
              });
              const h = Number(fmt.format(new Date(ts)));
              return Number.isFinite(h) ? h : new Date(ts).getUTCHours();
            } catch {
              return new Date(ts).getUTCHours();
            }
          };
          const hourMap = new Map<number, ForecastData>();
          for (const r of rows) {
            hourMap.set(pacificHour(r.timestamp), r);
          }

          const THREE_HOUR_GRID = [0, 3, 6, 9, 12, 15, 18, 21];
          const SPOT_HOURS = [6, 12, 18];
          const baseHours =
            numHours <= SPOT_HOURS.length ? SPOT_HOURS : THREE_HOUR_GRID;
          const targetHours = baseHours.slice(
            0,
            Math.min(numHours, baseHours.length)
          );

          const makeEntryFromRow = (
            r: ForecastData,
            hour: number
          ): TableEntry => {
            const displayHour = hour % 12 === 0 ? 12 : hour % 12;
            const ampm = hour >= 12 ? "PM" : "AM";

            const windDir = getWindDirection(r.conditions.windDirection ?? 0);
            const windDeg = Math.round(r.conditions.windDirection ?? 0);
            const windSpeed = Math.round(r.conditions.windSpeed ?? 0);
            const windGust = Math.round(r.conditions.windGust ?? windSpeed);

            const min = r.surf.heightMin ?? 0;
            const max = r.surf.heightMax ?? 0;
            const minR = Math.round(min);
            const maxR = Math.round(max);
            const surfHeight =
              minR === 0 && maxR === 0
                ? "—"
                : minR === maxR
                ? `${maxR}`
                : `${minR}-${maxR}`;

            const priH =
              r.swell.primary.height != null
                ? Number(r.swell.primary.height.toFixed(1))
                : 0;
            const priP = Math.round(r.swell.primary.period ?? 0);
            const priDeg = Math.round(r.swell.primary.direction ?? 0);
            const priDir = getWindDirection(priDeg);

            const secList: TableEntry["swell"]["secondary"] = [];
            if (r.swell.secondary.height != null) {
              const sH = Number((r.swell.secondary.height ?? 0).toFixed(1));
              const sP = Math.round(r.swell.secondary.period ?? 0);
              const sDg = Math.round(r.swell.secondary.direction ?? 0);
              secList.push({
                height: sH,
                period: sP,
                dir: getWindDirection(sDg),
                deg: sDg,
              });
            }
            if (r.swell.tertiary?.height != null) {
              const tH = Number((r.swell.tertiary.height ?? 0).toFixed(1));
              const tP = Math.round(r.swell.tertiary.period ?? 0);
              const tDg = Math.round(r.swell.tertiary.direction ?? 0);
              secList.push({
                height: tH,
                period: tP,
                dir: getWindDirection(tDg),
                deg: tDg,
              });
            }

            const pressure =
              r.conditions.pressure != null
                ? Number(r.conditions.pressure.toFixed(2))
                : 0;

            return {
              index: hour,
              time: `${displayHour} ${ampm}`,
              wind: {
                label: "wind",
                dir: windDir,
                speed: windSpeed,
                max: windGust,
                deg: windDeg,
              },
              surf: { label: "surf", height: surfHeight },
              swell: {
                label: "swell",
                primary: {
                  height: priH,
                  period: priP,
                  dir: priDir,
                  deg: priDeg,
                },
                secondary: secList.slice(0, 2),
              },
              pressure: { label: "pressure", value: pressure },
              weather: {
                label: "weather",
                condition: "clear",
                temp: Math.round(r.conditions.airTemp ?? 0),
                code: r.conditions.weather ?? null,
              },
              water: {
                label: "water",
                temp: Math.round(r.conditions.waterTemp ?? 0),
              },
              energy: {
                label: "energy",
                value: Math.round(r.surf.waveEnergy ?? 0),
              },
            };
          };

          const makePlaceholder = (hour: number): TableEntry => {
            const displayHour = hour % 12 === 0 ? 12 : hour % 12;
            const ampm = hour >= 12 ? "PM" : "AM";
            return {
              index: hour,
              time: `${displayHour} ${ampm}`,
              wind: { label: "wind", dir: "—", speed: 0, max: 0, deg: 0 },
              surf: { label: "surf", height: "—" },
              swell: {
                label: "swell",
                primary: { height: 0, period: 0, dir: "—", deg: 0 },
                secondary: [],
              },
              pressure: { label: "pressure", value: 0 },
              weather: { label: "weather", condition: "clear", temp: 64 },
              water: { label: "water", temp: 64 },
              energy: { label: "energy", value: 278 },
            };
          };

          const entries: TableEntry[] = targetHours.map((h) => {
            const r = hourMap.get(h);
            return r ? makeEntryFromRow(r, h) : makePlaceholder(h);
          });

          const firstTs = rows[0]?.timestamp ?? new Date().toISOString();
          const d0 = new Date(firstTs);
          const midnight = new Date(
            d0.getFullYear(),
            d0.getMonth(),
            d0.getDate()
          ).getTime();
          days.push({ date: label, dateMs: midnight, vals: entries });
        }

        let finalDays = days;
        if (allowedLabels) {
          if (!onlyLabels) finalDays = days.slice(0, 1);
          else finalDays = days.slice(0, numDays);
        }
        setData(finalDays);
      } catch (e) {
        console.error("Failed to load StatTable data", e);
      }
    };
    load();
  }, [selectedDays, beachId, numDays, numHours, date]);

  const COLUMNS = [
    { id: "surf", label: "Surf" },
    { id: "wind", label: "Wind" },
    { id: "swellPrimary", label: "Primary Swell" },
    { id: "swellSecondary", label: "Secondary Swell" },
    { id: "swellTertiary", label: "Tertiary Swell" },
    { id: "weather", label: "Weather" },
    { id: "water", label: "Water" },
    { id: "energy", label: "Energy" },
    { id: "pressure", label: "Pressure" },
  ];

  const [visibleCols, setVisibleCols] = React.useState(0);
  const [width, setWidth] = React.useState(0);
  const [columnPages, setColumnPages] = React.useState([COLUMNS]);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [startIndex, setStartIndex] = React.useState(0);

  const tableRef = React.useRef<HTMLTableElement>(null);

  React.useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    const adjustData = () => {
      const width = table.clientWidth;
      setWidth(width);
      if (width < 700) {
        setVisibleCols(3);
        setColumnPages([
          COLUMNS.slice(0, 3),
          COLUMNS.slice(3, 6),
          COLUMNS.slice(6, COLUMNS.length),
        ]);
      } else if (width < 1050) {
        setVisibleCols(4);
        setColumnPages([COLUMNS.slice(0, 5), COLUMNS.slice(5, COLUMNS.length)]);
        setCurrentPage(0);
      } else {
        setVisibleCols(6);
        setColumnPages([COLUMNS]);
        setCurrentPage(0);
      }
    };

    const observer = new ResizeObserver(adjustData);
    observer.observe(table);

    adjustData();

    return () => observer.disconnect();
  }, []);

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, columnPages.length - 1));
  };
  const handleBack = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const visibleColumns = columnPages[currentPage];

  const windowSize = 4;

  const handleNextDays = () => {
    if (startIndex + windowSize < data.length) {
      setStartIndex((prev) => prev + 1);
    }
  };

  const handleBackDays = () => {
    if (startIndex > 0) {
      setStartIndex((prev) => prev - 1);
    }
  };

  const visibleDays = data.slice(startIndex, startIndex + windowSize);

  return (
    <div ref={tableRef}>
      <table className="w-full table-auto border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-1 bg-highlight-4" />
            {visibleColumns.map((col) => {
              return (
                <th
                  key={col.id}
                  className={cn(
                    "px-2 pb-3 text-center font-medium text-xs sm:text-sm"
                  )}
                >
                  {col.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {visibleDays.map((day, i) => {
            const content = day.vals.map((entry, rowIdx) => {
              return (
                <tr
                  key={`${i}-${entry.index}`}
                  className={cn(
                    rowIdx !== day.vals.length - 1 &&
                      "border-b border-border/40"
                  )}
                >
                  <th
                    scope="row"
                    className="relative w-5 h-14 border-r border-border/40 p-0"
                  >
                    <span className="-translate-x-1/2 -translate-y-1/2 transform absolute top-1/2 left-1/2 -rotate-90 text-xs">
                      {entry.index % 12 === 0 ? 12 : entry.index % 12}
                      <span className="font-medium text-[0.6rem]">
                        {entry.index >= 12 ? "PM" : "AM"}
                      </span>
                    </span>
                  </th>
                  {visibleColumns.map((col, colIdx) => {
                    // Functional color coding for surf ranges (matches DatePicker)
                    const getSurfLevel = (height: string) => {
                      if (height === "—") return "bg-highlight-3";
                      const match = height.match(/(\d+)-?(\d+)?/);
                      if (!match) return "bg-highlight-3";
                      // Use the max value from the range (e.g., "2-4" -> 4)
                      const maxHeight = match[2]
                        ? parseInt(match[2])
                        : parseInt(match[1]);
                      if (maxHeight >= 6) return "bg-red-400 dark:bg-red-700";
                      if (maxHeight >= 3)
                        return "bg-orange-400 dark:bg-orange-700";
                      return "bg-green-400 dark:bg-green-700";
                    };

                    let content;
                    switch (col.label) {
                      case "Wind":
                        content = <WindStat data={entry.wind} />;
                        break;
                      case "Weather":
                        content = <WeatherStat data={entry.weather} />;
                        break;
                      case "Surf":
                        content = (
                          <GeneralStat
                            val={entry.surf.height}
                            unit="ft"
                            level={getSurfLevel(entry.surf.height)}
                          />
                        );
                        break;
                      case "Primary Swell":
                        {
                          content = (
                            <SwellStat
                              primary
                              data={entry.swell?.primary as any}
                            />
                          );
                          break;
                        }
                        break;
                      case "Secondary Swell": {
                        const s0 = entry.swell?.secondary?.[0];
                        content = <SwellStat data={s0 as any} />;
                        break;
                      }
                      case "Tertiary Swell": {
                        const s1 = entry.swell?.secondary?.[1];
                        content = <SwellStat data={s1 as any} />;
                        break;
                      }
                      case "Pressure":
                        content = (
                          <GeneralStat
                            val={entry.pressure.value}
                            unit="in"
                            level="bg-highlight-2"
                          />
                        );
                        break;
                      case "Water":
                        content = (
                          <div className="w-full flex justify-center items-center gap-0.5">
                            <span>
                              <span className="text-base font-medium">
                                {entry.water.temp}
                              </span>
                              <span className="text-xs">&deg;F</span>
                            </span>
                          </div>
                        );
                        break;
                      case "Energy":
                        content = (
                          <GeneralStat
                            val={entry.energy.value}
                            unit="kJ"
                            level="bg-highlight-2"
                          />
                        );
                        break;
                    }
                    return (
                      <td
                        key={`${col.id}-${entry.index}`}
                        className={cn(
                          "px-1",
                          colIdx !== visibleColumns.length - 1 &&
                            "border-r border-border/40"
                        )}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            });
            return (
              <React.Fragment key={i}>
                {header && (
                  <tr key={`${i}-date`}>
                    <td
                      colSpan={10}
                      className="p-3 bg-highlight-5 font-semibold rounded-sm"
                    >
                      {day.date}
                    </td>
                  </tr>
                )}
                {content}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      {columnPages.length > 1 && (
        <div className="flex gap-2 items-center justify-center mt-2">
          <Button
            aria-label="previous columns"
            size="icon"
            className="border border-gray-100 hover:bg-gray-200 bg-gray-50 rounded-full"
            onClick={handleBack}
            disabled={currentPage === 0}
          >
            <ArrowLeft color="#494949ff" />
          </Button>
          <div className="flex gap-1">
            {columnPages.map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === currentPage ? "bg-foreground" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
          <Button
            aria-label="next columns"
            size="icon"
            className="border border-gray-100 hover:bg-gray-200 bg-gray-50 rounded-full"
            onClick={handleNext}
            disabled={currentPage === columnPages.length - 1}
          >
            <ArrowRight color="#494949ff" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default StatTable;
