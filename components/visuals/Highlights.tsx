import { cn } from "@/lib/utils";
import SwellStat from "../general/SwellStat";
import { IoIosWater } from "react-icons/io";
import {
  WiDaySunny,
  WiCloudy,
  WiFog,
  WiRain,
  WiShowers,
  WiSnow,
  WiThunderstorm,
  WiSleet,
  WiHail,
} from "react-icons/wi";
import {
  fetchCurrentConditions,
  type ForecastData,
  type DailyConditions,
} from "@/lib/supabase";
import React, { useState, useEffect } from "react";

/* ---------------------------
   Small helpers
---------------------------- */

// round to nearest 0.1
const round1 = (v: number | null | undefined): number => {
  if (v == null || Number.isNaN(v)) return 0;
  return Math.round(v * 10) / 10;
};

// Degrees → 16-pt compass string
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

/* ---------------------------
   Weather icon from WMO code
---------------------------- */
const weatherIconByCode = (code: number | null | undefined) => {
  if (code == null) return <WiDaySunny size={22} color="#f59e0b" />;

  // Reference:
  // 0 Clear
  // 1,2,3 Mainly clear/partly cloudy/overcast
  // 45,48 Fog
  // 51,53,55 Drizzle (light/moderate/dense)
  // 56,57 Freezing drizzle
  // 61,63,65 Rain (slight/moderate/heavy)
  // 66,67 Freezing rain
  // 71,73,75 Snow fall (slight/moderate/heavy)
  // 77 Snow grains
  // 80,81,82 Rain showers (slight/moderate/violent)
  // 85,86 Snow showers (slight/heavy)
  // 95 Thunderstorm (slight/moderate)
  // 96,99 Thunderstorm with hail (slight/heavy)

  if (code === 0) return <WiDaySunny size={22} color="#f59e0b" />;

  if ([1, 2, 3].includes(code)) return <WiCloudy size={22} color="#6b7280" />;

  if ([45, 48].includes(code)) return <WiFog size={22} color="#94a3b8" />;

  if ([51, 53, 55].includes(code)) return <WiRain size={22} color="#60a5fa" />;

  if ([56, 57, 66, 67].includes(code)) return <WiSleet size={22} color="#38bdf8" />;

  if ([61, 63, 65].includes(code)) return <WiRain size={22} color="#3b82f6" />;

  if ([71, 73, 75, 77, 85, 86].includes(code)) return <WiSnow size={22} color="#93c5fd" />;

  if ([80, 81, 82].includes(code)) return <WiShowers size={22} color="#60a5fa" />;

  if (code === 95) return <WiThunderstorm size={22} color="#f59e0b" />;

  if ([96, 99].includes(code)) return <WiThunderstorm size={22} color="#eab308" />;

  // Fallback
  return <WiDaySunny size={22} color="#f59e0b" />;
};

/* ---------------------------
   Weather / Water UI
---------------------------- */

const WeatherStat = ({ temp, code }: { temp: number; code?: number | null }) => {
  return (
    <div className="flex items-center justify-center gap-1">
      {weatherIconByCode(code ?? null)}
      <span className="text-2xl font-medium">
        {Math.round(temp)}
        <span className="text-sm font-normal">&deg;F</span>
      </span>
    </div>
  );
};

const WaterStat = ({ temp }: { temp: number }) => {
  return (
    <div className="flex items-center justify-center gap-1">
      <IoIosWater size={22} color="#1CACD4" />
      <span className="text-2xl font-medium">
        {Math.round(temp)}
        <span className="text-sm font-normal">&deg;F</span>
      </span>
    </div>
  );
};

const BasicStat = ({
  data,
}: {
  data: { value: number | string; unit: string };
}) => {
  return (
    <span className="text-2xl font-medium px-3 py-2 border border-border rounded-md bg-white/50">
      {data.value}
      <span className="text-sm font-normal">{data.unit}</span>
    </span>
  );
};

/* ---------------------------
   Moon phase mapping (0..1)
   Spec:
   0            – new moon
   0..0.25      – waxing crescent
   0.25         – first quarter
   0.25..0.5    – waxing gibbous
   0.5          – full moon
   0.5..0.75    – waning gibbous
   0.75         – last quarter
   0.75..1      – waning crescent
---------------------------- */

