"use client";

import React from "react";
import {
  Atom,
  ChartNoAxesCombined,
  CircleGauge,
  ClockFading,
  Droplets,
  MapPin,
  MoonStar,
  Shell,
  Sun,
  Waves,
  Wind,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ChartLoadingCover } from "@/components/graphs/ChartLoadingCover";
import { OverviewCard, OverviewCardHeader } from "./OverviewPrimitives";

const iconMap: Record<string, React.ReactNode> = {
  map: <MapPin className="h-4 w-4" />,
  wind: <Wind className="h-4 w-4" />,
  surf: <Droplets className="h-4 w-4" />,
  weather: <Sun className="h-4 w-4" />,
  moon: <MoonStar className="h-4 w-4" />,
  daily: <ChartNoAxesCombined className="h-4 w-4" />,
  swell: <Shell className="h-4 w-4" />,
  tide: <Waves className="h-4 w-4" />,
  energy: <Atom className="h-4 w-4" />,
};

type Props = {
  children: React.ReactNode;
  label: string;
  unit?: string;
  onUnitClick?: () => void;
  unitAriaLabel?: string;
  unitDisabled?: boolean;
  extraPadding?: boolean;
  headerContent?: React.ReactNode;
  loading?: boolean;
};

export default function OverviewWidget({
  children,
  label,
  unit,
  onUnitClick,
  unitAriaLabel,
  unitDisabled,
  extraPadding,
  headerContent,
  loading,
}: Props) {
  const effectiveLoading = Boolean(loading);
  const lowerCaseLabel = label.toLowerCase();

  const icon = iconMap[lowerCaseLabel] ?? <CircleGauge className="h-4 w-4" />;
  const showInlineUnit = Boolean(
    unit && (headerContent == null || label === "Daily")
  );
  const unitIsToggle = Boolean(unit && onUnitClick);
  const unitPrimaryClassName =
    label === "Daily" ? "inline-flex" : "hidden @min-xs:inline-flex";

  const UnitPill = ({ className }: { className?: string }) => {
    if (!unit) return null;
    if (!unitIsToggle) {
      return (
        <span
          className={cn(
            "inline-flex items-center rounded-full border border-border/25 bg-foreground/5 px-2.5 py-1",
            "text-xs font-medium text-muted-foreground whitespace-nowrap tabular-nums",
            className
          )}
        >
          {unit}
        </span>
      );
    }

    if (unitDisabled) {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-border/25 bg-foreground/5 px-3 py-2",
            "text-xs font-medium text-muted-foreground whitespace-nowrap opacity-70",
            className
          )}
        >
          <ClockFading
            aria-hidden="true"
            className="h-4 w-4 text-foreground/60"
          />
          <span>{unit}</span>
        </span>
      );
    }

    return (
      <button
        type="button"
        aria-label={unitAriaLabel ?? `Toggle ${label} interval`}
        onClick={onUnitClick}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-border/25 bg-foreground/5 px-3 py-2",
          "text-xs font-medium text-muted-foreground whitespace-nowrap",
          "transition-colors duration-200 motion-reduce:transition-none",
          "hover:bg-foreground/10",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:ring-offset-0",
          className
        )}
      >
        <ClockFading
          aria-hidden="true"
          className="h-4 w-4 text-foreground/70"
        />
        <span>{unit}</span>
      </button>
    );
  };

  return (
    <figure className="relative flex-1">
      <OverviewCard className="h-full w-full">
        <OverviewCardHeader
          title={label}
          icon={icon}
          right={
            unit || headerContent ? (
              <div className="relative">
                <div className={cn(effectiveLoading && "opacity-0")}>
                  <div className="flex items-center gap-2">
                    {headerContent ??
                      (showInlineUnit ? (
                        <UnitPill className={unitPrimaryClassName} />
                      ) : null)}
                    {headerContent == null &&
                    showInlineUnit &&
                    label !== "Daily" ? (
                      <UnitPill className="@min-xs:hidden" />
                    ) : null}
                  </div>
                </div>
                {effectiveLoading ? (
                  <div
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute inset-0 rounded-xl bg-highlight-5/40",
                      "animate-pulse motion-reduce:animate-none"
                    )}
                  />
                ) : null}
              </div>
            ) : null
          }
        />

        <div
          className={cn(
            "px-4 touch-pan-y relative",
            label !== "Daily"
              ? extraPadding
                ? "px-5 pb-[24px]"
                : "pb-[22px]"
              : "pb-[18px]"
          )}
        >
          <div className="relative">
            <ChartLoadingCover
              show={effectiveLoading}
              message={`Loading ${label.toLowerCase()} data`}
              className="rounded-[18px]"
            />
            <div
              className={cn(
                effectiveLoading
                  ? "opacity-0 pointer-events-none"
                  : "opacity-100 transition-opacity duration-200 motion-reduce:transition-none"
              )}
            >
              {children}
            </div>
          </div>
        </div>
      </OverviewCard>
    </figure>
  );
}
