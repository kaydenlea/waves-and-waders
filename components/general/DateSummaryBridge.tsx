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
import Link from "next/link";
import { Pencil } from "lucide-react";
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

type Props = { beachId: string };

const DateSummaryBridge: React.FC<Props> = ({ beachId }) => {
  const [selected, setSelected] = React.useState<Date | null>(null);
  const [hour, setHour] = React.useState<number>(() => {
    if (typeof window === "undefined") return 12; // SSR-safe default
    const currentHour = new Date().getHours();
    return Math.round(Math.max(0, Math.min(21, currentHour)) / 3) * 3;
  });

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
            <VisualWrapper label="Current" unit={currentTime || "--"}>
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
    [beachId, selected, hour, currentTime]
  );

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

      {/* Main overview section */}
      <section
        id="overview-content"
        className="flex flex-col gap-1 w-full mb-2 scroll-mt-25"
      >
        <header className="mx-2 flex gap-5 justify-between">
          <div>
            <h2 className="text-3xl font-semibold">Daily Overview</h2>
            <p className="text-sm text-muted-foreground">
              An insight into the forecast of any day
            </p>
          </div>
          <Link
            href={`/${beachId}/overview/edit#overview-content`}
            className="flex justify-center text-sm gap-1 h-10 px-3 items-center border border-border bg-highlight-4 rounded-full drop-shadow-sm hover:bg-highlight-3"
          >
            <Pencil size={16} />
            Edit
          </Link>
        </header>

        {/* 🧭 Sticky date picker + hour slider */}
        <section className="sticky top-[100px] z-40 bg-transparent pt-2 pb-8 transition-all duration-300">
          <LazyLoadDatePicker
            beachId={beachId}
            value={selected}
            onSelect={setSelected}
          />
          <LazyLoadHourSlider
            value={hour}
            onChange={setHour}
            min={0}
            max={21}
            step={3}
          />
        </section>

        {visibleRows.length === 0 ? (
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
            // const isFull =
            //   visibleItems.length === 1 &&
            //   (layoutMeta[visibleItems[0]]?.span ?? "half") === "full";
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
        )}
      </section>
    </>
  );
};

export default DateSummaryBridge;
