import { cn } from "@/lib/utils";
import SwellStat from "../general/SwellStat";
import { FaSun, FaWind } from "react-icons/fa";
import { IoIosWater } from "react-icons/io";
import { WiMoonAltWaningCrescent2 } from "react-icons/wi";
import { fetchCurrentConditions, fetchDailyConditions, ForecastData, DailyConditions } from "@/lib/supabase";
import React, { useState, useEffect } from "react";

const WeatherStat = ({
  temp,
  condition,
}: {
  temp: number;
  condition?: string;
}) => {
  return (
    <div className="flex items-center justify-center gap-0.5">
      {condition && condition === "sun" ? (
        <FaSun size={22} color="#fa9847ff" />
      ) : (
        <IoIosWater size={22} color="#80b7ffff" />
      )}
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
    <span
      className={cn(
        "text-2xl font-medium px-3 py-2 border border-border rounded-md",
        typeof data.value === "number" ? "bg-green" : "bg-red"
      )}
    >
      {data.value}
      <span className="text-sm font-normal">{data.unit}</span>
    </span>
  );
};

const MoonStat = ({ moonPhase }: { moonPhase: number | null }) => {
  // Convert moon phase number (0-1) to description and percentage
  const getMoonPhaseInfo = (phase: number | null) => {
    if (phase === null || phase === undefined) {
      return {
        description: "Unknown",
        percentage: 0,
        icon: "🌑"
      };
    }

    // Moon phase is typically 0-1 where:
    // 0 = New Moon
    // 0.25 = First Quarter  
    // 0.5 = Full Moon
    // 0.75 = Last Quarter
    // 1 = New Moon (cycle complete)

    const percentage = Math.round(phase * 100);
    let description = "";
    let icon = "🌑";

    if (phase < 0.125) {
      description = "New Moon";
      icon = "🌑";
    } else if (phase < 0.375) {
      description = "Waxing Crescent";
      icon = "🌒";
    } else if (phase < 0.625) {
      description = "Full Moon";
      icon = "🌕";
    } else if (phase < 0.875) {
      description = "Waning Crescent";
      icon = "🌘";
    } else {
      description = "New Moon";
      icon = "🌑";
    }

    return { description, percentage, icon };
  };

  const phaseInfo = getMoonPhaseInfo(moonPhase);
  const [primaryPhase, secondaryPhase] = phaseInfo.description.split(" ");

  return (
    <div className="flex items-center justify-center gap-2">
      <div className="text-2xl">{phaseInfo.icon}</div>
      <div className="flex flex-col text-center">
        <span className="text-sm font-medium">{primaryPhase}</span>
        <span className="text-sm">{secondaryPhase || ""}</span>
        <span className="text-xs text-gray-500">{phaseInfo.percentage}%</span>
      </div>
    </div>
  );
};

const WindStat = ({ data }: { data: { speed: number; max: number } }) => {
  return (
    <span className="flex gap-1 bg-orange border border-border rounded-md py-2 px-3">
      <span className="text-2xl font-medium">{Math.round(data.speed)}</span>
      <span className="flex flex-col -space-y-1">
        <span className="text-[0.7rem]">{Math.round(data.max)}</span>
        <span className="text-xs">mph</span>
      </span>
    </span>
  );
};

