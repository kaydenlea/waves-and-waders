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
  hour: number; // Changed from 'time' to 'hour' to match tide chart
  hourLabel: string; // Keep formatted time for display
  primary: number;
  secondary: number;
  tertiary: number;
  primaryPeriod?: number;
  secondaryPeriod?: number;
  tertiaryPeriod?: number;
  primaryDirection?: number;
  secondaryDirection?: number;
  tertiaryDirection?: number;
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

const round1 = (v: number | null | undefined): number => {
  if (v == null || Number.isNaN(v)) return 0;
  return Math.round(v * 10) / 10;
};

const processSwellData = (hourlyData: ForecastData[]): SwellDataPoint[] => {
  if (!hourlyData || hourlyData.length === 0) {
    // Return default/mock data if no real data available
    return [
      { 
        hour: 0, 
        hourLabel: "12:00 AM", 
        primary: 1.2, 
        secondary: 0.6, 
        tertiary: 0.3,
        primaryPeriod: 8.5,
        secondaryPeriod: 6.2,
        tertiaryPeriod: 5.8,
        primaryDirection: 245,
        secondaryDirection: 290,
        tertiaryDirection: 275
      },
      { 
        hour: 3, 
        hourLabel: "3:00 AM", 
        primary: 1.5, 
        secondary: 0.7, 
        tertiary: 0.4,
        primaryPeriod: 9.1,
        secondaryPeriod: 6.8,
        tertiaryPeriod: 6.2,
        primaryDirection: 240,
        secondaryDirection: 285,
        tertiaryDirection: 270
      },
      { 
        hour: 6, 
        hourLabel: "6:00 AM", 
        primary: 1.8, 
        secondary: 0.9, 
        tertiary: 0.7,
        primaryPeriod: 9.7,
        secondaryPeriod: 7.2,
        tertiaryPeriod: 6.8,
        primaryDirection: 235,
        secondaryDirection: 280,
        tertiaryDirection: 265
      },
      { 
        hour: 9, 
        hourLabel: "9:00 AM", 
        primary: 1.4, 
        secondary: 0.8, 
        tertiary: 0.6,
        primaryPeriod: 8.9,
        secondaryPeriod: 6.5,
        tertiaryPeriod: 6.1,
        primaryDirection: 250,
        secondaryDirection: 295,
        tertiaryDirection: 280
      },
      { 
        hour: 12, 
        hourLabel: "12:00 PM", 
        primary: 1.1, 
        secondary: 0.5, 
        tertiary: 0.4,
        primaryPeriod: 8.2,
        secondaryPeriod: 5.8,
        tertiaryPeriod: 5.5,
        primaryDirection: 255,
        secondaryDirection: 300,
        tertiaryDirection: 285
      },
      { 
        hour: 15, 
        hourLabel: "3:00 PM", 
        primary: 1.6, 
        secondary: 0.7, 
        tertiary: 0.6,
        primaryPeriod: 9.3,
        secondaryPeriod: 6.4,
        tertiaryPeriod: 6.0,
        primaryDirection: 248,
        secondaryDirection: 292,
        tertiaryDirection: 277
      },
      { 
        hour: 18, 
        hourLabel: "6:00 PM", 
        primary: 1.9, 
        secondary: 1.0, 
        tertiary: 0.8,
        primaryPeriod: 10.1,
        secondaryPeriod: 7.5,
        tertiaryPeriod: 7.1,
        primaryDirection: 242,
        secondaryDirection: 287,
        tertiaryDirection: 272
      },
      { 
        hour: 21, 
        hourLabel: "9:00 PM", 
        primary: 1.3, 
        secondary: 0.6, 
        tertiary: 0.5,
        primaryPeriod: 8.7,
        secondaryPeriod: 6.1,
        tertiaryPeriod: 5.8,
        primaryDirection: 252,
        secondaryDirection: 297,
        tertiaryDirection: 282
      },
    ];
  }

  return hourlyData.map((forecast) => {
    const date = new Date(forecast.timestamp);
    const hour = date.getHours();
    
    // Get real swell heights from the API data (already in feet from your imperial script)
    const primaryHeight = forecast.swell.primary.height || 0;
    const secondaryHeight = forecast.swell.secondary.height || 0;
    const tertiaryHeight = forecast.swell.tertiary.height || 0; // REAL TERTIARY DATA
    
    // Round periods to nearest tenth using the same helper as other components
    const primaryPeriod = forecast.swell.primary.period 
      ? round1(forecast.swell.primary.period)
      : undefined;
    const secondaryPeriod = forecast.swell.secondary.period 
      ? round1(forecast.swell.secondary.period)
      : undefined;
    const tertiaryPeriod = forecast.swell.tertiary.period 
      ? round1(forecast.swell.tertiary.period)
      : undefined;
    
    return {
      hour: hour,
      hourLabel: formatTime(hour),
      primary: Number(primaryHeight.toFixed(1)),
      secondary: Number(secondaryHeight.toFixed(1)),
      tertiary: Number(tertiaryHeight.toFixed(1)), // REAL TERTIARY HEIGHT
      primaryPeriod: primaryPeriod,
      secondaryPeriod: secondaryPeriod,
      tertiaryPeriod: tertiaryPeriod, // REAL TERTIARY PERIOD
      primaryDirection: forecast.swell.primary.direction,
      secondaryDirection: forecast.swell.secondary.direction,
      tertiaryDirection: forecast.swell.tertiary.direction, // REAL TERTIARY DIRECTION
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

  // Check if there's meaningful tertiary data to show in the legend
  const hasRealTertiaryData = currentForecast?.swell.tertiary.height && currentForecast.swell.tertiary.height > 0;

  return (
    <div className="h-full bg-background border border-border p-2 rounded-md shadow-sm">
      <header className="mx-2 mb-4 mt-2">
        <h3 className="leading-none font-semibold">
          Swell <span className="text-base font-medium">(ft)</span>
        </h3>
        <span className="text-muted-foreground text-sm">
          Showing the swell for the day
          {beach && ` at ${beach.name}`}
          {hasRealTertiaryData && (
            <span className="text-green-600"> • Tertiary swell detected</span>
          )}
        </span>
        
        {/* Current swell info */}
        {currentForecast && (
          <div className="mt-2 text-xs text-muted-foreground">
            Primary: {currentForecast.swell.primary.height?.toFixed(1) || 'N/A'}ft @ {currentForecast.swell.primary.period || 'N/A'}s
            {currentForecast.swell.primary.direction && ` ${getWindDirection(currentForecast.swell.primary.direction)}`}
            {currentForecast.swell.secondary.height && (
              <> • Secondary: {currentForecast.swell.secondary.height.toFixed(1)}ft @ {currentForecast.swell.secondary.period || 'N/A'}s</>
            )}
            {hasRealTertiaryData && (
              <> • Tertiary: {currentForecast.swell.tertiary.height?.toFixed(1)}ft @ {currentForecast.swell.tertiary.period || 'N/A'}s</>
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
          syncId="surfCharts" // SYNC ID - use same ID as tide chart
          syncMethod="value"
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
            dataKey="hour" // Changed from 'time' to 'hour' to match tide chart
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
            tickFormatter={(value) => `${value}ft`}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <ChartTooltip 
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null;
              
              const hour = typeof label === "number" ? label : 0;
              const point = swellData.find(d => d.hour === hour);
              
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="flex flex-col gap-1">
                    <div className="font-medium text-sm">
                      {point?.hourLabel || formatTime(hour)}
                    </div>
                    
                    {payload.map((entry, index) => {
                      const value = entry.value as number;
                      const name = entry.name as string;
                      let label = `${value.toFixed(1)} ft`;
                      
                      // Add period and direction info for all swell components
                      if (name === 'primary' && point?.primaryPeriod) {
                        label += ` @ ${point.primaryPeriod}s`;
                        if (point.primaryDirection) {
                          label += ` ${getWindDirection(point.primaryDirection)}`;
                        }
                      } else if (name === 'secondary' && point?.secondaryPeriod) {
                        label += ` @ ${point.secondaryPeriod}s`;
                        if (point.secondaryDirection) {
                          label += ` ${getWindDirection(point.secondaryDirection)}`;
                        }
                      } else if (name === 'tertiary' && point?.tertiaryPeriod) {
                        label += ` @ ${point.tertiaryPeriod}s`;
                        if (point.tertiaryDirection) {
                          label += ` ${getWindDirection(point.tertiaryDirection)}`;
                        }
                      }
                      
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-sm" 
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-xs">
                            <span className="font-medium capitalize">{name}:</span> {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }}
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
          {/* Only show tertiary area if there's meaningful data */}
          {(hasRealTertiaryData || swellData.some(d => d.tertiary > 0)) && (
            <Area
              type="monotone"
              dataKey="tertiary"
              stackId="1"
              stroke="#70ccebff"
              fill="#adf1ffff"
              fillOpacity={0.6}
            />
          )}
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
          
          {/* Show tertiary info if it exists */}
          {hasRealTertiaryData && (
            <div className="mt-1">
              <span className="text-teal-600 font-medium">Tertiary:</span> {' '}
              {currentForecast.swell.tertiary.height?.toFixed(1)}ft
              {currentForecast.swell.tertiary.period && ` @ ${currentForecast.swell.tertiary.period}s`}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SwellChart;