const MoonStat = ({ moonPhase }: { moonPhase: number | null }) => {
  const getMoonPhaseInfo = (phase: number | null) => {
    if (phase == null) {
      return { description: "Unknown", percentage: 0, icon: "🌑" };
    }
    // normalize to [0,1)
    const p = ((phase % 1) + 1) % 1;
    const pct = Math.round(p * 100);
    const isClose = (a: number, b: number, eps = 0.02) => Math.abs(a - b) <= eps;

    let description = "";
    let icon = "🌑";

    if (isClose(p, 0) || isClose(p, 1)) {
      description = "new moon";
      icon = "🌑";
    } else if (p > 0 && p < 0.25) {
      description = "waxing crescent";
      icon = "🌒";
    } else if (isClose(p, 0.25)) {
      description = "first quarter";
      icon = "🌓";
    } else if (p > 0.25 && p < 0.5) {
      description = "waxing gibbous";
      icon = "🌔";
    } else if (isClose(p, 0.5)) {
      description = "full moon";
      icon = "🌕";
    } else if (p > 0.5 && p < 0.75) {
      description = "waning gibbous";
      icon = "🌖";
    } else if (isClose(p, 0.75)) {
      description = "last quarter";
      icon = "🌗";
    } else {
      // 0.75..1
      description = "waning crescent";
      icon = "🌘";
    }

    return { description, percentage: pct, icon };
  };

  const phaseInfo = getMoonPhaseInfo(moonPhase);

  return (
    <div className="flex items-center justify-center gap-2">
      <div className="text-2xl">{phaseInfo.icon}</div>
      <div className="flex flex-col text-center">
        <span className="text-sm font-medium capitalize">{phaseInfo.description}</span>
        <span className="text-xs text-gray-500">{phaseInfo.percentage}%</span>
      </div>
    </div>
  );
};

const WindStat = ({ data }: { data: { speed: number; max: number } }) => {
  return (
    <span className="flex gap-1 bg-orange/10 border border-border rounded-md py-2 px-3">
      <span className="text-2xl font-medium">{Math.round(data.speed)}</span>
      <span className="flex flex-col -space-y-1">
        <span className="text-[0.7rem]">{Math.round(data.max)}</span>
        <span className="text-xs">mph</span>
      </span>
    </span>
  );
};

/* ---------------------------
   Component
---------------------------- */

interface HighlightsProps {
  beachId?: number;
  county?: string;
  currentData?: ForecastData | null;
  dailyConditions?: DailyConditions | null;
  className?: string;
}

