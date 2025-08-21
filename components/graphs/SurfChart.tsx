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
    tertiary: {
      height: number | null;
      period: number | null;
      direction: number | null;
    };
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
  surf: number; // Average surf height for bar chart
  min: number;   // Min height for display
  max: number;   // Max height for display
  primaryDirection: number | null;
  waveEnergy?: number;
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
  if (degrees === null || degrees === undefined) return 'SE';
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
    // Return default/mock data if no real data available (keeping your original format)
    return [
      { hour: 0, surf: 2, min: 1, max: 3, primaryDirection: 135 },
      { hour: 1, surf: 3, min: 2, max: 4, primaryDirection: 140 },
      { hour: 2, surf: 1, min: 1, max: 2, primaryDirection: 130 },
      { hour: 3, surf: 1, min: 1, max: 2, primaryDirection: 125 },
      { hour: 4, surf: 4, min: 3, max: 5, primaryDirection: 145 },
      { hour: 5, surf: 2, min: 1, max: 3, primaryDirection: 135 },
      { hour: 6, surf: 2, min: 2, max: 3, primaryDirection: 140 },
    ];
  }

  // Filter to every 3rd hour for chart display (similar to other components)
  const filteredData = hourlyData.filter((_, index) => index % 3 === 0);

  return filteredData.map((forecast) => {
    const date = new Date(forecast.timestamp);
    const hour = date.getHours();
    
    // Get surf heights (already in feet from your imperial script)
    const minHeight = forecast.surf.heightMin || 0;
    const maxHeight = forecast.surf.heightMax || 0;
    const avgHeight = (minHeight + maxHeight) / 2;
    
    // Use primary swell direction for wave direction indicator
    const primaryDirection = forecast.swell.primary.direction;
    
    return {
      hour: hour,
      surf: Number(avgHeight.toFixed(1)),
      min: Number(minHeight.toFixed(1)),
      max: Number(maxHeight.toFixed(1)),
      primaryDirection: primaryDirection,
      waveEnergy: forecast.surf.waveEnergy || undefined,
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
  const maxHeight = Math.max(
    ...surfData.map(d => d.max),
    3 // Minimum scale of 3ft
  );

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
            {currentForecast.surf.waveEnergy && ` • Energy: ${Math.round(currentForecast.surf.waveEnergy)} ft-lbs`}
          </div>
        )}
      </header>
      
      <ChartContainer
        config={chartConfig}
        className="@min-lg:aspect-auto @min-lg:h-[250px] w-full"
      >
        <BarChart
          margin={{
            top: 5,
            right: 5,
            left: -28,
            bottom: 5,
          }}
          accessibilityLayer
          data={surfData}
          syncId="surfCharts" // Same sync ID as swell chart
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
            fontSize={11}
            tickFormatter={(value) =>
              value % 3 === 0
                ? (value % 12 === 0 ? 12 : value % 12).toString()
                : ""
            }
          />
          <YAxis
            allowDecimals={true}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={11}
            domain={[0, Math.ceil(maxHeight * 1.2)]}
            tickFormatter={(value) => `${value}ft`}
          />
          <ChartTooltip 
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null;
              
              const hour = typeof label === "number" ? label : 0;
              const point = surfData.find(d => d.hour === hour);
              
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="flex flex-col gap-1">
                    <div className="font-medium text-sm">
                      {hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? 'PM' : 'AM'}
                    </div>
                    
                    {point && (
                      <>
                        <div className="text-xs">
                          <span className="font-medium">Surf:</span> {point.min}-{point.max}ft
                        </div>
                        {point.waveEnergy && (
                          <div className="text-xs">
                            <span className="font-medium">Energy:</span> {Math.round(point.waveEnergy)} ft-lbs
                          </div>
                        )}
                        {point.primaryDirection && (
                          <div className="text-xs">
                            <span className="font-medium">Direction:</span> {getWindDirection(point.primaryDirection)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            }}
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
                
                // Get the direction for this bar
                const hourIndex = typeof props.index === "number" ? props.index : 0;
                const dataPoint = surfData[hourIndex];
                const direction = dataPoint?.primaryDirection ? getWindDirection(dataPoint.primaryDirection) : 'SE';
                const DirectionIcon = getDirectionIcon(direction);
                
                return (
                  <g>
                    <DirectionIcon
                      size={iconSize}
                      x={safeX + (safeWidth - iconSize) / 2}
                      y={safeY - iconSize - iconSize}
                      fill="#8bd668ff"
                    />
                  </g>
                );
              }}
            />
            
            {/* Surf height range labels in middle of bars */}
            <LabelList
              dataKey="surf"
              position="middle"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                const safeY = typeof props.y === "number" ? props.y : 0;
                const safeWidth = typeof props.width === "number" ? props.width : 0;
                const safeHeight = typeof props.height === "number" ? props.height : 0;
                const fontSize = Math.max(10, safeWidth * 0.15);
                
                // Get the min-max range for this bar
                const hourIndex = typeof props.index === "number" ? props.index : 0;
                const dataPoint = surfData[hourIndex];
                
                if (dataPoint) {
                  const displayText = dataPoint.min === dataPoint.max 
                    ? `${dataPoint.min}ft`
                    : `${dataPoint.min}-${dataPoint.max}ft`;
                    
                  return (
                    <g>
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
              }}
              fill="black"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      
      {/* Footer with current surf summary */}
      {currentForecast && (
        <div className="mt-3 mx-2 p-2 bg-muted/50 rounded text-xs">
          <div className="flex justify-between items-center">
            <div>
              <strong>Current Surf:</strong> {' '}
              {currentForecast.surf.heightMin?.toFixed(1) || 'N/A'}-{currentForecast.surf.heightMax?.toFixed(1) || 'N/A'}ft
            </div>
            <div className="text-right">
              Updated: {new Date(currentForecast.timestamp).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })}
            </div>
          </div>
          
          {currentForecast.surf.waveEnergy && (
            <div className="mt-1 text-xs">
              <span className="font-medium">Wave Energy:</span> {Math.round(currentForecast.surf.waveEnergy)} ft-lbs
            </div>
          )}
        </div>
      )}
      
      {/* Data quality indicator */}
      {!data && (
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Showing sample data - connect to API for live conditions
        </div>
      )}
    </div>
  );
};

export default SurfChart;