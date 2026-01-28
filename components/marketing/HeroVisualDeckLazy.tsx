"use client";

import * as React from "react";
import { Droplets, MapPin, Sparkles } from "lucide-react";

import type { Beach } from "@/components/general/BeachCard";
import { SunDataProvider } from "@/components/context/SunDataContext";
import HeroVisualDeck from "@/components/marketing/HeroVisualDeck";
import type { ForecastData } from "@/lib/supabase";

type Props = {
  previewBeach: Beach;
  previewForecast: ForecastData;
};

function useLiteMode() {
  const [lite, setLite] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mqlReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const mqlUpdate = window.matchMedia?.("(update: slow)");
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean; downlink?: number };
      hardwareConcurrency?: number;
    };

    const saveData = Boolean(nav.connection?.saveData);
    const downlinkSlow = (nav.connection?.downlink ?? 10) <= 1.2;
    const deviceMemoryLow = (nav.deviceMemory ?? 8) <= 4;
    const coresLow = (nav.hardwareConcurrency ?? 8) <= 4;
    const reduced = Boolean(mqlReduced?.matches);
    const slowUpdate = Boolean(mqlUpdate?.matches);

    setLite(saveData || downlinkSlow || deviceMemoryLow || coresLow || reduced || slowUpdate);
  }, []);

  return lite;
}

function LiteHeroCard({ previewBeach, previewForecast }: Props) {
  return (
    <div className="h-full w-full rounded-[32px] border border-border/35 bg-background shadow-even overflow-hidden">
      <div className="flex h-full flex-col justify-between p-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/80 px-3 py-2 text-xs font-semibold text-foreground shadow-sm">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>Forecast at a glance</span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Featured break</p>
            <p className="text-xl font-semibold text-foreground">{previewBeach.name}</p>
            <p className="text-sm text-muted-foreground">{previewBeach.region}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border/40 bg-highlight-7/60 p-3 text-center">
            <Droplets className="mx-auto h-4 w-4 text-cyan-500" aria-hidden="true" />
            <p className="mt-1 text-xs text-muted-foreground">Surf</p>
            <p className="text-sm font-semibold text-foreground">
              {previewForecast.surf.heightMin ?? 0}–{previewForecast.surf.heightMax ?? 0} ft
            </p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-highlight-7/60 p-3 text-center">
            <MapPin className="mx-auto h-4 w-4 text-indigo-500" aria-hidden="true" />
            <p className="mt-1 text-xs text-muted-foreground">Wind</p>
            <p className="text-sm font-semibold text-foreground">
              {previewForecast.conditions.windSpeed ?? 0} mph
            </p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-highlight-7/60 p-3 text-center">
            <Sparkles className="mx-auto h-4 w-4 text-amber-500" aria-hidden="true" />
            <p className="mt-1 text-xs text-muted-foreground">Tide</p>
            <p className="text-sm font-semibold text-foreground">
              {previewForecast.conditions.tideLevel ?? 0} ft
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeroVisualDeckLazy(props: Props) {
  const liteMode = useLiteMode();

  React.useEffect(() => {
    if (!liteMode) return;
    const body = document.body;
    body.dataset.wwLite = "1";
    return () => {
      if (body.dataset.wwLite === "1") {
        delete body.dataset.wwLite;
      }
    };
  }, [liteMode]);

  return (
    <div className="w-full h-[500px] @min-sm:h-[700px] @min-md:h-[760px]">
      {liteMode ? (
        <LiteHeroCard {...props} />
      ) : (
        <SunDataProvider>
          <HeroVisualDeck {...props} />
        </SunDataProvider>
      )}
    </div>
  );
}
