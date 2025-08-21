import { cn } from "@/lib/utils";
import { TidePreview } from "../graphs/TideChart";
import SwellStat from "../general/Stats/SwellStat";
import { Sun, Droplets, Dog, CircleParking, Toilet, LifeBuoy, Fish, Shell } from "lucide-react";
import {
  BsArrowDownCircleFill as SArrowIcon,
  BsArrowDownLeftCircleFill as SWArrowIcon,
  BsArrowLeftCircleFill as WArrowIcon,
  BsArrowUpLeftCircleFill as NWArrowIcon,
  BsArrowUpCircleFill as NArrowIcon,
  BsArrowUpRightCircleFill as NEArrowIcon,
  BsArrowRightCircleFill as EArrowIcon,
  BsArrowDownRightCircleFill as SEArrowIcon,
} from "react-icons/bs";
import { ForecastData } from "@/lib/supabase";

interface Beach {
  id: number;
  Name: string;
  COUNTY: string;
  LATITUDE: number;
  LONGITUDE: number;
  // Optional feature flags (wired from DB if provided)
  FISHING?: boolean | null;
  RESTROOMS?: boolean | null;
  PARKING?: boolean | null;
  DOG_FRIEND?: boolean | null;
  SNDY_BEACH?: boolean | null;
  LIFEGUARD?: boolean | null;
}

interface SummaryProps {
  currentForecast?: ForecastData | null;
  beach?: Beach;
  todayForecast?: ForecastData[];
  selectedHour?: number;
  className?: string;
}

/* =========================
   Helpers
   ========================= */

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

const getWindDirectionIcon = (direction: string) => {
  const iconMap: { [key: string]: React.ComponentType<any> } = {
    N: NArrowIcon,
    NNE: NEArrowIcon,
    NE: NEArrowIcon,
    ENE: NEArrowIcon,
    E: EArrowIcon,
    ESE: SEArrowIcon,
    SE: SEArrowIcon,
    SSE: SEArrowIcon,
    S: SArrowIcon,
    SSW: SWArrowIcon,
    SW: SWArrowIcon,
    WSW: SWArrowIcon,
    W: WArrowIcon,
    WNW: NWArrowIcon,
    NW: NWArrowIcon,
    NNW: NWArrowIcon,
  };
  return iconMap[direction] || NArrowIcon;
};

// Round to nearest tenth
const round1 = (v: number | null | undefined): number => {
  if (v == null || Number.isNaN(v)) return 0;
  return Math.round(v * 10) / 10;
};

// Surf height display
const formatSurfHeight = (min: number | null, max: number | null): string => {
  if (min == null || max == null) return "0-1";
  if (min === max) return min.toFixed(0);
  return `${min.toFixed(0)}-${max.toFixed(0)}`;
};

// --- Onshore/Offshore classification from compass strings ---
const norm360 = (d: number) => ((d % 360) + 360) % 360;
const bearingDiff = (a: number, b: number) =>
  Math.abs(((norm360(a) - norm360(b) + 540) % 360) - 180);

const DIR_TO_DEG: Record<string, number> = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
  E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
  W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};
const degFromDir = (dir: string) => DIR_TO_DEG[dir.toUpperCase()] ?? 0;

// County → typical beach facing (shore normal)
const shoreNormalByCounty: Record<string, string> = {
  Orange: "WSW",
  "Los Angeles": "WSW",
  "San Diego": "W",
  "Santa Barbara": "WSW",
  Monterey: "W",
};
const shoreNormalFor = (county?: string) =>
  (county && shoreNormalByCounty[county]) || "WSW";

const getWindLocationFromCompass = (
  windDirStr: string | null | undefined,
  shoreNormalStr: string = "WSW"
): "onshore" | "offshore" => {
  if (!windDirStr) return "onshore";
  const windDeg = degFromDir(windDirStr);
  const shoreDeg = degFromDir(shoreNormalStr);
  return bearingDiff(windDeg, shoreDeg) <= 90 ? "onshore" : "offshore";
};

/* =========================
   UI Components (Consolidated)
   ========================= */

