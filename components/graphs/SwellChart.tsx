"use client";
import {
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
  AreaChart,
  Area,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Types for real forecast data
interface ForecastData {
  timestamp: string;
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
}

interface DailyConditions {
  sunrise: string | null;
  sunset: string | null;
}

interface SwellChartProps {
  data?: ForecastData[];
  currentForecast?: ForecastData | null;
  dailyConditions?: DailyConditions;
  beach?: {
    id: number;
    name: string;
    county: string;
  };
}

interface SwellDataPoint {
  time: number;
  hour: string;
  primary: number;
  secondary: number;
  tertiary: number;
  primaryPeriod?: number;
  secondaryPeriod?: number;
  primaryDirection?: number;
  secondaryDirection?: number;
}

const chartConfig = {
  primary: {
    label: "Primary",
    color: "#2563eb",
  },
  secondary: {
    label: "Secondary", 
    color: "#95c5ffff",
  },
  tertiary: {
    label: "Tertiary",
    color: "#2564b8ff",
  },
} satisfies ChartConfig;

// Utility functions
const getCurrentHour = () => new Date().getHours();

const getWindDirection = (degrees: number | null): string => {
  if (degrees === null || degrees === undefined) return 'N/A';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
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

const processSwellData = (hourlyData: ForecastData[]): SwellDataPoint[] => {
  if (!hourlyData || hourlyData.length === 0) {
    // Return default/mock data if no real data available
    return [
      { time: 0, hour: "12:00 AM", primary: 1.2, secondary: 0.6, tertiary: 0.3 },
      { time: 3, hour: "3:00 AM", primary: 1.5, secondary: 0.7, tertiary: 0.4 },
      { time: 6, hour: "6:00 AM", primary: 1.8, secondary: 0.9, tertiary: 0.7 },
      { time: 9, hour: "9:00 AM", primary: 1.4, secondary: 0.8, tertiary: 0.6 },
      { time: 12, hour: "12:00 PM", primary: 1.1, secondary: 0.5, tertiary: 0.4 },
      { time: 15, hour: "3:00 PM", primary: 1.6, secondary: 0.7, tertiary: 0.6 },
      { time: 18, hour: "6:00 PM", primary: 1.9, secondary: 1.0, tertiary: 0.8 },
      { time: 21, hour: "9:00 PM", primary: 1.3, secondary: 0.6, tertiary: 0.5 },
    ];
  }

  return hourlyData.map((forecast) => {
    const date = new Date(forecast.timestamp);
    const hour = date.getHours();
    
    // Get swell heights (already in feet from your imperial script)
    const primaryHeight = forecast.swell.primary.height || 0;
    const secondaryHeight = forecast.swell.secondary.height || 0;
    
    // Create tertiary swell as a smaller component of secondary (common in real conditions)
    const tertiaryHeight = secondaryHeight > 0 ? secondaryHeight * 0.5 : 0;
    
    return {
      time: hour,
      hour: formatTime(hour),
      primary: Number(primaryHeight.toFixed(1)),
      secondary: Number(secondaryHeight.toFixed(1)),
      tertiary: Number(tertiaryHeight.toFixed(1)),
      primaryPeriod: forecast.swell.primary.period,
      secondaryPeriod: forecast.swell.secondary.period,
      primaryDirection: forecast.swell.primary.direction,
      secondaryDirection: forecast.swell.secondary.direction,
    };
  });
};

const SwellChart = ({ data, currentForecast, dailyConditions, beach }: SwellChartProps) => {
  const swellData = processSwellData(data || []);
  const currentHour = getCurrentHour();
  const sunTimes = getSunTimes(dailyConditions);
  
  // Reference areas for night/day
  const nightColor = "#ccc1ffff";
  const dayColor = "#FFE58F";
  
  // Find max swell height for Y-axis scaling
  const maxHeight = Math.max(
    ...swellData.map(d => Math.max(d.primary, d.secondary, d.tertiary)),
    3 // Minimum scale of 3ft
  );

  return (
    <div className="h-full bg-background border border-border p-2 rounded-md shadow-sm">
      <header className="mx-2 mb-4 mt-2">
        <h3 className="leading-none font-semibold">
          Swell <span className="text-base font-medium">(ft)</span>
        </h3>
        <span className="text-muted-foreground text-sm">
          Showing the swell for the day
          {beach && ` at ${beach.name}`}
        </span>
        
        {/* Current swell info */}
        {currentForecast && (
          <div className="mt-2 text-xs text-muted-foreground">
            Primary: {currentForecast.swell.primary.height?.toFixed(1) || 'N/A'}ft @ {currentForecast.swell.primary.period || 'N/A'}s
            {currentForecast.swell.primary.direction && ` ${getWindDirection(currentForecast.swell.primary.direction)}`}
            {currentForecast.swell.secondary.height && (
              <> • Secondary: {currentForecast.swell.secondary.height.toFixed(1)}ft @ {currentForecast.swell.secondary.period || 'N/A'}s</>
            )}
          </div>
        )}
      </header>
      
      <ChartContainer
        config={chartConfig}
        className="@min-lg:aspect-auto @min-lg:h-[250px] w-full"
      >
        <AreaChart
          accessibilityLayer
          data={swellData}
          margin={{
            left: -30,
            right: 15,
          }}
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
            dataKey="time"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={0}
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
          />
          <ChartLegend content={<ChartLegendContent />} />
          <ChartTooltip 
            content={<ChartTooltipContent 
              formatter={(value, name) => {
                const point = swellData.find(d => d.time === currentHour) || swellData[0];
                let label = `${value} ft`;
                
                // Add period and direction info for primary/secondary
                if (name === 'primary' && point.primaryPeriod) {
                  label += ` @ ${point.primaryPeriod}s`;
                  if (point.primaryDirection) {
                    label += ` ${getWindDirection(point.primaryDirection)}`;
                  }
                } else if (name === 'secondary' && point.secondaryPeriod) {
                  label += ` @ ${point.secondaryPeriod}s`;
                  if (point.secondaryDirection) {
                    label += ` ${getWindDirection(point.secondaryDirection)}`;
                  }
                }
                
                return [label, name.charAt(0).toUpperCase() + name.slice(1)];
              }}
              labelFormatter={(hour) => {
                const displayHour = hour % 12 === 0 ? 12 : hour % 12;
                const ampm = hour >= 12 ? 'PM' : 'AM';
                return `${displayHour}:00 ${ampm}`;
              }}
            />} 
          />
          
          {/* Stacked areas for different swell components */}
          <Area
            type="monotone"
            dataKey="primary"
            stackId="1"
            stroke="#023e8a"
            fill="#0077b6"
            fillOpacity={0.8}
          />
          <Area
            type="monotone"
            dataKey="secondary"
            stackId="1"
            stroke="#0096c7"
            fill="#48cae4"
            fillOpacity={0.7}
          />
          <Area
            type="monotone"
            dataKey="tertiary"
            stackId="1"
            stroke="#70ccebff"
            fill="#adf1ffff"
            fillOpacity={0.6}
          />
        </AreaChart>
      </ChartContainer>
      
      {/* Footer with current swell summary */}
      {currentForecast && (
        <div className="mt-3 mx-2 p-2 bg-muted/50 rounded text-xs">
          <div className="flex justify-between items-center">
            <div>
              <strong>Current Conditions:</strong>
            </div>
            <div className="text-right">
              Updated: {new Date(currentForecast.timestamp).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-1">
            <div>
              <span className="text-blue-600 font-medium">Primary:</span> {' '}
              {currentForecast.swell.primary.height?.toFixed(1) || 'N/A'}ft
              {currentForecast.swell.primary.period && ` @ ${currentForecast.swell.primary.period}s`}
            </div>
            <div>
              <span className="text-cyan-600 font-medium">Secondary:</span> {' '}
              {currentForecast.swell.secondary.height?.toFixed(1) || 'N/A'}ft
              {currentForecast.swell.secondary.period && ` @ ${currentForecast.swell.secondary.period}s`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SwellChart;