const Highlights = ({
  beachId,
  county,
  currentData,
  dailyConditions,
  className,
}: HighlightsProps) => {
  const [forecastData, setForecastData] = useState<ForecastData | null>(
    currentData || null
  );
  const [loading, setLoading] = useState(false);

  // Fetch current conditions if not provided
  useEffect(() => {
    const loadData = async () => {
      if (!beachId || currentData) return;
      try {
        setLoading(true);
        const current = await fetchCurrentConditions(beachId);
        setForecastData(current);
      } catch (error) {
        console.error("Error loading highlights data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [beachId, currentData]);

  const dataToUse = currentData || forecastData;

  // Build stats; round swell heights & periods to nearest 0.1
  const getStats = () => {
    const defaultStats = [
      { label: "weather", weather: { temp: 64, code: 0 } },
      { label: "water", temp: 60 },
      {
        label: "swell",
        primary: { height: 2.1, period: 7.0, wind: { dir: "W", deg: 272 } },
        secondary: [
          { height: 1.8, period: 12.0, wind: { dir: "SW", deg: 225 } },
          { height: 1.2, period: 9.0, wind: { dir: "S", deg: 180 } },
        ],
      },
      { label: "tide", tide: { value: "2-3", unit: "ft" } },
      { label: "moon phase", moonPhase: 0.25 },
      { label: "wind", wind: { speed: 12, max: 17 } },
      { label: "pressure", pressure: { value: 29.9, unit: "inHg" } },
      { label: "wave energy", energy: { value: 278, unit: "ft-lbs" } },
    ];

    if (!dataToUse) return defaultStats;

    const { conditions, swell, surf } = dataToUse;

    // Extract real swell data using the same pattern as Summary.tsx
    const primarySwell = {
      height: round1(swell.primary.height || 0),
      period: round1(swell.primary.period || 0),
      wind: {
        dir: getWindDirection(swell.primary.direction),
        deg: swell.primary.direction || 0,
      },
    };

    // ACTUAL SECONDARY SWELL DATA (not calculated)
    const secondarySwell = {
      height: round1(swell.secondary.height || 0),
      period: round1(swell.secondary.period || 0),
      wind: {
        dir: getWindDirection(swell.secondary.direction),
        deg: swell.secondary.direction || 0,
      },
    };

    // ACTUAL TERTIARY SWELL DATA (not calculated)
    const tertiarySwell = {
      height: round1(swell.tertiary.height || 0),
      period: round1(swell.tertiary.period || 0),
      wind: {
        dir: getWindDirection(swell.tertiary.direction),
        deg: swell.tertiary.direction || 0,
      },
    };

    return [
      {
        label: "weather",
        weather: {
          temp: conditions.airTemp ?? 64,
          code: conditions.weather ?? 0,
        },
      },
      {
        label: "water",
        temp: conditions.waterTemp ?? 60,
      },
      {
        label: "swell",
        primary: primarySwell,
        secondary: [secondarySwell, tertiarySwell],
      },
      {
        label: "tide",
        tide: {
          value:
            conditions.tideLevel != null
              ? round1(conditions.tideLevel).toFixed(1)
              : "2-3",
          unit: "ft",
        },
      },
      {
        label: "moon phase",
        moonPhase: dailyConditions?.moon_phase ?? null,
      },
      {
        label: "wind",
        wind: {
          speed: conditions.windSpeed ?? 12,
          max: conditions.windGust ?? 17,
        },
      },
      {
        label: "pressure",
        pressure: {
          value:
            conditions.pressure != null
              ? Number(conditions.pressure.toFixed(2))
              : 29.9,
          unit: "inHg",
        },
      },
      {
        label: "wave energy",
        energy: {
          value: surf.waveEnergy ? Math.round(surf.waveEnergy) : 278,
          unit: "ft-lbs",
        },
      },
    ];
  };

  const stats = getStats();

  return (
    <div className={cn("w-full p-2 border border-border rounded-md shadow-sm", className)}>
      <header className="ml-1 mb-4 mt-2">
        <h3 className="text-xl font-semibold">Current Conditions</h3>
        <p className="text-sm -mt-0.5">
          {dataToUse ? "Live data from sensors" : "Showing sample data"}
          {loading && " (Loading...)"}
          {dailyConditions && " • Daily conditions loaded"}
          {dataToUse && dataToUse.swell.tertiary.height && dataToUse.swell.tertiary.height > 0 && (
            <span className="text-green-600"> • Tertiary swell detected</span>
          )}
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {stats.map((stat) => {
            let content: React.ReactNode = null;

            switch (stat.label) {
              case "swell":
                content =
                  stat.primary &&
                  stat.secondary && (
                    <div className="flex flex-col items-center">
                      <SwellStat primary data={stat.primary} />
                      <SwellStat data={stat.secondary[0]} />
                      {/* Only show tertiary if it has meaningful data */}
                      {stat.secondary[1] && stat.secondary[1].height > 0 && (
                        <SwellStat data={stat.secondary[1]} />
                      )}
                    </div>
                  );
                break;

              case "weather":
                content =
                  stat.weather && (
                    <WeatherStat temp={stat.weather.temp} code={stat.weather.code} />
                  );
                break;

              case "water":
                content = typeof stat.temp === "number" && (
                  <WaterStat temp={stat.temp} />
                );
                break;

              case "tide":
                content = stat.tide && <BasicStat data={stat.tide} />;
                break;

              case "moon phase":
                content = <MoonStat moonPhase={stat.moonPhase} />;
                break;

              case "wind":
                content = stat.wind && <WindStat data={stat.wind} />;
                break;

              case "pressure":
                content = stat.pressure && <BasicStat data={stat.pressure} />;
                break;

              case "wave energy":
                content = stat.energy && <BasicStat data={stat.energy} />;
                break;
            }

            if (!content) return null;

            return (
              <li key={stat.label} className="highlight-card">
                <h4 className="highlight-title">{stat.label.toUpperCase()}</h4>
                <div className="flex-1 flex items-center justify-center gap-1 mt-1">
                  {content}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Debug info for moon phase */}
      {process.env.NODE_ENV === "development" && dailyConditions && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
          <p>
            <strong>Moon Phase Debug:</strong>
          </p>
          <p>Raw value: {dailyConditions.moon_phase}</p>
          <p>
            Percentage:{" "}
            {dailyConditions.moon_phase
              ? (dailyConditions.moon_phase * 100).toFixed(0) + "%"
              : "N/A"}
          </p>
          <p>County: {county}</p>
          <p>Date: {dailyConditions.date}</p>
        </div>
      )}
    </div>
  );
};

export default Highlights;