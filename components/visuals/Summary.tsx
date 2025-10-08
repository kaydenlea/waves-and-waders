"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
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
  BadgeCheck,
  Waves,
  Droplets,
  Sun,
  Wind,
  Lightbulb,
  Tent,
  Flame,
  Ship,
} from "lucide-react";

import {
  fetchCurrentConditions,
  fetchBeachForecast,
  fetchBeachByIdLoose,
  fetchBeachDetails,
  fetchBeachTides,
  fetchDailyConditions,
} from "@/lib/supabase";
// Optionally import the feature registry if exposed
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { FEATURE_COLUMNS } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getFeatureDisplayName } from "@/lib/supabase";

type SummaryStat =
  | { type: "temperature"; waterTemp?: number; airTemp?: number; waterTempPercent?: number; airTempPercent?: number; weatherCode?: number | null }
  | {
      type: "tide";
      currentHeight?: number;
      peaks: TidePeak[];
      sunrise?: string;
      sunset?: string;
    }
  | {
      type: "wind";
      wind: { speed: number; loc?: string; gust?: number; intensity: number };
    }
  | {
      type: "surf";
      surf: { height: string; period: number; intensity: number };
    }
  | {
      type: "features";
      tags: { label: string; icon: React.ReactNode; color: string }[];
    };

type TidePointValue = { x: number; tide: number };
type TidePeak = { kind: "high" | "low"; time: Date; level: number };

const computeTidePeaks = (points: TidePointValue[]): TidePeak[] => {
  if (!points || points.length < 3) return [];
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const peaks: TidePeak[] = [];
  for (let i = 1; i < sorted.length - 1; i += 1) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const next = sorted[i + 1];
    const tide = curr.tide;
    if (tide > prev.tide && tide >= next.tide) {
      peaks.push({
        kind: "high",
        time: new Date(curr.x),
        level: Number(tide.toFixed(1)),
      });
    } else if (tide < prev.tide && tide <= next.tide) {
      peaks.push({
        kind: "low",
        time: new Date(curr.x),
        level: Number(tide.toFixed(1)),
      });
    }
  }
  return peaks;
};

