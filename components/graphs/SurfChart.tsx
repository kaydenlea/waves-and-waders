"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  LabelList,
  YAxis,
  LabelProps,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
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
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Types for real forecast data
interface ForecastData {
  timestamp: string;
  surf: {
    heightMin: number | null;
    heightMax: number | null;
    waveEnergy: number | null;
  };
  swell: {
    primary: {
      height: number | null;
      period: number | null;
      direction: number | null;
    };
    secondary: {
      height: number | null;
      period: number | null;
      direction: number | null;
    };
  };
  conditions: {
    windSpeed: number | null;
    windDirection: number | null;
  };
}

interface DailyConditions {
  sunrise: string | null;
  sunset: string | null;
}

interface SurfChartProps {
  data?: ForecastData[];
  currentForecast?: ForecastData | null;
  dailyConditions?: DailyConditions;
  beach?: {
    id: number;
    name: string;
    county: string;
  };
}

interface SurfDataPoint {
  hour: number;
  surf: number;
  min: number;
  max: number;
  direction: number;
  quality: string;
  period: number;
  energy: number;
  time: string;
}

const chartConfig = {
  surf: {
    label: "Surf (ft)",
    color: "#95c5ffff",
  },
} satisfies ChartConfig;

// Utility functions
const getCurrentHour = () => new Date().getHours();

