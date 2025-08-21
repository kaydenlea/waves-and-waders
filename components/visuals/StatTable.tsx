"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { ArrowLeft, ArrowRight, MousePointer2 as ArrowIcon } from "lucide-react";

// Types for real forecast data
interface ForecastData {
  timestamp: string;
  swell: {
    primary: {
      height: number | null;
      period: number | null;
      direction: number | null;
    };
    secondary: {
      height: number | null;
      period: number | null;
      direction: number | null;
    };
    tertiary: {
      height: number | null;
      period: number | null;
      direction: number | null;
    };
  };
  surf: {
    heightMin: number | null;
    heightMax: number | null;
    waveEnergy: number | null;
  };
  conditions: {
    waterTemp: number | null;
    tideLevel: number | null;
    windSpeed: number | null;
    windGust: number | null;
    windDirection: number | null;
    airTemp: number | null;
    pressure: number | null;
    weather: number | null;
  };
}

interface StatTableProps {
  data?: ForecastData[];
  /** Force a number of visible columns (defaults to responsive auto if omitted) */
  visibleCols?: number;
  className?: string;
}

interface ProcessedHourData {
  index: number; // hour 0..23
  time: string;
  wind: { dir: string; speed: number; max: number };
  surf: { height: string; quality: string };
  swell: {
    primary: { height: number; period: number; dir: string; deg: number };
    secondary: Array<{ height: number; period: number; dir: string; deg: number }>;
  };
  pressure: { value: number };
  hasTertiary: boolean;
}

/* ---------- utils ---------- */

const round1 = (v: number | null | undefined): number => {
  if (v == null || Number.isNaN(v)) return 0;
  return Math.round(v * 10) / 10;
};

const getWindDirection = (degrees: number | null): string => {
  if (degrees === null || degrees === undefined) return "N";
  const norm = ((degrees % 360) + 360) % 360;
  const directions = [
    "N","NNE","NE","ENE","E","ESE","SE","SSE",
    "S","SSW","SW","WSW","W","WNW","NW","NNW",
  ];
  const index = Math.round(norm / 22.5) % 16;
  return directions[index];
};

const dirToDegrees = (dir: string): number => {
  const map: Record<string, number> = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
    E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
    S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
    W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
  };
  return map[dir] ?? 0;
};

const getSurfQuality = (height: number, windSpeed: number | null): string => {
  const isWindy = !!windSpeed && windSpeed > 15;
  if (height < 1) return "flat";
  if (height < 2) return isWindy ? "poor" : "fair";
  if (height < 4) return isWindy ? "fair" : "good";
  if (height < 8) return isWindy ? "fair" : "epic";
  return "huge";
};

const getQualityColor = (quality: string): string => {
  const colorMap: Record<string, string> = {
    flat: "bg-red-200",
    poor: "bg-orange-200",
    fair: "bg-yellow-200",
    good: "bg-green-200",
    epic: "bg-purple-200",
    huge: "bg-red-200",
  };
  return colorMap[quality] || "bg-gray-100";
};

const formatSurfHeight = (min: number | null, max: number | null): string => {
  if (min == null || max == null) return "0-1";
  if (min === max) return min.toFixed(0);
  return `${min.toFixed(0)}-${max.toFixed(0)}`;
};

