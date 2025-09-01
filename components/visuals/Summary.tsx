import { cn } from "@/lib/utils";
import { TidePreview } from "../graphs/TideChart";
import SwellStat from "../general/Stats/SwellStat";
import { 
  Sun, 
  Droplets, 
  Dog, 
  CircleParking, 
  Toilet, 
  LifeBuoy, 
  Fish, 
  Shell,
  DollarSign,
  Ban,
  Accessibility,
  MapPin,
  Baby,
  Sparkles,
  UtensilsCrossed,
  Waves,
  Tent,
  Truck,
  Anchor,
  MapPin as LighthouseIcon,
  Building2,
  Mountain,
  Trees,
  TreePine,
  Building,
  Factory,
  Footprints,
  Route,
  Bike,
  Rabbit,
  Binoculars,
  Droplet,
  Eye,
  Gamepad2,
  MapIcon,
  Wind,
  Ship,
  Zap,
  Clock
} from "lucide-react";
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
import { ForecastData, BeachWithFeatures, TidePoint, fetchCurrentTide, fetchBeachTides } from "@/lib/supabase";
import { useEffect, useState } from "react";

interface Beach {
  id: number;
  Name: string;
  COUNTY: string;
  LATITUDE: number;
  LONGITUDE: number;
  // Optional feature flags (wired from DB if provided) - BACK TO ORIGINAL STRUCTURE
  FISHING?: boolean | null;
  RESTROOMS?: boolean | null;
  PARKING?: boolean | null;
  DOG_FRIEND?: boolean | null;
  SNDY_BEACH?: boolean | null;
  LIFEGUARD?: boolean | null;
  
