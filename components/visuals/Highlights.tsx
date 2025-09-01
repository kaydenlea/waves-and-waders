import { cn } from "@/lib/utils";
import SwellStat from "../general/Stats/SwellStat";
import { Sun, Droplets, MoonStar, Clock, TrendingUp, TrendingDown } from "lucide-react";
import {
  WiDaySunny,
  WiCloudy,
  WiFog,
  WiRain,
  WiShowers,
  WiSnow,
  WiThunderstorm,
  WiSleet,
} from "react-icons/wi";
import {
  fetchCurrentConditions,
  fetchBeachForecast,
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

// Get closest 3-hour interval data to current time
const getClosest3HourData = (forecastData: ForecastData[]): ForecastData | null => {
  if (forecastData.length === 0) return null;
  
  const now = new Date();
  let closest = forecastData[0];
  let minDiff = Math.abs(new Date(closest.timestamp).getTime() - now.getTime());
  
  for (const forecast of forecastData) {
    const diff = Math.abs(new Date(forecast.timestamp).getTime() - now.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = forecast;
    }
  }
  
  return closest;
};

// Calculate trend from recent 3-hour intervals
const calculateTrend = (currentData: ForecastData, forecastData: ForecastData[], metric: 'wind' | 'swell' | 'surf'): 'rising' | 'falling' | 'stable' => {
  if (forecastData.length < 2) return 'stable';
  
  const currentTime = new Date(currentData.timestamp);
  const recentData = forecastData
    .filter(f => new Date(f.timestamp) <= currentTime)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 3); // Get last 3 intervals (9 hours)
  
  if (recentData.length < 2) return 'stable';
  
  let currentValue: number;
  let previousValue: number;
  
  switch (metric) {
    case 'wind':
      currentValue = recentData[0].conditions.windSpeed || 0;
      previousValue = recentData[recentData.length - 1].conditions.windSpeed || 0;
      break;
    case 'swell':
      currentValue = recentData[0].swell.primary.height || 0;
      previousValue = recentData[recentData.length - 1].swell.primary.height || 0;
      break;
    case 'surf':
      currentValue = recentData[0].surf.heightMax || 0;
      previousValue = recentData[recentData.length - 1].surf.heightMax || 0;
      break;
  }
  
  const change = currentValue - previousValue;
  const threshold = currentValue * 0.15; // 15% change threshold
  
  if (change > threshold) return 'rising';
  if (change < -threshold) return 'falling';
  return 'stable';
};

/* ---------------------------
   Weather icon from WMO code with fallback to Lucide
---------------------------- */
const weatherIconByCode = (code: number | null | undefined) => {
  if (code == null) return <Sun size={22} color="#fa9847ff" />;

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

  // Fallback to Lucide for unknown codes
  return <Sun size={22} color="#fa9847ff" />;
};

/* ---------------------------
   Weather / Water UI
---------------------------- */

