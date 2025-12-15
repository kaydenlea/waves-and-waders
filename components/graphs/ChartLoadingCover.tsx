"use client";

import React from "react";
import { cn } from "@/lib/utils";

type ChartLoadingCoverProps = {
  show: boolean;
  message?: string;
  className?: string;
};

export const ChartLoadingCover: React.FC<ChartLoadingCoverProps> = ({
  show,
  message = "Loading chart",
  className,
}) => {
  if (!show) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex items-center justify-center rounded-2xl border border-border/60 bg-background/80 backdrop-blur-sm",
        className
      )}
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="absolute inset-0 rounded-2xl bg-gradient-to-b from-background/60 via-background/40 to-background/70 opacity-80 motion-safe:animate-pulse"
        aria-hidden="true"
      />
      <div className="relative flex flex-col items-center gap-2 text-sm font-medium text-muted-foreground">
        <div className="flex items-center gap-1" aria-hidden="true">
          {[0, 120, 240].map((delay) => (
            <span
              key={delay}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
        <span className="text-xs sm:text-sm">{message}...</span>
      </div>
    </div>
  );
};
