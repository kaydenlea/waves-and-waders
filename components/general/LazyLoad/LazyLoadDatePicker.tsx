"use client";

import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import React from "react";
import { useClientPath } from "@/components/context/PathContext";

const Loading = () => {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [useNativeDragScroll, setUseNativeDragScroll] = React.useState(false);
  const { selectedTab } = useClientPath();

  React.useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    setUseNativeDragScroll(Boolean(el.closest?.("[data-ww-hero-deck]")));
  }, []);

  const forecast = !useNativeDragScroll && selectedTab === "forecast";
  const navButtonClassName = "hidden sm:inline-flex size-9 rounded-full";

  return (
    <div
      ref={rootRef}
      className={cn(
        // Match DatePicker root container to prevent layout shift on load.
        "relative w-full px-2 py-2 rounded-2xl"
      )}
    >
      <div className="w-full flex items-center gap-1">
        {!useNativeDragScroll ? (
          <div
            aria-hidden="true"
            className={cn(
              navButtonClassName,
              "border border-border/30 bg-background/40 shadow-xs",
              "animate-pulse"
            )}
          />
        ) : null}
        <div className="flex-1 overflow-hidden">
          <div className="flex mx-0">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "basis-1/2 @min-[350px]:basis-1/3 @min-md:basis-1/4 @min-xl:basis-1/5 @min-2xl:basis-1/6 @min-3xl:basis-1/7 flex justify-center"
                )}
              >
                <div
                  aria-hidden="true"
                  className={cn(
                    "relative mx-1 my-0.5 flex flex-col items-center w-full py-1.5 text-center text-sm font-medium",
                    forecast ? "rounded-none" : "rounded-md",
                    "shadow-even border-1 border-border/20",
                    "bg-highlight-4/25 animate-pulse"
                  )}
                >
                  <div className="h-3 w-14 rounded bg-highlight-5/60" />
                  <div className="mt-1 h-1 w-12 @min-sm:w-16 rounded-full bg-highlight-5/50" />
                  <div className="mt-1.5 mb-0.5 h-5 w-5 rounded-full bg-highlight-5/50" />
                  <div className="h-4 w-12 rounded bg-highlight-5/60" />
                </div>
              </div>
            ))}
          </div>
        </div>
        {!useNativeDragScroll ? (
          <div
            aria-hidden="true"
            className={cn(
              navButtonClassName,
              "border border-border/30 bg-background/40 shadow-xs",
              "animate-pulse"
            )}
          />
        ) : null}
      </div>
    </div>
  );
};

// Re-export with props passthrough so callers can pass beachId
export const LazyLoadDatePicker = dynamic(() => import("../DatePicker"), {
  ssr: false,
  loading: () => <Loading />,
});
