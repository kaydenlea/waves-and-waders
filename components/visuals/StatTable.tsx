"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
  ArrowLeft,
  ArrowRight,
  MousePointer2 as ArrowIcon,
} from "lucide-react";
import DaySlider from "../general/DaySlider";
import {
  fetchBeachByIdLoose,
  fetchBeachForecast,
  getWindDirection,
  type ForecastData,
} from "@/lib/supabase";

const SwellStat = ({
  primary = false,
  data,
}: {
  primary?: boolean;
  data?: { height?: number | string | null; period?: number | null; dir?: string | null; deg?: number | null } | null;
}) => {
  const height = data?.height ?? "—";
  const period = data?.period ?? "—";
  const dir = data?.dir ?? "—";
  const deg = data?.deg ?? "—";
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
          primary ? "gap-1.5" : "gap-1"
        )}
      >
        <span className="flex items-baseline gap-[1px] whitespace-nowrap">
          <span className={cn("font-semibold", primary ? "text-sm" : "text-xs")}>
            {height}
          </span>
          <span className={cn(primary ? "text-[.65rem]" : "text-[.6rem]")}>
            ft
          </span>
        </span>
        <span className="flex items-baseline gap-[1px] whitespace-nowrap">
          <span className={cn("font-semibold", primary ? "text-sm" : "text-xs")}>
            {period}
          </span>
          <span className={cn(primary ? "text-[.65rem]" : "text-[.6rem]")}>
            s
          </span>
        </span>
        <ArrowIcon size={16} color="#51e72bff" fill="#51e72bff" />
        <span className="flex items-baseline gap-[1px] whitespace-nowrap">
          <span className={cn("font-semibold", primary ? "text-sm" : "text-xs")}>
            {dir}
          </span>
          <span className={cn(primary ? "text-[.65rem]" : "text-[.55rem]")}>
            {deg}&deg;
          </span>
        </span>
      </div>
    </div>
  );
};

const WindStat = ({
  data,
}: {
  data: { dir: string; speed: number; max: number };
}) => {
  return (
    <div className="flex items-center gap-1">
      <div className="shadow-sm border border-border p-1 rounded-md text-center">
        <ArrowIcon size={16} color="#ff6a34ff" fill="#ff6a34ff" />
        <span className="text-[.6rem]">{data.dir}</span>
      </div>
      <span className="flex-1 justify-center flex gap-1 bg-highlight-1 rounded-md py-2 px-3">
        <span className="text-lg font-medium">{data.speed}</span>
        <span className="flex flex-col -space-y-1">
          <span className="text-[0.6rem]">{data.max}</span>
          <span className="text-[0.7rem]">mph</span>
        </span>
      </span>
    </div>
  );
};

type TableEntry = {
  index: number; // hour in local time (0,3,6,...)
  time: string;  // e.g., "3 PM"
  wind: { label: string; dir: string; speed: number; max: number };
  surf: { label: string; height: string };
  swell: {
    label: string;
    primary: { height: number; period: number; dir: string; deg: number };
    secondary: { height: number; period: number; dir: string; deg: number }[];
  };
  pressure: { label: string; value: number };
};

type TableDay = { date: string; dateMs: number; vals: TableEntry[] };

type DateLike = Date | undefined | null;

const isValidDate = (value: DateLike): value is Date => value instanceof Date && !Number.isNaN(value.getTime());