const getWindDirection = (degrees: number | null): string => {
  if (degrees === null || degrees === undefined) return 'N';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

const getDirectionIcon = (direction: string) => {
  const iconMap: { [key: string]: React.ComponentType<any> } = {
    'N': NArrowIcon,
    'NNE': NEArrowIcon,
    'NE': NEArrowIcon,
    'ENE': NEArrowIcon,
    'E': EArrowIcon,
    'ESE': SEArrowIcon,
    'SE': SEArrowIcon,
    'SSE': SEArrowIcon,
    'S': SArrowIcon,
    'SSW': SWArrowIcon,
    'SW': SWArrowIcon,
    'WSW': SWArrowIcon,
    'W': WArrowIcon,
    'WNW': NWArrowIcon,
    'NW': NWArrowIcon,
    'NNW': NWArrowIcon,
  };
  return iconMap[direction] || SEArrowIcon;
};

const getSurfQuality = (
  height: number,
  windSpeed: number | null,
  period: number | null
): { quality: string; color: string } => {
  const isWindy = windSpeed && windSpeed > 15;
  const hasGoodPeriod = period && period > 8;

  if (height < 1) {
    return { quality: 'flat', color: '#ef4444' }; // red
  } else if (height < 2) {
    if (isWindy) {
      return { quality: 'poor', color: '#f97316' }; // orange
    }
    return { quality: 'fair', color: '#eab308' }; // yellow
  } else if (height < 4) {
    if (isWindy) {
      return { quality: 'fair', color: '#eab308' }; // yellow
    }
    if (hasGoodPeriod) {
      return { quality: 'good', color: '#22c55e' }; // green
    }
    return { quality: 'fair', color: '#eab308' }; // yellow
  } else if (height < 8) {
    if (isWindy) {
      return { quality: 'fair', color: '#eab308' }; // yellow
    }
    return { quality: 'epic', color: '#8b5cf6' }; // purple
  } else {
    return { quality: 'huge', color: '#dc2626' }; // red (dangerous)
  }
};

const formatTime = (hour: number): string => {
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${displayHour}:00 ${ampm}`;
};

const getSunTimes = (dailyConditions?: DailyConditions) => {
  const defaultSunrise = 6;
  const defaultSunset = 19;
  
  if (!dailyConditions) {
    return { sunriseHour: defaultSunrise, sunsetHour: defaultSunset };
  }
  
  const getHourFromTime = (timeStr: string | null, defaultHour: number) => {
    if (!timeStr) return defaultHour;
    try {
      return parseInt(timeStr.split(':')[0]);
    } catch {
      return defaultHour;
    }
  };
  
  return {
    sunriseHour: getHourFromTime(dailyConditions.sunrise, defaultSunrise),
    sunsetHour: getHourFromTime(dailyConditions.sunset, defaultSunset)
  };
};

const processSurfData = (hourlyData: ForecastData[]): SurfDataPoint[] => {
  if (!hourlyData || hourlyData.length === 0) {
    // Return default data if no real data available
    return [
      { hour: 0, surf: 2, min: 2, max: 3, direction: 225, quality: 'fair', period: 7, energy: 4, time: "12:00 AM" },
      { hour: 3, surf: 3, min: 2, max: 4, direction: 225, quality: 'good', period: 8, energy: 9, time: "3:00 AM" },
      { hour: 6, surf: 1, min: 1, max: 2, direction: 270, quality: 'poor', period: 6, energy: 1, time: "6:00 AM" },
      { hour: 9, surf: 1, min: 1, max: 2, direction: 270, quality: 'poor', period: 6, energy: 1, time: "9:00 AM" },
      { hour: 12, surf: 4, min: 3, max: 5, direction: 225, quality: 'good', period: 9, energy: 16, time: "12:00 PM" },
      { hour: 15, surf: 2, min: 2, max: 3, direction: 225, quality: 'fair', period: 7, energy: 4, time: "3:00 PM" },
      { hour: 18, surf: 2, min: 2, max: 3, direction: 225, quality: 'fair', period: 7, energy: 4, time: "6:00 PM" },
      { hour: 21, surf: 3, min: 2, max: 4, direction: 225, quality: 'good', period: 8, energy: 9, time: "9:00 PM" },
    ];
  }

  return hourlyData.map((forecast) => {
    const date = new Date(forecast.timestamp);
    const hour = date.getHours();
    
    // Get surf heights (already in feet from your imperial script)
    const minHeight = forecast.surf.heightMin || 0;
    const maxHeight = forecast.surf.heightMax || 0;
    const avgHeight = (minHeight + maxHeight) / 2;
    
    // Use primary swell direction as surf direction
    const direction = forecast.swell.primary.direction || 225; // Default SW
    const period = forecast.swell.primary.period || 0;
    const energy = forecast.surf.waveEnergy || 0;
    
    // Determine surf quality
    const qualityInfo = getSurfQuality(avgHeight, forecast.conditions.windSpeed, period);
    
    return {
      hour,
      surf: Number(avgHeight.toFixed(1)),
      min: Number(minHeight.toFixed(1)),
      max: Number(maxHeight.toFixed(1)),
      direction,
      quality: qualityInfo.quality,
      period,
      energy: Number(energy.toFixed(1)),
      time: formatTime(hour),
    };
  });
};

const SurfChart = ({ data, currentForecast, dailyConditions, beach }: SurfChartProps) => {
  const surfData = processSurfData(data || []);
  const currentHour = getCurrentHour();
  const sunTimes = getSunTimes(dailyConditions);
  
  // Reference areas for night/day
  const nightColor = "#ccc1ffff";
  const dayColor = "#FFE58F";
  
  // Find max surf height for Y-axis scaling
  const maxHeight = Math.max(...surfData.map(d => d.max), 3);

  return (
    <div className="h-full bg-background border border-border p-2 rounded-md shadow-sm">
      <header className="mx-2 mb-4 mt-2">
        <h3 className="leading-none font-semibold">
          Surf <span className="text-base font-medium">(ft)</span>
        </h3>
        <span className="text-muted-foreground text-sm">
          Showing the surf for the day
          {beach && ` at ${beach.name}`}
        </span>
        
        {/* Current surf info */}
        {currentForecast && (
          <div className="mt-2 text-xs text-muted-foreground">
            Current: {currentForecast.surf.heightMin?.toFixed(1) || 'N/A'}-{currentForecast.surf.heightMax?.toFixed(1) || 'N/A'}ft
            {currentForecast.swell.primary.direction && (
              <> from {getWindDirection(currentForecast.swell.primary.direction)}</>
            )}
            {currentForecast.surf.waveEnergy && (
              <> • Energy: {currentForecast.surf.waveEnergy.toFixed(1)} ft-lbs</>
            )}
          </div>
        )}
      </header>
      
      <ChartContainer
        config={chartConfig}
        className="@min-lg:aspect-auto @min-lg:h-[250px] w-full"
      >
        <BarChart
          margin={{
            top: 35,
            right: 5,
            left: -28,
            bottom: 5,
          }}
          accessibilityLayer
          data={surfData}
          syncId="anyId"
        >
          {/* Night and day reference areas */}
          <ReferenceArea x1={0} x2={sunTimes.sunriseHour} fill={nightColor} fillOpacity={0.2} />
          <ReferenceArea x1={sunTimes.sunriseHour} x2={sunTimes.sunsetHour} fill={dayColor} fillOpacity={0.2} />
          <ReferenceArea x1={sunTimes.sunsetHour} x2={24} fill={nightColor} fillOpacity={0.2} />
          
          {/* Current time indicator */}
          <ReferenceLine x={currentHour} stroke="#ff6b6b" strokeWidth={2} strokeDasharray="2 2" />
          
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#eee"
            strokeWidth={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="hour"
            orientation="bottom"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) =>
              value % 3 === 0
                ? (value % 12 === 0 ? 12 : value % 12).toString()
                : ""
            }
          />
          <YAxis
            dataKey="max"
            allowDecimals={true}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            domain={[0, Math.ceil(maxHeight * 1.2)]}
          />
          <ChartTooltip 
            content={<ChartTooltipContent 
              formatter={(value, name) => {
                const dataPoint = surfData.find(d => d.hour === currentHour) || surfData[0];
                return [
                  `${dataPoint.min}-${dataPoint.max}ft (${dataPoint.quality})`,
                  "Surf Height"
                ];
              }}
              labelFormatter={(hour) => {
                const dataPoint = surfData.find(d => d.hour === hour);
                if (dataPoint) {
                  return `${dataPoint.time} - ${getWindDirection(dataPoint.direction)} swell @ ${dataPoint.period}s`;
                }
                const displayHour = hour % 12 === 0 ? 12 : hour % 12;
                const ampm = hour >= 12 ? 'PM' : 'AM';
                return `${displayHour}:00 ${ampm}`;
              }}
            />} 
          />
          
          <Bar
            dataKey="surf"
            fill="var(--color-surf)"
            radius={4}
            stroke="#5f5f5fff"
            strokeWidth={0.5}
          >
            {/* Direction arrows on top of bars */}
            <LabelList
              dataKey="surf"
              position="top"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                const safeY = typeof props.y === "number" ? props.y : 0;
                const safeWidth = typeof props.width === "number" ? props.width : 0;
                const iconSize = Math.min(20, safeWidth * 0.6);
                
                if (typeof props.index === "number" && surfData[props.index]) {
                  const dataPoint = surfData[props.index];
                  const direction = getWindDirection(dataPoint.direction);
                  const DirectionIcon = getDirectionIcon(direction);
                  const qualityInfo = getSurfQuality(dataPoint.surf, null, dataPoint.period);
                  
                  return (
                    <g key={`arrow-${props.index}`}>
                      <DirectionIcon
                        size={iconSize}
                        x={safeX + (safeWidth - iconSize) / 2}
                        y={safeY - iconSize - 5}
                        fill={qualityInfo.color}
                      />
                    </g>
                  );
                }
                return null;
              }}
            />
            
            {/* Height range labels in middle of bars */}
            <LabelList
              dataKey="surf"
              position="middle"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                const safeY = typeof props.y === "number" ? props.y : 0;
                const safeWidth = typeof props.width === "number" ? props.width : 0;
                const safeHeight = typeof props.height === "number" ? props.height : 0;
                const fontSize = Math.max(10, safeWidth * 0.15);
                
                if (typeof props.index === "number" && surfData[props.index]) {
                  const dataPoint = surfData[props.index];
                  const displayText = dataPoint.min === dataPoint.max 
                    ? `${dataPoint.min}ft` 
                    : `${dataPoint.min}-${dataPoint.max}ft`;
                  
                  return (
                    <g key={`label-${props.index}`}>
                      <text
                        x={safeX + safeWidth / 2}
                        y={safeY + safeHeight / 2 + fontSize / 3}
                        fill="#2c2c2cff"
                        textAnchor="middle"
                        fontWeight="bold"
                        fontSize={fontSize}
                      >
                        {displayText}
                      </text>
                    </g>
                  );
                }
                return null;
              }}
              fill="black"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      
      {/* Footer with surf quality legend */}
      <div className="mt-3 mx-2 text-xs">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium">Surf Quality:</span>
          <div className="flex gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span>Flat/Poor</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-500"></div>
              <span>Fair</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span>Good</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-purple-500"></div>
              <span>Epic</span>
            </div>
          </div>
        </div>
        
        {/* Current conditions summary */}
        {currentForecast && (
          <div className="p-2 bg-muted/50 rounded text-xs">
            <strong>Best Surf Today:</strong> {' '}
            {(() => {
              const bestHour = surfData.reduce((best, current) => 
                current.surf > best.surf ? current : best
              );
              return `${bestHour.time} - ${bestHour.min}-${bestHour.max}ft ${bestHour.quality}`;
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default SurfChart;