const WeatherStat = ({ temp, code, condition }: { temp: number; code?: number | null; condition?: string }) => {
  return (
    <div className="flex items-center justify-center gap-0.5">
      {/* Use weather icon if code is provided, otherwise fallback to condition-based Lucide icons */}
      {code !== undefined ? (
        weatherIconByCode(code)
      ) : condition && condition === "sun" ? (
        <Sun size={22} color="#fa9847ff" />
      ) : (
        <Droplets size={22} color="#80b7ffff" />
      )}
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
      <Droplets size={22} color="#1CACD4" />
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

const TrendStat = ({
  data,
  trend,
}: {
  data: { value: number | string; unit: string };
  trend?: 'rising' | 'falling' | 'stable';
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'rising': return <TrendingUp size={14} className="text-green-600" />;
      case 'falling': return <TrendingDown size={14} className="text-red-600" />;
      default: return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'rising': return 'border-green-200 bg-green-50';
      case 'falling': return 'border-red-200 bg-red-50';
      default: return 'border-border bg-white/50';
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 border rounded-md ${getTrendColor()}`}>
      <span className="text-2xl font-medium">
        {data.value}
        <span className="text-sm font-normal">{data.unit}</span>
      </span>
      {getTrendIcon()}
    </div>
  );
};

/* ---------------------------
   Moon phase mapping (0..1)
---------------------------- */

const MoonStat = ({ moonPhase, phase }: { moonPhase?: number | null; phase?: [string, string] }) => {
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

  // Use moonPhase data if available, otherwise fall back to phase prop from origin/main
  if (moonPhase !== undefined) {
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
  }

  // Fallback to origin/main style for backward compatibility
  return (
    <div className="flex items-center justify-center gap-1">
      <MoonStar size={25} />
      <div className="flex flex-col">
        <span className="text-sm">{phase?.[0] || "New"}</span>
        <span className="text-sm">{phase?.[1] || "Moon"}</span>
      </div>
    </div>
  );
};

const WindStat = ({ 
  data, 
  trend,
  intervalInfo 
}: { 
  data: { speed: number; max: number };
  trend?: 'rising' | 'falling' | 'stable';
  intervalInfo?: string;
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'rising': return 'bg-red-100 border-red-200';
      case 'falling': return 'bg-green-100 border-green-200';
      default: return 'bg-orange-100 border-orange-200';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'rising': return <TrendingUp size={12} className="text-red-600" />;
      case 'falling': return <TrendingDown size={12} className="text-green-600" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`flex gap-1 border rounded-md py-2 px-3 ${getTrendColor()}`}>
        <span className="text-2xl font-medium">{Math.round(data.speed)}</span>
        <span className="flex flex-col -space-y-1">
          <span className="text-[0.7rem]">{Math.round(data.max)}</span>
          <span className="text-xs">mph</span>
        </span>
        {getTrendIcon()}
      </span>
      {intervalInfo && (
        <span className="text-xs text-gray-500 text-center">{intervalInfo}</span>
      )}
    </div>
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
  const [recentIntervals, setRecentIntervals] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(false);
  const [intervalInfo, setIntervalInfo] = useState<string>("");

  // Fetch current conditions and recent intervals for trend analysis
  useEffect(() => {
    const loadData = async () => {
      if (!beachId) return;
      
      try {
        setLoading(true);

        if (!currentData) {
          // Fetch current conditions if not provided
          const current = await fetchCurrentConditions(beachId);
          setForecastData(current);
        }

        // Fetch recent forecast data for trend analysis (last 24 hours)
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const recent = await fetchBeachForecast(beachId.toString(), yesterday, now);
        setRecentIntervals(recent);

        // Calculate interval information
        if (recent.length > 0) {
          const latestInterval = recent[recent.length - 1];
          const intervalTime = new Date(latestInterval.timestamp);
          const hoursDiff = Math.abs(now.getTime() - intervalTime.getTime()) / (1000 * 60 * 60);
          
          if (hoursDiff < 1.5) {
            setIntervalInfo("Current 3-hour window");
          } else {
            const nextInterval = Math.ceil(now.getHours() / 3) * 3;
            const hoursToNext = nextInterval - now.getHours();
            setIntervalInfo(`Next update in ${hoursToNext}h`);
          }
        }

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
      { label: "wave energy", energy: { value: 278, unit: "kJ" } }, // Updated unit
    ];

    if (!dataToUse) return defaultStats;

    const { conditions, swell, surf } = dataToUse;

    // Calculate trends
    const windTrend = calculateTrend(dataToUse, recentIntervals, 'wind');
    const swellTrend = calculateTrend(dataToUse, recentIntervals, 'swell');
    const surfTrend = calculateTrend(dataToUse, recentIntervals, 'surf');

    // Extract real swell data using the same pattern as Summary.tsx
    const primarySwell = {
      height: round1(swell.primary.height || 0),
      period: round1(swell.primary.period || 0),
      wind: {
        dir: getWindDirection(swell.primary.direction),
        deg: Math.round(swell.primary.direction || 0), // Round to whole degrees
      },
    };

    // ACTUAL SECONDARY SWELL DATA (not calculated)
    const secondarySwell = {
      height: round1(swell.secondary.height || 0),
      period: round1(swell.secondary.period || 0),
      wind: {
        dir: getWindDirection(swell.secondary.direction),
        deg: Math.round(swell.secondary.direction || 0), // Round to whole degrees
      },
    };

    // ACTUAL TERTIARY SWELL DATA (not calculated)
    const tertiarySwell = {
      height: round1(swell.tertiary.height || 0),
      period: round1(swell.tertiary.period || 0),
      wind: {
        dir: getWindDirection(swell.tertiary.direction),
        deg: Math.round(swell.tertiary.direction || 0), // Round to whole degrees
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
        trend: swellTrend,
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
        trend: windTrend,
        intervalInfo,
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
          unit: "kJ", // Updated from ft-lbs to kJ
        },
        trend: surfTrend,
      },
    ];
  };

  const stats = getStats();

  return (
    <div className={cn("w-full p-2 border border-border rounded-md shadow-sm", className)}>
      <header className="ml-1 mb-4 mt-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold">Current Conditions</h3>
          {dataToUse && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={12} />
              <span>
                {new Date(dataToUse.timestamp).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
          )}
        </div>
        <p className="text-sm -mt-0.5">
          {dataToUse ? "3-hour interval forecast data" : "Showing sample data"}
          {loading && " (Loading...)"}
          {intervalInfo && ` • ${intervalInfo}`}
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
                      {stat.trend && stat.trend !== 'stable' && (
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          {stat.trend === 'rising' ? <TrendingUp size={12} className="text-green-600" /> : <TrendingDown size={12} className="text-red-600" />}
                          <span>{stat.trend}</span>
                        </div>
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
                content = stat.wind && (
                  <WindStat 
                    data={stat.wind} 
                    trend={stat.trend}
                    intervalInfo={stat.intervalInfo}
                  />
                );
                break;

              case "pressure":
                content = stat.pressure && <BasicStat data={stat.pressure} />;
                break;

              case "wave energy":
                content = stat.energy && (
                  <TrendStat 
                    data={stat.energy} 
                    trend={stat.trend}
                  />
                );
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
          {recentIntervals.length > 0 && (
            <div className="mt-2">
              <p><strong>3-Hour Intervals:</strong></p>
              <p>Recent intervals: {recentIntervals.length}</p>
              <p>Interval info: {intervalInfo}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Highlights;