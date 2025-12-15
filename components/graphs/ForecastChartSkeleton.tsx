"use client";

import React from "react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * Matches the forecast chart footprint so swapping between skeleton and chart
 * does not shift layout. Used both as a dynamic import fallback and as an
 * overlay while data is loading.
 */
export function ForecastChartSkeleton({ className }: Props) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative h-[300px] w-full overflow-hidden rounded-2xl bg-highlight-5/80",
        "border border-border/30 shadow-even shadow-highlight-7/20",
        "animate-pulse",
        className
      )}
    >
      {/* Day headers */}
      <div className="absolute left-4 right-4 top-3 grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-xl bg-highlight-6/70 px-3 py-2 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="h-3 w-12 rounded bg-highlight-7/80" />
                <div className="h-3 w-16 rounded bg-highlight-7/70" />
              </div>
              <div className="grid grid-cols-[56px_1fr] grid-rows-2 gap-x-2 gap-y-1">
                <div className="h-3 rounded bg-highlight-7/70" />
                <div className="h-3 rounded bg-highlight-7/60" />
                <div className="h-3 rounded bg-highlight-7/70" />
                <div className="h-3 rounded bg-highlight-7/60" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart body */}
      <div className="absolute inset-x-3 bottom-3 top-20 rounded-xl border border-border/40 bg-background/50">
        <div className="absolute inset-0 px-4 pb-6 pt-4">
          <div className="flex h-full items-end gap-1">
            {Array.from({ length: 32 }).map((_, idx) => {
              const wave = Math.sin(idx * 0.35) * 30 + 50;
              const height = Math.min(86, Math.max(18, Math.round(wave)));
              return (
                <div
                  key={idx}
                  className="flex-1 rounded-t-sm bg-highlight-7/70"
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>
        </div>
        <div className="absolute inset-y-4 left-0 right-0 px-4">
          <div className="flex h-full flex-col justify-between">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-px w-full bg-border/60" />
            ))}
          </div>
        </div>
      </div>

      {/* Nav buttons */}
      <div className="absolute left-3 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-highlight-7/60" />
      <div className="absolute right-3 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-highlight-7/60" />
    </div>
  );
}
