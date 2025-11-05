"use client";

import React from "react";
import {
  useSessionContext,
  useSupabaseClient,
} from "@supabase/auth-helpers-react";
import Summary from "@/components/visuals/Summary";
import Highlights from "@/components/visuals/Highlights";
import { LazyLoadDatePicker } from "@/components/general/LazyLoad/LazyLoadDatePicker";
import VisualWrapper from "@/components/general/VisualWrapper";
import { LazyLoadWind } from "@/components/general/LazyLoad/LazyLoadWind";
import { LazyLoadTide } from "@/components/general/LazyLoad/LazyLoadTide";
import { LazyLoadSwell } from "@/components/general/LazyLoad/LazyLoadSwell";
import { LazyLoadSurf } from "@/components/general/LazyLoad/LazyLoadSurf";
import { LazyLoadHourSlider } from "@/components/general/LazyLoad/LazyLoadHourSlider";
import { LazyLoadTable } from "@/components/general/LazyLoad/LazyLoadTable";
import { LazyLoadEnergy } from "@/components/general/LazyLoad/LazyLoadEnergy";
import {
  getDashboardStorageKey,
  getDefaultLayout,
  normalizeMeta,
  normalizeRows,
  type Row,
  type WidgetId,
  type WidgetMeta,
} from "./dashboardLayout";
import { LazyLoadSummary } from "./LazyLoad/LazyLoadSummary";
import { useMapFilters } from "../context/MapFilterContext";
import { useDateContext } from "../context/DateContext";
import { useClientPath } from "../context/PathContext";
import { ForecastChartProvider } from "../context/ForecastChartContext";
import ForecastBridge from "./ForecastBridge";
import PageTabs from "./PageTabs";
import Link from "next/link";
import { Pencil } from "lucide-react";

type Props = {
  beachId: string;
  beachParam?: string;
  isFavorite?: boolean;
};