const pacificStartOfDay = (input: Date) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZoneName: "short",
  });
  const parts = formatter.formatToParts(input);
  const partValue = (type: Intl.DateTimeFormatPart["type"]) => parts.find((p) => p.type === type)?.value ?? "";
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
  const utcMillis = Date.UTC(year, month, day, 0, 0, 0) - offsetMinutes * 60 * 1000;
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
        const rangeStart = new Date(anchorStart.getTime() - bufferBefore * DAY_MS);
        const daysToFetch = Math.max(numDays, 1) + bufferAfter;
        const rangeEnd = new Date(anchorStart.getTime() + daysToFetch * DAY_MS);
        const weekly = await fetchBeachForecast(resolvedId, rangeStart, rangeEnd);

        // Group by Pacific date (explicit timezone to avoid browser locale shifts)
        const byDay = new Map<string, ForecastData[]>();
        const fmtDayLabel = (d: Date) => d.toLocaleDateString("en-US", {
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

        // Build table structure
        const days: TableDay[] = [];
        const entriesByDay = Array.from(byDay.entries()).sort((a, b) => {
          // sort days chronologically by first timestamp
          const ta = new Date(a[1][0]?.timestamp ?? 0).getTime();
          const tb = new Date(b[1][0]?.timestamp ?? 0).getTime();
          return ta - tb;
        });

        const onlyLabel = requestedDate ? fmtDayLabel(requestedDate) : null;

        // Optionally narrow to selected label; if no exact match, try +/- 1 day as fallback
        let allowedLabels: Set<string> | null = null;
        if (onlyLabel) {
          const labels = entriesByDay.map(([lbl]) => lbl);
          if (labels.includes(onlyLabel)) {
            allowedLabels = new Set([onlyLabel]);
          } else {
            if (requestedDate) {
              const prev = fmtDayLabel(new Date(requestedDate.getTime() - DAY_MS));
              const next = fmtDayLabel(new Date(requestedDate.getTime() + DAY_MS));
              const cands = [prev, next].filter((l) => labels.includes(l));
              if (cands.length) allowedLabels = new Set([cands[0]]);
            }
          }
        }

        for (const [label, rows] of entriesByDay) {
          if (allowedLabels && !allowedLabels.has(label)) continue;
          // Sort by time ascending
          rows.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          const pacificHour = (ts: string) => {
            try {
              const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Los_Angeles' });
              const h = Number(fmt.format(new Date(ts)));
              return Number.isFinite(h) ? h : new Date(ts).getUTCHours();
            } catch { return new Date(ts).getUTCHours(); }
          };
          // Build a map from Pacific hour -> row
          const hourMap = new Map<number, ForecastData>();
          for (const r of rows) {
            hourMap.set(pacificHour(r.timestamp), r);
          }

          // Target hours start at 12 AM local; default to 3-hour grid
          const THREE_HOUR_GRID = [0, 3, 6, 9, 12, 15, 18, 21];
          const targetHours = THREE_HOUR_GRID.slice(0, Math.min(numHours, THREE_HOUR_GRID.length));

          const makeEntryFromRow = (r: ForecastData, hour: number): TableEntry => {
            const displayHour = ((hour % 12) === 0 ? 12 : (hour % 12));
            const ampm = hour >= 12 ? "PM" : "AM";

            const windDir = getWindDirection(r.conditions.windDirection ?? 0);
            const windSpeed = Math.round(r.conditions.windSpeed ?? 0);
            const windGust = Math.round(r.conditions.windGust ?? windSpeed);

            const min = r.surf.heightMin ?? 0;
            const max = r.surf.heightMax ?? 0;
            const minR = Math.round(min);
            const maxR = Math.round(max);
            const surfHeight = (minR === 0 && maxR === 0) ? "—" : (minR === maxR ? `${maxR}` : `${minR}-${maxR}`);

            const priH = r.swell.primary.height != null ? Number((r.swell.primary.height).toFixed(1)) : 0;
            const priP = Math.round(r.swell.primary.period ?? 0);
            const priDeg = Math.round(r.swell.primary.direction ?? 0);
            const priDir = getWindDirection(priDeg);

            const secList: TableEntry["swell"]["secondary"] = [];
            if (r.swell.secondary.height != null) {
              const sH = Number((r.swell.secondary.height ?? 0).toFixed(1));
              const sP = Math.round(r.swell.secondary.period ?? 0);
              const sDg = Math.round(r.swell.secondary.direction ?? 0);
              secList.push({ height: sH, period: sP, dir: getWindDirection(sDg), deg: sDg });
            }
            if (r.swell.tertiary?.height != null) {
              const tH = Number((r.swell.tertiary.height ?? 0).toFixed(1));
              const tP = Math.round(r.swell.tertiary.period ?? 0);
              const tDg = Math.round(r.swell.tertiary.direction ?? 0);
              secList.push({ height: tH, period: tP, dir: getWindDirection(tDg), deg: tDg });
            }

            const pressure = r.conditions.pressure != null ? Number((r.conditions.pressure).toFixed(2)) : 0;

            return {
              index: hour,
              time: `${displayHour} ${ampm}`,
              wind: { label: "wind", dir: windDir, speed: windSpeed, max: windGust },
              surf: { label: "surf", height: surfHeight },
              swell: {
                label: "swell",
                primary: { height: priH, period: priP, dir: priDir, deg: priDeg },
                secondary: secList.slice(0, 2),
              },
              pressure: { label: "pressure", value: pressure },
            };
          };

          const makePlaceholder = (hour: number): TableEntry => {
            const displayHour = ((hour % 12) === 0 ? 12 : (hour % 12));
            const ampm = hour >= 12 ? "PM" : "AM";
            return {
              index: hour,
              time: `${displayHour} ${ampm}`,
              wind: { label: "wind", dir: "—", speed: 0, max: 0 },
              surf: { label: "surf", height: "—" },
              swell: {
                label: "swell",
                primary: { height: 0, period: 0, dir: "—", deg: 0 },
                secondary: [],
              },
              pressure: { label: "pressure", value: 0 },
            };
          };

          const entries: TableEntry[] = targetHours.map((h) => {
            const r = hourMap.get(h);
            return r ? makeEntryFromRow(r, h) : makePlaceholder(h);
          });

          // Use first row's midnight for stable date range labeling
          const firstTs = rows[0]?.timestamp ?? new Date().toISOString();
          const d0 = new Date(firstTs);
          const midnight = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate()).getTime();
          days.push({ date: label, dateMs: midnight, vals: entries });
        }

        // Keep only requested number of days
        const finalDays = allowedLabels ? days.slice(0, 1) : days.slice(0, numDays);
        setData(finalDays);
      } catch (e) {
        console.error("Failed to load StatTable data", e);
      }
    };
    load();
  }, [beachId, numDays, numHours, date]);

  const COLUMNS = [
    { id: "wind", label: "Wind" },
    { id: "surf", label: "Surf" },
    { id: "swellPriamry", label: "Swell" },
    { id: "swellSecond", label: "Secondary Swell" },
    { id: "pressure", label: "Pressure" },
  ];

  const [visibleCols, setVisibleCols] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [startIndex, setStartIndex] = React.useState(0);

  React.useEffect(() => {
    const handleResize = () => {
      const tableContainer = document.querySelector("#content");
      const width = tableContainer ? tableContainer.clientWidth : 0;

      if (width < 750) {
        setVisibleCols(3);
      } else {
        setVisibleCols(5);
        setCurrentPage(0);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const columnPages =
    visibleCols !== 5
      ? [
          COLUMNS.slice(0, visibleCols),
          COLUMNS.slice(visibleCols, COLUMNS.length),
        ]
      : [COLUMNS];

  // handle visible columns
  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, columnPages.length - 1));
  };
  const handleBack = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const visibleColumns = columnPages[currentPage];

  // handle visible days

  // show 3 days at a time
  const windowSize = 3;

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
    <>
      {windowSize < data.length && (
        <DaySlider
          handleBack={handleBackDays}
          handleNext={handleNextDays}
          windowSize={3}
          length={data.length}
          startIndex={startIndex}
          days={(() => {
            const s = data[startIndex];
            const e = data[Math.min(startIndex + windowSize - 1, data.length - 1)];
            if (!s || !e) return "";
            const fmt = (ms: number) => new Date(ms).toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
            return `${fmt(s.dateMs)} - ${fmt(e.dateMs)}`;
          })()}
        />
      )}
      <table className="w-full table-auto border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-1 bg-highlight-4" />
            {visibleColumns.map((col) => {
              return (
                <th
                  key={col.id}
                  className={cn(
                    "px-2 pb-3 text-left font-medium text-xs sm:text-sm"
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
                    const level =
                      rowIdx % 3 === 0
                        ? "bg-green"
                        : rowIdx % 2 === 0
                        ? "bg-orange"
                        : "bg-red";
                    let content;
                    switch (col.label) {
                      case "Wind":
                        content = <WindStat data={entry.wind} />;
                        break;
                      case "Surf":
                        content = (
                          <span
                            className={cn(
                              "text-base font-medium flex justify-center items-center text-center gap-1 whitespace-nowrap rounded-sm p-1 h-10",
                              level
                            )}
                          >
                            {entry.surf.height}
                            <span className="text-xs hidden sm:inline">ft</span>
                          </span>
                        );
                        break;
                      case "Swell": {
                        content = (
                          <SwellStat primary data={entry.swell?.primary as any} />
                        );
                        break;
                      }
                        break;
                      case "Secondary Swell": {
                        const s0 = entry.swell?.secondary?.[0];
                        const s1 = entry.swell?.secondary?.[1];
                        content = (
                          <div className="flex gap-1">
                            <SwellStat data={s0 as any} />
                            <SwellStat data={s1 as any} />
                          </div>
                        );
                        break;
                      }
                      case "Pressure":
                        content = (
                          <span
                            className={cn(
                              "text-base font-medium flex justify-center items-center text-center gap-1 whitespace-nowrap rounded-sm p-1 h-10",
                              level
                            )}
                          >
                            {entry.pressure.value}
                            <span className="text-xs hidden sm:inline">in</span>
                          </span>
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
                      colSpan={6}
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
    </>
  );
};

export default StatTable;

