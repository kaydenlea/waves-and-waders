"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function LoadingBar({ isLoading }: { isLoading: boolean }) {
  return (
    <div 
      className={cn(
        "fixed top-0 left-0 right-0 h-1 bg-blue-500 z-50 transition-all duration-300",
        isLoading ? "opacity-100" : "opacity-0"
      )}
      style={{
        transform: isLoading ? "scaleX(1)" : "scaleX(0)",
        transformOrigin: "left",
      }}
    >
      <div 
        className="h-full bg-blue-400 animate-pulse"
        style={{
          animation: isLoading ? "loading-shimmer 1.5s ease-in-out infinite" : "none",
        }}
      />
    </div>
  );
}
