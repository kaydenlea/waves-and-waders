"use client";

import React from "react";
import {
  Atom,
  ChartNoAxesCombined,
  CircleGauge,
  Droplets,
  Eye,
  EyeOff,
  MapPin,
  MoonStar,
  Shell,
  Sun,
  Waves,
  Wind,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useDateContext } from "@/components/context/DateContext";
import { ChartLoadingCover } from "@/components/graphs/ChartLoadingCover";
import {
  OverviewCard,
  OverviewCardHeader,
  OverviewPill,
} from "./OverviewPrimitives";

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
  extraPadding?: boolean;
  headerContent?: React.ReactNode;
  loading?: boolean;
};

export default function OverviewWidget({
  children,
  label,
  unit,
  extraPadding,
  headerContent,
  loading,
}: Props) {
  const { showSecondarySwells, setShowSecondarySwells } = useDateContext();
  const lowerCaseLabel = label.toLowerCase();

  const icon = iconMap[lowerCaseLabel] ?? <CircleGauge className="h-4 w-4" />;
  const showInlineUnit = Boolean(
    unit && (headerContent == null || label === "Daily")
  );

  const SwellToggle = () => (
    <button
      type="button"
      aria-label={`${showSecondarySwells ? "Hide" : "Show"} secondary swells`}
      onClick={() => setShowSecondarySwells(!showSecondarySwells)}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/25 bg-foreground/5 px-3 py-2",
        "text-xs font-medium text-muted-foreground",
        "transition-colors duration-200 motion-reduce:transition-none",
        "hover:bg-foreground/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:ring-offset-0"
      )}
    >
      {showSecondarySwells ? (
        <>
          <Eye className="h-4 w-4 text-foreground/70" />
          <span className="whitespace-nowrap">
            <span className="hidden @min-[290px]:inline">Extra</span> Swells
          </span>
        </>
      ) : (
        <>
          <EyeOff className="h-4 w-4 text-foreground/70" />
          <span className="whitespace-nowrap">
            <span className="hidden @min-[290px]:inline">Extra</span> Swells
          </span>
        </>
      )}
    </button>
  );

  return (
    <figure className="relative flex-1">
      <OverviewCard className="h-full w-full">
        <OverviewCardHeader
          title={label}
          icon={icon}
          right={
            <div className="flex items-center gap-2">
              {label === "Daily" ? <SwellToggle /> : null}
              {headerContent ??
                (showInlineUnit ? (
                  <OverviewPill className="hidden @min-xs:inline-flex">
                    {unit}
                  </OverviewPill>
                ) : null)}
              {headerContent == null && showInlineUnit && label !== "Daily" ? (
                <OverviewPill className="@min-xs:hidden">{unit}</OverviewPill>
              ) : null}
            </div>
          }
        />

        <div
          className={cn(
            "px-4 pb-4 touch-pan-y relative",
            extraPadding && "px-5"
          )}
        >
          <div className="relative">
            <ChartLoadingCover
              show={Boolean(loading)}
              message={`Loading ${label.toLowerCase()} data`}
              className="rounded-[18px]"
            />
            <div
              className={cn(
                "transition-opacity duration-200 motion-reduce:transition-none",
                loading && "opacity-0 pointer-events-none"
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
