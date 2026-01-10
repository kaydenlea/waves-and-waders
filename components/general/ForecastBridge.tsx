"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import VisualWrapper from "@/components/general/VisualWrapper";
import OverviewWidget from "@/components/general/overview/OverviewWidget";
import { LazyLoadForecastTide } from "@/components/general/LazyLoad/LazyLoadForecastTide";
import { LazyLoadTable } from "@/components/general/LazyLoad/LazyLoadTable";
import type {
  StatTableDensity,
  StatTableUiState,
} from "@/components/general/LazyLoad/LazyLoadTable";
import { useDateContext } from "../context/DateContext";
import { useDashboardEditMode } from "../context/DashboardEditModeContext";
import { useSunData } from "../context/SunDataContext";
import { LazyLoadForecastWaveEnergy } from "./LazyLoad/LazyLoadForecastWaveEnergy";
import { LazyLoadForecastSurf } from "./LazyLoad/LazyLoadForecastSurf";
import { LazyLoadForecastWind } from "./LazyLoad/LazyLoadForecastWind";
import { LazyLoadForecastSwell } from "./LazyLoad/LazyLoadForecastSwell";
import { type Row, type WidgetId, type WidgetMeta } from "./dashboardLayout";
import { useDashboardLayout } from "./useDashboardLayout";
import { useForecastData } from "../context/ForecastDataContext";
import {
  useForecastChartsLoadingControls,
  useForecastChartsLoadingState,
} from "../context/ForecastChartsLoadingContext";
import { useStableOverlay } from "../hooks/useStableOverlay";

// ------------------------------------------------------

type Props = {
  beachId: string;
  hideHeader?: boolean;
  onWindowStringChange?: (value: string) => void;
  initialMeta?: Partial<Record<WidgetId, WidgetMeta>> | null;
  initialRows?: Row[] | null;
  cardVariant?: "default" | "overview" | "forecast";
  tableDensity?: StatTableDensity;
  onTableDensityChange?: (next: StatTableDensity) => void;
};

/**
 * Note: This component intentionally avoids reading client-only APIs
 * or client-only context during the server render, to prevent hydration mismatches.
 * It uses `isMounted` and initializes visible state in useEffect (client-only).
 */