  // Add the new features as optional
  O_PUBLIC?: boolean | null;
  FEE?: boolean | null;
  RSTRCTNS?: boolean | null;
  DSABLDACSS?: boolean | null;
  VISTOR_CTR?: boolean | null;
  EZ4STROLLE?: boolean | null;
  SHOWERS?: boolean | null;
  FOOD?: boolean | null;
  DRINKWTR?: boolean | null;
  PCNC_AREA?: boolean | null;
  FIREPITS?: boolean | null;
  CAMPGROUND?: boolean | null;
  RV_CMP?: boolean | null;
  BT_FACILIT?: boolean | null;
  HAND_LAUNCH?: boolean | null;
  LIGHTHOUSE?: boolean | null;
  PIER?: boolean | null;
  DUNES?: boolean | null;
  RKY_SHORE?: boolean | null;
  UPLAND_BCH?: boolean | null;
  STRM_CRDOR?: boolean | null;
  WETLAND?: boolean | null;
  BLUFF?: boolean | null;
  BAY_LGN_LK?: boolean | null;
  URBN_WFRNT?: boolean | null;
  INLND_AREA?: boolean | null;
  STRS_BEACH?: boolean | null;
  PTH_BEACH?: boolean | null;
  BOARDWLK?: boolean | null;
  BLFTP_TRLS?: boolean | null;
  BLFTP_PRK?: boolean | null;
  TRAIL_OR_P?: boolean | null;
  BIKE_PATH?: boolean | null;
  EQUEST_TRL?: boolean | null;
  WLDLFE_VWG?: boolean | null;
  SWIMMING?: boolean | null;
  DIVING?: boolean | null;
  SNORKLNG?: boolean | null;
  TIDEPOOL?: boolean | null;
  PLAYGROUND?: boolean | null;
  SPORT_FLDS?: boolean | null;
  VOLLEYBALL?: boolean | null;
  WNDSRF_KIT?: boolean | null;
  KAYAKING?: boolean | null;
  SURFING?: boolean | null;
  BOATING?: boolean | null;
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

// Round degrees to nearest whole number
const roundDegrees = (v: number | null | undefined): number => {
  if (v == null || Number.isNaN(v)) return 0;
  return Math.round(v);
};

// Surf height display
const formatSurfHeight = (min: number | null, max: number | null): string => {
  if (min == null || max == null) return "0-1";
  if (min === max) return min.toFixed(0);
  return `${min.toFixed(0)}-${max.toFixed(0)}`;
};

// Get the closest 3-hour interval to the current time
const getClosest3HourInterval = (forecastData: ForecastData[]): ForecastData | null => {
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

// Get forecast for specific hour, accounting for 3-hour intervals
const getForecastForHour = (forecastData: ForecastData[], targetHour: number): ForecastData | null => {
  if (forecastData.length === 0) return null;
  
  // Find the closest 3-hour interval to the target hour
  let closest = forecastData[0];
  let minDiff = Math.abs(new Date(closest.timestamp).getHours() - targetHour);
  
  for (const forecast of forecastData) {
    const forecastHour = new Date(forecast.timestamp).getHours();
    const diff = Math.abs(forecastHour - targetHour);
    if (diff < minDiff) {
      minDiff = diff;
      closest = forecast;
    }
  }
  
  return closest;
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

const TideStat = ({
  currentTide,
  tideData,
}: {
  currentTide: TidePoint | null;
  tideData: TidePoint[];
}) => {
  const tideLevel = currentTide?.tideLevelFt ?? 0;
  
  return (
    <div className="flex flex-col w-full">
      <span className="text-2xl font-medium">
        {tideLevel.toFixed(1)}
        <span className="text-xs">ft</span>
      </span>
      <div className="text-xs text-gray-500 mb-2">
        {currentTide ? 
          `Updated: ${new Date(currentTide.timestamp).toLocaleTimeString("en-US", { 
            hour: "numeric", 
            minute: "2-digit", 
            hour12: true 
          })}` : 
          "No tide data"
        }
      </div>
      <TidePreview data={tideData} />
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
  const [currentTide, setCurrentTide] = useState<TidePoint | null>(null);
  const [todayTides, setTodayTides] = useState<TidePoint[]>([]);

  // Fetch tide data when beach changes
  useEffect(() => {
    if (!beach?.id) return;

    const fetchTideData = async () => {
      try {
        // Fetch current tide
        const current = await fetchCurrentTide(beach.id.toString());
        setCurrentTide(current);

        // Fetch today's tides
        const today = new Date();
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const tides = await fetchBeachTides(beach.id.toString(), today, tomorrow);
        setTodayTides(tides);
      } catch (error) {
        console.error('Error fetching tide data:', error);
        setCurrentTide(null);
        setTodayTides([]);
      }
    };

    fetchTideData();
  }, [beach?.id]);

  // Choose the datapoint to show - Enhanced for 3-hour intervals
  const getCurrentData = (): { data: ForecastData | null; intervalInfo?: string } => {
    if (currentForecast) {
      return { 
        data: currentForecast,
        intervalInfo: "Current conditions"
      };
    }
    
    if (todayForecast.length === 0) {
      return { data: null };
    }
    
    if (selectedHour !== undefined) {
      const hourData = getForecastForHour(todayForecast, selectedHour);
      if (hourData) {
        const actualHour = new Date(hourData.timestamp).getHours();
        const hourDiff = Math.abs(actualHour - selectedHour);
        return { 
          data: hourData,
          intervalInfo: hourDiff > 0 ? `Closest 3-hour interval (${actualHour}:00)` : undefined
        };
      }
    }
    
    const closestData = getClosest3HourInterval(todayForecast);
    const now = new Date();
    const dataTime = closestData ? new Date(closestData.timestamp) : null;
    const timeDiff = dataTime ? Math.abs(dataTime.getTime() - now.getTime()) / (1000 * 60 * 60) : 0;
    
    return { 
      data: closestData,
      intervalInfo: timeDiff > 1.5 ? `Next 3-hour interval` : "Current 3-hour interval"
    };
  };

  const { data: currentData, intervalInfo } = getCurrentData();

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
  };

  // Build processed stats - NOW USING REAL TERTIARY DATA with rounded degrees
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
          direction: getWindDirection(roundDegrees(currentData.swell.primary.direction)),
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
              dir: getWindDirection(roundDegrees(currentData.swell.primary.direction)),
              deg: roundDegrees(currentData.swell.primary.direction),
            },
          },
          secondary: [
            // ACTUAL SECONDARY SWELL DATA with rounded degrees
            {
              height: round1(currentData.swell.secondary.height || 0),
              period: round1(currentData.swell.secondary.period || 0),
              wind: {
                dir: getWindDirection(roundDegrees(currentData.swell.secondary.direction)),
                deg: roundDegrees(currentData.swell.secondary.direction),
              },
            },
            // ACTUAL TERTIARY SWELL DATA with rounded degrees
            {
              height: round1(currentData.swell.tertiary.height || 0),
              period: round1(currentData.swell.tertiary.period || 0),
              wind: {
                dir: getWindDirection(roundDegrees(currentData.swell.tertiary.direction)),
                deg: roundDegrees(currentData.swell.tertiary.direction),
              },
            },
          ],
        },
      }
    : defaultStats;

  // Features from DB flags (if provided on beach) - BACK TO ORIGINAL WORKING STRUCTURE
  const getBeachFeatures = (b?: Beach) => {
    console.log('Beach data received:', b);
    
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
    
    // Original 6 features that were working
    if (b.FISHING) tags.push({ label: "Fishing", icon: <Fish size={16} />, color: "bg-blue-100" });
    if (b.RESTROOMS) tags.push({ label: "Bathrooms", icon: <Toilet size={16} />, color: "bg-yellow-100" });
    if (b.PARKING) tags.push({ label: "Parking", icon: <CircleParking size={16} />, color: "bg-green-100" });
    if (b.DOG_FRIEND) tags.push({ label: "Dogs", icon: <Dog size={16} />, color: "bg-red-100" });
    if (b.SNDY_BEACH) tags.push({ label: "Sandy", icon: <Shell size={16} />, color: "bg-orange-100" });
    if (b.LIFEGUARD) tags.push({ label: "Lifeguard", icon: <LifeBuoy size={16} />, color: "bg-purple-100" });
    
    // NEW FEATURES - Add them in addition to original ones
    // Access & Fees
    if (b.O_PUBLIC) tags.push({ label: "Public", icon: <MapPin size={16} />, color: "bg-green-100" });
    if (b.FEE) tags.push({ label: "Entry Fee", icon: <DollarSign size={16} />, color: "bg-red-100" });
    if (b.RSTRCTNS) tags.push({ label: "Restrictions", icon: <Ban size={16} />, color: "bg-red-100" });
    if (b.DSABLDACSS) tags.push({ label: "Accessible", icon: <Accessibility size={16} />, color: "bg-purple-100" });
    
    // Facilities  
    if (b.VISTOR_CTR) tags.push({ label: "Visitor Center", icon: <Building2 size={16} />, color: "bg-indigo-100" });
    if (b.EZ4STROLLE) tags.push({ label: "Stroller Friendly", icon: <Baby size={16} />, color: "bg-pink-100" });
    if (b.SHOWERS) tags.push({ label: "Showers", icon: <Sparkles size={16} />, color: "bg-blue-100" });
    if (b.FOOD) tags.push({ label: "Food", icon: <UtensilsCrossed size={16} />, color: "bg-orange-100" });
    if (b.DRINKWTR) tags.push({ label: "Drinking Water", icon: <Droplets size={16} />, color: "bg-cyan-100" });
    if (b.PCNC_AREA) tags.push({ label: "Picnic Area", icon: <Trees size={16} />, color: "bg-green-100" });
    if (b.FIREPITS) tags.push({ label: "Fire Pits", icon: <Zap size={16} />, color: "bg-red-100" });
    if (b.CAMPGROUND) tags.push({ label: "Campground", icon: <Tent size={16} />, color: "bg-green-100" });
    if (b.RV_CMP) tags.push({ label: "RV Camping", icon: <Truck size={16} />, color: "bg-gray-100" });
    if (b.BT_FACILIT) tags.push({ label: "Boat Facilities", icon: <Anchor size={16} />, color: "bg-blue-100" });
    if (b.HAND_LAUNCH) tags.push({ label: "Hand Launch", icon: <Ship size={16} />, color: "bg-teal-100" });
    if (b.LIGHTHOUSE) tags.push({ label: "Lighthouse", icon: <LighthouseIcon size={16} />, color: "bg-yellow-100" });
    if (b.PIER) tags.push({ label: "Pier", icon: <Building size={16} />, color: "bg-gray-100" });
    
    // Beach Types
    if (b.DUNES) tags.push({ label: "Sand Dunes", icon: <Mountain size={16} />, color: "bg-yellow-100" });
    if (b.RKY_SHORE) tags.push({ label: "Rocky Shore", icon: <Mountain size={16} />, color: "bg-gray-100" });
    if (b.UPLAND_BCH) tags.push({ label: "Upland Beach", icon: <TreePine size={16} />, color: "bg-green-100" });
    if (b.STRM_CRDOR) tags.push({ label: "Stream", icon: <Waves size={16} />, color: "bg-blue-100" });
    if (b.WETLAND) tags.push({ label: "Wetland", icon: <Droplets size={16} />, color: "bg-teal-100" });
    if (b.BLUFF) tags.push({ label: "Bluff", icon: <Mountain size={16} />, color: "bg-stone-100" });
    if (b.BAY_LGN_LK) tags.push({ label: "Bay/Lagoon", icon: <Waves size={16} />, color: "bg-cyan-100" });
    if (b.URBN_WFRNT) tags.push({ label: "Urban Waterfront", icon: <Building size={16} />, color: "bg-slate-100" });
    if (b.INLND_AREA) tags.push({ label: "Inland Area", icon: <Trees size={16} />, color: "bg-emerald-100" });
    if (b.STRS_BEACH) tags.push({ label: "Beach Stairs", icon: <Footprints size={16} />, color: "bg-gray-100" });
    if (b.PTH_BEACH) tags.push({ label: "Beach Path", icon: <Route size={16} />, color: "bg-green-100" });
    if (b.BOARDWLK) tags.push({ label: "Boardwalk", icon: <Route size={16} />, color: "bg-brown-100" });
    
    // Trails & Paths  
    if (b.BLFTP_TRLS) tags.push({ label: "Bluff Trails", icon: <Route size={16} />, color: "bg-green-100" });
    if (b.BLFTP_PRK) tags.push({ label: "Bluff Park", icon: <Trees size={16} />, color: "bg-emerald-100" });
    if (b.TRAIL_OR_P) tags.push({ label: "Trail/Path", icon: <Footprints size={16} />, color: "bg-lime-100" });
    if (b.BIKE_PATH) tags.push({ label: "Bike Path", icon: <Bike size={16} />, color: "bg-green-100" });
    if (b.EQUEST_TRL) tags.push({ label: "Horse Trail", icon: <Rabbit size={16} />, color: "bg-amber-100" });
    if (b.WLDLFE_VWG) tags.push({ label: "Wildlife Viewing", icon: <Binoculars size={16} />, color: "bg-teal-100" });
    
    // Activities
    if (b.SWIMMING) tags.push({ label: "Swimming", icon: <Droplet size={16} />, color: "bg-blue-100" });
    if (b.DIVING) tags.push({ label: "Diving", icon: <Eye size={16} />, color: "bg-indigo-100" });
    if (b.SNORKLNG) tags.push({ label: "Snorkeling", icon: <Eye size={16} />, color: "bg-cyan-100" });
    if (b.TIDEPOOL) tags.push({ label: "Tide Pooling", icon: <Shell size={16} />, color: "bg-teal-100" });
    if (b.PLAYGROUND) tags.push({ label: "Playground", icon: <Gamepad2 size={16} />, color: "bg-pink-100" });
    if (b.SPORT_FLDS) tags.push({ label: "Sports Fields", icon: <MapIcon size={16} />, color: "bg-green-100" });
    if (b.VOLLEYBALL) tags.push({ label: "Volleyball", icon: <Gamepad2 size={16} />, color: "bg-orange-100" });
    if (b.WNDSRF_KIT) tags.push({ label: "Windsurfing", icon: <Wind size={16} />, color: "bg-sky-100" });
    if (b.KAYAKING) tags.push({ label: "Kayaking", icon: <Ship size={16} />, color: "bg-blue-100" });
    if (b.SURFING) tags.push({ label: "Surfing", icon: <Waves size={16} />, color: "bg-cyan-100" });
    if (b.BOATING) tags.push({ label: "Boating", icon: <Anchor size={16} />, color: "bg-indigo-100" });
    
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
    { type: "tide", currentTide, tideData: todayTides },
    { type: "wind", wind: processedStats.wind },
    { type: "surf", surf: processedStats.surf },
    { type: "features", tags: getBeachFeatures(beach) },
  ] as const;

  return (
    <div className={cn("w-full", className)}>
      {currentData && (
        <div className="mb-2 text-xs text-gray-500 flex items-center gap-2">
          <Clock size={14} />
          <span>
            {new Date(currentData.timestamp).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
            {intervalInfo && ` • ${intervalInfo}`}
            {beach && ` • ${beach.Name}, ${beach.COUNTY} County`}
            {currentData.swell.tertiary.height && currentData.swell.tertiary.height > 0 && (
              <span className="text-green-600"> • Tertiary swell detected</span>
            )}
          </span>
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
              content = <TideStat currentTide={stat.currentTide} tideData={stat.tideData} />;
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