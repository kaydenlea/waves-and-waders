"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import TidePreview from "../graphs/TidePreview";
import SwellStat from "../general/Stats/SwellStat";
import GradientCircle from "../general/Stats/GradientCircle";
import Tag from "../general/Tag";
import WindStat from "../general/Stats/WindStat";
import SurfStat from "../general/Stats/SurfStat";

import { Dog, CircleParking, Toilet, LifeBuoy, Fish, Shell, BadgeCheck } from "lucide-react";

import {
  fetchCurrentConditions,
  fetchBeachForecast,
  getWindDirection,
  fetchBeachByIdLoose,
  fetchBeachDetails,
} from "@/lib/supabase";
// Optionally import the feature registry if exposed
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { FEATURE_COLUMNS } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getFeatureDisplayName } from "@/lib/supabase";

type SummaryStat =
  | { type: "water"; temp: number }
  | { type: "weather"; temp: number }
  | {
      type: "swell";
      primary: { height: number; period: number; wind: { dir: string; deg: number } };
      secondary: { height: number; period: number; wind: { dir: string; deg: number } }[];
    }
  | { type: "tide"; height: number }
  | { type: "wind"; wind: { direction: string; speed: number; loc: string; gust?: number } }
  | { type: "surf"; surf: { direction: string; height: string; period: number } }
  | { type: "features"; tags: { label: string; icon: React.ReactNode; color: string }[] };

const Summary = ({ beachId }: { beachId?: string }) => {
  // Visible immediately while data loads
  const [stats, setStats] = useState<SummaryStat[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        if (!beachId) return;

        // Resolve the param to a concrete id (supports id/uuid/slug)
        const resolved = await fetchBeachByIdLoose(beachId);
        const resolvedId = resolved?.id ?? beachId;

        const now = new Date();
        const end = new Date(now.getTime() + 6 * 60 * 60 * 1000);
        const [current, forecast, beach] = await Promise.all([
          fetchCurrentConditions(resolvedId),
          fetchBeachForecast(resolvedId, now, end),
          fetchBeachDetails(resolvedId),
        ]);

        const first = forecast[0];
        // Use latest current conditions when available; otherwise fall back to first forecast row
        const base = current ?? first;
        const windDirDeg = base?.conditions.windDirection ?? null;
        const windDirStr = windDirDeg == null ? "N/A" : getWindDirection(windDirDeg);

        const s: SummaryStat[] = [];
        if (base?.conditions.waterTemp != null) {
          s.push({ type: "water", temp: Math.round(base.conditions.waterTemp) });
        }
        if (base?.conditions.airTemp != null) {
          s.push({ type: "weather", temp: Math.round(base.conditions.airTemp) });
        }

        if (first) {
          s.push({
            type: "swell",
            primary: {
              height: Number((first.swell.primary.height ?? 0).toFixed(1)),
              period: Number((first.swell.primary.period ?? 0).toFixed(1)),
              wind: {
                dir: getWindDirection(first.swell.primary.direction ?? 0),
                deg: Number(((first.swell.primary.direction ?? 0)).toFixed(1)),
              },
            },
            secondary: [
              {
                height: Number((first.swell.secondary.height ?? 0).toFixed(1)),
                period: Number((first.swell.secondary.period ?? 0).toFixed(1)),
                wind: {
                  dir: getWindDirection(first.swell.secondary.direction ?? 0),
                  deg: Number(((first.swell.secondary.direction ?? 0)).toFixed(1)),
                },
              },
              // Only include tertiary if present
              ...((first.swell.tertiary?.height ?? null) != null
                ? [
                    {
                      height: Number((first.swell.tertiary!.height ?? 0).toFixed(1)),
                      period: Number((first.swell.tertiary!.period ?? 0).toFixed(1)),
                      wind: {
                        dir: getWindDirection(first.swell.tertiary!.direction ?? 0),
                        deg: Number(((first.swell.tertiary!.direction ?? 0)).toFixed(1)),
                      },
                    },
                  ]
                : []),
            ],
          });

          const min = first.surf.heightMin ?? 0;
          const max = first.surf.heightMax ?? 0;
          const minR = Number(min.toFixed(0));
          const maxR = Number(max.toFixed(0));
          const surfDirStr = getWindDirection(first.swell.primary.direction ?? 0);
          s.push({
            type: "surf",
            surf: {
              direction: surfDirStr,
              height: minR === maxR ? `${maxR}` : `${minR}-${maxR}`,
              period: Math.round(first.swell.primary.period ?? 0),
            },
          });
        }

        if (base?.conditions.tideLevel != null) {
          s.push({ type: "tide", height: Number(base.conditions.tideLevel.toFixed(1)) });
        }

        if (
          base?.conditions.windSpeed != null ||
          base?.conditions.windDirection != null
        ) {
          s.push({
            type: "wind",
            wind: {
              direction: windDirStr,
              speed: Math.round(base?.conditions.windSpeed ?? 0),
              gust: base?.conditions.windGust != null ? Math.round(base.conditions.windGust) : undefined,
              loc: "-",
            },
          });
        }

        // Build features from beach flags when available
        if (beach) {
          const tags: { label: string; icon: React.ReactNode; color: string }[] = [];
          // If FEATURE_COLUMNS/getFeatureDisplayName are exported, iterate them; else, fallback to known ones
          const keys: string[] = (typeof FEATURE_COLUMNS !== "undefined" && Array.isArray(FEATURE_COLUMNS))
            ? FEATURE_COLUMNS as string[]
            : [
                "FISHING",
                "RESTROOMS",
                "PARKING",
                "DOG_FRIEND",
                "SNDY_BEACH",
                "LIFEGUARD",
              ];
          for (const key of keys) {
            const val = (beach as any)[key];
            if (val === true) {
              const label = typeof getFeatureDisplayName === "function" ? getFeatureDisplayName(key) : key;
              let icon: React.ReactNode = <BadgeCheck size={16} />;
              let color = "bg-highlight-2";
              if (key === "FISHING") { icon = <Fish size={16} />; color = "bg-blue"; }
              else if (key === "RESTROOMS") { icon = <Toilet size={16} />; color = "bg-yellow"; }
              else if (key === "PARKING") { icon = <CircleParking size={16} />; color = "bg-green"; }
              else if (key === "DOG_FRIEND") { icon = <Dog size={16} />; color = "bg-red"; }
              else if (key === "SNDY_BEACH") { icon = <Shell size={16} />; color = "bg-orange"; }
              else if (key === "LIFEGUARD") { icon = <LifeBuoy size={16} />; color = "bg-purple"; }
              tags.push({ label, icon, color });
            }
          }
          if (tags.length > 0) s.push({ type: "features", tags });
        }

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
                {stat.secondary.map((sec, i) => (
                  <SwellStat key={i} data={sec} />
                ))}
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
            content = stat.tags && stat.tags.map((tag) => <Tag key={tag.label} data={tag} />);
            break;
        }
        if (content) {
          return (
            <li
              key={stat.type}
              className={cn(
                "highlight-card flex flex-col overflow-hidden",
                stat.type === "features" && "col-span-2 @min-xl:col-span-3 @min-4xl:col-span-6"
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
