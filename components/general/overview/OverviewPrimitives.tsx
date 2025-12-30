"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function OverviewCard({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={cn(
        // NOTE: Backdrop blur can cause intermittent paint/flicker issues on some browsers while scrolling.
        // Keep a solid-ish fallback background and only apply blur when supported.
        "group relative rounded-[22px] border border-border/25 bg-highlight-7/70 shadow-even",
        "[--widget-surface:color-mix(in_oklch,var(--highlight-7)_70%,transparent)]",
        "[--widget-header-surface:color-mix(in_oklch,var(--highlight-7)_55%,var(--background-2))]",
        "supports-[backdrop-filter]:bg-highlight-7/40 supports-[backdrop-filter]:backdrop-blur-md",
        "supports-[backdrop-filter]:[--widget-surface:color-mix(in_oklch,var(--highlight-7)_40%,transparent)]",
        "supports-[backdrop-filter]:[--widget-header-surface:color-mix(in_oklch,var(--highlight-7)_45%,var(--background-2))]",
        "transition-shadow duration-200 ease-out motion-reduce:transition-none",
        "hover:z-10 hover:shadow-[0_10px_30px_rgba(0,0,0,0.12)]",
        "dark:hover:shadow-[0_18px_50px_rgba(0,0,0,0.70),0_0_0_1px_rgba(255,255,255,0.08),0_12px_26px_rgba(255,255,255,0.04)]",
        "focus-within:ring-1 focus-within:ring-foreground/10",
        className
      )}
      {...props}
    />
  );
}

export function OverviewCardHeader({
  title,
  icon,
  right,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-3 px-4 pt-4 pb-3",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {icon ? (
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground/5 text-foreground/80 ring-1 ring-border/25">
            {icon}
          </div>
        ) : null}
        <h3 className="min-w-0 text-[0.95rem] font-semibold leading-tight tracking-[-0.01em] truncate">
          {title}
        </h3>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  );
}

export function OverviewPill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border/25 bg-foreground/5 px-2.5 py-1",
        "text-xs font-medium text-muted-foreground whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  );
}

export function OverviewDivider({ className }: { className?: string }) {
  return <hr className={cn("border-border/20", className)} />;
}