const average = (values: number[]): number | null => {
  if (!values || values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
};

const clampIntensity = (value: number, max: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(100, Math.round((value / max) * 100));
};

const SURF_HEIGHT_CAP = 12;
const WIND_SPEED_CAP = 40;
const TEMP_CAP = 100; // For temperature circles

const Summary = ({ beachId, date }: { beachId?: string; date?: Date }) => {
  // Visible immediately while data loads
  const [stats, setStats] = useState<SummaryStat[]>([]);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const featuresContainerRef = useRef<HTMLDivElement | null>(null);
  const [featuresOverflowing, setFeaturesOverflowing] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (!beachId) return;

        // Resolve the param to a concrete id (supports id/uuid/slug)
        const resolved = await fetchBeachByIdLoose(beachId);
        const resolvedId = resolved?.id ?? beachId;

        // Choose the time window: if a date is provided, use that local day; otherwise next 24 hours
        const now = new Date();
        let startWindow = now;
        let endWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        let tideEndWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        if (date instanceof Date) {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          startWindow = d;
          endWindow = new Date(d.getTime() + 24 * 60 * 60 * 1000);
          tideEndWindow = endWindow;
        }
        const [current, forecast, beach, tideRows] = await Promise.all([
          fetchCurrentConditions(resolvedId),
          fetchBeachForecast(resolvedId, startWindow, endWindow),
          fetchBeachDetails(resolvedId),
          fetchBeachTides(resolvedId, startWindow, tideEndWindow),
        ]);
        const first = forecast[0];
        // If a specific date is selected, use that day's forecast; otherwise prefer current conditions
        const base = date ? first : current ?? first;

        const s: SummaryStat[] = [];
        
        // Calculate average water and air temps for the day
        const waterTemps = forecast
          .map((row) => row?.conditions?.waterTemp)
          .filter((value): value is number =>
            typeof value === "number" && !Number.isNaN(value)
          );
        const airTemps = forecast
          .map((row) => row?.conditions?.airTemp)
          .filter((value): value is number =>
            typeof value === "number" && !Number.isNaN(value)
          );
        
        const avgWaterTemp = average(waterTemps);
        const avgAirTemp = average(airTemps);

        const waterTemp = avgWaterTemp != null ? Math.round(avgWaterTemp) : undefined;
        const airTemp = avgAirTemp != null ? Math.round(avgAirTemp) : undefined;

        // Calculate most occurring weather code for the day
        const weatherCodes = forecast
          .map((row) => row?.conditions?.weather)
          .filter((value): value is number =>
            typeof value === "number" && !Number.isNaN(value)
          );

        let dominantWeatherCode: number | null = null;
        if (weatherCodes.length > 0) {
          const codeCounts: Record<number, number> = {};
          for (const code of weatherCodes) {
            codeCounts[code] = (codeCounts[code] ?? 0) + 1;
          }
          let bestCount = -1;
          for (const code of Object.keys(codeCounts)) {
            const count = codeCounts[Number(code)];
            if (count > bestCount) {
              dominantWeatherCode = Number(code);
              bestCount = count;
            }
          }
        }

        if (waterTemp != null || airTemp != null) {
          s.push({
            type: "temperature",
            waterTemp,
            airTemp,
            waterTempPercent: waterTemp != null ? clampIntensity(waterTemp, TEMP_CAP) : undefined,
            airTempPercent: airTemp != null ? clampIntensity(airTemp, TEMP_CAP) : undefined,
            weatherCode: dominantWeatherCode,
          });
        }

        const heightMins = forecast
          .map((row) => row?.surf?.heightMin)
          .filter((value): value is number =>
            typeof value === "number" && !Number.isNaN(value)
          );
        const heightMaxes = forecast
          .map((row) => row?.surf?.heightMax)
          .filter((value): value is number =>
            typeof value === "number" && !Number.isNaN(value)
          );
        const periods = forecast
          .map((row) => row?.swell?.primary?.period)
          .filter((value): value is number =>
            typeof value === "number" && !Number.isNaN(value)
          );

        const avgHeightMin = average(heightMins);
        const avgHeightMax = average(heightMaxes);
        const avgPeriod = average(periods);

        const minWithFallback =
          avgHeightMin != null
            ? avgHeightMin
            : avgHeightMax != null && avgHeightMax <= 1
            ? 0
            : null;
        const maxWithFallback = avgHeightMax != null ? avgHeightMax : null;
        const hasRange =
          minWithFallback != null && maxWithFallback != null;

        let surfHeightLabel: string | null = null;
        if (hasRange) {
          let minRounded = Math.round(minWithFallback!);
          const maxRounded = Math.round(maxWithFallback!);
          if (minRounded === maxRounded) {
            minRounded = Math.max(0, maxRounded - 1);
          }
          surfHeightLabel = `${minRounded}-${maxRounded}`;
        }
        const surfPeriod = avgPeriod != null ? Math.round(avgPeriod) : null;

        if (hasRange && surfHeightLabel && surfPeriod != null) {
          const surfIntensity = clampIntensity(
            maxWithFallback ?? minWithFallback ?? 0,
            SURF_HEIGHT_CAP
          );

          s.push({
            type: "surf",
            surf: {
              height: surfHeightLabel,
              period: surfPeriod,
              intensity: surfIntensity,
            },
          });
        }

        const tideSeries: TidePointValue[] = (tideRows ?? [])
          .map((row) => {
            const tideFt =
              typeof row?.tideLevelFt === "number"
                ? row.tideLevelFt
                : typeof row?.tideLevelM === "number"
                ? row.tideLevelM * 3.28084
                : null;
            if (tideFt == null || Number.isNaN(tideFt)) return null;
            return {
              x: new Date(row.timestamp).getTime(),
              tide: tideFt,
            };
          })
          .filter((point): point is TidePointValue => point !== null)
          .sort((a, b) => a.x - b.x);

        let tidePeaks = computeTidePeaks(tideSeries);
        if (tidePeaks.length === 0 && forecast.length > 0) {
          const fallbackSeries: TidePointValue[] = forecast
            .map((row) => {
              const tideLevel = row?.conditions?.tideLevel;
              if (tideLevel == null || Number.isNaN(tideLevel)) return null;
              return {
                x: new Date(row.timestamp).getTime(),
                tide: tideLevel,
              };
            })
            .filter((point): point is TidePointValue => point !== null)
            .sort((a, b) => a.x - b.x);
          tidePeaks = computeTidePeaks(fallbackSeries);
        }

        const tideStatPeaks = tidePeaks.slice(0, 4);
        const currentTideHeight =
          base?.conditions.tideLevel != null
            ? Number(base.conditions.tideLevel.toFixed(1))
            : undefined;

        let sunrise: string | undefined;
        let sunset: string | undefined;
        const county = beach?.COUNTY;
        if (county) {
          try {
            const basisDate =
              date instanceof Date ? new Date(date) : new Date(startWindow);
            const cond = await fetchDailyConditions(county, basisDate);
            const dayForFormat = cond?.date
              ? new Date(`${cond.date}T00:00:00`)
              : new Date(basisDate);
            const formatClock = (raw: string | null | undefined) => {
              if (!raw) return undefined;
              // Match HH:MM:SS or HH:MM format
              const match = /^([0-9]{1,2}):([0-9]{2})(?::([0-9]{2}))?/.exec(raw.trim());
              if (!match) return undefined;
              const h = Number(match[1]);
              const m = Number(match[2]);
              if (!Number.isFinite(h) || !Number.isFinite(m)) return undefined;
              
              // Create a date with the correct time
              const ts = new Date(dayForFormat);
              ts.setHours(h, m, 0, 0);
              
              return ts.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              });
            };
            const resolvedSunrise = formatClock(cond?.sunrise);
            const resolvedSunset = formatClock(cond?.sunset);
            sunrise = resolvedSunrise ?? cond?.sunrise ?? undefined;
            sunset = resolvedSunset ?? cond?.sunset ?? undefined;
          } catch (sunErr) {
            console.warn("Summary sunrise/sunset unavailable", sunErr);
          }
        }

        if (
          currentTideHeight != null ||
          tideStatPeaks.length > 0 ||
          sunrise ||
          sunset
        ) {
          s.push({
            type: "tide",
            currentHeight: currentTideHeight,
            peaks: tideStatPeaks,
            sunrise,
            sunset,
          });
        }

        const windSpeeds = forecast
          .map((row) => row?.conditions?.windSpeed)
          .filter((value): value is number =>
            typeof value === "number" && !Number.isNaN(value)
          );
        const windGusts = forecast
          .map((row) => row?.conditions?.windGust)
          .filter((value): value is number =>
            typeof value === "number" && !Number.isNaN(value)
          );

        const avgWindSpeed = average(windSpeeds);
        const avgWindGust = average(windGusts);

        const resolvedWindSpeed = avgWindSpeed != null ? Math.round(avgWindSpeed) : null;
        const resolvedWindGust = avgWindGust != null ? Math.round(avgWindGust) : undefined;

        if (resolvedWindSpeed != null) {
          const windIntensity = clampIntensity(resolvedWindSpeed, WIND_SPEED_CAP);

          s.push({
            type: "wind",
            wind: {
              speed: resolvedWindSpeed,
              gust: resolvedWindGust,
              loc: resolvedWindGust == null ? "-" : undefined,
              intensity: windIntensity,
            },
          });
        }


        // Build features from beach flags when available
        if (beach) {
          const tags: {
            label: string;
            icon: React.ReactNode;
            color: string;
          }[] = [];
          // If FEATURE_COLUMNS/getFeatureDisplayName are exported, iterate them; else, fallback to known ones
          const keys: string[] =
            typeof FEATURE_COLUMNS !== "undefined" &&
            Array.isArray(FEATURE_COLUMNS)
              ? (FEATURE_COLUMNS as string[])
              : [
                  "FISHING",
                  "RESTROOMS",
                  "PARKING",
                  "DOG_FRIEND",
                  "SNDY_BEACH",
                  "LIFEGUARD",
                ];
          // Centralized icon/color map (safe icons known to exist in lucide-react)
          const iconMap: Record<
            string,
            { icon: React.ReactNode; color: string }
          > = {
            // Access & Fees
            O_PUBLIC: {
              icon: <BadgeCheck size={16} />,
              color: "bg-emerald-100",
            },
            FEE: { icon: <BadgeCheck size={16} />, color: "bg-amber-100" },
            PARKING: {
              icon: <CircleParking size={16} />,
              color: "bg-green-100",
            },
            RSTRCTNS: { icon: <BadgeCheck size={16} />, color: "bg-slate-200" },
            DSABLDACSS: {
              icon: <BadgeCheck size={16} />,
              color: "bg-indigo-100",
            },

            // Facilities
            RESTROOMS: { icon: <Toilet size={16} />, color: "bg-yellow-100" },
            VISTOR_CTR: { icon: <BadgeCheck size={16} />, color: "bg-sky-100" },
            DOG_FRIEND: { icon: <Dog size={16} />, color: "bg-pink-100" },
            EZ4STROLLE: {
              icon: <BadgeCheck size={16} />,
              color: "bg-violet-100",
            },
            LIFEGUARD: { icon: <LifeBuoy size={16} />, color: "bg-red-100" },
            SHOWERS: { icon: <Droplets size={16} />, color: "bg-cyan-100" },
            FOOD: { icon: <BadgeCheck size={16} />, color: "bg-orange-100" },
            DRINKWTR: { icon: <Droplets size={16} />, color: "bg-blue-100" },
            PCNC_AREA: { icon: <Sun size={16} />, color: "bg-amber-100" },
            FIREPITS: { icon: <Flame size={16} />, color: "bg-rose-100" },
            CAMPGROUND: { icon: <Tent size={16} />, color: "bg-lime-100" },
            RV_CMP: { icon: <BadgeCheck size={16} />, color: "bg-lime-100" },
            BT_FACILIT: { icon: <Ship size={16} />, color: "bg-teal-100" },
            LIGHTHOUSE: {
              icon: <Lightbulb size={16} />,
              color: "bg-purple-100",
            },
            PIER: { icon: <Ship size={16} />, color: "bg-slate-100" },
            HAND_LAUNCH: { icon: <Ship size={16} />, color: "bg-teal-100" },

            // Beach Types
            SNDY_BEACH: { icon: <Shell size={16} />, color: "bg-orange-100" },
            DUNES: { icon: <Shell size={16} />, color: "bg-amber-100" },
            RKY_SHORE: { icon: <Shell size={16} />, color: "bg-slate-200" },
            UPLAND_BCH: { icon: <Shell size={16} />, color: "bg-emerald-100" },
            STRM_CRDOR: { icon: <Droplets size={16} />, color: "bg-cyan-100" },
            WETLAND: { icon: <Droplets size={16} />, color: "bg-green-100" },
            BLUFF: { icon: <BadgeCheck size={16} />, color: "bg-lime-100" },
            BAY_LGN_LK: { icon: <Droplets size={16} />, color: "bg-sky-100" },
            URBN_WFRNT: {
              icon: <BadgeCheck size={16} />,
              color: "bg-gray-200",
            },
            INLND_AREA: {
              icon: <BadgeCheck size={16} />,
              color: "bg-emerald-100",
            },
            STRS_BEACH: {
              icon: <BadgeCheck size={16} />,
              color: "bg-slate-100",
            },
            PTH_BEACH: {
              icon: <BadgeCheck size={16} />,
              color: "bg-slate-100" },
            BOARDWLK: { icon: <BadgeCheck size={16} />, color: "bg-slate-100" },

            // Trails & Paths
            BLFTP_TRLS: {
              icon: <BadgeCheck size={16} />,
              color: "bg-emerald-100",
            },
            BLFTP_PRK: {
              icon: <BadgeCheck size={16} />,
              color: "bg-emerald-100",
            },
            TRAIL_OR_P: {
              icon: <BadgeCheck size={16} />,
              color: "bg-emerald-100",
            },
            BIKE_PATH: { icon: <BadgeCheck size={16} />, color: "bg-teal-100" },
            EQUEST_TRL: {
              icon: <BadgeCheck size={16} />,
              color: "bg-amber-100",
            },
            WLDLFE_VWG: {
              icon: <BadgeCheck size={16} />,
              color: "bg-green-100",
            },

            // Activities
            SWIMMING: { icon: <Droplets size={16} />, color: "bg-cyan-100" },
            DIVING: { icon: <Droplets size={16} />, color: "bg-cyan-100" },
            SNORKLNG: { icon: <Droplets size={16} />, color: "bg-cyan-100" },
            TIDEPOOL: { icon: <Shell size={16} />, color: "bg-amber-100" },
            PLAYGROUND: { icon: <Sun size={16} />, color: "bg-yellow-100" },
            SPORT_FLDS: {
              icon: <BadgeCheck size={16} />,
              color: "bg-orange-100",
            },
            VOLLEYBALL: {
              icon: <BadgeCheck size={16} />,
              color: "bg-orange-100",
            },
            WNDSRF_KIT: { icon: <Wind size={16} />, color: "bg-sky-100" },
            KAYAKING: { icon: <Ship size={16} />, color: "bg-teal-100" },
            SURFING: { icon: <Waves size={16} />, color: "bg-blue-100" },
            FISHING: { icon: <Fish size={16} />, color: "bg-blue-100" },
            BOATING: { icon: <Ship size={16} />, color: "bg-teal-100" },
          };
          for (const key of keys) {
            const val = (beach as any)[key];
            if (val === true) {
              const label =
                typeof getFeatureDisplayName === "function"
                  ? getFeatureDisplayName(key)
                  : key;
              const def = iconMap[key] ?? {
                icon: <BadgeCheck size={16} />,
                color: "bg-highlight-2",
              };
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

  useEffect(() => {

    const el = featuresContainerRef.current;

    if (!el) {

      setFeaturesOverflowing(false);

      return;

    }



    const measure = () => {

      const target = featuresContainerRef.current;

      if (!target) return;

      const previousWrap = target.style.flexWrap;

      const previousOverflow = target.style.overflow;



      target.style.flexWrap = "nowrap";

      target.style.overflow = "hidden";

      const isOverflowing = target.scrollWidth > target.clientWidth + 1;

      target.style.flexWrap = previousWrap;

      target.style.overflow = previousOverflow;



      setFeaturesOverflowing(isOverflowing);

      if (!isOverflowing && showAllFeatures) {

        setShowAllFeatures(false);

      }

    };



    const scheduleMeasure = () => {

      requestAnimationFrame(measure);

    };



    scheduleMeasure();



    let observer: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {

      observer = new ResizeObserver(() => scheduleMeasure());

      observer.observe(el);

    }



    const resizeHandler = () => scheduleMeasure();

    if (typeof window !== "undefined") {

      window.addEventListener("resize", resizeHandler);

    }



    return () => {

      observer?.disconnect();

      if (typeof window !== "undefined") {

        window.removeEventListener("resize", resizeHandler);

      }

    };

  }, [stats, showAllFeatures]);



  const surfStat = stats.find(
    (stat): stat is Extract<SummaryStat, { type: "surf" }> =>
      stat.type === "surf"
  );
  const windStat = stats.find(
    (stat): stat is Extract<SummaryStat, { type: "wind" }> =>
      stat.type === "wind"
  );
  const tideStat = stats.find(
    (stat): stat is Extract<SummaryStat, { type: "tide" }> =>
      stat.type === "tide"
  );

  // Generate dynamic overview text based on conditions
  const getOverviewText = () => {
    const surfHeight = surfStat?.surf?.height || "N/A";
    const windSpeed = windStat?.wind?.speed;
    
    // Determine surf condition
    let surfCondition = "calm";
    if (surfStat?.surf?.intensity) {
      const intensity = surfStat.surf.intensity;
      if (intensity >= 75) surfCondition = "huge";
      else if (intensity >= 50) surfCondition = "pumping";
      else if (intensity >= 25) surfCondition = "moderate";
      else surfCondition = "calm";
    }
    
    // Determine wind condition
    let windCondition = "light";
    let windAction = "blowing";
    if (windSpeed != null) {
      if (windSpeed >= 25) {
        windCondition = "strong";
        windAction = "whipping";
      } else if (windSpeed >= 15) {
        windCondition = "moderate";
        windAction = "blowing";
      } else if (windSpeed >= 8) {
        windCondition = "gentle";
        windAction = "coming in";
      } else {
        windCondition = "light";
        windAction = "blowing";
      }
    }
    
    // Build sentence based on conditions
    let sentence = `The waves are ${surfHeight} ft and ${surfCondition}.`;
    
    if (windSpeed != null) {
      if (windSpeed >= 15) {
        sentence += ` Watch out for ${windCondition} winds ${windAction} at ${windSpeed} mph.`;
      } else {
        sentence += ` Winds are ${windCondition}, ${windAction} at ${windSpeed} mph.`;
      }
    } else {
      sentence += ` Wind conditions unavailable.`;
    }
    
    return sentence;
  };

  return (
    <ul className="grid grid-cols-2 @min-xl:grid-cols-3 @min-4xl:grid-cols-6 gap-3">
      {/* Overview card */}
      <li
        className="highlight-card shadow-even flex flex-col overflow-hidden col-span-2"
      >
        <div className="flex items-center justify-between">
          <h3 className="highlight-title">OVERVIEW</h3>
          <div className="text-xs text-muted-foreground text-right uppercase tracking-wide leading-tight space-y-1">
            <div>
              Sunrise{" "}
              <span className="ml-1 text-foreground normal-case">
                {tideStat?.sunrise ?? "--"}
              </span>
            </div>
            <div>
              Sunset{" "}
              <span className="ml-1 text-foreground normal-case">
                {tideStat?.sunset ?? "--"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-1 mt-1 justify-center">
          <p className="text-center text-base">
            {getOverviewText()}
          </p>
        </div>
      </li>
      {stats.map((stat) => {
        let content;
        switch (stat.type) {
          case "temperature":
            content = (
              <div className="flex gap-3 items-center">
                {stat.waterTemp != null && (
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">WATER</span>
                    <GradientCircle
                      condition="water"
                      data={stat.waterTemp}
                      percent={stat.waterTempPercent}
                    />
                  </div>
                )}
                {stat.airTemp != null && (
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">AIR</span>
                    <GradientCircle
                      condition="sun"
                      data={stat.airTemp}
                      percent={stat.airTempPercent}
                      weatherCode={stat.weatherCode}
                    />
                  </div>
                )}
              </div>
            );
            break;
          case "tide":
            content = (
          <div className="flex flex-col w-full gap-2">
            {stat.currentHeight != null && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  Current
                </span>
                <span className="text-xl font-medium">
                  {stat.currentHeight}
                  <span className="text-xs ml-1">ft</span>
                </span>
              </div>
            )}
            <div className="flex flex-col gap-1 text-sm">
              {stat.peaks.length > 0 ? (
                stat.peaks.slice(0, 4).map((peak) => (
                  <div
                    key={`${peak.kind}-${peak.time.getTime()}`}
                        className="flex items-center justify-between"
                      >
                        <span className="font-medium">
                          {peak.kind === "high" ? "High tide" : "Low tide"}
                        </span>
                        <span className="text-muted-foreground">
                          {`${peak.time.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} - ${peak.level} ft`}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground text-center">
                      Tide peaks unavailable
                    </span>
                  )}
                </div>
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
                "highlight-card shadow-even flex flex-col overflow-hidden",
                stat.type === "features"
                  ? "col-span-2 @min-xl:col-span-3 @min-4xl:col-span-6"
                  : "min-h-35"
              )}
            >
              <div className="flex items-start justify-between">
                <h3 className="highlight-title mt-0.5">
                  {stat.type.toUpperCase()}
                </h3>
                {stat.type === "features" && featuresOverflowing ? (
                  <button
                    className="text-[11px] px-2 py-0.5 rounded border border-border bg-highlight-5 hover:bg-highlight-4"
                    onClick={() => setShowAllFeatures((v) => !v)}
                  >
                    {showAllFeatures ? "Collapse" : "Show all"}
                  </button>
                ) : null}
              </div>
              {stat.type === "features" ? (
                <div
                  ref={featuresContainerRef}
                  className={cn(
                    "flex-1 flex items-center gap-2 mt-2",
                    showAllFeatures
                      ? "flex-wrap"
                      : "flex-nowrap overflow-x-auto pb-1"
                  )}
                >
                  {/* When collapsed, single row scrollable */}
                  {stat.tags &&
                    stat.tags.map((tag) => <Tag key={tag.label} data={tag} />)}
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
