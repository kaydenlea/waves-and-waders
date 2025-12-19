"use client";

import React from "react";
import {
  useSessionContext,
  useSupabaseClient,
} from "@supabase/auth-helpers-react";
import { cn } from "@/lib/utils";
import Summary from "@/components/visuals/Summary";
import Highlights from "@/components/visuals/Highlights";
import { LazyLoadDatePicker } from "@/components/general/LazyLoad/LazyLoadDatePicker";
import OverviewWidget from "@/components/general/overview/OverviewWidget";
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
import { useDateContext } from "../context/DateContext";
import { useClientPath } from "../context/PathContext";
import { ForecastChartProvider } from "../context/ForecastChartContext";
import { SunDataProvider, useSunData } from "../context/SunDataContext";
import ForecastBridge from "./ForecastBridge";
import PageTabs from "./PageTabs";
import Link from "next/link";
import {
  Pencil,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { getTidesCached } from "@/lib/dataCache";
import { useCachedForecast } from "@/lib/hooks/useCachedForecast";
import { getPacificDayRange, getPacificMidnightUTC } from "@/lib/utils";
import SurfIntensityMarker from "./SurfIntensityMarker";
import { ForecastDataProvider } from "../context/ForecastDataContext";
import { useTideWindowData } from "@/lib/hooks/useTideWindow";
import { TideDataProvider } from "../context/TideDataContext";
import {
  buildSunSegments,
  buildSunSegmentsForRange,
} from "@/components/graphs/sunSegments";
import type { SharedSunSegments } from "@/components/graphs/sharedSunSegments";
import { ForecastChartsLoadingProvider } from "../context/ForecastChartsLoadingContext";
import { useStableOverlay } from "../hooks/useStableOverlay";

type Props = {
  beachId: string;
  beachParam?: string;
  isFavorite?: boolean;
  loggedIn?: boolean;
  initialOverviewMeta?: Partial<Record<WidgetId, WidgetMeta>> | null;
  initialOverviewRows?: Row[] | null;
  initialForecastMeta?: Partial<Record<WidgetId, WidgetMeta>> | null;
  initialForecastRows?: Row[] | null;
};

type RangeStats = {
  min: string | null;
  max: string | null;
};

const HeaderVisual = ({
  unit,
  min,
  max,
}: {
  unit: string;
  min: string | null;
  max: string | null;
}) => {
  return (
    <div className="flex gap-2 rounded-lg bg-highlight-5 items-center text-xs text-muted-foreground uppercase tracking-wide leading-tight px-3 py-2">
      <div className="flex items-center gap-0.5">
        <span className="flex gap-0.5 items-center">
          <ArrowDown className="h-4 w-4 text-rose-500/80" />
          <span className="hidden @min-sm:block font-semibold">Lo</span>
        </span>
        <span className="ml-1 text-foreground normal-case font-semibold">
          {min ?? "--"} <span className="inline-block">{unit}</span>
        </span>
      </div>
      <div className="flex items-center gap-0.5">
        <span className="flex gap-0.5 items-center">
          <ArrowUp className="h-4 w-4 text-emerald-500/80" />
          <span className="hidden @min-sm:block font-semibold">Hi</span>
        </span>
        <span className="ml-1 text-foreground normal-case font-semibold">
          {max ?? "--"} <span className="inline-block">{unit}</span>
        </span>
      </div>
    </div>
  );
};

const TideStatsHeader = ({
  beachId,
  date,
}: {
  beachId: string;
  date?: Date;
}) => {
  const [highTide, setHighTide] = React.useState<string | null>(null);
  const [lowTide, setLowTide] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const loadTideStats = async () => {
      try {
        const HOURS_TO_MS = 60 * 60 * 1000;
        const hours = 24;

        const { start, end } = getPacificDayRange(
          date instanceof Date ? date : undefined
        );

        const BUFFER_HOURS = 6;
        const tideFetchStart = new Date(
          start.getTime() - BUFFER_HOURS * HOURS_TO_MS
        );
        const tideFetchEnd = new Date(
          end.getTime() + BUFFER_HOURS * HOURS_TO_MS
        );

        const tideRows = await getTidesCached(
          beachId,
          tideFetchStart,
          tideFetchEnd
        );
        if (cancelled) return;

        const startMs = start.getTime();
        const endMs = end.getTime();

        const tideInRange = tideRows.filter((row) => {
          const t = new Date(row.timestamp).getTime();
          return t >= startMs && t <= endMs;
        });

        const tideLevels = tideInRange
          .map((row) => row.tideLevelFt)
          .filter((v): v is number => typeof v === "number" && !isNaN(v));

        if (tideLevels.length > 0) {
          const high = Math.max(...tideLevels);
          const low = Math.min(...tideLevels);

          if (!cancelled) {
            setHighTide(high.toFixed(1));
            setLowTide(low.toFixed(1));
          }
        }
      } catch (e) {
        console.error("Failed to load tide stats", e);
      }
    };

    void loadTideStats();

    return () => {
      cancelled = true;
    };
  }, [beachId, date]);

  return (
    // <div className="grid rounded-md bg-highlight-5 grid-cols-[60px_1fr] grid-rows-2 gap-y-0.5 items-center text-xs text-muted-foreground uppercase tracking-wide leading-tight px-2 py-1.5">
    //   <span className="flex gap-2 items-center">
    //     <TrendingUp
    //       fill="#353535ff"
    //       className="stroke-muted-foreground w-4 h-4"
    //     />
    //     <span className="block font-medium">High</span>
    //   </span>
    //   <span className="ml-1 text-foreground normal-case font-medium">
    //     {highTide ?? "--"} <span className="inline-block">ft</span>
    //   </span>
    //   <span className="flex gap-2 items-center">
    //     <TrendingDown
    //       fill="#353535ff"
    //       className="stroke-muted-foreground w-4 h-4"
    //     />
    //     <span className="block -mb-0.5 font-medium">Low</span>
    //   </span>
    //   <span className="ml-1 text-foreground normal-case font-medium">
    //     {lowTide ?? "--"} <span className="inline-block">ft</span>
    //   </span>
    // </div>
    <HeaderVisual unit="ft" min={lowTide} max={highTide} />
  );
};

