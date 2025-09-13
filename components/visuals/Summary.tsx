"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import TidePreview from "../graphs/TidePreview";
import SwellStat from "../general/Stats/SwellStat";
import GradientCircle from "../general/Stats/GradientCircle";
import Tag from "../general/Tag";
import WindStat from "../general/Stats/WindStat";
import SurfStat from "../general/Stats/SurfStat";

import { Dog, CircleParking, Toilet, LifeBuoy, Fish, Shell, BadgeCheck, Waves, Droplets, Sun, Wind, Lightbulb, Tent, Flame, Ship } from "lucide-react";

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

const Summary = ({ beachId, date }: { beachId?: string; date?: Date }) => {
  // Visible immediately while data loads
  const [stats, setStats] = useState<SummaryStat[]>([]);
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (!beachId) return;

        // Resolve the param to a concrete id (supports id/uuid/slug)
        const resolved = await fetchBeachByIdLoose(beachId);
        const resolvedId = resolved?.id ?? beachId;

        // Choose the time window: if a date is provided, use that local day; otherwise next 6 hours
        const now = new Date();
        let startWindow = now;
        let endWindow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
        if (date instanceof Date) {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          startWindow = d;
          endWindow = new Date(d.getTime() + 24 * 60 * 60 * 1000);
        }
        const [current, forecast, beach] = await Promise.all([
          fetchCurrentConditions(resolvedId),
          fetchBeachForecast(resolvedId, startWindow, endWindow),
          fetchBeachDetails(resolvedId),
        ]);

        const first = forecast[0];
        // If a specific date is selected, use that day's forecast; otherwise prefer current conditions
        const base = date ? first : (current ?? first);
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
          // Centralized icon/color map (safe icons known to exist in lucide-react)
          const iconMap: Record<string, { icon: React.ReactNode; color: string }> = {
            // Access & Fees
            O_PUBLIC:   { icon: <BadgeCheck size={16} />, color: "bg-emerald-100" },
            FEE:        { icon: <BadgeCheck size={16} />, color: "bg-amber-100" },
            PARKING:    { icon: <CircleParking size={16} />, color: "bg-green-100" },
            RSTRCTNS:   { icon: <BadgeCheck size={16} />, color: "bg-slate-200" },
            DSABLDACSS: { icon: <BadgeCheck size={16} />, color: "bg-indigo-100" },

            // Facilities
            RESTROOMS:  { icon: <Toilet size={16} />, color: "bg-yellow-100" },
            VISTOR_CTR: { icon: <BadgeCheck size={16} />, color: "bg-sky-100" },
            DOG_FRIEND: { icon: <Dog size={16} />, color: "bg-pink-100" },
            EZ4STROLLE: { icon: <BadgeCheck size={16} />, color: "bg-violet-100" },
            LIFEGUARD:  { icon: <LifeBuoy size={16} />, color: "bg-red-100" },
            SHOWERS:    { icon: <Droplets size={16} />, color: "bg-cyan-100" },
            FOOD:       { icon: <BadgeCheck size={16} />, color: "bg-orange-100" },
            DRINKWTR:   { icon: <Droplets size={16} />, color: "bg-blue-100" },
            PCNC_AREA:  { icon: <Sun size={16} />, color: "bg-amber-100" },
            FIREPITS:   { icon: <Flame size={16} />, color: "bg-rose-100" },
            CAMPGROUND: { icon: <Tent size={16} />, color: "bg-lime-100" },
            RV_CMP:     { icon: <BadgeCheck size={16} />, color: "bg-lime-100" },
            BT_FACILIT: { icon: <Ship size={16} />, color: "bg-teal-100" },
            LIGHTHOUSE: { icon: <Lightbulb size={16} />, color: "bg-purple-100" },
            PIER:       { icon: <Ship size={16} />, color: "bg-slate-100" },
            HAND_LAUNCH:{ icon: <Ship size={16} />, color: "bg-teal-100" },

            // Beach Types
            SNDY_BEACH: { icon: <Shell size={16} />, color: "bg-orange-100" },
            DUNES:      { icon: <Shell size={16} />, color: "bg-amber-100" },
            RKY_SHORE:  { icon: <Shell size={16} />, color: "bg-slate-200" },
            UPLAND_BCH: { icon: <Shell size={16} />, color: "bg-emerald-100" },
            STRM_CRDOR: { icon: <Droplets size={16} />, color: "bg-cyan-100" },
            WETLAND:    { icon: <Droplets size={16} />, color: "bg-green-100" },
            BLUFF:      { icon: <BadgeCheck size={16} />, color: "bg-lime-100" },
            BAY_LGN_LK: { icon: <Droplets size={16} />, color: "bg-sky-100" },
            URBN_WFRNT: { icon: <BadgeCheck size={16} />, color: "bg-gray-200" },
            INLND_AREA: { icon: <BadgeCheck size={16} />, color: "bg-emerald-100" },
            STRS_BEACH: { icon: <BadgeCheck size={16} />, color: "bg-slate-100" },
            PTH_BEACH:  { icon: <BadgeCheck size={16} />, color: "bg-slate-100" },
            BOARDWLK:   { icon: <BadgeCheck size={16} />, color: "bg-slate-100" },

            // Trails & Paths
            BLFTP_TRLS: { icon: <BadgeCheck size={16} />, color: "bg-emerald-100" },
            BLFTP_PRK:  { icon: <BadgeCheck size={16} />, color: "bg-emerald-100" },
            TRAIL_OR_P: { icon: <BadgeCheck size={16} />, color: "bg-emerald-100" },
            BIKE_PATH:  { icon: <BadgeCheck size={16} />, color: "bg-teal-100" },
            EQUEST_TRL: { icon: <BadgeCheck size={16} />, color: "bg-amber-100" },
            WLDLFE_VWG: { icon: <BadgeCheck size={16} />, color: "bg-green-100" },

            // Activities
            SWIMMING:   { icon: <Droplets size={16} />, color: "bg-cyan-100" },
            DIVING:     { icon: <Droplets size={16} />, color: "bg-cyan-100" },
            SNORKLNG:   { icon: <Droplets size={16} />, color: "bg-cyan-100" },
            TIDEPOOL:   { icon: <Shell size={16} />, color: "bg-amber-100" },
            PLAYGROUND: { icon: <Sun size={16} />, color: "bg-yellow-100" },
            SPORT_FLDS: { icon: <BadgeCheck size={16} />, color: "bg-orange-100" },
            VOLLEYBALL: { icon: <BadgeCheck size={16} />, color: "bg-orange-100" },
            WNDSRF_KIT: { icon: <Wind size={16} />, color: "bg-sky-100" },
            KAYAKING:   { icon: <Ship size={16} />, color: "bg-teal-100" },
            SURFING:    { icon: <Waves size={16} />, color: "bg-blue-100" },
            FISHING:    { icon: <Fish size={16} />, color: "bg-blue-100" },
            BOATING:    { icon: <Ship size={16} />, color: "bg-teal-100" },
          };
          for (const key of keys) {
            const val = (beach as any)[key];
            if (val === true) {
              const label = typeof getFeatureDisplayName === "function" ? getFeatureDisplayName(key) : key;
              const def = iconMap[key] ?? { icon: <BadgeCheck size={16} />, color: "bg-highlight-2" };
              tags.push({ label, icon: def.icon, color: def.color });
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
  }, [beachId, date]);

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
              <div className="flex items-center justify-between">
                <h3 className="highlight-title">{stat.type.toUpperCase()}</h3>
                {stat.type === "features" && (
                  <button
                    className="text-[11px] px-2 py-0.5 rounded border border-border bg-highlight-5 hover:bg-highlight-4"
                    onClick={() => setShowAllFeatures((v) => !v)}
                  >
                    {showAllFeatures ? "Collapse" : "Show all"}
                  </button>
                )}
              </div>
              {stat.type === "features" ? (
                <div
                  className={cn(
                    "flex-1 flex items-center gap-2 mt-2",
                    showAllFeatures
                      ? "flex-wrap"
                      : "flex-nowrap overflow-x-auto pb-1"
                  )}
                >
                  {/* When collapsed, single row scrollable */}
                  {stat.tags && stat.tags.map((tag) => <Tag key={tag.label} data={tag} />)}
                </div>
              ) : (
                <div
                  className={cn(
                    "flex-1 flex items-center gap-1 mt-1",
                    "justify-center"
                  )}
                >
                  {content}
                </div>
              )}
            </li>
          );
        }
      })}
    </ul>
  );
};

export default Summary;
