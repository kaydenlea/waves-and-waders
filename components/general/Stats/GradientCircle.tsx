import { cn } from "@/lib/utils";
import {
  Droplets,
  Sun,
  Waves,
  Wind,
  Cloud as CloudIcon,
  CloudSun,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  Snowflake,
} from "lucide-react";
import React from "react";

const baseColors: Record<string, string[]> = {
  water: ["#3b82f6", "#60a5fa", "#0ea5e9", "#22d3ee"],
  sun: ["#facc15", "#f97316", "#f59e0b", "#fbbf24"],
};

const intensityColorSets: Record<string, string[][]> = {
  tide: [
    ["#FCA5A5", "#F87171", "#EF4444", "#DC2626"],
    ["#FDE68A", "#FACC15", "#F59E0B", "#D97706"],
    ["#34D399", "#22C55E", "#10B981", "#059669"],
  ],
  wind: [
    ["#FCA5A5", "#F87171", "#EF4444", "#DC2626"],
    ["#FDE68A", "#FACC15", "#F59E0B", "#D97706"],
    ["#22D3EE", "#0EA5E9", "#0284C7", "#0369A1"],
  ],
  surf: [
    ["#BFDBFE", "#93C5FD", "#60A5FA", "#3B82F6"],
    ["#93C5FD", "#60A5FA", "#3B82F6", "#2563EB"],
    ["#818CF8", "#6366F1", "#4F46E5", "#4338CA"],
  ],
};

const getIntensityColors = (
  conditionKey: string,
  pct: number
): string[] | null => {
  const sets = intensityColorSets[conditionKey];
  if (!sets) return null;
  if (pct <= 33) return sets[0];
  if (pct <= 66) return sets[1];
  return sets[2];
};

const getWeatherIcon = (
  code: number | null | undefined,
  iconSize: number = 18
) => {
  if (code == null) return <Sun size={iconSize} className="text-[#FF8D0B]" />;
  // WMO code groupings per spec
  if (code === 0) return <Sun size={iconSize} className="text-[#FF8D0B]" />; // Clear
  if ([1, 2, 3].includes(code))
    return <CloudSun size={iconSize} className="text-[#bdbdbd]" />; // Partly cloudy/overcast
  if ([45, 48].includes(code))
    return <CloudIcon size={iconSize} className="text-[#bdbdbd]" />; // Fog
  if ([51, 53, 55].includes(code))
    return <CloudDrizzle size={iconSize} className="text-[#66a3ff]" />; // Drizzle
  if ([56, 57].includes(code))
    return <CloudDrizzle size={iconSize} className="text-[#66a3ff]" />; // Freezing drizzle
  if ([61, 63, 65].includes(code))
    return <CloudRain size={iconSize} className="text-[#66a3ff]" />; // Rain
  if ([66, 67].includes(code))
    return <CloudRain size={iconSize} className="text-[#66a3ff]" />; // Freezing rain
  if ([71, 73, 75].includes(code))
    return <Snowflake size={iconSize} className="text-[#8ecaff]" />; // Snow
  if (code === 77)
    return <Snowflake size={iconSize} className="text-[#8ecaff]" />; // Snow grains
  if ([80, 81, 82].includes(code))
    return <CloudRain size={iconSize} className="text-[#66a3ff]" />; // Showers
  if ([85, 86].includes(code))
    return <Snowflake size={iconSize} className="text-[#8ecaff]" />; // Snow showers
  if ([95, 96, 99].includes(code))
    return <CloudLightning size={iconSize} className="text-[#ff8d6b]" />; // Thunderstorm/hail
  return <CloudIcon size={iconSize} className="text-[#bdbdbd]" />;
};

const GradientCircle = ({
  data,
  percentage = 75,
  size = 75,
  strokeWidth = 7,
  condition = "sun",
  color,
  content,
  showIcon = true,
  unitOverride,
  weatherCode,
  percent,
}: {
  data?: React.ReactNode;
  percentage?: number;
  size?: number;
  strokeWidth?: number;
  condition?: string;
  color?: string;
  content?: React.ReactNode;
  showIcon?: boolean;
  unitOverride?: string;
  weatherCode?: number | null;
  percent?: number;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const iconSize = size <= 65 ? 14 : 18;

  const iconsMap: Record<string, React.ReactNode> = {
    water: <Droplets size={iconSize} className="text-[#1CACD4]" />,
    sun: <Sun size={iconSize} className="text-[#FF8D0B]" />,
    tide: <Waves size={iconSize} className="text-foreground" />,
    wind: <Wind size={iconSize} className="text-foreground" />,
    surf: <Waves size={iconSize} className="text-[#2563eb]" />,
  };

  const unitsMap: Record<string, string> = {
    water: "\u00b0F",
    sun: "\u00b0F",
    tide: "ft",
    wind: "mph",
    surf: "ft",
  };

  const bgColor = color ? color : "bg-highlight-4";

  // Use weather icon if condition is "sun" and weatherCode is provided
  let icon = showIcon ? iconsMap[condition] ?? null : null;
  if (showIcon && condition === "sun" && weatherCode !== undefined) {
    icon = getWeatherIcon(weatherCode, iconSize);
  }

  const unit = unitOverride ?? unitsMap[condition] ?? "";

  // Use percent if provided, otherwise use percentage
  const actualPercentage = percent ?? percentage;
  const offset = circumference - (actualPercentage / 100) * circumference;

  let selectedColors = getIntensityColors(condition, actualPercentage);
  if (!selectedColors) {
    selectedColors = baseColors[condition] ?? [
      "#94a3b8",
      "#64748b",
      "#475569",
      "#1f2937",
    ];
  }

  const gradientId = `grad-${condition}`;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 rounded-full bg-gray-200" />

      <svg
        className="absolute"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="1" y1="0" x2="0" y2="1">
            {selectedColors.map((c, i) => (
              <stop
                key={i}
                offset={`${
                  (i / Math.max(selectedColors.length - 1, 1)) * 100
                }%`}
                stopColor={c}
              />
            ))}
          </linearGradient>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            filter: `drop-shadow(0 0 2px ${selectedColors[0]}) drop-shadow(0 0 1px ${selectedColors[1]})`,
          }}
        />
      </svg>

      <div
        className={cn("absolute rounded-full", bgColor)}
        style={{
          width: size - strokeWidth * 2,
          height: size - strokeWidth * 2,
        }}
      />

      <div className="z-10 flex flex-col items-center justify-center gap-1 text-center px-1">
        {content ?? (
          <div className="flex flex-col items-center gap-0.5">
            {icon}
            <span
              className={cn(
                "flex items-center font-medium whitespace-nowrap",
                size <= 65 ? "text-sm" : ""
              )}
            >
              {data}
              {unit && (
                <span
                  className={cn(
                    "ml-0.5 font-normal",
                    size <= 65 ? "text-[10px]" : "text-xs"
                  )}
                >
                  {unit}
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GradientCircle;