const WaveEnergyStatsHeader = ({ stats }: { stats: RangeStats }) => {
  return <HeaderVisual unit="kJ" min={stats.min} max={stats.max} />;
};

const WindStatsHeader = ({ stats }: { stats: RangeStats }) => {
  return <HeaderVisual unit="mph" min={stats.min} max={stats.max} />;
};

const SurfStatsHeader = ({ stats }: { stats: RangeStats }) => {
  return <HeaderVisual unit="ft" min={stats.min} max={stats.max} />;
};

const SwellStatsHeader = ({ stats }: { stats: RangeStats }) => {
  return <HeaderVisual unit="ft" min={stats.min} max={stats.max} />;
};

const DateSummaryBridge: React.FC<Props> = ({
  beachId,
  beachParam,
  isFavorite = false,
  loggedIn = false,
  initialOverviewMeta = null,
  initialOverviewRows = null,
  initialForecastMeta = null,
  initialForecastRows = null,
}) => {
  const { id, selected, setSelected, hour, setHour, selectedDays } =
    useDateContext();
  id.current = beachId;
  const { selectedTab } = useClientPath();
  const isOverview = selectedTab === "overview";
  const isForecastTab = selectedTab === "forecast";
  const [mounted, setMounted] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState<string>("");
  const [layoutMeta, setLayoutMeta] = React.useState<
    Partial<Record<WidgetId, WidgetMeta>>
  >(() => initialOverviewMeta ?? {});
  const [layoutRows, setLayoutRows] = React.useState<Row[]>(
    () => initialOverviewRows ?? []
  );
  const [layoutHydrated, setLayoutHydrated] = React.useState(
    () => !!(initialOverviewRows && initialOverviewRows.length)
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
  const statsRange = React.useMemo(() => {
    return getPacificDayRange(selected instanceof Date ? selected : undefined);
  }, [selected]);
  const statsStartMs = statsRange.start.getTime();
  const FORECAST_VISIBLE_DAYS = 4;

  const forecastTabRange = React.useMemo(() => {
    const HOURS_PER_DAY = 24;
    const normalizedDays =
      Array.isArray(selectedDays) && selectedDays.length > 0
        ? [...selectedDays].sort((a, b) => a.getTime() - b.getTime())
        : null;

    if (normalizedDays && normalizedDays.length > 0) {
      const start = getPacificMidnightUTC(normalizedDays[0]);
      const lastMidnight = getPacificMidnightUTC(
        normalizedDays[normalizedDays.length - 1]
      );
      const end = new Date(
        lastMidnight.getTime() + HOURS_PER_DAY * 60 * 60 * 1000
      );
      return { start, end };
    }

    const base =
      selected instanceof Date && !Number.isNaN(selected.getTime())
        ? selected
        : new Date();
    const start = getPacificMidnightUTC(base);
    const end = new Date(
      start.getTime() + FORECAST_VISIBLE_DAYS * HOURS_PER_DAY * 60 * 60 * 1000
    );
    return { start, end };
  }, [selected, selectedDays, FORECAST_VISIBLE_DAYS]);

  const { prefetchSunData, getSunData } = useSunData();
  React.useEffect(() => {
    if (!beachId) return;
    void prefetchSunData(beachId, [new Date(statsStartMs)]);
  }, [beachId, statsStartMs, prefetchSunData]);

  // TODO(overview-perf): Promote this daily forecast fetch into a shared overview data hook/context
  // so Summary, Highlights, charts, and tables all reuse the exact same rows and loading state.
  const { data: forecastRows, loading: forecastLoading } = useCachedForecast({
    beachId,
    start: statsRange.start,
    end: statsRange.end,
    enabled: Boolean(beachId),
  });

  const { data: forecastTabRows, loading: forecastTabLoading } =
    useCachedForecast({
      beachId,
      start: forecastTabRange.start,
      end: forecastTabRange.end,
      enabled: Boolean(beachId && isForecastTab),
    });

  const [sharedSunSegments, setSharedSunSegments] =
    React.useState<SharedSunSegments>({
      dayAreas: [],
      nightAreas: [],
      sunrise: null,
      sunset: null,
      baseDate: null,
    });
  const [forecastSunSegments, setForecastSunSegments] = React.useState<{
    dayAreas: { x1: number; x2: number }[];
    nightAreas: { x1: number; x2?: number }[];
  } | null>(null);

  // TODO(overview-perf): Tie shared sun segments into a unified loading gate with forecastRows
  // so overview charts only render once both data and day/night shading are ready.
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!beachId) {
        setSharedSunSegments({
          dayAreas: [],
          nightAreas: [],
          sunrise: null,
          sunset: null,
          baseDate: null,
        });
        return;
      }
      const baseDate =
        selected instanceof Date ? new Date(selected) : new Date();
      try {
        const sunData = await getSunData(String(beachId), baseDate);
        const segments = buildSunSegments(
          24,
          sunData?.sunrise ?? null,
          sunData?.sunset ?? null
        );
        if (!cancelled) {
          setSharedSunSegments({
            dayAreas: segments.dayAreas,
            nightAreas: segments.nightAreas,
            sunrise: sunData?.sunrise ?? null,
            sunset: sunData?.sunset ?? null,
            baseDate,
          });
        }
      } catch {
        if (!cancelled) {
          setSharedSunSegments({
            dayAreas: [],
            nightAreas: [],
            sunrise: null,
            sunset: null,
            baseDate,
          });
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [beachId, getSunData, selected]);

  React.useEffect(() => {
    if (!beachId || !isForecastTab) {
      setForecastSunSegments(null);
      return;
    }

    let cancelled = false;

    const hydrateForecastSun = async () => {
      try {
        const totalMs =
          forecastTabRange.end.getTime() - forecastTabRange.start.getTime();
        const HOURS_PER_DAY = 24;
        const totalDays = Math.max(
          1,
          Math.round(totalMs / (HOURS_PER_DAY * 60 * 60 * 1000))
        );

        const segments = await buildSunSegmentsForRange({
          fetchSun: (date) => getSunData(String(beachId), date),
          startDate: forecastTabRange.start,
          days: totalDays,
          hourSnap: 3,
        });

        if (!cancelled) {
          setForecastSunSegments({
            dayAreas: segments.dayAreas,
            nightAreas: segments.nightAreas,
          });
        }
      } catch {
        if (!cancelled) {
          const HOURS_PER_DAY = 24;
          const totalMs =
            forecastTabRange.end.getTime() - forecastTabRange.start.getTime();
          const totalDays = Math.max(
            1,
            Math.round(totalMs / (HOURS_PER_DAY * 60 * 60 * 1000))
          );

          setForecastSunSegments({
            dayAreas: [],
            nightAreas: [{ x1: 0, x2: totalDays * HOURS_PER_DAY }],
          });
        }
      }
    };

    void hydrateForecastSun();

    return () => {
      cancelled = true;
    };
  }, [
    beachId,
    getSunData,
    isForecastTab,
    forecastTabRange.start,
    forecastTabRange.end,
  ]);

  const tideWindow = useTideWindowData({
    beachId,
    date: selected ?? undefined,
    hours: 24,
  });
  const overviewChartsLoading =
    !layoutHydrated ||
    !beachId ||
    forecastLoading ||
    forecastRows.length === 0 ||
    tideWindow.loading ||
    (tideWindow.rows?.length ?? 0) === 0 ||
    sharedSunSegments.baseDate == null;

  const [tabOverlayActive, setTabOverlayActive] = React.useState(false);
  const prevTabRef = React.useRef<string | null>(null);
  const prevLoadingRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    const prev = prevTabRef.current;
    if (isOverview && prev !== "overview") {
      setTabOverlayActive(true);
    } else if (!isOverview) {
      setTabOverlayActive(false);
    }
    prevTabRef.current = selectedTab;
  }, [isOverview, selectedTab]);

  React.useEffect(() => {
    if (!isOverview) return;
    const wasLoading = prevLoadingRef.current;
    if (!wasLoading && overviewChartsLoading) {
      setTabOverlayActive(true);
    }
    prevLoadingRef.current = overviewChartsLoading;
  }, [isOverview, overviewChartsLoading]);

  React.useEffect(() => {
    if (!isOverview) return;
    if (!tabOverlayActive) return;
    if (overviewChartsLoading) return;
    const timeout = window.setTimeout(() => setTabOverlayActive(false), 250);
    return () => window.clearTimeout(timeout);
  }, [isOverview, tabOverlayActive, overviewChartsLoading]);

  const overlayVisible = useStableOverlay(
    overviewChartsLoading || tabOverlayActive,
    250
  );

  const { windStats, surfStats, swellStats, energyStats } =
    React.useMemo(() => {
      const makeEmptyRange = () => ({ min: null, max: null });
      const toRange = (
        values: number[],
        fractionDigits: number
      ): RangeStats => {
        if (!values.length) {
          return makeEmptyRange();
        }
        const max = Math.max(...values);
        const min = Math.min(...values);
        return {
          min: min.toFixed(fractionDigits),
          max: max.toFixed(fractionDigits),
        };
      };
      const isValidNumber = (value: unknown): value is number =>
        typeof value === "number" && Number.isFinite(value);

      if (!forecastRows.length) {
        return {
          windStats: makeEmptyRange(),
          surfStats: makeEmptyRange(),
          swellStats: makeEmptyRange(),
          energyStats: makeEmptyRange(),
        };
      }

      const energyValues = forecastRows
        .map((row) => row.surf.waveEnergy)
        .filter(isValidNumber);
      const windValues = forecastRows
        .map((row) => row.conditions.windSpeed)
        .filter(isValidNumber);
      const swellValues = forecastRows
        .map((row) => row.swell.primary.height)
        .filter(isValidNumber);
      const surfValues = forecastRows
        .map((row) => {
          const h1 = row.swell.primary.height ?? 0;
          const p1 = row.swell.primary.period ?? 10;
          const h2 = row.swell.secondary.height ?? 0;
          const p2 = row.swell.secondary.period ?? 10;
          const h3 = row.swell.tertiary?.height ?? 0;
          const p3 = row.swell.tertiary?.period ?? 10;
          const s1 = h1 * Math.sqrt(Math.max(0, p1) / 10);
          const s2 = h2 * Math.sqrt(Math.max(0, p2) / 10);
          const s3 = h3 * Math.sqrt(Math.max(0, p3) / 10);
          const w1 = 1.0;
          const w2 = 0.6;
          const w3 = 0.3;
          const combined = Math.sqrt(
            Math.pow(w1 * s1, 2) + Math.pow(w2 * s2, 2) + Math.pow(w3 * s3, 2)
          );
          const wind = row.conditions.windSpeed ?? 0;
          const windPenalty = Math.min(0.5, Math.max(0, (wind - 5) / 35));
          const effective = Math.max(0, combined * (1 - windPenalty));
          const min = row.surf.heightMin ?? 0;
          const max = row.surf.heightMax ?? 0;
          const estimate = min > 0 && max > 0 ? (min + max) / 2 : max;
          let representative = effective;
          if (!Number.isFinite(representative) || representative <= 0) {
            representative = estimate > 0 ? estimate : 0;
          } else if (estimate > 0) {
            representative = representative * 0.7 + estimate * 0.3;
          }
          return Math.max(0, representative);
        })
        .filter(isValidNumber);

      return {
        windStats: toRange(windValues, 0),
        surfStats: toRange(surfValues, 1),
        swellStats: toRange(swellValues, 1),
        energyStats: toRange(energyValues, 0),
      };
    }, [forecastRows]);

  const [, startMapSyncTransition] = React.useTransition();

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
      setLayoutHydrated(true);
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

  const visibleRows = React.useMemo(
    () =>
      layoutRows.filter((row) =>
        row.items.some((id) => layoutMeta[id]?.visible !== false)
      ),
    [layoutRows, layoutMeta]
  );

  // TODO(overview-perf): Centralize widget loading/skeleton handling here so all cards
  // transition from placeholder to real charts/tables in sync using shared loading state.
  const renderWidget = React.useCallback(
    (id: WidgetId, isFull: boolean) => {
      switch (id) {
        case "stats":
          return (
            <OverviewWidget
              label={label}
              unit={timeDisplay}
              loading={overlayVisible}
            >
              <Highlights
                beachId={beachId}
                date={selected ?? undefined}
                hour={hour}
                startIdx={0}
                endIdx={7}
                isFull={isFull}
                forecastRows={forecastRows}
              />
            </OverviewWidget>
          );
        case "tide":
          return (
            <OverviewWidget
              label="Tide"
              unit="ft"
              loading={overlayVisible}
              headerContent={
                <TideStatsHeader
                  beachId={beachId}
                  date={selected ?? undefined}
                />
              }
            >
              <LazyLoadTide
                beachId={beachId}
                date={selected ?? undefined}
                sunSegments={sharedSunSegments}
              />
            </OverviewWidget>
          );
        case "wind":
          return (
            <OverviewWidget
              label="Wind"
              unit="mph"
              loading={overlayVisible}
              headerContent={<WindStatsHeader stats={windStats} />}
            >
              <LazyLoadWind
                beachId={beachId}
                date={selected ?? undefined}
                sunSegments={sharedSunSegments}
              />
            </OverviewWidget>
          );
        case "swell":
          return (
            <OverviewWidget
              label="Swell"
              unit="ft"
              loading={overlayVisible}
              headerContent={<SwellStatsHeader stats={swellStats} />}
            >
              <LazyLoadSwell
                beachId={beachId}
                date={selected ?? undefined}
                sunSegments={sharedSunSegments}
              />
            </OverviewWidget>
          );
        case "surf":
          return (
            <OverviewWidget
              label="Surf"
              unit="ft"
              loading={overlayVisible}
              headerContent={<SurfStatsHeader stats={surfStats} />}
            >
              <LazyLoadSurf
                beachId={beachId}
                date={selected ?? undefined}
                sunSegments={sharedSunSegments}
              />
            </OverviewWidget>
          );
        case "energy":
          return (
            <OverviewWidget
              label="Energy"
              unit="kJ"
              loading={overlayVisible}
              headerContent={<WaveEnergyStatsHeader stats={energyStats} />}
            >
              <LazyLoadEnergy
                beachId={beachId}
                date={selected ?? undefined}
                sunSegments={sharedSunSegments}
              />
            </OverviewWidget>
          );
        case "table":
          return (
            <OverviewWidget label="Daily" unit="3 hrs" loading={overlayVisible}>
              <LazyLoadTable
                beachId={beachId}
                numHours={8}
                numDays={1}
                date={selected ?? undefined}
              />
            </OverviewWidget>
          );
        default:
          return null;
      }
    },
    [
      beachId,
      selected,
      hour,
      label,
      timeDisplay,
      windStats,
      surfStats,
      swellStats,
      energyStats,
      overlayVisible,
    ]
  );

  const sectionId = isOverview ? "overview-content" : "forecast-content";
  const showOverviewCopy = isOverview;
  const headerTitle = isOverview ? "Daily Overview" : "Weekly Forecast";
  const headerSubtitle = isOverview ? "Today's surf insights" : forecastWindow;
  const mobileEditTarget =
    selectedTab === "forecast"
      ? `/${beachId}/forecast/edit#forecast-content`
      : `/${beachId}/overview/edit#overview-content`;
  const mobileEditHref = loggedIn
    ? mobileEditTarget
    : `/login?next=${encodeURIComponent(mobileEditTarget)}`;

  return (
    <ForecastDataProvider
      value={{
        rows: forecastRows ?? null,
        start: statsRange.start,
        end: statsRange.end,
        loading: forecastLoading,
      }}
    >
      <TideDataProvider value={tideWindow}>
        <>
          {/* Summary header */}
          <section className="mb-10">
            <header className="px-3 mb-4 mt-1 flex items-center gap-2">
              <SurfIntensityMarker />
              <h2 className="font-medium text-muted-foreground leading-none truncate">
                {selected
                  ? selected.toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                  : "Select a day"}
              </h2>
            </header>
            <Summary
              beachId={beachId}
              date={selected ?? undefined}
              forecastRows={forecastRows}
              forecastLoading={forecastLoading}
              variant="overview"
            />
            {/* <LazyLoadSummary beachId={beachId} date={selected ?? undefined} /> */}
          </section>

          <section
            id={sectionId}
            className="mt-10 flex flex-col gap-1 w-full scroll-mt-35"
          >
            <header className="mx-2 flex flex-col gap-3 @min-xl:flex-row @min-xl:items-start @min-xl:justify-between">
              <div className="flex items-start justify-between gap-2 w-full">
                <div className="space-y-0 min-w-0">
                  <h2 className="text-2xl @min-md:text-3xl font-semibold tracking-tight truncate">
                    {headerTitle}
                  </h2>
                  <p className="text-sm @min-md:text-base text-muted-foreground truncate">
                    {headerSubtitle}
                  </p>
                </div>
                {/* Mobile edit button (hidden on wide screens). Signed-out users go to login with return URL. */}
                <Link
                  href={mobileEditHref}
                  className={cn(
                    "@min-xl:hidden inline-flex items-center rounded-full px-4 py-2.5 gap-1.5 shrink-0",
                    "border border-border/25 bg-highlight-7/50 hover:bg-highlight-6/60 shadow-even",
                    "transition-colors duration-200 motion-reduce:transition-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:ring-offset-0"
                  )}
                  aria-label={`Edit ${
                    selectedTab === "forecast" ? "forecast" : "overview"
                  } dashboard`}
                >
                  <Pencil className="stroke-[2.5px] w-4.5 h-4.5 @min-sm:mb-0.5" />
                  <span className="font-medium hidden @min-sm:inline-block text-[15px]">
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
                  loggedIn={loggedIn}
                  overviewPage
                  forecastPage={selectedTab === "forecast"}
                  placement="inline"
                  buttons
                  responsiveFull
                />
              </div>
            </header>
            {/* Tabs now live inside header for all breakpoints */}

            {/* Overview content - hidden when forecast is active */}
            <div className={isOverview ? "" : "hidden"}>
              <div className="relative min-h-[640px]">
                {visibleRows.length === 0 ? (
                  layoutHydrated ? (
                    <p className="mx-2 mt-6 text-sm text-muted-foreground">
                      All widgets are hidden. Use the edit screen to enable
                      widgets.
                    </p>
                  ) : null
                ) : (
                  visibleRows.map((row, index) => {
                    const visibleItems = row.items.filter(
                      (id) => layoutMeta[id]?.visible !== false
                    );
                    if (!visibleItems.length) return null;
                    const spacing = index === 0 ? "mt-4" : "mt-5";
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
                          return (
                            <React.Fragment key={id}>{content}</React.Fragment>
                          );
                        })}
                      </div>
                    );
                  })
                )}
                {/* Subtle overlay while overview layout is hydrating */}
                {!layoutHydrated && (
                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl border border-border/40 bg-background/40"
                    aria-hidden="true"
                  >
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-background/40 via-background/20 to-background/40 opacity-80 animate-pulse motion-reduce:animate-none" />
                  </div>
                )}
              </div>
            </div>

            {/* Forecast content - hidden when overview is active */}
            <div className={isOverview ? "hidden" : ""}>
              <div className="relative">
                <ForecastChartsLoadingProvider>
                  <SunDataProvider>
                    <ForecastChartProvider>
                      <ForecastDataProvider
                        value={{
                          rows: forecastTabRows ?? null,
                          start: forecastTabRange.start,
                          end: forecastTabRange.end,
                          loading: forecastTabLoading,
                        }}
                      >
                        <ForecastBridge
                          beachId={beachId}
                          hideHeader
                          onWindowStringChange={setForecastWindow}
                          initialMeta={initialForecastMeta ?? undefined}
                          initialRows={initialForecastRows ?? undefined}
                          cardVariant="overview"
                        />
                      </ForecastDataProvider>
                    </ForecastChartProvider>
                  </SunDataProvider>
                </ForecastChartsLoadingProvider>
              </div>
            </div>
          </section>
        </>
      </TideDataProvider>
    </ForecastDataProvider>
  );
};

export default DateSummaryBridge;
