"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useSessionContext,
  useSupabaseClient,
} from "@supabase/auth-helpers-react";
import { LazyLoadDatePicker } from "@/components/general/LazyLoad/LazyLoadDatePicker";
import VisualWrapper from "@/components/general/VisualWrapper";
import { LazyLoadForecastTide } from "@/components/general/LazyLoad/LazyLoadForecastTide";
import { LazyLoadTable } from "@/components/general/LazyLoad/LazyLoadTable";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { useDateContext } from "../context/DateContext";
import dayjs from "dayjs";
import { LazyLoadForecastWaveEnergy } from "./LazyLoad/LazyLoadForecastWaveEnergy";
import { LazyLoadForecastSurf } from "./LazyLoad/LazyLoadForecastSurf";
import { LazyLoadForecastWind } from "./LazyLoad/LazyLoadForecastWind";
import { LazyLoadForecastSwell } from "./LazyLoad/LazyLoadForecastSwell";
import {
  getDashboardStorageKey,
  getDefaultLayout,
  normalizeMeta,
  normalizeRows,
  type Row,
  type WidgetId,
  type WidgetMeta,
} from "./dashboardLayout";

// ------------------------------------------------------

type Props = {
  beachId: string;
  hideHeader?: boolean;
  onWindowStringChange?: (value: string) => void;
};

/**
 * Note: This component intentionally avoids reading any client-only API
 * or client-only context during the server render, to prevent hydration mismatches.
 * It uses `isMounted` and initializes visible state in useEffect (client-only).
 */
const ForecastBridge: React.FC<Props> = ({
  beachId,
  hideHeader = false,
  onWindowStringChange,
}) => {
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

  const forecastDefaults = useMemo(() => getDefaultLayout("forecast"), []);
  const [layoutMeta, setLayoutMeta] = useState<
    Partial<Record<WidgetId, WidgetMeta>>
  >(() => forecastDefaults.meta);
  const [layoutRows, setLayoutRows] = useState<Row[]>(
    () => forecastDefaults.rows
  );
  const storageMetaKey = useMemo(
    () => getDashboardStorageKey("forecast", "meta"),
    []
  );
  const storageRowsKey = useMemo(
    () => getDashboardStorageKey("forecast", "rows"),
    []
  );
  const supabase = useSupabaseClient();
  const { session } = useSessionContext();

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  useEffect(() => {
    let cancelled = false;
    const fallback = getDefaultLayout("forecast");

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
          ? normalizeMeta("forecast", JSON.parse(savedMetaRaw))
          : fallback.meta;
        const savedRowsRaw = window.localStorage.getItem(storageRowsKey);
        const nextRows = savedRowsRaw
          ? normalizeRows("forecast", JSON.parse(savedRowsRaw), nextMeta)
          : fallback.rows;
        applyLayout(nextMeta, nextRows);
      } catch (error) {
        console.warn("Failed to load forecast layout", error);
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
          .select("forecast_meta, forecast_rows")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) {
          console.warn("Failed to load forecast layout from Supabase", error);
          loadFromLocalStorage();
          return;
        }
        if (!data) {
          applyLayout(fallback.meta, fallback.rows);
          return;
        }

        const nextMeta = normalizeMeta("forecast", data.forecast_meta);
        const nextRows = normalizeRows(
          "forecast",
          data.forecast_rows,
          nextMeta
        );
        applyLayout(nextMeta, nextRows);
      } catch (error) {
        console.warn("Unexpected error loading forecast layout", error);
        loadFromLocalStorage();
      }
    };

    void loadFromSupabase();

    return () => {
      cancelled = true;
    };
  }, [storageMetaKey, storageRowsKey, session, supabase]);

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

  const renderWidget = useCallback(
    (id: WidgetId) => {
      switch (id) {
        case "stats":
          return (
            <VisualWrapper label="Forecast Overview">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{windowString}</p>
                <p>
                  Adjust the date range above or use the edit mode to customize
                  which panels show here.
                </p>
              </div>
            </VisualWrapper>
          );
        case "tide":
          return (
            <VisualWrapper label="Tide" extraPadding>
              <LazyLoadForecastTide
                beachId={beachId}
                date={selectedDays?.[0] ?? undefined}
                days={selectedDays}
              />
            </VisualWrapper>
          );
        case "surf":
          return (
            <VisualWrapper extraPadding label="Surf">
              <LazyLoadForecastSurf beachId={beachId} days={selectedDays} />
            </VisualWrapper>
          );
        case "wind":
          return (
            <VisualWrapper extraPadding label="Wind" unit="mph">
              <LazyLoadForecastWind beachId={beachId} days={selectedDays} />
            </VisualWrapper>
          );
        case "surfAndWind":
          return (
            <div className="w-full flex flex-col @min-2xl:flex-row gap-6">
              <VisualWrapper label="Wind" unit="mph">
                <LazyLoadForecastWind beachId={beachId} days={selectedDays} />
              </VisualWrapper>
              <VisualWrapper label="Surf" unit="ft">
                <LazyLoadForecastSurf beachId={beachId} days={selectedDays} />
              </VisualWrapper>
            </div>
          );
        case "energy":
          return (
            <VisualWrapper extraPadding label="Wave Energy">
              <LazyLoadForecastWaveEnergy
                beachId={beachId}
                days={selectedDays}
              />
            </VisualWrapper>
          );
        case "table":
          return (
            <VisualWrapper label="Hourly Stats" unit="12 hrs">
              <LazyLoadTable
                beachId={beachId}
                numHours={3}
                numDays={7}
                header
                date={selected ?? undefined}
              />
            </VisualWrapper>
          );
        case "swell":
          return (
            <VisualWrapper extraPadding label="Swell">
              <LazyLoadForecastSwell beachId={beachId} days={selectedDays} />
            </VisualWrapper>
          );
        default:
          return null;
      }
    },
    [beachId, selected, selectedDays, windowString]
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
        <div className="flex flex-col gap-3">
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
              console.log("FORECAST WIDGETS", visibleItems);
              const renderedItems = visibleItems
                .map((id) => ({
                  id,
                  content: renderWidget(id),
                }))
                .filter(
                  (
                    entry
                  ): entry is {
                    id: WidgetId;
                    content: React.JSX.Element | null;
                  } => Boolean(entry.content)
                );

              if (!renderedItems.length) return null;

              const spacingClass = index === 0 ? "mt-4" : "mt-3";
              const isFull =
                renderedItems.length === 1 &&
                (layoutMeta[renderedItems[0].id]?.span ?? "full") === "full";

              if (isFull) {
                return (
                  <div key={row.id} className={`${spacingClass} w-full`}>
                    {renderedItems[0].content}
                  </div>
                );
              }

              return (
                <div
                  key={row.id}
                  className={`${spacingClass} w-full flex flex-col @min-2xl:flex-row gap-6`}
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
