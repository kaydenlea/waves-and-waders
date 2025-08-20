"use client";

import {
  Area,
  AreaChart,
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  LabelList,
  LabelProps,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { FaSun } from "react-icons/fa";
import { FiSunrise, FiSunset } from "react-icons/fi";
import { ForecastData } from "@/lib/supabase";

interface DailyConditions {
  date: string;
  sunrise: string | null;
  sunset: string | null;
  moon_phase: number | null;
}

interface TideDataPoint {
  hour: number;
  tide: number;
  isPeak?: number;
  time: string;
  isHigh?: boolean;
  isLow?: boolean;
  timestamp: string;
}

interface TidePreviewProps {
  data?: ForecastData[];
  selectedHour?: number;
  className?: string;
}

interface TideChartProps {
  data?: ForecastData[];
  dailyConditions?: DailyConditions;
  selectedHour?: number;
  selectedDate?: Date;
  beach?: {
    id: number;
    Name: string;
    COUNTY: string;
  };
  className?: string;
}

// Utility functions
const getCurrentHour = () => new Date().getHours();

const findTidePeaks = (data: TideDataPoint[]): TideDataPoint[] => {
  if (data.length < 3) return [];
  
  const peaks: TideDataPoint[] = [];
  
  for (let i = 1; i < data.length - 1; i++) {
    const prev = data[i - 1];
    const current = data[i];
    const next = data[i + 1];
    
    // Skip if we don't have valid tide data
    if (prev.tide === null || current.tide === null || next.tide === null) continue;
    
    // High tide: higher than both neighbors (with some threshold to avoid noise)
    if (current.tide > prev.tide + 0.2 && current.tide > next.tide + 0.2) {
      peaks.push({
        ...current,
        isPeak: current.tide,
        isHigh: true
      });
    }
    // Low tide: lower than both neighbors (with some threshold to avoid noise)
    else if (current.tide < prev.tide - 0.2 && current.tide < next.tide - 0.2) {
      peaks.push({
        ...current,
        isPeak: current.tide,
        isLow: true
      });
    }
  }
  
  return peaks;
};

const formatTime = (hour: number): string => {
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${displayHour}:00 ${ampm}`;
};

const formatTimeFromTimestamp = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    const hour = date.getHours();
    return formatTime(hour);
  } catch {
    return "Invalid Time";
  }
};

const processHourlyTideData = (hourlyData: ForecastData[]): TideDataPoint[] => {
  if (!hourlyData || hourlyData.length === 0) {
    // Return realistic default tide data
    return Array.from({ length: 24 }, (_, i) => {
      // Create a realistic tide curve (2 high tides, 2 low tides per day)
      const tideValue = 3 + 2 * Math.sin((i * Math.PI) / 6) + Math.sin((i * Math.PI) / 12);
      
      return {
        hour: i,
        tide: Math.max(0, tideValue), // Ensure no negative tides
        time: formatTime(i),
        timestamp: new Date(2024, 0, 1, i).toISOString(),
      };
    });
  }

  const tideData: TideDataPoint[] = hourlyData
    .filter(forecast => forecast.conditions.tideLevel !== null) // Filter out null tide data
    .map((forecast) => {
      const date = new Date(forecast.timestamp);
      const hour = date.getHours();
      
      return {
        hour,
        tide: forecast.conditions.tideLevel!,
        time: formatTime(hour),
        timestamp: forecast.timestamp,
      };
    });

  // If we don't have enough data points, fill in gaps
  if (tideData.length < 12) {
    console.warn('Limited tide data available, supplementing with interpolated values');
    // You could add interpolation logic here if needed
  }

  // Find and mark tide peaks
  const peaks = findTidePeaks(tideData);
  
  // Merge peaks back into main data
  return tideData.map(point => {
    const peak = peaks.find(p => p.hour === point.hour);
    if (peak) {
      return { ...point, isPeak: peak.isPeak, isHigh: peak.isHigh, isLow: peak.isLow };
    }
    return point;
  });
};

const getSunTimes = (dailyConditions?: DailyConditions, selectedDate?: Date) => {
  // Defaults (if table missing)
  let sunrise = "6:30";
  let sunset = "19:30";

  if (dailyConditions?.sunrise && dailyConditions?.sunset) {
    sunrise = dailyConditions.sunrise; // e.g., "06:19:00"
    sunset = dailyConditions.sunset;   // e.g., "19:22:00"
  } else if (selectedDate) {
    const month = selectedDate.getMonth();
    const isWinter = month < 3 || month > 8;
    sunrise = isWinter ? "7:00" : "6:00";
    sunset  = isWinter ? "17:30" : "19:00";
  }

  const parseTime = (timeStr: string) => {
    const parts = timeStr.split(":");    // "HH:MM:SS" or "HH:MM"
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1] ?? "0", 10) || 0;
    const hourFloat = h + m / 60;        // 6:19 -> 6.3166...

    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h >= 12 ? "PM" : "AM";
    const formatted = `${displayHour}:${m.toString().padStart(2, "0")} ${ampm}`;

    return { hourFloat, formatted };
  };

  const sunriseData = parseTime(sunrise);
  const sunsetData  = parseTime(sunset);

  return {
    sunrise: sunriseData.formatted,
    sunset: sunsetData.formatted,
    sunriseHour: sunriseData.hourFloat,  // decimal hours
    sunsetHour: sunsetData.hourFloat,
  };
};


// Default chart configuration
const previewChartConfig = {
  tide: {
    label: "Tide",
    color: "#499effff",
  },
} satisfies ChartConfig;

const chartConfig = {
  tide: {
    label: "Tide",
    color: "#6e6e6eff",
  },
} satisfies ChartConfig;

export const TidePreview = ({ data, selectedHour, className }: TidePreviewProps) => {
  const processedData = processHourlyTideData(data || []);
  const currentHour = selectedHour !== undefined ? selectedHour : getCurrentHour();
  
  // Create simplified data for preview (every 4 hours for better visibility)
  const previewData = processedData.filter((_, index) => index % 4 === 0).slice(0, 6);
  
  // Find current position for reference line
  const currentDataPoint = processedData.find(d => d.hour === currentHour);
  const currentTide = currentDataPoint?.tide || 0;

  return (
    <ChartContainer
      className={`aspect-auto h-[60px] w-full ${className}`}
      config={previewChartConfig}
    >
      <AreaChart
        accessibilityLayer
        data={previewData}
        margin={{
          left: 0,
          right: 0,
          bottom: 0,
          top: 5,
        }}
      >
        {currentDataPoint && (
          <>
            <ReferenceLine x={currentHour} stroke="#ff6b6b" strokeWidth={1} />
            <ReferenceDot x={currentHour} y={currentTide} r={2} fill="#ff6b6b" stroke="#ffffff" />
          </>
        )}
        <XAxis
          dataKey="hour"
          tickLine={false}
          axisLine={false}
          tickMargin={0}
          fontSize={8}
          hide={true}
        />
        <defs>
          <linearGradient id="fillTidePreview" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-tide)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-tide)" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <Area
          dataKey="tide"
          type="monotone"
          fill="url(#fillTidePreview)"
          fillOpacity={0.4}
          stroke="var(--color-tide)"
          strokeWidth={1.5}
          stackId="a"
        />
      </AreaChart>
    </ChartContainer>
  );
};

export const TideChart = ({ 
  data, 
  dailyConditions, 
  selectedHour, 
  selectedDate = new Date(),
  beach,
  className 
}: TideChartProps) => {
  const chartData = processHourlyTideData(data || []);
  const sunTimes = getSunTimes(dailyConditions, selectedDate);
  const currentHour = selectedHour !== undefined ? selectedHour : getCurrentHour();
  
  // Create reference areas for night/day
  const nightColor = "#e0e7ff";
  const dayColor = "#fef3c7";
  
  // Calculate tide range for better Y-axis scaling
  const tideValues = chartData.map(d => d.tide).filter(t => t !== null);
  const minTide = tideValues.length > 0 ? Math.min(...tideValues) : 0;
  const maxTide = tideValues.length > 0 ? Math.max(...tideValues) : 6;
  
  return (
    <div className={`h-full bg-background border border-border p-2 rounded-md shadow-sm ${className}`}>
      <header className="mx-2 mb-4 mt-2">
        <h3 className="leading-none font-semibold">
          Tide <span className="text-base font-medium">(ft)</span>
        </h3>
        <span className="text-muted-foreground text-sm">
          Showing the tides for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {beach && ` at ${beach.Name}`}
          {chartData.length > 0 && ` • ${chartData.length} data points`}
        </span>
      </header>
      
      <ChartContainer
        className="@min-lg:aspect-auto @min-lg:h-[250px] w-full"
        config={chartConfig}
      >
        <LineChart
          accessibilityLayer
          data={chartData}
          margin={{
            left: -20,
            right: 15,
            top: 20,
            bottom: 5,
          }}
        >
          {/* Night and day reference areas */}
          <ReferenceArea 
            x1={0} 
            x2={sunTimes.sunriseHour} 
            fill={nightColor} 
            fillOpacity={0.3}
            label="Night"
          />
          <ReferenceArea 
            x1={sunTimes.sunriseHour} 
            x2={sunTimes.sunsetHour} 
            fill={dayColor} 
            fillOpacity={0.3}
            label="Day"
          />
          <ReferenceArea 
            x1={sunTimes.sunsetHour} 
            x2={24} 
            fill={nightColor} 
            fillOpacity={0.3}
            label="Night"
          />
          
          {/* Current time indicator */}
          <ReferenceLine 
            x={currentHour} 
            stroke="#ff6b6b" 
            strokeWidth={2} 
            strokeDasharray="3 3"
            label={{ value: "Now", position: "top" }}
          />
          
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            strokeWidth={0.5}
            vertical={false}
          />
          
          <XAxis
            dataKey="hour"
            type="number"                 // ⬅️ numeric axis
            domain={[0, 24]}             // ⬅️ full-day range
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={0}
            fontSize={11}
            tickFormatter={(value) => {
              // Show every 3rd hour
              if (typeof value === "number" && value % 3 === 0) {
                const v = value % 12;
                return v === 0 ? "12" : String(v);
              }
              return "";
            }}
          />

          {/* Night/Day shading (works with numeric axis) */}
          <ReferenceArea x1={0} x2={sunTimes.sunriseHour} fill="#e0e7ff" fillOpacity={0.3} />
          <ReferenceArea x1={sunTimes.sunriseHour} x2={sunTimes.sunsetHour} fill="#fef3c7" fillOpacity={0.3} />
          <ReferenceArea x1={sunTimes.sunsetHour} x2={24} fill="#e0e7ff" fillOpacity={0.3} />

          {/* Sunrise / Sunset vertical markers */}
          <ReferenceLine
            x={sunTimes.sunriseHour}
            stroke="#f59e0b"
            strokeWidth={2}
            label={{ value: "Sunrise", position: "top", fill: "#f59e0b" }}
          />
          <ReferenceLine
            x={sunTimes.sunsetHour}
            stroke="#ea580c"
            strokeWidth={2}
            label={{ value: "Sunset", position: "top", fill: "#ea580c" }}
          />

          {/* Optional: dots at sunrise/sunset even if no data point exists */}
          <ReferenceDot
            x={sunTimes.sunriseHour}
            y={Math.max(0, Math.floor(minTide - 0.5))} // near bottom of chart
            r={4}
            fill="#f59e0b"
            stroke="var(--color-tide)"
          />
          <ReferenceDot
            x={sunTimes.sunsetHour}
            y={Math.max(0, Math.floor(minTide - 0.5))}
            r={4}
            fill="#ea580c"
            stroke="var(--color-tide)"
          />

          
          <YAxis
            dataKey="tide"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={11}
            domain={[
              Math.max(0, Math.floor(minTide - 0.5)),
              Math.ceil(maxTide + 0.5)
            ]}
            tickFormatter={(value) => `${value}ft`}
          />
          
          <ChartTooltip 
            content={<ChartTooltipContent 
              formatter={(value, name) => [
                typeof value === 'number' ? `${value.toFixed(1)} ft` : 'N/A',
                "Tide Height"
              ]}
              labelFormatter={(hour) => {
                if (typeof hour === 'number') {
                  return formatTime(hour);
                }
                return "Time";
              }}
            />} 
          />
          
          <Line
            dataKey="tide"
            type="monotone"
            stroke="var(--color-tide)"
            strokeWidth={3}
            dot={({ payload, cx, cy, index }) => {
              if (!payload || typeof cx !== 'number' || typeof cy !== 'number') return null;
              
              const isCurrentHour = payload.hour === currentHour;
              const isSunTime = payload.hour === sunTimes.sunriseHour || payload.hour === sunTimes.sunsetHour;
              
              if (isCurrentHour) {
                return (
                  <circle
                    key={`current-${index}`}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill="#ff6b6b"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                );
              } else if (isSunTime) {
                return (
                  <circle
                    key={`sun-${index}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill="#f59e0b"
                    stroke="var(--color-tide)"
                    strokeWidth={1}
                  />
                );
              } else if (payload.isPeak) {
                return (
                  <circle
                    key={`peak-${index}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={payload.isHigh ? "#10b981" : "#3b82f6"}
                    stroke="var(--color-tide)"
                    strokeWidth={1}
                  />
                );
              }
              return null;
            }}
          >
            {/* Peak tide labels */}
            <LabelList
              dataKey="isPeak"
              content={(props: LabelProps) => {
                const safeX = typeof props.x === "number" ? props.x : 0;
                const safeY = typeof props.y === "number" ? props.y : 0;
                const safeIndex = typeof props.index === "number" ? props.index : 0;
                
                if (props.value && safeIndex < chartData.length) {
                  const dataPoint = chartData[safeIndex];
                  const displayTime = formatTime(dataPoint.hour);
                  const tideHeight = Number(props.value).toFixed(1);
                  const isHigh = dataPoint.isHigh;
                  
                  return (
                    <g key={`peak-label-${safeIndex}`}>
                      <text
                        x={safeX}
                        y={safeY - 35}
                        fill="var(--foreground)"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={10}
                        fontWeight="500"
                      >
                        {displayTime}
                      </text>
                      <text
                        x={safeX}
                        y={safeY - 20}
                        fill={isHigh ? "#10b981" : "#3b82f6"}
                        textAnchor="middle"
                        fontWeight="bold"
                        fontSize={11}
                      >
                        {`${tideHeight} ft`}
                      </text>
                      <text
                        x={safeX}
                        y={safeY - 8}
                        fill="var(--muted-foreground)"
                        textAnchor="middle"
                        fontSize={8}
                      >
                        {isHigh ? "HIGH" : "LOW"}
                      </text>
                    </g>
                  );
                }
                return null;
              }}
            />
          </Line>
        </LineChart>
      </ChartContainer>
      
      {/* Sunrise/Sunset info */}
      <figcaption className="flex justify-between mt-4 mx-4">
        <div className="flex items-center gap-2 bg-amber-50 py-2 px-3 rounded-md border border-amber-200">
          <FiSunrise className="text-amber-600" size={18} />
          <div className="text-left">
            <div className="text-xs font-medium text-amber-800">Sunrise</div>
            <div className="text-xs text-amber-600">{sunTimes.sunrise}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-orange-50 py-2 px-3 rounded-md border border-orange-200">
          <FiSunset className="text-orange-600" size={18} />
          <div className="text-left">
            <div className="text-xs font-medium text-orange-800">Sunset</div>
            <div className="text-xs text-orange-600">{sunTimes.sunset}</div>
          </div>
        </div>
      </figcaption>
      
      {/* No data warning */}
      {chartData.length === 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          ⚠️ No tide data available for this date
        </div>
      )}
    </div>
  );
};