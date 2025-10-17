"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import SwellStat from "../general/Stats/SwellStat";

import {
  Sun,
  Droplets,
  MoonStar,
  Wind,
  CircleGauge,
  Waves,
  Atom,
  Shell,
  Cloud as CloudIcon,
  CloudSun,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  Snowflake,
} from "lucide-react";

const WeatherStat = ({
  temp,
  condition,
  label,
  weatherCode,
}: {
  temp: number;
  condition?: string;
  label: string;
  weatherCode?: number | null;
}) => {
  // Function to get weather icon based on WMO code
  const getWeatherIcon = (code: number | null) => {
    if (code == null)
      return <Sun className="w-5 h-5" strokeWidth={3} color="#f79e55ff" />;

    // WMO code groupings
    if (code === 0)
      return <Sun className="w-5 h-5" strokeWidth={3} color="#f79e55ff" />; // Clear
    if ([1, 2, 3].includes(code))
      return <CloudSun className="w-5 h-5" color="#bdbdbdff" />; // Partly cloudy/overcast
    if ([45, 48].includes(code))
      return <CloudIcon className="w-5 h-5" color="#bdbdbdff" />; // Fog
    if ([51, 53, 55].includes(code))
      return <CloudDrizzle className="w-5 h-5" color="#66a3ffff" />; // Drizzle
    if ([56, 57].includes(code))
      return <CloudDrizzle className="w-5 h-5" color="#66a3ffff" />; // Freezing drizzle
    if ([61, 63, 65].includes(code))
      return <CloudRain className="w-5 h-5" color="#66a3ffff" />; // Rain
    if ([66, 67].includes(code))
      return <CloudRain className="w-5 h-5" color="#66a3ffff" />; // Freezing rain
    if ([71, 73, 75].includes(code))
      return <Snowflake className="w-5 h-5" color="#8ecaffff" />; // Snow
    if (code === 77) return <Snowflake className="w-5 h-5" color="#8ecaffff" />; // Snow grains
    if ([80, 81, 82].includes(code))
      return <CloudRain className="w-5 h-5" color="#66a3ffff" />; // Showers
    if ([85, 86].includes(code))
      return <Snowflake className="w-5 h-5" color="#8ecaffff" />; // Snow showers
    if ([95, 96, 99].includes(code))
      return <CloudLightning className="w-5 h-5" color="#ff8d6bff" />; // Thunderstorm/hail

    return <CloudIcon className="w-5 h-5" color="#bdbdbdff" />;
  };

  return (
    <HighlightCard label={label}>
      <div className="flex items-center justify-center gap-0.5">
        {getWeatherIcon(weatherCode ?? null)}
        <span className="text-2xl font-semibold">
          {temp}
          <span className="text-sm font-normal">&deg;F</span>
        </span>
      </div>
    </HighlightCard>
  );
};

const BasicStat = ({
  data,
  label,
}: {
  data: { value: number | string; unit: string };
  label: string;
}) => {
  return (
    <HighlightCard label={label}>
      <span className="text-2xl font-semibold rounded-md pb-5">
        {data.value}
        <span className="text-sm font-normal">{data.unit}</span>
      </span>
    </HighlightCard>
  );
};

type MoonKind =
  | "new"
  | "waxing_crescent"
  | "first_quarter"
  | "waxing_gibbous"
  | "full"
  | "waning_gibbous"
  | "last_quarter"
  | "waning_crescent";

function getMoonPhaseInfo(raw: string | number): {
  kind: MoonKind;
  lines: [string, string];
} {
  const toKindFromNumber = (n: number): MoonKind => {
    if (n === 0) return "new";
    if (n > 0 && n < 0.25) return "waxing_crescent";
    if (n === 0.25) return "first_quarter";
    if (n > 0.25 && n < 0.5) return "waxing_gibbous";
    if (n === 0.5) return "full";
    if (n > 0.5 && n < 0.75) return "waning_gibbous";
    if (n === 0.75) return "last_quarter";
    return "waning_crescent"; // 0.75 - 1
  };

  let kind: MoonKind | null = null;
  if (typeof raw === "number") {
    kind = toKindFromNumber(raw);
  } else {
    const s = raw.trim().toLowerCase();
    const num = Number(s);
    if (!Number.isNaN(num)) {
      kind = toKindFromNumber(num);
    } else {
      if (s.includes("new")) kind = "new";
      else if (s.includes("first") && s.includes("quarter"))
        kind = "first_quarter";
      else if (s.includes("last") && s.includes("quarter"))
        kind = "last_quarter";
      else if (s.includes("full")) kind = "full";
      else if (s.includes("waxing") && s.includes("crescent"))
        kind = "waxing_crescent";
      else if (s.includes("waning") && s.includes("crescent"))
        kind = "waning_crescent";
      else if (s.includes("waxing") && s.includes("gibbous"))
        kind = "waxing_gibbous";
      else if (s.includes("waning") && s.includes("gibbous"))
        kind = "waning_gibbous";
      else kind = "new";
    }
  }

  const labelMap: Record<MoonKind, [string, string]> = {
    new: ["New", "Moon"],
    waxing_crescent: ["Waxing", "Crescent"],
    first_quarter: ["First", "Quarter"],
    waxing_gibbous: ["Waxing", "Gibbous"],
    full: ["Full", "Moon"],
    waning_gibbous: ["Waning", "Gibbous"],
    last_quarter: ["Last", "Quarter"],
    waning_crescent: ["Waning", "Crescent"],
  };

  return { kind, lines: labelMap[kind] };
}

