"use client";

import * as React from "react";
import { ChevronRight, MapPinned } from "lucide-react";

import { cn } from "@/lib/utils";

export type PeekingSideTabProps = {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  label?: string;
  ariaLabel?: string;
  title?: string;
  className?: string;
};

export default function PeekingSideTab({
  onClick,
  label = "Map",
  ariaLabel = "Show map",
  title = "Show map",
  className,
}: PeekingSideTabProps) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed left-0 top-[42%] sm:top-3/4 -translate-y-3/4 z-[60]",
        className
      )}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        title={title}
        onClick={onClick}
        className={cn(
          "group pointer-events-auto relative flex items-center gap-2",
          "h-14 pl-5 pr-2",
          "rounded-r-2xl",
          "border border-border/40 bg-highlight-7 text-foreground",
          "supports-[backdrop-filter]:bg-highlight-7 supports-[backdrop-filter]:backdrop-blur-md",
          "shadow-xl ring-1 ring-foreground/15",
          "transition-transform duration-200 ease-out motion-reduce:transition-none will-change-transform",
          "-translate-x-[55px] hover:translate-x-0 focus-visible:translate-x-0 active:translate-x-0 active:scale-[0.98]",
          "hover:bg-highlight-3",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:ring-offset-0"
        )}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-r-3xl bg-gradient-to-r from-foreground/5 to-transparent"
        />
        {/* <span
          aria-hidden="true"
          className="relative grid h-9 w-9 place-items-center"
        >
          <MapPinned className="h-5 w-5" />
        </span> */}
        <span className=" -ml-2 relative text-sm font-medium tracking-wide whitespace-nowrap opacity-0 translate-x-1 transition-all duration-200 ease-out motion-reduce:transition-none group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0">
          {label}
        </span>
        <span
          aria-hidden="true"
          className="relative h-5 w-px bg-foreground/15 opacity-0 transition-opacity duration-200 motion-reduce:transition-none group-hover:opacity-100 group-focus-visible:opacity-100"
        />
        {/* <ChevronRight
          aria-hidden="true"
          className="relative h-4.5 w-4.5 opacity-80"
        /> */}
        <MapPinned
          aria-hidden="true"
          className="relative h-4.5 w-4.5 opacity-80"
        />
      </button>
    </div>
  );
}
