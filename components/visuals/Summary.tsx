"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import TidePreview from "../graphs/TidePreview";
import SwellStat from "../general/Stats/SwellStat";
import GradientCircle from "../general/Stats/GradientCircle";
import Tag from "../general/Tag";
import WindStat from "../general/Stats/WindStat";
import SurfStat from "../general/Stats/SurfStat";

import {
  Dog,
  CircleParking,
  Toilet,
  LifeBuoy,
  Fish,
  Shell,
} from "lucide-react";

import { fetchCurrentConditions, fetchBeachForecast, getWindDirection } from "@/lib/supabase";

type SummaryStat =
  | { type: "water"; temp: number }
  | { type: "weather"; temp: number }
  | { type: "swell"; primary: { height: number; period: number; wind: { dir: string; deg: number } }; secondary: { height: number; period: number; wind: { dir: string; deg: number } }[] }
  | { type: "tide"; height: number }
  | { type: "wind"; wind: { direction: string; speed: number; loc: string } }
  | { type: "surf"; surf: { direction: string; height: string; period: number } }
  | { type: "features"; tags: { label: string; icon: React.ReactNode; color: string }[] };

const Summary = ({ beachId }: { beachId?: string }) => {
  const sample: SummaryStat[] = [
    { type: "water", temp: 64 },
    { type: "weather", temp: 60 },
    {
      type: "swell",
      primary: { height: 2.1, period: 7, wind: { dir: "W", deg: 272 } },
      secondary: [
        { height: 2.1, period: 7, wind: { dir: "W", deg: 272 } },
        { height: 2.1, period: 7, wind: { dir: "W", deg: 272 } },
      ],
    },
    { type: "tide", height: 2.4 },
    { type: "wind", wind: { direction: "NNE", speed: 12, loc: "—" } },
    { type: "surf", surf: { direction: "NNW", height: "2-3", period: 11 } },
    {
      type: "features",
      tags: [
        { label: "Fishing", icon: <Fish size={16} />, color: "bg-blue" },
        { label: "Bathrooms", icon: <Toilet size={16} />, color: "bg-yellow" },
        { label: "Parking", icon: <CircleParking size={16} />, color: "bg-green" },
        { label: "Dogs", icon: <Dog size={16} />, color: "bg-red" },
        { label: "Sandy", icon: <Shell size={16} />, color: "bg-orange" },
        { label: "Lifeguard", icon: <LifeBuoy size={16} />, color: "bg-purple" },
      ],
    },
  ];
  const [stats, setStats] = useState<SummaryStat[]>(beachId ? [] : sample);

  useEffect(() => {
    const load = async () => {
      try {
        if (!beachId) return;
        const now = new Date();
        const end = new Date(now.getTime() + 6 * 60 * 60 * 1000);
        // Resolve id from slug/uuid if needed
        const resolved = (await import("@/lib/supabase")).fetchBeachByIdLoose
          ? await (await import("@/lib/supabase")).fetchBeachByIdLoose(beachId)
          : null;
        const resolvedId = resolved?.id ?? beachId;
        const [current, forecast] = await Promise.all([
          fetchCurrentConditions(resolvedId),
          fetchBeachForecast(resolvedId, now, end),
        ]);
        const first = forecast[0];
        const windDirDeg = current?.conditions.windDirection ?? 0;
        const dirStr = getWindDirection(windDirDeg);

        const s: SummaryStat[] = [
          { type: "water", temp: Math.round(current?.conditions.waterTemp ?? 0) },
          { type: "weather", temp: Math.round(current?.conditions.airTemp ?? 0) },
        ];
        if (first) {
          s.push({
            type: "swell",
            primary: { height: first.swell.primary.height ?? 0, period: first.swell.primary.period ?? 0, wind: { dir: getWindDirection(first.swell.primary.direction ?? 0), deg: first.swell.primary.direction ?? 0 } },
            secondary: [
              { height: first.swell.secondary.height ?? 0, period: first.swell.secondary.period ?? 0, wind: { dir: getWindDirection(first.swell.secondary.direction ?? 0), deg: first.swell.secondary.direction ?? 0 } },
              { height: first.swell.tertiary?.height ?? 0, period: first.swell.tertiary?.period ?? 0, wind: { dir: getWindDirection(first.swell.tertiary?.direction ?? 0), deg: first.swell.tertiary?.direction ?? 0 } },
            ],
          });
          const min = first.surf.heightMin ?? 0;
          const max = first.surf.heightMax ?? 0;
          s.push({ type: "surf", surf: { direction: dirStr, height: min === max ? `${max.toFixed(0)}` : `${min.toFixed(0)}-${max.toFixed(0)}`, period: first.swell.primary.period ?? 0 } });
        }
        s.push({ type: "tide", height: Number((current?.conditions.tideLevel ?? 0).toFixed(1)) });
        s.push({ type: "wind", wind: { direction: dirStr, speed: Math.round(current?.conditions.windSpeed ?? 0), loc: "—" } });
        s.push({
          type: "features",
          tags: [
            { label: "Fishing", icon: <Fish size={16} />, color: "bg-blue" },
            { label: "Bathrooms", icon: <Toilet size={16} />, color: "bg-yellow" },
            { label: "Parking", icon: <CircleParking size={16} />, color: "bg-green" },
            { label: "Dogs", icon: <Dog size={16} />, color: "bg-red" },
            { label: "Sandy", icon: <Shell size={16} />, color: "bg-orange" },
            { label: "Lifeguard", icon: <LifeBuoy size={16} />, color: "bg-purple" },
          ],
        });
        setStats(s);
      } catch (e) {
        console.error("Failed to load summary", e);
      }
    };
    load();
  }, [beachId]);
  return (
    <ul className="grid grid-cols-2 @min-xl:grid-cols-3 @min-4xl:grid-cols-6 gap-3">
      {stats.map((stat) => {
        let content;
        switch (stat.type) {
          case "water":
            content = <GradientCircle condition="water" data={stat.temp} />;
            break;
          case "weather":
            content = <GradientCircle condition="sun" data={stat.temp} />;
            break;
          case "swell":
            content = stat.primary && stat.secondary && (
              <div className="flex flex-col items-center">
                <SwellStat primary data={stat.primary} />
                <SwellStat data={stat.secondary[0]} />
                <SwellStat data={stat.secondary[1]} />
              </div>
            );
            break;
          case "tide":
            content = (
              <div className="flex flex-col w-full">
                <span className="text-2xl font-medium">
                  {stat.height}
                  <span className="text-xs">ft</span>
                </span>
                <TidePreview />
              </div>
            );
            break;
          case "wind":
            content = stat.wind && <WindStat data={stat.wind} />;
            break;
          case "surf":
            content = stat.surf && <SurfStat data={stat.surf} />;
            break;
          case "features":
            content =
              stat.tags &&
              stat.tags.map((tag) => <Tag key={tag.label} data={tag} />);
            break;
        }

        if (content) {
          return (
            <li
              key={stat.type}
              className={cn(
                "highlight-card flex flex-col overflow-hidden",
                stat.type === "features" &&
                  "col-span-2 @min-xl:col-span-3 @min-4xl:col-span-6"
              )}
            >
              <h3 className="highlight-title">{stat.type.toUpperCase()}</h3>
              <div
                className={cn(
                  "flex-1 flex items-center gap-1 mt-1",
                  stat.type !== "features" && "justify-center",
                  stat.type === "features" && "flex-wrap"
                )}
              >
                {content}
              </div>
            </li>
          );
        }
      })}
    </ul>
  );
};

export default Summary;