const GradientCircle = ({
  data,
  percentage = 75,
  size = 75,
  strokeWidth = 7,
  condition = "sun",
}: {
  data?: React.ReactNode;
  percentage?: number;
  size?: number;
  strokeWidth?: number;
  condition?: string;
}) => {
  const angle = (percentage / 100) * 360;
  const colors =
    condition === "water"
      ? ["#3b82f6", "#60a5fa", "#0ea5e9", "#22d3ee"]
      : ["#facc15", "#f97316", "#f59e0b", "#fbbf24"];
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 rounded-full bg-gray-200" />

      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(
            from -90deg,
            ${colors[0]} 0deg,
            ${colors[1]} ${angle * 0.33}deg,
            ${colors[2]} ${angle * 0.66}deg,
            ${colors[3]} ${angle}deg,
            transparent ${angle}deg 360deg
          )`,
          filter: `drop-shadow(0 0 2px ${colors[0]}) drop-shadow(0 0 1px ${colors[1]})`,
        }}
      />

      <div
        className="absolute rounded-full bg-background"
        style={{
          width: size - strokeWidth * 2,
          height: size - strokeWidth * 2,
        }}
      />
      <div className="z-1 flex items-center">
        {condition === "water" ? (
          <Droplets size={18} className="text-[#1CACD4]" />
        ) : (
          <Sun size={18} className="text-[#FF8D0B]" />
        )}
        <span className="flex items-center font-medium whitespace-nowrap">
          {data} <span className="text-xs font-normal">&deg;F</span>
        </span>
      </div>
    </div>
  );
};

const WindStat = ({
  data,
}: {
  data: { direction: string; speed: number; loc: "onshore" | "offshore" };
}) => {
  const WindIcon = getWindDirectionIcon(data.direction);
  return (
    <div className="flex items-center gap-1">
      <div className="shadow-sm border border-border p-1 rounded-xl text-center">
        <WindIcon size={30} color="#ff6a34ff" />
        <span className="text-[.7rem]">{data.direction}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-medium">
          {data.speed}
          <span className="text-xs font-normal">mph</span>
        </span>
        <span className={cn(
          "text-xs p-1 border border-border rounded-xl",
          data.loc === "offshore" ? "bg-green-100" : "bg-red-100"
        )}>
          {data.loc}
        </span>
      </div>
    </div>
  );
};

const SurfStat = ({
  data,
}: {
  data: { direction: string; height: string; period: number };
}) => {
  const SurfIcon = getWindDirectionIcon(data.direction);
  return (
    <div className="flex items-center gap-1">
      <div className="shadow-sm border border-border p-1 rounded-xl text-center">
        <SurfIcon size={30} color="#51e72bff" />
        <span className="text-[.7rem]">{data.direction}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-medium">
          {data.height}
          <span className="text-xs font-normal">ft</span>
        </span>
        <span className="text-2xl font-medium">
          {data.period}
          <span className="text-xs font-normal">s</span>
        </span>
      </div>
    </div>
  );
};

const Tag = ({
  data,
}: {
  data: { label: string; icon: React.ReactNode; color: string };
}) => {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1 py-1.5 px-4 rounded-md border border-border",
        data.color
      )}
    >
      {data.icon}
      <span className="text-xs">{data.label}</span>
    </div>
  );
};

/* =========================
   Summary Component
   ========================= */

const Summary = ({
  currentForecast,
  beach,
  todayForecast = [],
  selectedHour,
  className,
}: SummaryProps) => {
  // Choose the datapoint to show
  const getCurrentData = (): ForecastData | null => {
    if (currentForecast) return currentForecast;
    if (todayForecast.length === 0) return null;
    if (selectedHour !== undefined) {
      const hourData = todayForecast.find((forecast) => {
        const forecastHour = new Date(forecast.timestamp).getHours();
        return forecastHour === selectedHour;
      });
      if (hourData) return hourData;
    }
    return todayForecast[0] || null;
  };

  const currentData = getCurrentData();

  // Defaults when no data (enhanced from origin/main)
  const defaultStats = {
    water: { temp: 60 as number | string },
    weather: { temp: 64 as number | string },
    wind: { direction: "NNE", speed: 12, loc: "offshore" as "onshore" | "offshore" },
    surf: { direction: "NNW", height: "2-3", period: 11 },
    swell: {
      primary: { height: 2.1, period: 7.0, wind: { dir: "W", deg: 272 } },
      secondary: [
        { height: 1.8, period: 12.0, wind: { dir: "SW", deg: 225 } },
        { height: 1.2, period: 9.0, wind: { dir: "S", deg: 180 } },
      ],
    },
    tide: { height: 2.4 },
  };

  // Build processed stats - NOW USING REAL TERTIARY DATA
  const windDirStr = getWindDirection(currentData?.conditions.windDirection ?? null);

  const processedStats = currentData
    ? {
        water: {
          temp: currentData.conditions.waterTemp
            ? Math.round(currentData.conditions.waterTemp)
            : "N/A",
        },
        weather: {
          temp: currentData.conditions.airTemp
            ? Math.round(currentData.conditions.airTemp)
            : "N/A",
        },
        wind: {
          direction: windDirStr,
          speed: currentData.conditions.windSpeed
            ? Math.round(currentData.conditions.windSpeed)
            : 0,
          loc: getWindLocationFromCompass(
            windDirStr,
            shoreNormalFor(beach?.COUNTY)
          ),
        },
        surf: {
          direction: getWindDirection(currentData.swell.primary.direction),
          height: formatSurfHeight(
            currentData.surf.heightMin,
            currentData.surf.heightMax
          ),
          period: currentData.swell.primary.period
            ? Math.round(currentData.swell.primary.period)
            : 0,
        },
        swell: {
          primary: {
            height: round1(currentData.swell.primary.height || 0),
            period: round1(currentData.swell.primary.period || 0),
            wind: {
              dir: getWindDirection(currentData.swell.primary.direction),
              deg: currentData.swell.primary.direction || 0,
            },
          },
          secondary: [
            // ACTUAL SECONDARY SWELL DATA
            {
              height: round1(currentData.swell.secondary.height || 0),
              period: round1(currentData.swell.secondary.period || 0),
              wind: {
                dir: getWindDirection(currentData.swell.secondary.direction),
                deg: currentData.swell.secondary.direction || 0,
              },
            },
            // ACTUAL TERTIARY SWELL DATA (no longer calculated)
            {
              height: round1(currentData.swell.tertiary.height || 0),
              period: round1(currentData.swell.tertiary.period || 0),
              wind: {
                dir: getWindDirection(currentData.swell.tertiary.direction),
                deg: currentData.swell.tertiary.direction || 0,
              },
            },
          ],
        },
        tide: {
          height: currentData.conditions.tideLevel || 0, // Already includes +2.4ft adjustment
        },
      }
    : defaultStats;

  // Features from DB flags (if provided on beach) - updated with Lucide icons
  const getBeachFeatures = (b?: Beach) => {
    if (!b) {
      // Fallback features from origin/main
      return [
        { label: "Fishing", icon: <Fish size={16} />, color: "bg-blue-100" },
        { label: "Bathrooms", icon: <Toilet size={16} />, color: "bg-yellow-100" },
        { label: "Parking", icon: <CircleParking size={16} />, color: "bg-green-100" },
        { label: "Dogs", icon: <Dog size={16} />, color: "bg-red-100" },
        { label: "Sandy", icon: <Shell size={16} />, color: "bg-orange-100" },
        { label: "Lifeguard", icon: <LifeBuoy size={16} />, color: "bg-purple-100" },
      ];
    }
    
    const tags = [];
    if (b.FISHING) tags.push({ label: "Fishing", icon: <Fish size={16} />, color: "bg-blue-100" });
    if (b.RESTROOMS) tags.push({ label: "Bathrooms", icon: <Toilet size={16} />, color: "bg-yellow-100" });
    if (b.PARKING) tags.push({ label: "Parking", icon: <CircleParking size={16} />, color: "bg-green-100" });
    if (b.DOG_FRIEND) tags.push({ label: "Dogs", icon: <Dog size={16} />, color: "bg-red-100" });
    if (b.SNDY_BEACH) tags.push({ label: "Sandy", icon: <Shell size={16} />, color: "bg-orange-100" });
    if (b.LIFEGUARD) tags.push({ label: "Lifeguard", icon: <LifeBuoy size={16} />, color: "bg-purple-100" });
    return tags;
  };

  const stats = [
    { type: "water", temp: processedStats.water.temp },
    { type: "weather", temp: processedStats.weather.temp },
    {
      type: "swell",
      primary: processedStats.swell.primary,
      secondary: processedStats.swell.secondary,
    },
    { type: "tide", height: processedStats.tide.height },
    { type: "wind", wind: processedStats.wind },
    { type: "surf", surf: processedStats.surf },
    { type: "features", tags: getBeachFeatures(beach) },
  ] as const;

  return (
    <div className={cn("w-full", className)}>
      {currentData && (
        <div className="mb-2 text-xs text-gray-500">
          Showing data for{" "}
          {new Date(currentData.timestamp).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}
          {beach && ` • ${beach.Name}, ${beach.COUNTY} County`}
          {currentData.swell.tertiary.height && currentData.swell.tertiary.height > 0 && (
            <span className="text-green-600"> • Tertiary swell detected</span>
          )}
        </div>
      )}

      {!currentData && (
        <div className="mb-2 text-xs text-yellow-600">
          ⚠️ No forecast data available - showing sample data
        </div>
      )}

      <ul className="grid grid-cols-2 @min-xl:grid-cols-3 @min-4xl:grid-cols-6 gap-2">
        {stats.map((stat) => {
          let content: React.ReactNode = null;

          switch (stat.type) {
            case "water":
              content = <GradientCircle condition="water" data={stat.temp} />;
              break;

            case "weather":
              content = <GradientCircle condition="sun" data={stat.temp} />;
              break;

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

            case "tide":
              content = (
                <div className="flex flex-col w-full">
                  <span className="text-2xl font-medium">
                    {typeof stat.height === "number"
                      ? stat.height.toFixed(1)
                      : stat.height}
                    <span className="text-xs">ft</span>
                  </span>
                  <TidePreview data={todayForecast} selectedHour={selectedHour} />
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

          if (!content) return null;

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
        })}
      </ul>
    </div>
  );
};

export default Summary;