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
} from "lucide-react";

const WeatherStat = ({
  temp,
  condition,
  label,
}: {
  temp: number;
  condition?: string;
  label: string;
}) => {
  return (
    // <div className="flex items-center justify-center gap-0.5">
    //   {condition && condition === "sun" ? (
    //     <Sun size={22} color="#fa9847ff" />
    //   ) : (
    //     <Droplets size={22} color="#80b7ffff" />
    //   )}
    //   <span className="text-2xl font-medium">
    //     {temp}
    //     <span className="text-sm font-normal">&deg;F</span>
    //   </span>
    // </div>
    <HighlightCard label={label}>
      <div className="flex items-center justify-center gap-0.5">
        <span className="text-2xl font-semibold">
          {temp}
          <span className="text-sm font-normal">&deg;F</span>
        </span>
      </div>
      {/* <span className="flex gap-1 text-[0.7rem]">
        <span>
          <span className="font-semibold">hi</span>: 2.1
        </span>
        <span>
          <span className="font-semibold">lo</span>: 2.9
        </span>
      </span> */}
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
    // <span
    //   className={cn(
    //     "text-xl font-medium px-3 py-2 border border-border rounded-md",
    //     typeof data.value === "number" ? "bg-green" : "bg-red"
    //   )}
    // >
    //   {data.value}
    //   <span className="text-xs font-normal">{data.unit}</span>
    // </span>
    <HighlightCard label={label}>
      <span className="text-2xl font-semibold rounded-md pb-5">
        {data.value}
        <span className="text-sm font-normal">{data.unit}</span>
      </span>
      {
        // <span className="flex gap-1 text-[0.7rem]">
        //   <span>
        //     <span className="font-semibold">hi</span>: 2.1
        //   </span>
        //   <span>
        //     <span className="font-semibold">lo</span>: 2.9
        //   </span>
        // </span>
      }
    </HighlightCard>
  );
};

type MoonKind =
  | 'new'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

function getMoonPhaseInfo(raw: string | number): { kind: MoonKind; lines: [string, string] } {
  const toKindFromNumber = (n: number): MoonKind => {
    if (n === 0) return 'new';
    if (n > 0 && n < 0.25) return 'waxing_crescent';
    if (n === 0.25) return 'first_quarter';
    if (n > 0.25 && n < 0.5) return 'waxing_gibbous';
    if (n === 0.5) return 'full';
    if (n > 0.5 && n < 0.75) return 'waning_gibbous';
    if (n === 0.75) return 'last_quarter';
    return 'waning_crescent'; // 0.75 - 1
  };

  let kind: MoonKind | null = null;
  if (typeof raw === 'number') {
    kind = toKindFromNumber(raw);
  } else {
    const s = raw.trim().toLowerCase();
    const num = Number(s);
    if (!Number.isNaN(num)) {
      kind = toKindFromNumber(num);
    } else {
      if (s.includes('new')) kind = 'new';
      else if (s.includes('first') && s.includes('quarter')) kind = 'first_quarter';
      else if (s.includes('last') && s.includes('quarter')) kind = 'last_quarter';
      else if (s.includes('full')) kind = 'full';
      else if (s.includes('waxing') && s.includes('crescent')) kind = 'waxing_crescent';
      else if (s.includes('waning') && s.includes('crescent')) kind = 'waning_crescent';
      else if (s.includes('waxing') && s.includes('gibbous')) kind = 'waxing_gibbous';
      else if (s.includes('waning') && s.includes('gibbous')) kind = 'waning_gibbous';
      else kind = 'new';
    }
  }

  const labelMap: Record<MoonKind, [string, string]> = {
    new: ['New', 'Moon'],
    waxing_crescent: ['Waxing', 'Crescent'],
    first_quarter: ['First', 'Quarter'],
    waxing_gibbous: ['Waxing', 'Gibbous'],
    full: ['Full', 'Moon'],
    waning_gibbous: ['Waning', 'Gibbous'],
    last_quarter: ['Last', 'Quarter'],
    waning_crescent: ['Waning', 'Crescent'],
  };

  return { kind, lines: labelMap[kind] };
}

