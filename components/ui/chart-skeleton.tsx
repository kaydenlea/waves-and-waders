import React from "react";
import { cn } from "@/lib/utils";

interface ChartSkeletonProps {
  className?: string;
  showControls?: boolean;
  height?: string;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  className,
  showControls = true,
  height = "h-64",
}) => {
  return (
    <div className={cn("w-full space-y-4 animate-pulse", className)}>
      {/* Chart area */}
      <div className={cn("relative w-full bg-muted/50 rounded-lg", height)}>
        {/* Y-axis labels skeleton */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between py-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-3 w-8 bg-muted rounded" />
          ))}
        </div>

        {/* Chart bars/lines skeleton */}
        <div className="absolute left-14 right-4 top-4 bottom-12 flex items-end justify-around gap-1">
          {[...Array(24)].map((_, i) => {
            const randomHeight = Math.random() * 60 + 20; // 20-80% height
            return (
              <div
                key={i}
                className="flex-1 bg-muted rounded-t"
                style={{ height: `${randomHeight}%` }}
              />
            );
          })}
        </div>

        {/* X-axis labels skeleton */}
        <div className="absolute left-14 right-4 bottom-0 h-10 flex justify-between items-center">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-3 w-12 bg-muted rounded" />
          ))}
        </div>
      </div>

      {/* Controls skeleton */}
      {showControls && (
        <div className="flex items-center justify-between px-2">
          <div className="h-8 w-8 bg-muted rounded-md" />
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-8 w-8 bg-muted rounded-md" />
        </div>
      )}
    </div>
  );
};

export const CompactChartSkeleton: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <div className={cn("w-full animate-pulse", className)}>
      <div className="h-32 w-full bg-muted/50 rounded-lg relative overflow-hidden">
        {/* Simple wave pattern */}
        <div className="absolute bottom-0 left-0 right-0 h-20 flex items-end justify-around gap-0.5">
          {[...Array(40)].map((_, i) => {
            const height = Math.sin(i * 0.3) * 30 + 50;
            return (
              <div
                key={i}
                className="flex-1 bg-muted"
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
