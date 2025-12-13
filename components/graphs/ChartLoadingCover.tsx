"use client";

import React from "react";
import { Loader2 } from "lucide-react";
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
        "absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-highlight-5/80 backdrop-blur-sm",
        className
      )}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>{message}...</span>
      </div>
    </div>
  );
};