const getMoonEmoji = (kind: MoonKind): string => {
  switch (kind) {
    case "new":
      return "🌑";
    case "waxing_crescent":
      return "🌒";
    case "first_quarter":
      return "🌓";
    case "waxing_gibbous":
      return "🌔";
    case "full":
      return "🌕";
    case "waning_gibbous":
      return "🌖";
    case "last_quarter":
      return "🌗";
    case "waning_crescent":
      return "🌘";
  }
};

const MoonStat = ({
  label,
  data,
}: {
  label: string;
  data: string | number;
}) => {
  const info = getMoonPhaseInfo(data);
  return (
    <HighlightCard label={label}>
      <div className="flex items-center justify-center gap-0.5">
        <span
          role="img"
          aria-label={`${info.lines[0]} ${info.lines[1]}`}
          style={{ fontSize: 26, lineHeight: 1 }}
        >
          {getMoonEmoji(info.kind)}
        </span>
        <div className="flex flex-col font-semibold">
          <span className="text-[0.8rem] -mb-1">{info.lines[0]}</span>
          <span className="text-[0.8rem]">{info.lines[1]}</span>
        </div>
      </div>
    </HighlightCard>
  );
};

const WindStat = ({
  data,
  label,
}: {
  data: { speed: number; max: number };
  label: string;
}) => {
  return (
    <HighlightCard label={label}>
      <span className="flex gap-1">
        <span className="text-2xl font-semibold">{data.speed}</span>
        <span className="flex flex-col -space-y-1">
          <span className="text-[0.7rem] font-semibold">{data.max}</span>
          <span className="text-[0.8rem]">mph</span>
        </span>
      </span>
    </HighlightCard>
  );
};