// Utility functions
const getWindDirection = (degrees: number | null): string => {
  if (degrees === null || degrees === undefined) return 'N';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

const getWeatherCondition = (weatherCode: number | null): string => {
  if (!weatherCode) return "sun";
  if (weatherCode >= 80) return "rain";
  if (weatherCode >= 60) return "rain";
  if (weatherCode >= 50) return "rain";
  return "sun";
};

interface HighlightsProps {
  beachId?: number;
  county?: string;
  currentData?: ForecastData | null;
  dailyConditions?: DailyConditions | null;
  className?: string;
}

const Highlights = ({ beachId, county, currentData, dailyConditions, className }: HighlightsProps) => {
  const [forecastData, setForecastData] = useState<ForecastData | null>(currentData || null);
  const [loading, setLoading] = useState(false);

  // Fetch current conditions when beachId changes and no currentData provided
  useEffect(() => {
    const loadData = async () => {
      if (!beachId || currentData) return;
      
      try {
        setLoading(true);
        
        const current = await fetchCurrentConditions(beachId);
        setForecastData(current);
      } catch (error) {
        console.error('Error loading highlights data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [beachId, currentData]);

  // Use provided currentData or fetched data
  const dataToUse = currentData || forecastData;

  // Transform data to stats format
  const getStats = () => {
    // Default/fallback stats
    const defaultStats = [
      { label: "weather", weather: { temp: 64, condition: "sun" } },
      { label: "water", temp: 60 },
      {
        label: "swell",
        primary: { height: 2.1, period: 7, wind: { dir: "W", deg: 272 } },
        secondary: [
          { height: 1.8, period: 12, wind: { dir: "SW", deg: 225 } },
          { height: 1.2, period: 9, wind: { dir: "S", deg: 180 } },
        ],
      },
      { label: "tide", tide: { value: "2-3", unit: "ft" } },
      { label: "moon phase", moonPhase: 0.25 },
      { label: "wind", wind: { speed: 12, max: 17 } },
      { label: "pressure", pressure: { value: 29.9, unit: "inHg" } },
      { label: "wave energy", energy: { value: 278, unit: "ft-lbs" } },
    ];

    if (!dataToUse) return defaultStats;

    const conditions = dataToUse.conditions;
    const swell = dataToUse.swell;
    const surf = dataToUse.surf;

    // Process swell data
    const primarySwell = {
      height: swell.primary.height || 2.1,
      period: swell.primary.period || 7,
      wind: { 
        dir: getWindDirection(swell.primary.direction), 
        deg: swell.primary.direction || 272 
      },
    };

    const secondarySwell = {
      height: swell.secondary.height || 1.8,
      period: swell.secondary.period || 12,
      wind: { 
        dir: getWindDirection(swell.secondary.direction), 
        deg: swell.secondary.direction || 225 
      },
    };

    // Create tertiary swell (smaller component)
    const tertiarySwell = {
      height: secondarySwell.height * 0.7,
      period: secondarySwell.period,
      wind: secondarySwell.wind,
    };

    return [
      { 
        label: "weather", 
        weather: { 
          temp: conditions.airTemp || 64, 
          condition: getWeatherCondition(conditions.weather) 
        } 
      },
      { 
        label: "water", 
        temp: conditions.waterTemp || 60 
      },
      {
        label: "swell",
        primary: primarySwell,
        secondary: [secondarySwell, tertiarySwell],
      },
      { 
        label: "tide", 
        tide: { 
          value: conditions.tideLevel ? conditions.tideLevel.toFixed(1) : "2-3", 
          unit: "ft" 
        } 
      },
      { 
        label: "moon phase", 
        moonPhase: dailyConditions?.moon_phase || null
      },
      { 
        label: "wind", 
        wind: { 
          speed: conditions.windSpeed || 12, 
          max: conditions.windGust || 17 
        } 
      },
      { 
        label: "pressure", 
        pressure: { 
          value: conditions.pressure ? conditions.pressure.toFixed(1) : "29.9", 
          unit: "inHg" 
        } 
      },
      { 
        label: "wave energy", 
        energy: { 
          value: surf.waveEnergy ? Math.round(surf.waveEnergy) : 278, 
          unit: "ft-lbs" 
        } 
      },
    ];
  };

  const stats = getStats();

  return (
    <div className={cn("p-2 border border-border rounded-md shadow-sm", className)}>
      <header className="ml-1 mb-4 mt-2">
        <h3 className="text-xl font-semibold">Current Conditions</h3>
        <p className="text-sm -mt-0.5">
          {dataToUse ? "Live data from sensors" : "Showing sample data"}
          {loading && " (Loading...)"}
          {dailyConditions && " • Daily conditions loaded"}
        </p>
      </header>
      
      {loading && (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      {!loading && (
        <ul className="grid grid-cols-2 gap-2">
          {stats.map((stat) => {
            let content;
            switch (stat.label) {
              case "swell":
                content = stat.primary && stat.secondary && (
                  <div className="flex flex-col items-center">
                    <SwellStat primary data={stat.primary} />
                    <SwellStat data={stat.secondary[0]} />
                    <SwellStat data={stat.secondary[1]} />
                  </div>
                );
                break;
              case "weather":
                content = stat.weather && (
                  <WeatherStat
                    temp={stat.weather.temp}
                    condition={stat.weather.condition}
                  />
                );
                break;
              case "water":
                content = stat.temp && <WeatherStat temp={stat.temp} />;
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
            if (content) {
              return (
                <li key={stat.label} className="highlight-card">
                  <h4 className="highlight-title">{stat.label.toUpperCase()}</h4>
                  <div
                    className={
                      "flex-1 flex items-center justify-center gap-1 mt-1"
                    }
                  >
                    {content}
                  </div>
                </li>
              );
            }
            return null;
          })}
        </ul>
      )}

      {/* Debug info for moon phase */}
      {process.env.NODE_ENV === 'development' && dailyConditions && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
          <p><strong>Moon Phase Debug:</strong></p>
          <p>Raw value: {dailyConditions.moon_phase}</p>
          <p>Percentage: {dailyConditions.moon_phase ? (dailyConditions.moon_phase * 100).toFixed(0) + '%' : 'N/A'}</p>
          <p>County: {county}</p>
          <p>Date: {dailyConditions.date}</p>
        </div>
      )}
    </div>
  );
};

export default Highlights;