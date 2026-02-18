"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  Sunrise,
  Sunset,
  Waves,
  Droplets,
  Wind,
  Shell,
  Atom,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { ChartLegendItem } from "@/components/graphs/ChartLegendPopover";

const iconClass = "h-4 w-4 text-muted-foreground";

export type ChartLegendKey = "tide" | "surf" | "wind" | "swell" | "energy";

function formatRange(value: number) {
  if (!Number.isFinite(value)) return "--";
  const rounded = Math.round(value * 10) / 10;
  return rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1);
}

function buildEnergyIntensityItems(range?: { min: number; max: number }): ChartLegendItem[] {
  if (
    !range ||
    !Number.isFinite(range.min) ||
    !Number.isFinite(range.max) ||
    range.max <= range.min
  ) {
    return [
      {
        label: "Intensity (relative)",
        description: "Higher kJ/m² means more powerful wave energy.",
        marker: (
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-[3px] bg-foreground/15"
          />
        ),
      },
    ];
  }

  const min = Math.max(0, range.min);
  const max = Math.max(min, range.max);
  const span = Math.max(0.001, max - min);
  const a = min;
  const b = min + span / 3;
  const c = min + (2 * span) / 3;
  const d = max;

  const marker = (shade: string) => (
    <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-[3px]", shade)} />
  );

  return [
    {
      label: `Low (${formatRange(a)}–${formatRange(b)} kJ/m²)`,
      marker: marker("bg-foreground/10"),
    },
    {
      label: `Moderate (${formatRange(b)}–${formatRange(c)} kJ/m²)`,
      marker: marker("bg-foreground/20"),
    },
    {
      label: `High (${formatRange(c)}–${formatRange(d)} kJ/m²)`,
      marker: marker("bg-foreground/30"),
      description: "Ranges are based on the visible window for this chart.",
    },
  ];
}

export const CHART_LEGENDS: Record<
  ChartLegendKey,
  { title: string; items: ChartLegendItem[] }
> = {
  tide: {
    title: "Tide",
    items: [
      {
        label: "Tide height (ft)",
        marker: <Waves className={iconClass} aria-hidden="true" />,
        description: "The line shows the tidal height over time.",
      },
      {
        label: "High tide",
        marker: (
          <ArrowUp
            className="h-4 w-4 text-emerald-500/80 stroke-4"
            aria-hidden="true"
          />
        ),
        description: "Peaks are labeled with an up-arrow marker.",
      },
      {
        label: "Low tide",
        marker: (
          <ArrowDown
            className="h-4 w-4 text-rose-500/80 stroke-4"
            aria-hidden="true"
          />
        ),
        description: "Troughs are labeled with a down-arrow marker.",
      },
      {
        label: "Sunrise",
        marker: (
          <Sunrise
            className="h-4 w-4 fill-amber-500/80 stroke-muted-foreground"
            aria-hidden="true"
          />
        ),
      },
      {
        label: "Sunset",
        marker: (
          <Sunset
            className="h-4 w-4 fill-amber-500/80 stroke-muted-foreground"
            aria-hidden="true"
          />
        ),
      },
    ],
  },
  surf: {
    title: "Surf",
    items: [
      {
        label: "0–1.5 ft",
        color: "#b8d9ffff",
        description: "Light shading indicates smaller surf.",
      },
      { label: "1.5–3 ft", color: "#9ccaffff" },
      { label: "3–5 ft", color: "#86bbffff" },
      {
        label: "5+ ft",
        color: "#74b0ffff",
        description: "Darker shading indicates larger surf.",
      },
    ],
  },
  wind: {
    title: "Wind",
    items: [
      {
        label: "0–10 mph",
        color: "#b8d9ffff",
        description: "Light shading indicates lighter wind.",
      },
      { label: "10–15 mph", color: "#9ccaffff" },
      { label: "15–20 mph", color: "#86bbffff" },
      {
        label: "20+ mph",
        color: "#74b0ffff",
        description: "Darker shading indicates stronger wind.",
      },
    ],
  },
  swell: {
    title: "Swell",
    items: [
      {
        label: "Primary swell",
        color: "#0077b6",
        description: "Dominant swell component.",
      },
      { label: "Secondary swell", color: "#48cae4" },
      { label: "Tertiary swell", color: "#adf1ffff" },
    ],
  },
  energy: {
    title: "Energy",
    items: [
      {
        label: "Wave energy (kJ/m²)",
        marker: <Atom className={iconClass} aria-hidden="true" />,
        description: "Higher values generally mean more powerful wave energy.",
      },
      {
        label: "Trend colors (rising vs dropping)",
        marker: (
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-[3px]"
            style={{
              backgroundImage:
                "linear-gradient(90deg, var(--energy-fill-inc), var(--energy-fill-dec))",
            }}
          />
        ),
      },
    ],
  },
};

export function getChartLegend(
  key: ChartLegendKey,
  options?: { energyRange?: { min: number; max: number } },
) {
  if (key !== "energy") return CHART_LEGENDS[key];

  const base = CHART_LEGENDS.energy;
  const intensity = buildEnergyIntensityItems(options?.energyRange);
  const header = base.items[0];
  const tail = base.items.slice(1);
  return { ...base, items: [...(header ? [header] : []), ...intensity, ...tail] };
}
