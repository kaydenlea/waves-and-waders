"use client";

import * as React from "react";

import BackButton from "@/components/general/BackButton";
import BottomNav from "@/components/general/BottomNav";
import DateSummaryBridge from "@/components/general/DateSummaryBridge";
import Footer from "@/components/general/Footer";
import { LazyLoadMap } from "@/components/general/LazyLoad/LazyLoadMap";
import PathStyleWrapper from "@/components/general/PathStyleWrapper";
import SaveButton from "@/components/general/SaveButton";
import Breadcrumbs from "@/components/general/Breadcrumbs";
import { SunDataProvider } from "@/components/context/SunDataContext";
import { useOptionalDashboardEditMode } from "@/components/context/DashboardEditModeContext";
import { OverviewPageBusyProvider } from "@/components/context/OverviewPageBusyContext";
import { OverviewChartsLoadingProvider } from "@/components/context/OverviewChartsLoadingContext";
import type { BeachPoint } from "@/components/context/MapFilterContext";
import type {
  Row,
  WidgetId,
  WidgetMeta,
} from "@/components/general/dashboardLayout";

type Props = {
  beachId: string;
  beachParam: string;
  beachName: string;
  loggedIn: boolean;
  isFavorite: boolean;
  initialStatTableDensity?: "3h" | "12h" | null;
  initialForecastTableDensity?: "3h" | "12h" | null;
  initialForecastViewMode?: "all" | "single" | null;
  seoSummary?: {
    updatedAt: string | null;
    surfHeight: string | null;
    windSpeed: number | null;
    windDirection: number | null;
    waterTemp: number | null;
    county: string | null;
    features: string[];
  };
  initialBeach?: BeachPoint | null;
  initialOverviewMeta: Partial<Record<WidgetId, WidgetMeta>>;
  initialOverviewRows: Row[];
  initialForecastMeta: Partial<Record<WidgetId, WidgetMeta>>;
  initialForecastRows: Row[];
  navBar?: React.ReactNode;
};

const getWindDirectionLabel = (degrees: number | null) => {
  if (degrees == null || !Number.isFinite(degrees)) return null;
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index] ?? null;
};

const formatPacificDateTime = (iso: string | null) => {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(dt);
  } catch {
    return dt.toISOString();
  }
};