const DateSummaryBridge: React.FC<Props> = ({
  beachId,
  beachParam,
  isFavorite = false,
}) => {
  const { id, selected, setSelected, hour, setHour } = useDateContext();
  id.current = beachId;
  const { selectedTab } = useClientPath();
  const isOverview =
    selectedTab === "overview" || selectedTab === "" || selectedTab == null;
  const [mounted, setMounted] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState<string>("");
  const overviewDefaults = React.useMemo(
    () => getDefaultLayout("overview"),
    []
  );
  const [layoutMeta, setLayoutMeta] = React.useState<
    Partial<Record<WidgetId, WidgetMeta>>
  >(() => overviewDefaults.meta);
  const [layoutRows, setLayoutRows] = React.useState<Row[]>(
    () => overviewDefaults.rows
  );
  const [forecastWindow, setForecastWindow] = React.useState("Select range");
  const storageMetaKey = React.useMemo(
    () => getDashboardStorageKey("overview", "meta"),
    []
  );
  const storageRowsKey = React.useMemo(
    () => getDashboardStorageKey("overview", "rows"),
    []
  );
  const supabase = useSupabaseClient();
  const { session } = useSessionContext();

  const { setSelectedDate, setSelectedHour } = useMapFilters();

  // Set mounted and initialize time on client
  React.useEffect(() => {
    setMounted(true);
    setCurrentTime(
      new Date().toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    );
  }, []);

  // Update current time every minute
  React.useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        })
      );
    }, 60000);
    return () => clearInterval(interval);
  }, [mounted]);

  // Format the data hour label and determine if showing current, past, or forecast data
  const { label, timeDisplay } = React.useMemo(() => {
    if (!currentTime) return { label: "Stats", timeDisplay: "--" };

    const now = new Date();

    // Get the nearest 3-hour interval for the selected hour
    const dataHour = hour ?? now.getHours();
    const nearestHour = Math.round(dataHour / 3) * 3;

    // Format data hour as 12-hour time
    const displayHour = nearestHour % 12 === 0 ? 12 : nearestHour % 12;
    const ampm = nearestHour >= 12 ? "PM" : "AM";

    // Check if we're showing current, past, or future data
    const currentNearestHour = Math.round(now.getHours() / 3) * 3;

    // Check if selected date is today
    const isToday =
      selected &&
      selected.getDate() === now.getDate() &&
      selected.getMonth() === now.getMonth() &&
      selected.getFullYear() === now.getFullYear();

    // Create date objects for comparison
    const selectedDateTime = selected ? new Date(selected) : now;
    selectedDateTime.setHours(nearestHour, 0, 0, 0);

    const currentDateTime = new Date(now);
    currentDateTime.setHours(currentNearestHour, 0, 0, 0);

    // Determine label based on time relationship
    let labelText = "Stats";
    if (isToday && nearestHour === currentNearestHour) {
      labelText = "Current";
    } else if (selectedDateTime < currentDateTime) {
      labelText = "Historical";
    } else {
      labelText = "Forecast";
    }

    // Always show current time + data hour
    // Use compact format to prevent wrapping on mobile
    return {
      label: labelText,
      timeDisplay: `${currentTime} • ${displayHour} ${ampm}`,
    };
  }, [currentTime, hour, selected]);

  // Ensure a default selected date on mount (today) to keep map marker styling correct
  React.useEffect(() => {
    if (!selected) {
      const now = new Date();
      const dateOnly = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      setSelected(dateOnly);
      setSelectedDate(dateOnly);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const fallback = getDefaultLayout("overview");

    const applyLayout = (
      nextMeta: Partial<Record<WidgetId, WidgetMeta>>,
      nextRows: Row[]
    ) => {
      if (cancelled) return;
      setLayoutMeta(nextMeta);
      setLayoutRows(nextRows);
    };

    const loadFromLocalStorage = () => {
      if (typeof window === "undefined") {
        applyLayout(fallback.meta, fallback.rows);
        return;
      }
      try {
        const savedMetaRaw = window.localStorage.getItem(storageMetaKey);
        const nextMeta = savedMetaRaw
          ? normalizeMeta("overview", JSON.parse(savedMetaRaw))
          : fallback.meta;
        const savedRowsRaw = window.localStorage.getItem(storageRowsKey);
        const nextRows = savedRowsRaw
          ? normalizeRows("overview", JSON.parse(savedRowsRaw), nextMeta)
          : fallback.rows;
        applyLayout(nextMeta, nextRows);
      } catch (error) {
        console.warn("Failed to load overview layout", error);
        applyLayout(fallback.meta, fallback.rows);
      }
    };

    const loadFromSupabase = async () => {
      if (!session) {
        loadFromLocalStorage();
        return;
      }
      try {
        const { data, error } = await supabase
          .from("user_dashboard_settings")
          .select("overview_meta, overview_rows")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) {
          console.warn("Failed to load overview layout from Supabase", error);
          loadFromLocalStorage();
          return;
        }
        if (!data) {
          applyLayout(fallback.meta, fallback.rows);
          return;
        }
        const nextMeta = normalizeMeta("overview", data.overview_meta);
        const nextRows = normalizeRows(
          "overview",
          data.overview_rows,
          nextMeta
        );
        applyLayout(nextMeta, nextRows);
      } catch (error) {
        console.warn("Unexpected error loading overview layout", error);
        loadFromLocalStorage();
      }
    };

    void loadFromSupabase();

    return () => {
      cancelled = true;
    };
  }, [storageMetaKey, storageRowsKey, supabase, session]);

  // Sync selected date and hour with context
  React.useEffect(() => setSelectedDate(selected), [selected, setSelectedDate]);
  React.useEffect(() => setSelectedHour(hour), [hour, setSelectedHour]);

  const visibleRows = React.useMemo(
    () =>
      layoutRows.filter((row) =>
        row.items.some((id) => layoutMeta[id]?.visible !== false)
      ),
    [layoutRows, layoutMeta]
  );

  const renderWidget = React.useCallback(
    (id: WidgetId, isFull: boolean) => {
      switch (id) {
        case "stats":
          return (
            <VisualWrapper label={label} unit={timeDisplay}>
              <Highlights
                beachId={beachId}
                date={selected ?? undefined}
                hour={hour}
                startIdx={0}
                endIdx={7}
                isFull={isFull}
              />
            </VisualWrapper>
          );
        case "tide":
          return (
            <VisualWrapper label="Tide" unit="ft">
              <LazyLoadTide beachId={beachId} date={selected ?? undefined} />
            </VisualWrapper>
          );
        case "wind":
          return (
            <VisualWrapper label="Wind" unit="mph">
              <LazyLoadWind beachId={beachId} date={selected ?? undefined} />
            </VisualWrapper>
          );
        case "swell":
          return (
            <VisualWrapper label="Swell" unit="ft">
              <LazyLoadSwell beachId={beachId} date={selected ?? undefined} />
            </VisualWrapper>
          );
        case "surf":
          return (
            <VisualWrapper label="Surf" unit="ft">
              <LazyLoadSurf beachId={beachId} date={selected ?? undefined} />
            </VisualWrapper>
          );
        case "energy":
          return (
            <VisualWrapper label="Wave Energy" unit="ft">
              <LazyLoadEnergy beachId={beachId} date={selected ?? undefined} />
            </VisualWrapper>
          );
        case "table":
          return (
            <VisualWrapper label="Hourly Stats" unit="3 hrs">
              <LazyLoadTable
                beachId={beachId}
                numHours={8}
                numDays={1}
                date={selected ?? undefined}
              />
            </VisualWrapper>
          );
        default:
          return null;
      }
    },
    [beachId, selected, hour, label, timeDisplay]
  );

  const sectionId = isOverview ? "overview-content" : "forecast-content";
  const showOverviewCopy = isOverview;
  const headerTitle = isOverview ? "Daily Overview" : "Weekly Forecast";
  const headerSubtitle = isOverview ? "Today's surf insights" : forecastWindow;

  return (
    <>
      {/* Summary header */}
      <section className="mb-8">
        <h2 className="mb-4 ml-2 text-muted-foreground text-lg">
          {selected
            ? selected.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })
            : "Select a day"}
        </h2>
        <Summary beachId={beachId} date={selected ?? undefined} />
        {/* <LazyLoadSummary beachId={beachId} date={selected ?? undefined} /> */}
      </section>

      <section
        id={sectionId}
        className="mt-10 flex flex-col gap-1 w-full scroll-mt-35"
      >
        <header className="mx-2 flex flex-col gap-3 @min-xl:flex-row @min-xl:items-start @min-xl:justify-between">
          <div className="flex items-start justify-between gap-2 w-full">
            <div className="space-y-0 min-w-0">
              <h2 className="text-3xl font-semibold truncate">{headerTitle}</h2>
              <p className="text-base text-muted-foreground truncate">
                {headerSubtitle}
              </p>
            </div>
            {/* Mobile edit button (hidden on wide screens) */}
            <Link
              href={
                selectedTab === "forecast"
                  ? `/${beachId}/forecast/edit#forecast-content`
                  : `/${beachId}/overview/edit#overview-content`
              }
              className="@min-xl:hidden inline-flex bg-highlight-5 hover:bg-highlight-3 rounded-full p-3 @min-sm:py-2.5 gap-2 @min-sm:px-4 shrink-0"
              aria-label={`Edit ${
                selectedTab === "forecast" ? "forecast" : "overview"
              } dashboard`}
            >
              <Pencil className="stroke-[2.5px] w-5 h-5 @min-sm:w-5 @min-sm:h-5" />
              <span className="font-medium hidden @min-sm:inline-block">
                Edit
              </span>
            </Link>
          </div>
          <div className="shrink-0 @min-xl:ml-auto w-full @min-xl:w-auto">
            <PageTabs
              beach={beachParam}
              beachId={beachId}
              tabs={["overview", "forecast"]}
              isFavorite={isFavorite}
              overviewPage
              forecastPage={selectedTab === "forecast"}
              placement="inline"
              buttons
              responsiveFull
            />
          </div>
        </header>
        {/* Tabs now live inside header for all breakpoints */}

        {isOverview ? (
          visibleRows.length === 0 ? (
            <p className="mx-2 mt-6 text-sm text-muted-foreground">
              All widgets are hidden. Use the edit screen to enable widgets.
            </p>
          ) : (
            visibleRows.map((row, index) => {
              const visibleItems = row.items.filter(
                (id) => layoutMeta[id]?.visible !== false
              );
              if (!visibleItems.length) return null;
              const spacing = index === 0 ? "mt-4" : "mt-3";
              const isFull = visibleItems.length === 1;
              if (isFull) {
                const content = renderWidget(visibleItems[0], isFull);
                if (!content) return null;
                return (
                  <div key={row.id} className={`${spacing} w-full`}>
                    {content}
                  </div>
                );
              }

              return (
                <div
                  key={row.id}
                  className={`${spacing} w-full flex flex-col @min-3xl:flex-row gap-4`}
                >
                  {visibleItems.map((id) => {
                    const content = renderWidget(id, isFull);
                    if (!content) return null;
                    return <React.Fragment key={id}>{content}</React.Fragment>;
                  })}
                </div>
              );
            })
          )
        ) : (
          <div>
            <ForecastChartProvider>
              <ForecastBridge
                beachId={beachId}
                hideHeader
                onWindowStringChange={setForecastWindow}
              />
            </ForecastChartProvider>
          </div>
        )}
      </section>
    </>
  );
};

export default DateSummaryBridge;