const MoonIcon = ({ kind, size = 26 }: { kind: MoonKind; size?: number }) => {
  // Simple crescent rendering using two overlapping circles
  const r = size / 2;
  const cx = r;
  const cy = r;
  const light = '#f1f1f1';
  const dark = '#2d2d2d';

  // Offsets to approximate phase shapes
  let dx = 0; // overlay circle offset (+ right, - left)
  let fillBase = light;
  switch (kind) {
    case 'new':
      fillBase = dark;
      dx = 0;
      break;
    case 'waxing_crescent':
      dx = -r * 0.6; // small lit sliver on right
      break;
    case 'first_quarter':
      dx = -r; // half right lit
      break;
    case 'waxing_gibbous':
      dx = -r * 1.4; // mostly lit right
      break;
    case 'full':
      dx = -r * 2; // overlay fully off
      break;
    case 'waning_gibbous':
      dx = r * 1.4; // mostly lit left
      break;
    case 'last_quarter':
      dx = r; // half left lit
      break;
    case 'waning_crescent':
      dx = r * 0.6; // small lit sliver on left
      break;
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* base lit disc */}
      <circle cx={cx} cy={cy} r={r - 1} fill={light} stroke={dark} strokeWidth={1} />
      {/* overlay to carve crescent */}
      {kind !== 'full' && kind !== 'new' && (
        <g>
          <circle cx={cx + dx} cy={cy} r={r} fill={dark} />
        </g>
      )}
      {/* fully dark for new moon */}
      {kind === 'new' && <circle cx={cx} cy={cy} r={r - 1} fill={dark} stroke={dark} strokeWidth={1} />}
    </svg>
  );
};

const getMoonEmoji = (kind: MoonKind): string => {
  switch (kind) {
    case 'new': return '🌑';
    case 'waxing_crescent': return '🌒';
    case 'first_quarter': return '🌓';
    case 'waxing_gibbous': return '🌔';
    case 'full': return '🌕';
    case 'waning_gibbous': return '🌖';
    case 'last_quarter': return '🌗';
    case 'waning_crescent': return '🌘';
  }
};