export default function OverviewPageClient({
  beachId,
  beachParam,
  beachName,
  loggedIn,
  isFavorite,
  initialStatTableDensity = null,
  initialForecastTableDensity = null,
  initialForecastViewMode = null,
  seoSummary,
  initialBeach,
  initialOverviewMeta,
  initialOverviewRows,
  initialForecastMeta,
  initialForecastRows,
  navBar,
}: Props) {
  const dashboardEdit = useOptionalDashboardEditMode();
  const noop = React.useCallback(() => {}, []);
  const isEditing = dashboardEdit?.isEditing ?? false;
  const pendingScrollToId = dashboardEdit?.pendingScrollToId ?? null;
  const clearPendingScrollTo = dashboardEdit?.clearPendingScrollTo ?? noop;

  const [beachesHref, setBeachesHref] = React.useState("/beaches");

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.sessionStorage.getItem("ww:beaches:return");
      if (stored && (stored === "/beaches" || stored.startsWith("/beaches?") || stored === "/beaches/all")) {
        setBeachesHref(stored);
        return;
      }

      const ref = document.referrer;
      if (!ref) return;
      const url = new URL(ref);
      if (url.pathname === "/beaches/all") {
        setBeachesHref(`${url.pathname}${url.search ?? ""}`);
      } else if (url.pathname === "/beaches") {
        setBeachesHref(`${url.pathname}${url.search ?? ""}`);
      }
    } catch {
      // ignore
    }
  }, []);

  React.useLayoutEffect(() => {
    if (isEditing || !pendingScrollToId) return;

    const el = document.getElementById(pendingScrollToId);
    if (el) {
      el.scrollIntoView({ block: "start" });
      const url = new URL(window.location.href);
      url.hash = pendingScrollToId;
      history.replaceState(null, "", url.toString());
    }

    clearPendingScrollTo();
  }, [isEditing, pendingScrollToId, clearPendingScrollTo]);

  const updatedAtLabel = formatPacificDateTime(seoSummary?.updatedAt ?? null);
  const windDirLabel = getWindDirectionLabel(seoSummary?.windDirection ?? null);
  const visibleFeatures = (seoSummary?.features ?? []).slice(0, 6);

  return (
    <>
      <div>
        {navBar}
        <OverviewPageBusyProvider>
          <main
            id="main-content"
            className="ww-stable-viewport touch-pan-y overscroll-y-none bg-background-2 min-h-[calc(var(--ww-100vh,100vh)+env(safe-area-inset-top,0px)-4rem)] @min-4xl:flex @min-4xl:flex-1 @min-4xl:mt-[5.5rem] @min-4xl:pb-4"
          >
            <LazyLoadMap
              beachId={beachId}
              initialBeach={initialBeach ?? undefined}
            />
            <PathStyleWrapper>
              <div className="@container pb-6 @min-4xl:pb-3 pt-2 @min-4xl:pt-8 px-1 @min-md:px-3">
                <header
                  id="overview-header"
                  className="relative w-full flex flex-col gap-5 px-2 pt-3 @min-md:pt-4 pb-0 scroll-mt-30"
                >
                  <Breadcrumbs
                    items={[
                      { label: "Beaches", href: beachesHref },
                      {
                        label: beachName,
                        href: `/${beachParam}/overview`,
                      },
                    ]}
                  />
                  <div className="flex items-center gap-3">
                    <h1 className="pb-0.5 font-semibold text-3xl @min-md:text-4xl tracking-tight w-full whitespace-nowrap truncate">
                      {beachName}
                    </h1>
                    <div className="ml-auto flex items-center gap-2 shrink-0">
                      <BackButton loggedIn={loggedIn} />
                      <SaveButton beachId={beachId} initialIsFav={isFavorite} />
                    </div>
                  </div>

                  {seoSummary ? (
                    <section
                      aria-label="Surf forecast summary"
                      className="sr-only rounded-2xl border border-border/40 bg-background/40 p-3 text-sm text-muted-foreground shadow-xs supports-[backdrop-filter]:bg-background/30 supports-[backdrop-filter]:backdrop-blur"
                    >
                      <p className="text-foreground/80">
                        {seoSummary.county ? (
                          <>
                            <span className="font-semibold text-foreground">
                              {seoSummary.county}
                            </span>{" "}
                            surf forecast summary
                          </>
                        ) : (
                          <span className="font-semibold text-foreground">
                            Surf forecast summary
                          </span>
                        )}
                        {visibleFeatures.length ? (
                          <> • Features: {visibleFeatures.join(", ")}</>
                        ) : null}
                      </p>

                      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 sm:grid-cols-[auto_1fr_auto_1fr]">
                        <dt className="text-xs font-semibold text-foreground/70">
                          Surf
                        </dt>
                        <dd className="text-right text-foreground">
                          {seoSummary.surfHeight ?? "—"}
                        </dd>
                        <dt className="text-xs font-semibold text-foreground/70">
                          Wind
                        </dt>
                        <dd className="text-right text-foreground">
                          {seoSummary.windSpeed != null
                            ? `${seoSummary.windSpeed} mph${
                                windDirLabel ? ` ${windDirLabel}` : ""
                              }`
                            : "—"}
                        </dd>
                        <dt className="text-xs font-semibold text-foreground/70">
                          Water
                        </dt>
                        <dd className="text-right text-foreground">
                          {seoSummary.waterTemp != null
                            ? `${seoSummary.waterTemp}°F`
                            : "—"}
                        </dd>
                        <dt className="text-xs font-semibold text-foreground/70">
                          Updated
                        </dt>
                        <dd className="text-right text-foreground">
                          {updatedAtLabel ?? "—"}
                        </dd>
                      </dl>
                    </section>
                  ) : null}
                </header>

                <SunDataProvider>
                  <OverviewChartsLoadingProvider>
                    <DateSummaryBridge
                      beachId={beachId}
                      beachParam={beachParam}
                      isFavorite={isFavorite}
                      loggedIn={loggedIn}
                      initialOverviewTableDensity={initialStatTableDensity}
                      initialForecastTableDensity={initialForecastTableDensity}
                      initialForecastViewMode={initialForecastViewMode}
                      initialOverviewMeta={initialOverviewMeta}
                      initialOverviewRows={initialOverviewRows}
                      initialForecastMeta={initialForecastMeta}
                      initialForecastRows={initialForecastRows}
                    />
                  </OverviewChartsLoadingProvider>
                </SunDataProvider>
              </div>
            </PathStyleWrapper>
        </main>
      </OverviewPageBusyProvider>
      <BottomNav beachName={beachName} />
      <Footer />
    </div>
  </>
);
}
