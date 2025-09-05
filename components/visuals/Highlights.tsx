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

const MoonStat = ({ label, data }: { label: string; data: string }) => {
  const phase = data.split(" ");
  return (
    // <div className="flex items-center justify-center gap-1">
    //   <MoonStar size={25} />
    //   <div className="flex flex-col">
    //     <span className="text-sm">{phase[0]}</span>
    //     <span className="text-sm">{phase[1]}</span>
    //   </div>
    // </div>
    <HighlightCard label={label}>
      <div className="flex items-center justify-center gap-1">
        <div className="flex flex-col font-semibold">
          <span className="text-[0.8rem] -mb-1">{phase[0]}</span>
          <span className="text-[0.8rem]">{phase[1]}</span>
        </div>
      </div>
      {/* <span className="text-[0.7rem]">
        <span>
          <span className="font-semibold">next</span>: Waxing
        </span>
      </span> */}
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
  | { label: "moon"; phase: string }
  | { label: "wind"; wind: { speed: number; max: number } }
  | { label: "pressure"; pressure: { value: number; unit: string } }
  | { label: "energy"; energy: { value: number; unit: string } };

const Highlights = ({
  beachId,
  startIdx = 0,
  endIdx = 7,
}: {
  beachId?: string;
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
        const current = await fetchCurrentConditions(resolvedId);
        const county = beach?.COUNTY ?? null;
        const daily = county ? await fetchDailyConditions(county) : null;
        // compute swell from forecast slice
        const now = new Date();
        const end = new Date(now.getTime() + 6 * 60 * 60 * 1000);
        const forecast = await fetchBeachForecast(resolvedId, now, end);
        const first = forecast[0];

        const nextStats: Stat[] = [];
        // weather air temp
        nextStats.push({ label: "weather", weather: { temp: Math.round(current?.conditions.airTemp ?? 0), condition: "sun" } });
        // water temp
        nextStats.push({ label: "water", temp: Math.round(current?.conditions.waterTemp ?? 0) });
        // swell primary/secondary
        if (first) {
          const pDir = first.swell.primary.direction ?? 0;
          const sDir = first.swell.secondary.direction ?? 0;
          nextStats.push({
            label: "swell",
            primary: { height: first.swell.primary.height ?? 0, period: first.swell.primary.period ?? 0, wind: { dir: getWindDirection(pDir), deg: pDir } },
            secondary: [
              { height: first.swell.secondary.height ?? 0, period: first.swell.secondary.period ?? 0, wind: { dir: getWindDirection(sDir), deg: sDir } },
              { height: first.swell.tertiary?.height ?? 0, period: first.swell.tertiary?.period ?? 0, wind: { dir: getWindDirection(first.swell.tertiary?.direction ?? 0), deg: first.swell.tertiary?.direction ?? 0 } },
            ],
          });
        }
        // tide
        nextStats.push({ label: "tide", tide: { value: Number((current?.conditions.tideLevel ?? 0).toFixed(1)), unit: "ft" } });
        // moon
        if (daily?.moon_phase != null) {
          nextStats.push({ label: "moon", phase: String(daily.moon_phase) });
        }
        // wind
        nextStats.push({ label: "wind", wind: { speed: Math.round(current?.conditions.windSpeed ?? 0), max: Math.round(current?.conditions.windGust ?? 0) } });
        // pressure
        nextStats.push({ label: "pressure", pressure: { value: Number((current?.conditions.pressure ?? 0).toFixed(2)), unit: "in" } });
        // energy
        nextStats.push({ label: "energy", energy: { value: Math.round(current?.surf.waveEnergy ?? 0), unit: "kJ" } });

        setStats(nextStats);
      } catch (e) {
        console.error("Failed to load highlights", e);
      }
    };
    load();
  }, [beachId]);

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
