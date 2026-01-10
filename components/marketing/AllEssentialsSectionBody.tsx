"use client";

import Link from "next/link";
import { BarChart3, Layers, ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";

import TimeRail from "@/components/general/TimeRail";
import {
  DashboardWidgetHeaderMiniature,
  DashboardWidgetMiniature,
  getDashboardWidgetIcon,
} from "@/components/general/dashboardMiniatures";
import {
  getDefaultMeta,
  type DashboardType,
  type WidgetId,
} from "@/components/general/dashboardLayout";
import { SwellRings, WindRing } from "@/components/visuals/DirectionRings";
import { cn } from "@/lib/utils";

const PREVIEW_BEACH_ID = "000b44bb-e4b7-452b-b28b-dd596d202cdf";

export default function AllEssentialsSectionBody() {
  const dashboardType: DashboardType = "forecast";
  const meta = getDefaultMeta(dashboardType);
  const widgetIds: WidgetId[] = ["swell", "wind", "tide", "table"];

  return (
    <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      <div
        className="ww-reveal md:col-span-2 lg:col-span-2"
        style={{ "--delay": "60ms" } as CSSProperties}
      >
        <div className="overflow-hidden rounded-3xl border border-border/30 bg-background/40 shadow-xs dark:border-border/45 dark:bg-highlight-5/40">
          <div className="border-b border-border/25 bg-background/50 px-5 py-4 backdrop-blur dark:border-border/35 dark:bg-highlight-5/45">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-tight text-foreground/90">
                  Real forecast UI
                </p>
                <p className="mt-0.5 text-sm text-foreground/65 dark:text-foreground/75">
                  The same controls and widgets used on forecast pages.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
                <Link
                  href="/overview"
                  className={cn(
                    "inline-flex items-center justify-center rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-sm",
                    "transition-colors motion-reduce:transition-none hover:opacity-95",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                  )}
                >
                  Open forecast
                </Link>
                <Link
                  href="/beaches?tab=nearby"
                  className={cn(
                    "inline-flex items-center justify-center rounded-full border border-border/40 bg-highlight-1 px-4 py-2 text-sm font-medium text-foreground/90 shadow-sm backdrop-blur",
                    "transition-colors motion-reduce:transition-none hover:bg-highlight-3",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                  )}
                >
                  Explore beaches
                </Link>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="rounded-2xl border border-border/25 bg-background/55 p-3 shadow-sm dark:border-border/35 dark:bg-highlight-5/45">
              <div aria-hidden className="pointer-events-none select-none">
                <TimeRail beachId={PREVIEW_BEACH_ID} size="md" />
              </div>
              <p className="mt-2 text-xs text-foreground/60 dark:text-foreground/75">
                Choose a date + hour in the full forecast view.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {widgetIds.map((widgetId) => {
                const title = meta[widgetId]?.title ?? widgetId;
                const showHeader = widgetId === "table" || widgetId === "stats";

                return (
                  <article
                    key={widgetId}
                    className="flex h-[13rem] flex-col rounded-2xl border border-border bg-background p-4 shadow-sm ring-1 ring-black/5 dark:bg-highlight-5/50"
                  >
                    <header className="flex items-center gap-2">
                      {getDashboardWidgetIcon(widgetId)}
                      <h3 className="text-sm font-semibold min-w-0 flex-1 truncate text-foreground">
                        {title}
                      </h3>
                      {showHeader ? (
                        <div className="ml-auto flex items-center gap-2">
                          <DashboardWidgetHeaderMiniature widgetId={widgetId} />
                        </div>
                      ) : null}
                    </header>
                    <div className="mt-3 flex-1 min-h-0 overflow-hidden text-sm text-gray-700 dark:text-gray-200">
                      <div className="h-full w-full pointer-events-none select-none">
                        <DashboardWidgetMiniature
                          dashboardType={dashboardType}
                          widgetId={widgetId}
                          isFull={false}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div
        className="ww-reveal"
        style={{ "--delay": "120ms" } as CSSProperties}
      >
        <div className="h-full rounded-3xl border border-border/30 bg-background/40 p-5 shadow-xs dark:border-border/45 dark:bg-highlight-5/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                Direction rings
              </h3>
              <p className="mt-1 text-sm text-foreground/65 dark:text-foreground/75">
                Wind and swell direction, right on the map.
              </p>
            </div>
            <span
              aria-hidden
              className="grid size-9 place-items-center rounded-full bg-foreground/5 text-foreground/70 ring-1 ring-border/25 dark:bg-highlight-4/60 dark:text-foreground/90"
            >
              <Layers className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 place-items-center gap-2">
            <div aria-hidden className="flex flex-col items-center">
              <SwellRings
                variant="preview"
                scale={0.62}
                directions={{ primary: 310, secondary: 265, tertiary: 220 }}
              />
              <p className="mt-1 text-xs font-medium text-foreground/70 dark:text-foreground/85">
                Swell
              </p>
            </div>
            <div aria-hidden className="flex flex-col items-center">
              <WindRing variant="preview" scale={0.62} direction={45} />
              <p className="mt-1 text-xs font-medium text-foreground/70 dark:text-foreground/85">
                Wind
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        className="ww-reveal"
        style={{ "--delay": "180ms" } as CSSProperties}
      >
        <div className="h-full rounded-3xl border border-border/30 bg-background/40 p-5 shadow-xs dark:border-border/45 dark:bg-highlight-5/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                Charts you can scan
              </h3>
              <p className="mt-1 text-sm text-foreground/65 dark:text-foreground/75">
                Quick trends without digging through tables.
              </p>
            </div>
            <span
              aria-hidden
              className="grid size-9 place-items-center rounded-full bg-foreground/5 text-foreground/70 ring-1 ring-border/25 dark:bg-highlight-4/60 dark:text-foreground/90"
            >
              <BarChart3 className="h-4 w-4" />
            </span>
          </div>

          <div
            aria-hidden
            className="mt-4 aspect-[16/10] overflow-hidden rounded-2xl border border-border/25 bg-background/55 p-3 shadow-sm dark:border-border/35 dark:bg-highlight-5/45"
          >
            <div className="h-full w-full pointer-events-none select-none">
              <DashboardWidgetMiniature
                dashboardType={dashboardType}
                widgetId="swell"
                isFull={true}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className="ww-reveal"
        style={{ "--delay": "240ms" } as CSSProperties}
      >
        <div className="h-full rounded-3xl border border-border/30 bg-background/40 p-5 shadow-xs dark:border-border/45 dark:bg-highlight-5/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                Powered by NOAA data
              </h3>
              <p className="mt-1 text-sm text-foreground/65 dark:text-foreground/75">
                Forecast grids and tide stations from NOAA.
              </p>
            </div>
            <span
              aria-hidden
              className="grid size-9 place-items-center rounded-full bg-foreground/5 text-foreground/70 ring-1 ring-border/25 dark:bg-highlight-4/60 dark:text-foreground/90"
            >
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="https://www.noaa.gov/"
              target="_blank"
              rel="noreferrer"
              className={cn(
                "inline-flex items-center rounded-full border border-border/25 bg-foreground/5 px-3 py-2 text-sm font-medium text-foreground/80 shadow-sm",
                "transition-colors motion-reduce:transition-none hover:bg-highlight-5/50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15",
                "dark:bg-highlight-4/60 dark:border-border/35 dark:text-foreground/90"
              )}
            >
              NOAA model grids
            </a>
            <a
              href="https://tidesandcurrents.noaa.gov/"
              target="_blank"
              rel="noreferrer"
              className={cn(
                "inline-flex items-center rounded-full border border-border/25 bg-foreground/5 px-3 py-2 text-sm font-medium text-foreground/80 shadow-sm",
                "transition-colors motion-reduce:transition-none hover:bg-highlight-5/50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15",
                "dark:bg-highlight-4/60 dark:border-border/35 dark:text-foreground/90"
              )}
            >
              NOAA tide stations
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