const HighlightCard = ({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) => {
  const iconMap: Record<string, { icon: React.ReactNode; bgColor: string }> = {
    wind: {
      icon: <Wind size={16} className="text-gray-700" />,
      bgColor: "bg-gray-50",
    },
    water: {
      icon: <Droplets size={16} className="text-blue-400" />,
      bgColor: "bg-blue-100",
    },
    weather: {
      icon: <Sun size={16} className="text-orange-500" />,
      bgColor: "bg-orange-100",
    },
    moon: {
      icon: <MoonStar size={16} className="text-purple-600" />,
      bgColor: "bg-purple-100",
    },
    pressure: {
      icon: <CircleGauge size={16} className="text-yellow-800" />,
      bgColor: "bg-yellow-100",
    },
    swell: {
      icon: <Shell size={16} className="text-blue-900" />,
      bgColor: "bg-blue-200",
    },
    tide: {
      icon: <Waves size={16} className="text-blue-500" />,
      bgColor: "bg-blue-100",
    },
    energy: {
      icon: <Atom size={16} className="text-red-400" />,
      bgColor: "bg-red-100",
    },
  };
  return (
    <div className="flex flex-col gap-4 items-center">
      <h3 className="absolute top-2 left-2 text-muted-foreground text-[0.7rem] font-medium whitespace-nowrap">
        {label.toUpperCase()}
      </h3>
      <div className="p-0.5 rounded-full bg-highlight-5/50 border border-border/40 absolute -top-3 right-1">
        <div
          className={cn(
            "flex justify-center items-center w-8 h-8 rounded-full",
            iconMap[label].bgColor
          )}
        >
          {iconMap[label].icon}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
};

import {
  fetchCurrentConditions,
  fetchDailyConditions,
  fetchBeachForecast,
  fetchBeachByIdLoose,
  getWindDirection,
  fetchBeachTides,
} from "@/lib/supabase";

type Stat =
  | {
      label: "weather";
      weather: { temp: number; condition?: string; code?: number | null };
    }
  | { label: "water"; temp: number }
  | {
      label: "swell";
      primary: {
        height: number;
        period: number;
        wind: { dir: string; deg: number };
      };
      secondary: [
        { height: number; period: number; wind: { dir: string; deg: number } },
        { height: number; period: number; wind: { dir: string; deg: number } }
      ];
    }
  | { label: "tide"; tide: { value: number | string; unit: string } }
  | { label: "moon"; phase: string | number }
  | { label: "wind"; wind: { speed: number; max: number } }
  | { label: "pressure"; pressure: { value: number; unit: string } }
  | { label: "energy"; energy: { value: number; unit: string } };

const Highlights = ({
  beachId,
  date,
  hour,
  startIdx = 0,
  endIdx = 7,
  isFull,
}: {
  beachId?: string;
  date?: Date;
  hour?: number;
  startIdx?: number;
  endIdx?: number;
  isFull?: boolean;
}) => {
  const [stats, setStats] = useState<Stat[]>([
    {
      label: "weather",
      weather: { temp: 64, condition: "sun" },
    },
    {
      label: "swell",
      primary: { height: 2.1, period: 7, wind: { dir: "W", deg: 272 } },
      secondary: [
        { height: 2.1, period: 7, wind: { dir: "W", deg: 272 } },
        { height: 2.1, period: 7, wind: { dir: "W", deg: 272 } },
      ],
    },
    { label: "water", temp: 60 },
    { label: "tide", tide: { value: "2-3", unit: "ft" } },
    { label: "wind", wind: { speed: 12, max: 17 } },
    { label: "moon", phase: "Waning Cresent" },
    { label: "pressure", pressure: { value: 29.9, unit: "in" } },
    { label: "energy", energy: { value: 278, unit: "kJ" } },
  ]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!beachId) return;
        const beach = await fetchBeachByIdLoose(beachId);
        const resolvedId = beach?.id ?? beachId;
        // window: if date chosen, use that whole local day; else next 6 hours
        const now = new Date();
        let startWindow = now;
        let endWindow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
        if (date instanceof Date) {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          startWindow = d;
          endWindow = new Date(d.getTime() + 24 * 60 * 60 * 1000);
        }
        // data sources
        const [current, forecast, tides] = await Promise.all([
          fetchCurrentConditions(resolvedId),
          fetchBeachForecast(resolvedId, startWindow, endWindow),
          fetchBeachTides(resolvedId, startWindow, endWindow),
        ]);
        const county = beach?.COUNTY ?? null;
        const daily = county
          ? await fetchDailyConditions(
              county,
              date instanceof Date ? date : undefined
            )
          : null;
        const first = forecast[0];
        // Choose a base row aligned to selected hour when provided
        let baseRow = first;
        if (Array.isArray(forecast) && forecast.length) {
          if (typeof hour === "number") {
            // Snap to nearest 3-hour slot and find the closest row
            const targetHour = (((Math.round(hour / 3) * 3) % 24) + 24) % 24;
            let best = forecast[0];
            let bestDiff = 1e9;
            for (const r of forecast) {
              const h = new Date(r.timestamp).getHours();
              const diff = Math.abs(h - targetHour);
              if (diff < bestDiff) {
                bestDiff = diff;
                best = r;
              }
            }
            baseRow = best;
          } else if (date) {
            // if date selected but no hour, prefer midday-ish row
            baseRow = forecast[Math.min(12, forecast.length - 1)];
          }
        }

        const nextStats: Stat[] = [];
        // weather air temp: if a date is selected, prefer forecast row; else use current
        const base = date ? baseRow : current ?? baseRow;
        nextStats.push({
          label: "weather",
          weather: {
            temp: Math.round(base?.conditions.airTemp ?? 0),
            condition: "sun",
            code: base?.conditions.weather ?? null,
          },
        });
        // swell primary/secondary
        if (baseRow) {
          const pDir = baseRow.swell.primary.direction ?? 0;
          const sDir = baseRow.swell.secondary.direction ?? 0;
          const tDir = baseRow.swell.tertiary?.direction ?? 0;
          nextStats.push({
            label: "swell",
            primary: {
              height: Number((baseRow.swell.primary.height ?? 0).toFixed(1)),
              period: Math.round(baseRow.swell.primary.period ?? 0),
              wind: { dir: getWindDirection(pDir), deg: pDir },
            },
            secondary: [
              {
                height: Number(
                  (baseRow.swell.secondary.height ?? 0).toFixed(1)
                ),
                period: Math.round(baseRow.swell.secondary.period ?? 0),
                wind: { dir: getWindDirection(sDir), deg: sDir },
              },
              {
                height: Number(
                  (baseRow.swell.tertiary?.height ?? 0).toFixed(1)
                ),
                period: Math.round(baseRow.swell.tertiary?.period ?? 0),
                wind: { dir: getWindDirection(tDir), deg: tDir },
              },
            ],
          });
        }
        // water temp
        nextStats.push({
          label: "water",
          temp: Math.round(base?.conditions.waterTemp ?? 0),
        });
        // tide - find the tide data point closest to the selected time
        let tideValue = 0;
        if (tides && tides.length > 0) {
          // Get the target timestamp from baseRow or use current time
          const targetTime = baseRow?.timestamp
            ? new Date(baseRow.timestamp).getTime()
            : now.getTime();

          // Find the closest tide data point
          let closestTide = tides[0];
          let minDiff = Math.abs(
            new Date(tides[0].timestamp).getTime() - targetTime
          );

          for (const tide of tides) {
            const diff = Math.abs(
              new Date(tide.timestamp).getTime() - targetTime
            );
            if (diff < minDiff) {
              minDiff = diff;
              closestTide = tide;
            }
          }

          tideValue = closestTide.tideLevelFt ?? 0;
        }

        nextStats.push({
          label: "tide",
          tide: {
            value: Number(tideValue.toFixed(1)),
            unit: "ft",
          },
        });
        // wind
        nextStats.push({
          label: "wind",
          wind: {
            speed: Math.round(base?.conditions.windSpeed ?? 0),
            max: Math.round(base?.conditions.windGust ?? 0),
          },
        });
        // moon
        if (daily?.moon_phase != null) {
          nextStats.push({ label: "moon", phase: (daily as any).moon_phase });
        }
        // pressure
        nextStats.push({
          label: "pressure",
          pressure: {
            value: Number((base?.conditions.pressure ?? 0).toFixed(2)),
            unit: "in",
          },
        });
        // energy
        nextStats.push({
          label: "energy",
          energy: { value: Math.round(base?.surf.waveEnergy ?? 0), unit: "kJ" },
        });

        if (!cancelled) {
          setStats(nextStats);
        }
      } catch (e) {
        console.error("Failed to load highlights", e);
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [beachId, date, hour]);

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ul
        className={cn(
          "grid grid-cols-2 @min-2xl:grid-cols-4 @min-3xl:grid-cols-3 gap-2.5",
          isFull && "@min-4xl:grid-cols-4 @min-6xl:grid-cols-8"
        )}
      >
        {stats.slice(startIdx, endIdx + 1).map((stat) => {
          let content;
          switch (stat.label) {
            case "swell":
              content = stat.primary && stat.secondary && (
                <HighlightCard label={stat.label}>
                  <div className="">
                    <SwellStat
                      primary
                      data={stat.primary}
                      small
                      isFull={isFull}
                    />
                    <SwellStat data={stat.secondary[0]} small isFull={isFull} />
                    <SwellStat data={stat.secondary[1]} small isFull={isFull} />
                  </div>
                </HighlightCard>
              );
              break;
            case "weather":
              content = stat.weather && (
                <WeatherStat
                  temp={stat.weather.temp}
                  condition={stat.weather.condition}
                  label={stat.label}
                  weatherCode={stat.weather.code}
                />
              );
              break;
            case "water":
              content = stat.temp && (
                <HighlightCard label={stat.label}>
                  <div className="flex items-center justify-center gap-0.5">
                    <span className="text-2xl font-semibold">
                      {stat.temp}
                      <span className="text-sm font-normal">&deg;F</span>
                    </span>
                  </div>
                </HighlightCard>
              );
              break;
            case "tide":
              content = stat.tide && (
                <BasicStat data={stat.tide} label={stat.label} />
              );
              break;
            case "moon":
              {
                const hasPhase =
                  stat.phase !== null && stat.phase !== undefined;
                content = hasPhase ? (
                  <MoonStat data={stat.phase as any} label={stat.label} />
                ) : (
                  <HighlightCard label={stat.label}>
                    <div className="flex flex-col items-center text-sm text-muted-foreground">
                      <span>Moon data unavailable</span>
                    </div>
                  </HighlightCard>
                );
                break;
              }
              break;
            case "wind":
              content = stat.wind && (
                <WindStat data={stat.wind} label={stat.label} />
              );
              break;
            case "pressure":
              content = stat.pressure && (
                <BasicStat data={stat.pressure} label={stat.label} />
              );
              break;
            case "energy":
              content = stat.energy && (
                <BasicStat data={stat.energy} label={stat.label} />
              );
              break;
          }
          if (content) {
            return (
              <li
                key={stat.label}
                className={cn(
                  "relative highlight-card shadow-even min-h-25",
                  stat.label === "swell" &&
                    "col-span-1 @min-2xl:col-span-1 @min-3xl:col-span-2",
                  stat.label === "swell" && isFull && "@min-4xl:col-span-1"
                )}
              >
                <div className="flex-1 flex items-center justify-center gap-1 mt-1 h-full">
                  {content}
                </div>
              </li>
            );
          }
        })}
      </ul>
    </div>
  );
};

export default Highlights;