const formatTime = (hour: number): string => {
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${displayHour} ${ampm}`;
};

const processHourlyData = (hourlyData: ForecastData[]): ProcessedHourData[] => {
  if (!hourlyData || hourlyData.length === 0) {
    // 8 rows (every 3 hours) of sample data
    return Array.from({ length: 8 }, (_, i) => {
      const hour = i * 3;
      return {
        index: hour,
        time: formatTime(hour),
        wind: { dir: "NNE", speed: 12, max: 17 },
        surf: { height: "2-3", quality: "fair" },
        swell: {
          primary: { height: 2.1, period: 7, dir: "W", deg: 270 },
          secondary: [
            { height: 1.8, period: 12, dir: "SW", deg: 225 },
            { height: 1.2, period: 9, dir: "S", deg: 180 },
          ],
        },
        pressure: { value: 29.94 },
        hasTertiary: false,
      };
    });
  }

  // use every 3rd point (0,3,6,...) for compact table
  const filtered = hourlyData.filter((_, idx) => idx % 3 === 0);

  return filtered.map((f) => {
    const d = new Date(f.timestamp);
    const hour = d.getHours();

    // wind
    const windSpeed = f.conditions.windSpeed ?? 0;
    const windGust = f.conditions.windGust ?? windSpeed;
    const windDir = getWindDirection(f.conditions.windDirection);

    // surf
    const surfMin = f.surf.heightMin ?? 0;
    const surfMax = f.surf.heightMax ?? 0;
    const avgHeight = (surfMin + surfMax) / 2;
    const surfHeight = formatSurfHeight(surfMin, surfMax);
    const surfQuality = getSurfQuality(avgHeight, windSpeed);

    // swell (use actual 3 components if available)
    const primary = {
      height: round1(f.swell.primary.height ?? 0),
      period: round1(f.swell.primary.period ?? 0),
      dir: getWindDirection(f.swell.primary.direction),
      deg: f.swell.primary.direction ?? dirToDegrees(getWindDirection(f.swell.primary.direction)),
    };

    const secondary = {
      height: round1(f.swell.secondary.height ?? 0),
      period: round1(f.swell.secondary.period ?? 0),
      dir: getWindDirection(f.swell.secondary.direction),
      deg: f.swell.secondary.direction ?? dirToDegrees(getWindDirection(f.swell.secondary.direction)),
    };

    const tertiary = {
      height: round1(f.swell.tertiary.height ?? 0),
      period: round1(f.swell.tertiary.period ?? 0),
      dir: getWindDirection(f.swell.tertiary.direction),
      deg: f.swell.tertiary.direction ?? dirToDegrees(getWindDirection(f.swell.tertiary.direction)),
    };

    const hasTertiary = (f.swell.tertiary.height ?? 0) > 0;

    const pressure = f.conditions.pressure ?? 29.92;

    return {
      index: hour,
      time: formatTime(hour),
      wind: { dir: windDir, speed: Math.round(windSpeed), max: Math.round(windGust) },
      surf: { height: surfHeight, quality: surfQuality },
      swell: {
        primary,
        secondary: [secondary, tertiary],
      },
      pressure: { value: Number(pressure.toFixed(2)) },
      hasTertiary,
    };
  });
};

/* ---------- small UI pieces ---------- */

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
      <div className={cn("flex items-center mt-0.5", primary ? "gap-1.5" : "gap-1")}>
        <span className="flex items-baseline gap-[1px] whitespace-nowrap">
          <span className={cn("font-semibold", primary ? "text-sm" : "text-xs")}>
            {data.height.toFixed(1)}
          </span>
          <span className={cn(primary ? "text-[.65rem]" : "text-[.6rem]")}>ft</span>
        </span>
        <span className="flex items-baseline gap-[1px] whitespace-nowrap">
          <span className={cn("font-semibold", primary ? "text-sm" : "text-xs")}>
            {Math.round(data.period)}
          </span>
          <span className={cn(primary ? "text-[.65rem]" : "text-[.6rem]")}>s</span>
        </span>

        {/* Rotated arrow for direction */}
        <ArrowIcon
          size={16}
          color="#51e72bff"
          fill="#51e72bff"
          style={{ transform: `rotate(${data.deg}deg)` }}
        />

        <span className="flex items-baseline gap-[1px] whitespace-nowrap">
          <span className={cn("font-semibold", primary ? "text-sm" : "text-xs")}>{data.dir}</span>
          <span className={cn(primary ? "text-[.65rem]" : "text-[.55rem]")}>
            {Math.round(data.deg)}&deg;
          </span>
        </span>
      </div>
    </div>
  );
};

const WindStat = ({ data }: { data: { dir: string; speed: number; max: number } }) => {
  const deg = dirToDegrees(data.dir);
  return (
    <div className="flex items-center gap-1">
      <div className="shadow-sm border border-border p-1 rounded-md text-center">
        <ArrowIcon
          size={16}
          color="#ff6a34ff"
          fill="#ff6a34ff"
          style={{ transform: `rotate(${deg}deg)` }}
        />
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

/* ---------- main component ---------- */

const StatTable = ({
  data: forecastData,
  visibleCols,
  className,
}: StatTableProps) => {
  const processedData = processHourlyData(forecastData || []);

  // If no prop provided, auto decide visible columns based on container width
  const [autoVisibleCols, setAutoVisibleCols] = React.useState<number>(5);

  React.useEffect(() => {
    if (visibleCols != null) return; // user controls it
    const handleResize = () => {
      const el = document.querySelector("#content-container") as HTMLElement | null;
      const width = el?.clientWidth ?? window.innerWidth;
      if (width < 750) {
        setAutoVisibleCols(3);
      } else {
        setAutoVisibleCols(5);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [visibleCols]);

  const effectiveVisibleCols = visibleCols ?? autoVisibleCols;

  const COLUMNS = [
    { id: "wind", label: "Wind" },
    { id: "surf", label: "Surf" },
    { id: "swellPrimary", label: "Swell" },
    { id: "swellSecond", label: "Secondary Swell" },
    { id: "pressure", label: "Pressure" },
  ];

  const columnPages =
    effectiveVisibleCols !== 5
      ? [COLUMNS.slice(0, effectiveVisibleCols), COLUMNS.slice(effectiveVisibleCols)]
      : [COLUMNS];

  const [currentPage, setCurrentPage] = React.useState(0);

  const handleNext = () => setCurrentPage((p) => Math.min(p + 1, columnPages.length - 1));
  const handleBack = () => setCurrentPage((p) => Math.max(p - 1, 0));

  const visibleColumns = columnPages[currentPage];

  const hasAnyTertiaryData = processedData.some((e) => e.hasTertiary);

  return (
    <div className={cn("h-full bg-background border border-border p-2 rounded-md shadow-sm", className)}>
      <header className="mx-4 mt-4 mb-6">
        <h3 className="leading-none font-semibold">Hourly Statistics</h3>
        <span className="text-muted-foreground text-sm">
          Hourly stats for the day
          {forecastData && ` (${processedData.length} data points)`}
          {hasAnyTertiaryData && <span className="text-green-600"> • Tertiary swell detected</span>}
        </span>
      </header>

      <table className="w-full table-auto border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-1 bg-background" />
            {visibleColumns.map((col) => (
              <th key={col.id} className={cn("px-2 pb-3 text-left font-medium text-xs sm:text-sm")}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {processedData.map((entry, rowIdx) => (
            <tr key={entry.index} className="border-b border-border hover:bg-gray-50 transition">
              {/* Time rail */}
              <th scope="row" className="relative w-5 h-14 border-r border-border p-0">
                <span className="-translate-x-1/2 -translate-y-1/2 transform absolute top-1/2 left-1/2 -rotate-90 text-xs">
                  {entry.index % 12 === 0 ? 12 : entry.index % 12}
                  <span className="font-medium text-[0.6rem]">{entry.index >= 12 ? "PM" : "AM"}</span>
                </span>
              </th>

              {visibleColumns.map((col, colIdx) => {
                const qualityBg = getQualityColor(entry.surf.quality);

                let content: React.ReactNode = null;
                switch (col.label) {
                  case "Wind":
                    content = <WindStat data={entry.wind} />;
                    break;
                  case "Surf":
                    content = (
                      <span
                        className={cn(
                          "text-base font-medium flex justify-center items-center text-center gap-1 whitespace-nowrap rounded-sm p-1 h-10",
                          qualityBg
                        )}
                      >
                        {entry.surf.height}
                        <span className="text-xs hidden sm:inline">ft</span>
                      </span>
                    );
                    break;
                  case "Swell":
                    content = <SwellStat primary data={entry.swell.primary} />;
                    break;
                  case "Secondary Swell":
                    content = (
                      <div className="flex gap-1">
                        <SwellStat data={entry.swell.secondary[0]} />
                        {/* Only show tertiary if it has meaningful data */}
                        {entry.hasTertiary && entry.swell.secondary[1].height > 0 && (
                          <SwellStat data={entry.swell.secondary[1]} />
                        )}
                      </div>
                    );
                    break;
                  case "Pressure":
                    content = (
                      <span className="text-base font-medium flex justify-center items-center text-center gap-1 whitespace-nowrap rounded-sm p-1 h-10 bg-highlight-1">
                        {entry.pressure.value}
                        <span className="text-xs hidden sm:inline">inHg</span>
                      </span>
                    );
                    break;
                }

                return (
                  <td
                    key={`${col.id}-${entry.index}`}
                    className={cn("px-1", colIdx !== visibleColumns.length - 1 && "border-r border-border")}
                  >
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Column pagination for narrow layouts */}
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
                className={`h-2 w-2 rounded-full transition-colors ${i === currentPage ? "bg-foreground" : "bg-gray-300"}`}
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

      {/* Data quality indicator */}
      {(!forecastData || forecastData.length === 0) && (
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Showing sample data — connect to API for live conditions
        </div>
      )}
    </div>
  );
};

export default StatTable;
