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
  conditions: {
    windSpeed: number | null;
    windGust: number | null;
    windDirection: number | null;
    airTemp: number | null;
    pressure: number | null;
  };
}

interface DailyConditions {
  sunrise: string | null;
  sunset: string | null;
}

interface WindChartProps {
  data?: ForecastData[];
  currentForecast?: ForecastData | null;
  dailyConditions?: DailyConditions;
  beach?: {
    id: number;
    name: string;
    county: string;
  };
}

interface WindDataPoint {
  hour: number;
  wind: number;
  gust: number;
  direction: number;
  quality: string;
  type: string;
  time: string;
}

const chartConfig = {
  wind: {
    label: "Wind (mph)",
    color: "#60a5fa",
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
  return iconMap[direction] || NArrowIcon;
};

const getWindQuality = (
  speed: number,
  direction: string
): { quality: string; color: string; type: string } => {
  // Offshore winds (NE, E, SE) are generally better for surfing
  const offshoreDirections = ['NE', 'ENE', 'E', 'ESE', 'SE'];
  const onshoreDirections = ['SW', 'WSW', 'W', 'WNW', 'NW'];
  const sideShoreDirections = ['N', 'NNE', 'SSE', 'S', 'SSW', 'NNW'];
  
  let type = 'variable';
  if (offshoreDirections.includes(direction)) {
    type = 'offshore';
  } else if (onshoreDirections.includes(direction)) {
    type = 'onshore';
  } else if (sideShoreDirections.includes(direction)) {
    type = 'sideshore';
  }

  if (speed < 5) {
    return { 
      quality: 'glassy', 
      color: '#10b981', // green
      type 
    };
  } else if (speed < 10) {
    if (type === 'offshore') {
      return { 
        quality: 'clean', 
        color: '#22c55e', // light green
        type 
      };
    } else if (type === 'onshore') {
      return { 
        quality: 'bumpy', 
        color: '#eab308', // yellow
        type 
      };
    } else {
      return { 
        quality: 'fair', 
        color: '#3b82f6', // blue
        type 
      };
    }
  } else if (speed < 15) {
    if (type === 'offshore') {
      return { 
        quality: 'textured', 
        color: '#eab308', // yellow
        type 
      };
    } else {
      return { 
        quality: 'choppy', 
        color: '#f97316', // orange
        type 
      };
    }
  } else if (speed < 25) {
    return { 
      quality: 'windy', 
      color: '#ef4444', // red
      type 
    };
  } else {
    return { 
      quality: 'blown out', 
      color: '#991b1b', // dark red
      type 
    };
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

const processWindData = (hourlyData: ForecastData[]): WindDataPoint[] => {
  if (!hourlyData || hourlyData.length === 0) {
    // Return default data if no real data available
    return [
      { hour: 0, wind: 5, gust: 8, direction: 45, quality: 'clean', type: 'offshore', time: "12:00 AM" },
      { hour: 3, wind: 3, gust: 5, direction: 90, quality: 'glassy', type: 'sideshore', time: "3:00 AM" },
      { hour: 6, wind: 8, gust: 12, direction: 225, quality: 'bumpy', type: 'onshore', time: "6:00 AM" },
      { hour: 9, wind: 12, gust: 18, direction: 270, quality: 'choppy', type: 'onshore', time: "9:00 AM" },
      { hour: 12, wind: 15, gust: 22, direction: 270, quality: 'windy', type: 'onshore', time: "12:00 PM" },
      { hour: 15, wind: 18, gust: 25, direction: 225, quality: 'windy', type: 'onshore', time: "3:00 PM" },
      { hour: 18, wind: 10, gust: 15, direction: 270, quality: 'choppy', type: 'onshore', time: "6:00 PM" },
      { hour: 21, wind: 6, gust: 9, direction: 315, quality: 'fair', type: 'sideshore', time: "9:00 PM" },
    ];
  }

  return hourlyData.map((forecast) => {
    const date = new Date(forecast.timestamp);
    const hour = date.getHours();
    
    // Get wind data (already in mph from your imperial script)
    const windSpeed = forecast.conditions.windSpeed || 0;
    const windGust = forecast.conditions.windGust || windSpeed;
    const windDirection = forecast.conditions.windDirection || 0;
    
    // Get direction and quality
    const directionStr = getWindDirection(windDirection);
    const qualityInfo = getWindQuality(windSpeed, directionStr);
    
    return {
      hour,
      wind: Number(windSpeed.toFixed(1)),
      gust: Number(windGust.toFixed(1)),
      direction: windDirection,
      quality: qualityInfo.quality,
      type: qualityInfo.type,
      time: formatTime(hour),
    };
  });
};

const WindChart = ({ data, currentForecast, dailyConditions, beach }: WindChartProps) => {
  const windData = processWindData(data || []);
  const currentHour = getCurrentHour();
  const sunTimes = getSunTimes(dailyConditions);
  
  // Reference areas for night/day
  const nightColor = "#ccc1ffff";
  const dayColor = "#FFE58F";
  
  // Find max wind speed for Y-axis scaling
  const maxWind = Math.max(...windData.map(d => Math.max(d.wind, d.gust)), 10);

  return (
    <div className="h-full bg-background border border-border p-2 rounded-md shadow-sm">
      <header className="mx-2 mb-4 mt-2">
        <h3 className="leading-none font-semibold">
          Wind <span className="text-base font-medium">(mph)</span>
        </h3>
        <span className="text-muted-foreground text-sm">
          Showing wind conditions for the day
          {beach && ` at ${beach.name}`}
        </span>
        
        {/* Current wind info */}
        {currentForecast && (
          <div className="mt-2 text-xs text-muted-foreground">
            Current: {currentForecast.conditions.windSpeed?.toFixed(1) || 'N/A'} mph
            {currentForecast.conditions.windGust && (
              <> (gusts to {currentForecast.conditions.windGust.toFixed(1)} mph)</>
            )}
            {currentForecast.conditions.windDirection && (
              <> from {getWindDirection(currentForecast.conditions.windDirection)}</>
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
          data={windData}
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
            dataKey="wind"
            allowDecimals={true}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            domain={[0, Math.ceil(maxWind * 1.2)]}
          />
          <ChartTooltip 
            content={<ChartTooltipContent 
              formatter={(value, name) => {
                const dataPoint = windData.find(d => d.hour === currentHour) || windData[0];
                return [
                  `${dataPoint.wind} mph (gusts ${dataPoint.gust} mph) - ${dataPoint.quality}`,
                  "Wind Speed"
                ];
              }}
              labelFormatter={(hour) => {
                const dataPoint = windData.find(d => d.hour === hour);
                if (dataPoint) {
                  return `${dataPoint.time} - ${getWindDirection(dataPoint.direction)} ${dataPoint.type}`;
                }
                const displayHour = hour % 12 === 0 ? 12 : hour % 12;
                const ampm = hour >= 12 ? 'PM' : 'AM';
                return `${displayHour}:00 ${ampm}`;
              }}
            />} 
          />
          
          <Bar
            dataKey="wind"
            fill="var(--color-wind)"
            radius={4}
            stroke="#5f5f5fff"
            strokeWidth={0.5}
          >
            {/* Direction arrows on top of bars */}
            <LabelList
              dataKey="wind"
              position="top"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                const safeY = typeof props.y === "number" ? props.y : 0;
                const safeWidth = typeof props.width === "number" ? props.width : 0;
                const iconSize = Math.min(20, safeWidth * 0.6);
                
                if (typeof props.index === "number" && windData[props.index]) {
                  const dataPoint = windData[props.index];
                  const direction = getWindDirection(dataPoint.direction);
                  const DirectionIcon = getDirectionIcon(direction);
                  const qualityInfo = getWindQuality(dataPoint.wind, direction);
                  
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
            
            {/* Wind speed labels in middle of bars */}
            <LabelList
              dataKey="wind"
              position="middle"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                const safeY = typeof props.y === "number" ? props.y : 0;
                const safeWidth = typeof props.width === "number" ? props.width : 0;
                const safeHeight = typeof props.height === "number" ? props.height : 0;
                const fontSize = Math.max(10, safeWidth * 0.15);
                
                if (typeof props.index === "number" && windData[props.index]) {
                  const dataPoint = windData[props.index];
                  const displayText = dataPoint.gust > dataPoint.wind 
                    ? `${dataPoint.wind}-${dataPoint.gust}` 
                    : `${dataPoint.wind}`;
                  
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
      
      {/* Footer with wind quality legend */}
      <div className="mt-3 mx-2 text-xs">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium">Wind Quality:</span>
          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span>Glassy</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-400"></div>
              <span>Clean</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span>Fair</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-500"></div>
              <span>Bumpy</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-500"></div>
              <span>Choppy</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span>Blown Out</span>
            </div>
          </div>
        </div>
        
        {/* Wind direction types */}
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium">Wind Types:</span>
          <div className="flex gap-3">
            <span className="text-green-600">Offshore (clean)</span>
            <span className="text-blue-600">Sideshore (fair)</span>
            <span className="text-orange-600">Onshore (bumpy)</span>
          </div>
        </div>
        
        {/* Best wind conditions summary */}
        {currentForecast && (
          <div className="p-2 bg-muted/50 rounded text-xs">
            <strong>Best Wind Today:</strong> {' '}
            {(() => {
              const bestHour = windData.reduce((best, current) => {
                const bestQuality = getWindQuality(best.wind, getWindDirection(best.direction));
                const currentQuality = getWindQuality(current.wind, getWindDirection(current.direction));
                
                // Prefer offshore winds and lower speeds
                if (currentQuality.type === 'offshore' && bestQuality.type !== 'offshore') return current;
                if (bestQuality.type === 'offshore' && currentQuality.type !== 'offshore') return best;
                
                return current.wind < best.wind ? current : best;
              });
              return `${bestHour.time} - ${bestHour.wind} mph ${getWindDirection(bestHour.direction)} (${bestHour.quality})`;
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default WindChart;