const ForecastBridge: React.FC<Props> = ({
  beachId,
  hideHeader = false,
  onWindowStringChange,
  initialMeta = null,
  initialRows = null,
  cardVariant = "default",
  tableDensity: controlledTableDensity,
  onTableDensityChange,
}) => {
  const isOverviewCards = cardVariant === "overview";
  const isForecastCards = cardVariant === "forecast";
  const isTableDensityControlled = controlledTableDensity != null;
  const [uncontrolledDailyTableDensity, setUncontrolledDailyTableDensity] =
    useState<StatTableDensity>("3h");
  const skipDailyTableDensityPersistRef = useRef(true);

  const dailyTableDensity =
    controlledTableDensity ?? uncontrolledDailyTableDensity;

  const setDailyTableDensity = useCallback(
    (next: StatTableDensity) => {
      if (onTableDensityChange) {
        onTableDensityChange(next);
        return;
      }
      setUncontrolledDailyTableDensity(next);
    },
    [onTableDensityChange]
  );
  const [dailyTableUi, setDailyTableUi] = useState<StatTableUiState | null>(
    null
  );
  const onDailyTableUiStateChange = useCallback((next: StatTableUiState) => {
    setDailyTableUi((prev) => {
      if (
        prev &&
        prev.canToggleDensity === next.canToggleDensity &&
        prev.effectiveDensity === next.effectiveDensity &&
        prev.isHalfColumns === next.isHalfColumns
      ) {
        return prev;
      }
      return next;
    });
  }, []);
  const toggleDailyTableDensity = useCallback(() => {
    setDailyTableDensity(dailyTableDensity === "3h" ? "12h" : "3h");
  }, [dailyTableDensity, setDailyTableDensity]);

  useEffect(() => {
    if (isTableDensityControlled) return;
    try {
      const stored = window.localStorage.getItem(
        "waves-and-waders.statTable.density"
      );
      if (stored === "3h" || stored === "12h") {
        skipDailyTableDensityPersistRef.current = true;
        setDailyTableDensity(stored);
      }
    } catch {}
  }, [isTableDensityControlled]);

  useEffect(() => {
    if (isTableDensityControlled) return;
    if (skipDailyTableDensityPersistRef.current) {
      skipDailyTableDensityPersistRef.current = false;
      return;
    }
    try {
      window.localStorage.setItem(
        "waves-and-waders.statTable.density",
        dailyTableDensity
      );
    } catch {}
  }, [dailyTableDensity, isTableDensityControlled]);
  // local selected date (kept for the DatePicker's controlled value)
  // const [selected, setSelected] = useState<Date | null>(dayjs().toDate());

  // this context may be client-populated; we will only read it after mount to avoid hydration mismatch
  const { id, selected, selectedDays } = useDateContext();
  id.current = beachId;

  // ref for the in-page date picker
  const pickerRef = useRef<HTMLDivElement | null>(null);

  // mounted flag: false during SSR and initial client render; true after mount.
  // This is important to keep server-rendered markup consistent with the first client render.
  const [isMounted, setIsMounted] = useState(false);

  // whether the picker is visible in the viewport; default true so compact bar is NOT shown on SSR/initial render.
  const [, setIsPickerVisible] = useState<boolean>(true);

  const {
    meta: layoutMeta,
    rows: layoutRows,
    hydrated: layoutHydrated,
    setMeta: setLayoutMeta,
    setRows: setLayoutRows,
  } = useDashboardLayout({
    type: "forecast",
    initialMeta,
    initialRows,
  });
  const {
    pendingLayoutApply,
    clearPendingLayoutApply,
    cacheLayout,
    isEditing,
  } = useDashboardEditMode();
  const [layoutOverlayActive, setLayoutOverlayActive] = useState(false);
  useLayoutEffect(() => {
    if (!pendingLayoutApply) return;
    if (pendingLayoutApply.type !== "forecast") return;
    if (isEditing) return;
    setLayoutOverlayActive(true);
    setLayoutMeta(pendingLayoutApply.meta);
    setLayoutRows(pendingLayoutApply.rows);
    clearPendingLayoutApply();
  }, [
    isEditing,
    pendingLayoutApply,
    setLayoutMeta,
    setLayoutRows,
    clearPendingLayoutApply,
  ]);
  useEffect(() => {
    if (!layoutOverlayActive) return;
    const timeout = window.setTimeout(() => setLayoutOverlayActive(false), 250);
    return () => window.clearTimeout(timeout);
  }, [layoutOverlayActive]);
  useEffect(() => {
    if (!layoutHydrated) return;
    cacheLayout({ type: "forecast", meta: layoutMeta, rows: layoutRows });
  }, [cacheLayout, layoutHydrated, layoutMeta, layoutRows]);
  const { prefetchSunData } = useSunData();
  const { rows: forecastRows, loading: forecastLoading } = useForecastData();
  const chartsLoading = useForecastChartsLoadingState();
  const { setExpectedCharts } = useForecastChartsLoadingControls();

  const expectedChartIds = useMemo(() => {
    const ids = new Set<string>();
    const widgetToCharts: Partial<Record<WidgetId, readonly string[]>> = {
      tide: ["forecast-tide"],
      surf: ["forecast-surf"],
      wind: ["forecast-wind"],
      swell: ["forecast-swell"],
      energy: ["forecast-energy"],
      table: ["forecast-table"],
      surfAndWind: ["forecast-surf", "forecast-wind"],
    };

    for (const row of layoutRows) {
      for (const widgetId of row.items) {
        if (layoutMeta[widgetId]?.visible === false) continue;
        const charts = widgetToCharts[widgetId];
        if (!charts) continue;
        for (const chartId of charts) ids.add(chartId);
      }
    }

    return Array.from(ids).sort();
  }, [layoutMeta, layoutRows]);

  useLayoutEffect(() => {
    setExpectedCharts(expectedChartIds);
  }, [expectedChartIds, setExpectedCharts]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prefetch sun data for all selected days to speed up chart rendering
  useEffect(() => {
    if (!beachId || !selectedDays || selectedDays.length === 0) return;

    // Prefetch sun data for all days in the range
    void prefetchSunData(beachId, selectedDays);
  }, [beachId, selectedDays, prefetchSunData]);

  // Set up the IntersectionObserver on client only (after mount). Keeps layout stable on SSR.
  useEffect(() => {
    if (!isMounted) return;
    if (!pickerRef.current) return;
    if (typeof IntersectionObserver === "undefined") {
      // fail-safe: assume visible
      setIsPickerVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        // update visibility based on intersection status
        setIsPickerVisible(Boolean(e.isIntersecting));
      },
      {
        root: null,
        // rootMargin triggers when the element is mostly out of view
        rootMargin: "0px 0px -70% 0px",
        threshold: 0,
      }
    );

    observer.observe(pickerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [isMounted]);

  // Build the human readable window string only after mounted and when selectedDays exist.
  const windowString = useMemo(() => {
    if (!isMounted || !selectedDays || selectedDays.length === 0) {
      return "Select range";
    }
    const windowStart = selectedDays[0].toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "America/Los_Angeles",
    });
    const windowEnd = selectedDays[selectedDays.length - 1].toLocaleDateString(
      "en-US",
      {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "America/Los_Angeles",
      }
    );
    return `${windowStart} – ${windowEnd}`;
  }, [isMounted, selectedDays]);

  useEffect(() => {
    onWindowStringChange?.(windowString);
  }, [windowString, onWindowStringChange]);

  const visibleRows = useMemo(
    () =>
      layoutRows.filter((row) =>
        row.items.some((id) => layoutMeta[id]?.visible !== false)
      ),
    [layoutRows, layoutMeta]
  );

  // Memoize individual widgets to prevent unnecessary re-renders
  const rawWidgetLoading =
    chartsLoading || !layoutHydrated || forecastLoading || layoutOverlayActive;
  const stableWidgetLoading = useStableOverlay(rawWidgetLoading, 220);

  const Wrapper = useMemo(
    () =>
      (cardVariant === "overview" || cardVariant === "forecast"
        ? OverviewWidget
        : VisualWrapper) as React.ComponentType<
        React.ComponentProps<typeof VisualWrapper>
      >,
    [cardVariant]
  );

  const renderWidget = useCallback(
    (id: WidgetId, variant: "full" | "half") => {
      const firstDay = selectedDays?.[0] ?? undefined;

      switch (id) {
        case "stats":
          return (
            <Wrapper label="Forecast Overview" loading={stableWidgetLoading}>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{windowString}</p>
                <p>
                  Adjust the date range above or use the edit mode to customize
                  which panels show here.
                </p>
              </div>
            </Wrapper>
          );
        case "tide":
          return (
            <Wrapper
              label="Tide"
              extraPadding={isForecastCards}
              unit="ft"
              loading={stableWidgetLoading}
            >
              <LazyLoadForecastTide
                beachId={beachId}
                date={firstDay}
                days={selectedDays ?? undefined}
              />
            </Wrapper>
          );
        case "surf":
          return (
            <Wrapper
              extraPadding={isForecastCards}
              label="Surf"
              unit="ft"
              loading={stableWidgetLoading}
            >
              <LazyLoadForecastSurf beachId={beachId} days={selectedDays} />
            </Wrapper>
          );
        case "wind":
          return (
            <Wrapper
              extraPadding={isForecastCards}
              label="Wind"
              unit="mph"
              loading={stableWidgetLoading}
            >
              <LazyLoadForecastWind beachId={beachId} days={selectedDays} />
            </Wrapper>
          );
        case "surfAndWind":
          return (
            <div
              className={cn(
                "w-full flex flex-col @min-2xl:flex-row",
                isOverviewCards ? "gap-4" : "gap-6"
              )}
            >
              <Wrapper label="Wind" unit="mph" loading={stableWidgetLoading}>
                <LazyLoadForecastWind beachId={beachId} days={selectedDays} />
              </Wrapper>
              <Wrapper label="Surf" unit="ft" loading={stableWidgetLoading}>
                <LazyLoadForecastSurf beachId={beachId} days={selectedDays} />
              </Wrapper>
            </div>
          );
        case "energy":
          return (
            <Wrapper
              extraPadding={isForecastCards}
              label="Energy"
              unit="kJ"
              loading={stableWidgetLoading}
            >
              <LazyLoadForecastWaveEnergy
                beachId={beachId}
                days={selectedDays}
              />
            </Wrapper>
          );
        case "table": {
          const tableUnit =
            (dailyTableUi?.effectiveDensity ?? dailyTableDensity) === "12h"
              ? "12 hrs"
              : "3 hrs";
          const table = (
            <LazyLoadTable
              beachId={beachId}
              numHours={3}
              numDays={7}
              header
              date={selected ?? undefined}
              variant={variant}
              density={dailyTableDensity}
              onToggleDensity={toggleDailyTableDensity}
              onUiStateChange={onDailyTableUiStateChange}
            />
          );

          return isOverviewCards || isForecastCards ? (
            <OverviewWidget
              label="Daily"
              unit={tableUnit}
              loading={stableWidgetLoading}
              extraPadding
            >
              {table}
            </OverviewWidget>
          ) : (
            <Wrapper
              label="Daily"
              unit={tableUnit}
              loading={stableWidgetLoading}
            >
              {table}
            </Wrapper>
          );
        }
        case "swell":
          return (
            <Wrapper
              extraPadding={isForecastCards}
              label="Swell"
              unit="ft"
              loading={stableWidgetLoading}
            >
              <LazyLoadForecastSwell beachId={beachId} days={selectedDays} />
            </Wrapper>
          );
        default:
          return null;
      }
    },
    [
      Wrapper,
      beachId,
      dailyTableDensity,
      dailyTableUi,
      isOverviewCards,
      isForecastCards,
      onDailyTableUiStateChange,
      selected,
      selectedDays,
      stableWidgetLoading,
      toggleDailyTableDensity,
      windowString,
    ]
  );

  return (
    <section
      id="forecast-content"
      className="relative flex flex-col gap-4 scroll-mt-45"
    >
      {/* --- Date picker area: sticky on all sizes so behavior is identical everywhere --- */}
      <section
        ref={pickerRef}
        // className="sticky top-[var(--nav-height,60px)] z-60"
        // aria-label="Date picker region"
      >
        {!hideHeader && (
          <header className="mx-2 flex gap-5 justify-between">
            <div>
              <h2 className="text-3xl font-semibold">Weekly Forecast</h2>
              <p className="text-sm text-muted-foreground">{windowString}</p>
            </div>
            {/* <Link
            href={`/${beachId}/overview/edit#overview-content`}
            className="flex justify-center text-sm gap-1 h-10 px-3 items-center border border-border bg-highlight-4 rounded-full drop-shadow-sm hover:bg-highlight-3"
          >
            <Pencil size={16} />
            Edit
          </Link> */}
          </header>
        )}
        {/* <h2 className="ml-2 mb-0 text-muted-foreground text-lg">
          {windowString}
        </h2> */}
        {/* <div className="mt-4 mb-4">
          <LazyLoadDatePicker
            forecast
            beachId={beachId}
            className="rounded-b-xl"
            value={selected}
            onSelect={(d) => {
              setSelected(d);
            }}
          />
        </div> */}
        {/* <div className="flex justify-end">
          <Link
            href={`/${beachId}/forecast/edit#forecast-content`}
            className="flex justify-center text-sm gap-1 h-10 px-3 items-center border border-border bg-highlight-4 rounded-full drop-shadow-sm hover:bg-highlight-3"
            aria-label="Edit forecast"
          >
            <Pencil size={16} />
            Edit
          </Link>
        </div> */}
        <div className="flex flex-col">
          {visibleRows.length === 0 ? (
            <p className="mx-2 mt-4 text-sm text-muted-foreground">
              All widgets are hidden. Use the edit page to re-enable panels for
              the forecast view.
            </p>
          ) : (
            visibleRows.map((row, index) => {
              const visibleItems = row.items.filter(
                (id) => layoutMeta[id]?.visible !== false
              );
              if (!visibleItems.length) return null;

              const renderedItems = visibleItems
                .map((id) => {
                  const span = layoutMeta[id]?.span ?? "half";
                  const variant = span === "half" ? "half" : "full";
                  return { id, content: renderWidget(id, variant) };
                })
                .filter((entry) => Boolean(entry.content));

              if (!renderedItems.length) return null;

              const spacingClass = index === 0 ? "mt-4" : "mt-5";
              const isFull = renderedItems.length === 1;

              if (isFull) {
                const singleContent =
                  renderWidget(renderedItems[0].id, "full") ??
                  renderedItems[0].content;
                return (
                  <div key={row.id} className={`${spacingClass} w-full`}>
                    {singleContent}
                  </div>
                );
              }

              return (
                <div
                  key={row.id}
                  className={cn(
                    `${spacingClass} w-full flex flex-col`,
                    isOverviewCards || isForecastCards
                      ? "@min-4xl:flex-row gap-4"
                      : "@min-3xl:flex-row gap-5"
                  )}
                >
                  {renderedItems.map((entry) => (
                    <React.Fragment key={entry.id}>
                      {entry.content}
                    </React.Fragment>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* --- Main content header --- */}
      {/* <section className="scroll-mt-[calc(var(--nav-height,72px)+1rem)]">
        <header className="-mb-5 mx-2 flex gap-12 justify-between items-center">
          <div>
            <h2 className="leading-none font-semibold text-2xl">
              {windowString}
            </h2>
            <span className="text-sm text-muted-foreground">
              Look at the days ahead
            </span>
          </div>
          <Link
            href={`/${beachId}/forecast/edit#forecast-content`}
            className="flex justify-center text-sm gap-1 h-10 px-3 items-center border border-border bg-highlight-4 rounded-full drop-shadow-sm hover:bg-highlight-3"
            aria-label="Edit forecast"
          >
            <Pencil size={16} />
            Edit
          </Link>
        </header>
      </section> */}
    </section>
  );
};

export default ForecastBridge;