const MoonStat = ({ label, data }: { label: string; data: string | number }) => {
  const info = getMoonPhaseInfo(data);
  return (
    <HighlightCard label={label}>
      <div className="flex items-center justify-center gap-2">
        <span role="img" aria-label={`${info.lines[0]} ${info.lines[1]}`} style={{ fontSize: 26, lineHeight: 1 }}>
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
    // <span className="flex gap-1 bg-orange border border-border rounded-md py-2 px-3">
    //   <span className="text-xl font-medium">{data.speed}</span>
    //   <span className="flex flex-col -space-y-1">
    //     <span className="text-[0.6rem]">{data.max}</span>
    //     <span className="text-xs">mph</span>
    //   </span>
    // </span>
    <HighlightCard label={label}>
      <span className="flex gap-1">
        <span className="text-2xl font-semibold">{data.speed}</span>
        <span className="flex flex-col -space-y-1">
          <span className="text-[0.7rem] font-semibold">{data.max}</span>
          <span className="text-[0.8rem]">mph</span>
        </span>
      </span>
      {/* <span className="flex gap-1 text-[0.7rem]">
        <span>
          <span className="font-semibold">hi</span>: 2.1
        </span>
        <span>
          <span className="font-semibold">lo</span>: 2.9
        </span>
      </span> */}
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
      <h3 className="absolute top-2 left-2  text-muted-foreground text-[0.7rem] font-medium whitespace-nowrap">
        {label.toUpperCase()}
      </h3>
      <div className="p-0.5 rounded-full bg-highlight-5/50 border border-border/40 absolute -top-3 right-2">
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
} from "@/lib/supabase";

type Stat =
  | { label: "weather"; weather: { temp: number; condition?: string } }
  | { label: "water"; temp: number }
  | {
      label: "swell";
      primary: { height: number; period: number; wind: { dir: string; deg: number } };
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
}: {
  beachId?: string;
  date?: Date;
  hour?: number;
  startIdx?: number;
  endIdx?: number;
}) => {
  const [stats, setStats] = useState<Stat[]>([{
    label: "weather",
    weather: { temp: 64, condition: "sun" },
  }, { label: "water", temp: 60 }, {
    label: "swell",
    primary: { height: 2.1, period: 7, wind: { dir: "W", deg: 272 } },
    secondary: [
      { height: 2.1, period: 7, wind: { dir: "W", deg: 272 } },
      { height: 2.1, period: 7, wind: { dir: "W", deg: 272 } },
    ],
  }, { label: "tide", tide: { value: "2-3", unit: "ft" } }, { label: "moon", phase: "Waning Cresent" }, { label: "wind", wind: { speed: 12, max: 17 } }, { label: "pressure", pressure: { value: 29.9, unit: "in" } }, { label: "energy", energy: { value: 278, unit: "kJ" } }]);

  useEffect(() => {
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
        const [current, forecast] = await Promise.all([
          fetchCurrentConditions(resolvedId),
          fetchBeachForecast(resolvedId, startWindow, endWindow),
        ]);
        const county = beach?.COUNTY ?? null;
        const daily = county ? await fetchDailyConditions(county, date instanceof Date ? date : undefined) : null;
        const first = forecast[0];
        // Choose a base row aligned to selected hour when provided
        let baseRow = first;
        if (Array.isArray(forecast) && forecast.length) {
          if (typeof hour === 'number') {
            // Snap to nearest 3-hour slot and find the closest row
            const targetHour = ((Math.round(hour / 3) * 3) % 24 + 24) % 24;
            let best = forecast[0];
            let bestDiff = 1e9;
            for (const r of forecast) {
              const h = new Date(r.timestamp).getHours();
              const diff = Math.abs(h - targetHour);
              if (diff < bestDiff) { bestDiff = diff; best = r; }
            }
            baseRow = best;
          } else if (date) {
            // if date selected but no hour, prefer midday-ish row
            baseRow = forecast[Math.min(12, forecast.length - 1)];
          }
        }

        const nextStats: Stat[] = [];
        // weather air temp: if a date is selected, prefer forecast row; else use current
        const base = date ? baseRow : (current ?? baseRow);
        nextStats.push({ label: "weather", weather: { temp: Math.round(base?.conditions.airTemp ?? 0), condition: "sun" } });
        // water temp
        nextStats.push({ label: "water", temp: Math.round(base?.conditions.waterTemp ?? 0) });
        // swell primary/secondary
        if (baseRow) {
          const pDir = baseRow.swell.primary.direction ?? 0;
          const sDir = baseRow.swell.secondary.direction ?? 0;
          nextStats.push({
            label: "swell",
            primary: { height: Number((baseRow.swell.primary.height ?? 0).toFixed(1)), period: Number((baseRow.swell.primary.period ?? 0).toFixed(1)), wind: { dir: getWindDirection(pDir), deg: Number((pDir).toFixed(1)) } },
            secondary: [
              { height: Number((baseRow.swell.secondary.height ?? 0).toFixed(1)), period: Number((baseRow.swell.secondary.period ?? 0).toFixed(1)), wind: { dir: getWindDirection(sDir), deg: Number((sDir).toFixed(1)) } },
              { height: Number((baseRow.swell.tertiary?.height ?? 0).toFixed(1)), period: Number((baseRow.swell.tertiary?.period ?? 0).toFixed(1)), wind: { dir: getWindDirection(baseRow.swell.tertiary?.direction ?? 0), deg: Number(((baseRow.swell.tertiary?.direction ?? 0)).toFixed(1)) } },
            ],
          });
        }
        // tide
        nextStats.push({ label: "tide", tide: { value: Number((base?.conditions.tideLevel ?? 0).toFixed(1)), unit: "ft" } });
        // moon
        if (daily?.moon_phase != null) {
          nextStats.push({ label: "moon", phase: (daily as any).moon_phase });
        }
        // wind
        nextStats.push({ label: "wind", wind: { speed: Math.round(base?.conditions.windSpeed ?? 0), max: Math.round(base?.conditions.windGust ?? 0) } });
        // pressure
        nextStats.push({ label: "pressure", pressure: { value: Number((base?.conditions.pressure ?? 0).toFixed(2)), unit: "in" } });
        // energy
        nextStats.push({ label: "energy", energy: { value: Math.round(base?.surf.waveEnergy ?? 0), unit: "kJ" } });

        setStats(nextStats);
      } catch (e) {
        console.error("Failed to load highlights", e);
      }
    };
    load();
  }, [beachId, date, hour]);

  return (
    // <div className="p-2 border border-border/40 rounded-md shadow-sm bg-highlight-4">
    <div>
      {/* <header className="ml-2 mb-4 mt-1 flex flex-col gap-1">
        <h3 className="font-semibold">Current Conditions</h3>
        <p className="text-muted-foreground text-sm -mt-0.5">
          Showing the stats for the day
        </p>
      </header> */}
      <ul className="grid grid-cols-2 @min-lg:grid-cols-4 @min-4xl:grid-cols-8 gap-3.5">
        {stats.slice(startIdx, endIdx + 1).map((stat) => {
          let content;
          switch (stat.label) {
            case "swell":
              content = stat.primary && stat.secondary && (
                <HighlightCard label={stat.label}>
                  <div className="flex flex-col items-center">
                    <SwellStat primary data={stat.primary} small />
                    <SwellStat data={stat.secondary[0]} small />
                    <SwellStat data={stat.secondary[1]} small />
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
                />
              );
              break;
            case "water":
              content = stat.temp && (
                <WeatherStat temp={stat.temp} label={stat.label} />
              );
              break;
            case "tide":
              content = stat.tide && (
                <BasicStat data={stat.tide} label={stat.label} />
              );
              break;
            case "moon":
              content = stat.phase && (
                <MoonStat data={stat.phase} label={stat.label} />
              );
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
              // <li key={stat.label} className="highlight-card">
              //   <h4 className="highlight-title">{stat.label.toUpperCase()}</h4>
              //   <div
              //     className={
              //       "flex-1 flex items-center justify-center gap-1 mt-1"
              //     }
              //   >
              //     {content}
              //   </div>
              // </li>
              <li key={stat.label} className="relative highlight-card">
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
