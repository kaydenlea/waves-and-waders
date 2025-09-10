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
  fetchWeeklyForecast,
  getWindDirection,
  type ForecastData,
} from "@/lib/supabase";

const SwellStat = ({
  primary = false,
  data,
}: {
  primary?: boolean;
  data: { height: number; period: number; dir: string; deg: number };
}) => {
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
          <span
            className={cn("font-semibold", primary ? "text-sm" : "text-xs")}
          >
            {data.height}
          </span>
          <span className={cn(primary ? "text-[.65rem]" : "text-[.6rem]")}>
            ft
          </span>
        </span>
        <span className="flex items-baseline gap-[1px] whitespace-nowrap">
          <span
            className={cn("font-semibold", primary ? "text-sm" : "text-xs")}
          >
            {data.period}
          </span>
          <span className={cn(primary ? "text-[.65rem]" : "text-[.6rem]")}>
            s
          </span>
        </span>
        <ArrowIcon size={16} color="#51e72bff" fill="#51e72bff" />
        <span className="flex items-baseline gap-[1px] whitespace-nowrap">
          <span
            className={cn("font-semibold", primary ? "text-sm" : "text-xs")}
          >
            {data.dir}
          </span>
          <span className={cn(primary ? "text-[.65rem]" : "text-[.55rem]")}>
            {data.deg}&deg;
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

const StatTable = ({
  numDays,
  numHours,
  header = false,
  beachId,
}: {
  numDays: number;
  numHours: number;
  header?: boolean;
  beachId?: string;
}) => {
  const [data, setData] = React.useState<TableDay[]>([]);

  React.useEffect(() => {
    const load = async () => {
      try {
        if (!beachId) return;
        const resolved = await fetchBeachByIdLoose(beachId);
        const resolvedId = resolved?.id ?? beachId;
        const weekly = await fetchWeeklyForecast(resolvedId);

        // Group by local (Pacific) date
        const byDay = new Map<string, ForecastData[]>();
        weekly.forEach((row) => {
          const d = new Date(row.timestamp);
          // Format like "Monday, July 10"
          const label = d.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          });
          const arr = byDay.get(label) ?? [];
          arr.push(row);
          byDay.set(label, arr);
        });

        // Build table structure
        const days: TableDay[] = [];
        for (const [label, rows] of byDay.entries()) {
          // Sort by time ascending
          rows.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          const entries: TableEntry[] = rows.slice(0, numHours).map((r) => {
            const t = new Date(r.timestamp);
            const hour = t.getHours();
            const displayHour = ((hour % 12) === 0 ? 12 : (hour % 12));
            const ampm = hour >= 12 ? "PM" : "AM";

            const windDir = getWindDirection(r.conditions.windDirection ?? 0);
            const windSpeed = Math.round(r.conditions.windSpeed ?? 0);
            const windGust = Math.round(r.conditions.windGust ?? windSpeed);

            const min = r.surf.heightMin ?? 0;
            const max = r.surf.heightMax ?? 0;
            const minR = Math.round(min);
            const maxR = Math.round(max);
            const surfHeight = minR === maxR ? `${maxR}` : `${minR}-${maxR}`;

            const priH = Number((r.swell.primary.height ?? 0).toFixed(1));
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
          });

          // Use first row's midnight for stable date range labeling
          const firstTs = rows[0]?.timestamp ?? new Date().toISOString();
          const d0 = new Date(firstTs);
          const midnight = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate()).getTime();
          days.push({ date: label, dateMs: midnight, vals: entries });
        }

        // Keep only requested number of days if provided
        const finalDays = days.slice(0, numDays);
        setData(finalDays);
      } catch (e) {
        console.error("Failed to load StatTable data", e);
      }
    };
    load();
  }, [beachId, numDays, numHours]);

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
                      case "Swell":
                        content = (
                          <SwellStat primary data={entry.swell.primary} />
                        );
                        break;
                      case "Secondary Swell":
                        content = (
                          <div className="flex gap-1">
                            <SwellStat data={entry.swell.secondary[0]} />
                            <SwellStat data={entry.swell.secondary[1]} />
                          </div>
                        );
                        break;
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
