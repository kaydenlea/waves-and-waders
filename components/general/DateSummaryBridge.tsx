"use client";

import React from "react";
import { cn } from "@/lib/utils";
import Summary from "@/components/visuals/Summary";
import Highlights from "@/components/visuals/Highlights";
import OverviewWidget from "@/components/general/overview/OverviewWidget";
import { LazyLoadWind } from "@/components/general/LazyLoad/LazyLoadWind";
import { LazyLoadTide } from "@/components/general/LazyLoad/LazyLoadTide";
import { LazyLoadSwell } from "@/components/general/LazyLoad/LazyLoadSwell";
import { LazyLoadSurf } from "@/components/general/LazyLoad/LazyLoadSurf";
import { LazyLoadTable } from "@/components/general/LazyLoad/LazyLoadTable";
import type {
  StatTableDensity,
  StatTableUiState,
} from "@/components/general/LazyLoad/LazyLoadTable";
import { LazyLoadEnergy } from "@/components/general/LazyLoad/LazyLoadEnergy";
import {
  normalizeRowsForSingleColumn,
  packRowsForTwoColumn,
  type Row,
  type WidgetId,
  type WidgetMeta,
} from "./dashboardLayout";
import { useDashboardLayout } from "./useDashboardLayout";
import { useDateContext } from "../context/DateContext";
import { useClientPath } from "../context/PathContext";
import { ForecastChartProvider } from "../context/ForecastChartContext";
import { SunDataProvider, useSunData } from "../context/SunDataContext";
import ForecastBridge from "./ForecastBridge";
import PageTabs from "./PageTabs";
import DashboardEditorPanel from "./DashboardEditorPanel";
import Link from "next/link";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, CircleCheck, Pencil, X } from "lucide-react";
import { useDashboardEditMode } from "@/components/context/DashboardEditModeContext";
import { getTidesCached } from "@/lib/dataCache";
import { useCachedForecast } from "@/lib/hooks/useCachedForecast";
import { usePacificTodayMs } from "@/lib/hooks/usePacificTodayMs";
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
import { useOptionalOverviewPageBusyControls } from "../context/OverviewPageBusyContext";
import {
  useOptionalOverviewChartsLoadingControls,
  useOptionalOverviewChartsLoadingState,
} from "../context/OverviewChartsLoadingContext";

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
    <div className="flex items-center gap-2 rounded-xl border border-border/25 bg-highlight-7/70 px-3 py-2 text-xs uppercase tracking-wide leading-tight text-muted-foreground shadow-even supports-[backdrop-filter]:bg-highlight-7/40 supports-[backdrop-filter]:backdrop-blur-md">
      <div className="flex items-center gap-1.5">
        <span className="flex gap-0.5 items-center">
          <ArrowDown className="h-4 w-4 text-rose-500/80" />
          <span className="hidden @min-sm:block font-semibold">Lo</span>
        </span>
        <span className="text-foreground normal-case font-semibold tabular-nums whitespace-nowrap">
          {min ?? "--"}
          <span className="ml-0.5 inline-block">{unit}</span>
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="flex gap-0.5 items-center">
          <ArrowUp className="h-4 w-4 text-emerald-500/80" />
          <span className="hidden @min-sm:block font-semibold">Hi</span>
        </span>
        <span className="text-foreground normal-case font-semibold tabular-nums whitespace-nowrap">
          {max ?? "--"}
          <span className="ml-0.5 inline-block">{unit}</span>
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

        const { start, end } = getPacificDayRange(
          date instanceof Date ? date : undefined,
        );

        const BUFFER_HOURS = 6;
        const tideFetchStart = new Date(
          start.getTime() - BUFFER_HOURS * HOURS_TO_MS,
        );
        const tideFetchEnd = new Date(
          end.getTime() + BUFFER_HOURS * HOURS_TO_MS,
        );

        const tideRows = await getTidesCached(
          beachId,
          tideFetchStart,
          tideFetchEnd,
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
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to load tide stats", e);
        }
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
  const { id, selected, hour, selectedDays } = useDateContext();
  id.current = beachId;
  const { selectedTab } = useClientPath();
  const prevSelectedTabRef = React.useRef<string | null>(null);
  const tabJustSwitched =
    prevSelectedTabRef.current != null &&
    prevSelectedTabRef.current !== selectedTab;
  const tabSwitchedToOverview = tabJustSwitched && selectedTab === "overview";
  const tabSwitchedToForecast = tabJustSwitched && selectedTab === "forecast";

  React.useEffect(() => {
    prevSelectedTabRef.current = selectedTab;
  }, [selectedTab]);
  const isOverview = selectedTab === "overview";
  const isForecastTab = selectedTab === "forecast";

  const dashboardContainerProbeRef = React.useRef<HTMLDivElement | null>(null);
  const dashboardTwoColumnSentinelRef = React.useRef<HTMLDivElement | null>(
    null,
  );
  const [isTwoColumnDashboardLayout, setIsTwoColumnDashboardLayout] =
    React.useState(true);

  React.useLayoutEffect(() => {
    const probe = dashboardContainerProbeRef.current;
    const sentinel = dashboardTwoColumnSentinelRef.current;
    if (!probe || !sentinel) return;
    if (typeof ResizeObserver === "undefined") return;

    const containerEl =
      (probe.closest?.(".\\@container") as HTMLElement | null) ?? probe;

    const update = () => {
      const dir = window.getComputedStyle(sentinel).flexDirection;
      const next = dir === "row";
      setIsTwoColumnDashboardLayout((prev) => (prev === next ? prev : next));
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(containerEl);
    return () => ro.disconnect();
  }, []);
  const {
    enterEdit,
    isEditing,
    pendingLayoutApply,
    clearPendingLayoutApply,
    cacheLayout,
    getCachedLayout,
    cancel,
    confirm,
  } = useDashboardEditMode();
  const floatingConfirmTopSentinelRef = React.useRef<HTMLDivElement | null>(
    null,
  );
  const floatingConfirmBottomSentinelRef = React.useRef<HTMLDivElement | null>(
    null,
  );
  const floatingConfirmWrapperRef = React.useRef<HTMLDivElement | null>(null);
  const floatingConfirmActiveRef = React.useRef(false);
  const floatingConfirmNearEndRef = React.useRef(false);

  React.useEffect(() => {
    if (!isEditing || !isOverview) return;
    if (typeof IntersectionObserver === "undefined") return;

    const topSentinel = floatingConfirmTopSentinelRef.current;
    const bottomSentinel = floatingConfirmBottomSentinelRef.current;
    const wrapper = floatingConfirmWrapperRef.current;
    if (!topSentinel || !bottomSentinel || !wrapper) return;

    const applyVisibility = () => {
      const visible =
        floatingConfirmActiveRef.current && !floatingConfirmNearEndRef.current;
      wrapper.classList.toggle("opacity-100", visible);
      wrapper.classList.toggle("opacity-0", !visible);
      wrapper.setAttribute("aria-hidden", visible ? "false" : "true");
      const buttons = wrapper.querySelectorAll("button");
      buttons.forEach((btn) => {
        if (!(btn instanceof HTMLButtonElement)) return;
        btn.tabIndex = visible ? 0 : -1;
        btn.setAttribute("aria-hidden", visible ? "false" : "true");
        btn.style.pointerEvents = visible ? "auto" : "none";
      });
    };

    const updateCenter = () => {
      const container = dashboardContainerProbeRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      wrapper.style.left = `${rect.left + rect.width / 2}px`;
    };

    let rafId: number | null = null;
    const scheduleUpdateCenter = () => {
      if (rafId != null) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateCenter();
      });
    };

    scheduleUpdateCenter();
    applyVisibility();

    const topObserver = new IntersectionObserver(
      ([entry]) => {
        // Activate only after the user has scrolled past the reveal sentinel.
        // (Prevents activating while the dashboard is still below the viewport.)
        floatingConfirmActiveRef.current =
          !entry.isIntersecting && entry.boundingClientRect.top < 0;
        applyVisibility();
      },
      { root: null, threshold: 0, rootMargin: "0px" },
    );

    const bottomObserver = new IntersectionObserver(
      ([entry]) => {
        floatingConfirmNearEndRef.current = entry.isIntersecting;
        applyVisibility();
      },
      { root: null, threshold: 0, rootMargin: "0px 0px 48px 0px" },
    );

    topObserver.observe(topSentinel);
    bottomObserver.observe(bottomSentinel);
    window.addEventListener("resize", scheduleUpdateCenter);
    window.visualViewport?.addEventListener("resize", scheduleUpdateCenter);

    const ro = new ResizeObserver(() => scheduleUpdateCenter());
    const centerTarget = dashboardContainerProbeRef.current;
    if (centerTarget) ro.observe(centerTarget);

    return () => {
      topObserver.disconnect();
      bottomObserver.disconnect();
      window.removeEventListener("resize", scheduleUpdateCenter);
      window.visualViewport?.removeEventListener(
        "resize",
        scheduleUpdateCenter,
      );
      ro.disconnect();
      if (rafId != null) window.cancelAnimationFrame(rafId);
    };
  }, [isEditing, isOverview]);
  const [mounted, setMounted] = React.useState(false);
  const formatNow = React.useCallback(() => {
    return new Date().toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  }, []);
  const [currentTime, setCurrentTime] = React.useState<string>(() =>
    formatNow(),
  );
  const {
    meta: layoutMeta,
    rows: layoutRows,
    hydrated: layoutHydrated,
    setMeta: setLayoutMeta,
    setRows: setLayoutRows,
  } = useDashboardLayout({
    type: "overview",
    initialMeta: initialOverviewMeta,
    initialRows: initialOverviewRows,
  });
  React.useLayoutEffect(() => {
    const pending = pendingLayoutApply.overview;
    if (!pending) return;
    if (isEditing) return;
    setLayoutOverlayActive(true);
    setLayoutMeta(pending.meta);
    setLayoutRows(pending.rows);
    clearPendingLayoutApply("overview");
  }, [
    isEditing,
    pendingLayoutApply,
    setLayoutMeta,
    setLayoutRows,
    clearPendingLayoutApply,
  ]);
  React.useEffect(() => {
    if (isEditing) return;
    if (!layoutHydrated) return;
    cacheLayout({ type: "overview", meta: layoutMeta, rows: layoutRows });
  }, [cacheLayout, isEditing, layoutHydrated, layoutMeta, layoutRows]);
  const [, setForecastWindow] = React.useState("Select range");
  const [overviewTableDensity, setOverviewTableDensity] =
    React.useState<StatTableDensity>("3h");
  const [forecastTableDensity, setForecastTableDensity] =
    React.useState<StatTableDensity>("12h");
  const skipOverviewTableDensityPersistRef = React.useRef(true);
  const skipForecastTableDensityPersistRef = React.useRef(true);
  const [dailyTableUi, setDailyTableUi] =
    React.useState<StatTableUiState | null>(null);
  const onDailyTableUiStateChange = React.useCallback(
    (next: StatTableUiState) => {
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
    },
    [],
  );
  const toggleDailyTableDensity = React.useCallback(() => {
    setOverviewTableDensity((prev) => (prev === "3h" ? "12h" : "3h"));
  }, []);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(
        "waves-and-waders.statTable.density",
      );
      if (stored === "3h" || stored === "12h") {
        skipOverviewTableDensityPersistRef.current = true;
        setOverviewTableDensity(stored);
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    if (skipOverviewTableDensityPersistRef.current) {
      skipOverviewTableDensityPersistRef.current = false;
      return;
    }
    try {
      window.localStorage.setItem(
        "waves-and-waders.statTable.density",
        overviewTableDensity,
      );
    } catch {}
  }, [overviewTableDensity]);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(
        "waves-and-waders.forecastTable.density",
      );
      if (stored === "3h" || stored === "12h") {
        skipForecastTableDensityPersistRef.current = true;
        setForecastTableDensity(stored);
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    if (skipForecastTableDensityPersistRef.current) {
      skipForecastTableDensityPersistRef.current = false;
      return;
    }
    try {
      window.localStorage.setItem(
        "waves-and-waders.forecastTable.density",
        forecastTableDensity,
      );
    } catch {}
  }, [forecastTableDensity]);

  const pacificTodayMs = usePacificTodayMs();
  const defaultSelectedMs = pacificTodayMs;
  const selectedDateMs =
    selected instanceof Date && Number.isFinite(selected.getTime())
      ? selected.getTime()
      : defaultSelectedMs;
  const selectedDateForData = React.useMemo(
    () => new Date(selectedDateMs),
    [selectedDateMs],
  );

  const statsRange = React.useMemo(() => {
    return getPacificDayRange(selectedDateForData);
  }, [selectedDateForData]);
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
        normalizedDays[normalizedDays.length - 1],
      );
      const end = new Date(
        lastMidnight.getTime() + HOURS_PER_DAY * 60 * 60 * 1000,
      );
      return { start, end };
    }

    const base =
      selected instanceof Date && !Number.isNaN(selected.getTime())
        ? selected
        : new Date(defaultSelectedMs);
    const start = getPacificMidnightUTC(base);
    const end = new Date(
      start.getTime() + FORECAST_VISIBLE_DAYS * HOURS_PER_DAY * 60 * 60 * 1000,
    );
    return { start, end };
  }, [selected, selectedDays, FORECAST_VISIBLE_DAYS, defaultSelectedMs]);

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

  const forecastWindowFallback = React.useMemo(() => {
    const HOURS_PER_DAY = 24;
    const startLabel = forecastTabRange.start.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "America/Los_Angeles",
    });
    const lastDay = new Date(
      forecastTabRange.end.getTime() - HOURS_PER_DAY * 60 * 60 * 1000,
    );
    const endLabel = lastDay.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "America/Los_Angeles",
    });
    return `${startLabel} \u2013 ${endLabel}`;
  }, [forecastTabRange.end, forecastTabRange.start]);

  const overviewChartsControls = useOptionalOverviewChartsLoadingControls();
  const expectedOverviewChartIds = React.useMemo(() => {
    const ids = new Set<string>();
    const widgetToCharts: Partial<Record<WidgetId, readonly string[]>> = {
      stats: ["overview-highlights"],
      tide: ["overview-tide"],
      surf: ["overview-surf"],
      swell: ["overview-swell"],
      energy: ["overview-energy"],
      wind: ["overview-wind"],
      table: ["overview-table"],
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

  React.useLayoutEffect(() => {
    if (isEditing) return;
    overviewChartsControls?.setExpectedCharts(expectedOverviewChartIds);
  }, [expectedOverviewChartIds, overviewChartsControls, isEditing]);

  const [sharedSunSegments, setSharedSunSegments] =
    React.useState<SharedSunSegments>({
      dayAreas: [],
      nightAreas: [],
      sunrise: null,
      sunset: null,
      baseDate: null,
    });
  const [, setForecastSunSegments] = React.useState<{
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
      const baseDate = new Date(selectedDateMs);
      try {
        const sunData = await getSunData(String(beachId), baseDate);
        const segments = buildSunSegments(
          24,
          sunData?.sunrise ?? null,
          sunData?.sunset ?? null,
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
  }, [beachId, getSunData, selectedDateMs]);

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
          Math.round(totalMs / (HOURS_PER_DAY * 60 * 60 * 1000)),
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
            Math.round(totalMs / (HOURS_PER_DAY * 60 * 60 * 1000)),
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
    date: selectedDateForData,
    hours: 24,
  });
  const overviewChartsLoading = !layoutHydrated || !beachId || forecastLoading;
  const overviewWidgetsLoading = useOptionalOverviewChartsLoadingState();
  const hasVisibleOverviewWidgets = React.useMemo(
    () =>
      layoutRows.some((row) =>
        row.items.some(
          (id) => id !== "surfAndWind" && layoutMeta[id]?.visible !== false,
        ),
      ),
    [layoutMeta, layoutRows],
  );

  const [tabOverlayActive, setTabOverlayActive] = React.useState(false);
  const [layoutOverlayActive, setLayoutOverlayActive] = React.useState(false);
  const prevTabRef = React.useRef<string | null>(null);
  const prevLoadingRef = React.useRef<boolean>(false);

  React.useLayoutEffect(() => {
    const prevTab = prevTabRef.current;
    const wasLoading = prevLoadingRef.current;

    if (!isOverview) {
      if (tabOverlayActive) setTabOverlayActive(false);
      prevTabRef.current = selectedTab;
      prevLoadingRef.current = overviewChartsLoading;
      return;
    }

    // Ensure the overlay is active *before paint* when switching back to Overview,
    // so content never flashes briefly before the loading cover appears.
    const switchedToOverview = prevTab != null && prevTab !== "overview";
    const loadingBecameTrue = !wasLoading && overviewChartsLoading;
    if (switchedToOverview || loadingBecameTrue) {
      if (!tabOverlayActive) setTabOverlayActive(true);
    }

    prevTabRef.current = selectedTab;
    prevLoadingRef.current = overviewChartsLoading;
  }, [isOverview, overviewChartsLoading, selectedTab, tabOverlayActive]);

  React.useEffect(() => {
    if (!isOverview) return;
    if (!tabOverlayActive) return;
    if (overviewChartsLoading) return;
    const timeout = window.setTimeout(() => setTabOverlayActive(false), 250);
    return () => window.clearTimeout(timeout);
  }, [isOverview, tabOverlayActive, overviewChartsLoading]);

  React.useEffect(() => {
    if (!layoutOverlayActive) return;
    const timeout = window.setTimeout(() => setLayoutOverlayActive(false), 250);
    return () => window.clearTimeout(timeout);
  }, [layoutOverlayActive]);

  const pendingLayoutApplyActive = Boolean(
    pendingLayoutApply.overview &&
    // If we're still editing, the overview tab is hidden and we shouldn't flash an overlay.
    !isEditing,
  );

  const overviewInitialBusyRaw =
    overviewChartsLoading ||
    (isOverview && hasVisibleOverviewWidgets && overviewWidgetsLoading) ||
    tabOverlayActive ||
    tabSwitchedToOverview;
  const overviewInitialBusy = overviewInitialBusyRaw;

  const overlayVisible = useStableOverlay(
    overviewInitialBusy || layoutOverlayActive || pendingLayoutApplyActive,
    250,
  );

  const [forecastBridgeBusy, setForecastBridgeBusy] = React.useState(true);
  const [forecastTabOverlayActive, setForecastTabOverlayActive] =
    React.useState(false);
  const prevForecastTabRef = React.useRef<string | null>(null);
  const prevForecastBusyRef = React.useRef<boolean>(false);

  React.useLayoutEffect(() => {
    const prevTab = prevForecastTabRef.current;
    const wasBusy = prevForecastBusyRef.current;

    if (isOverview) {
      if (forecastTabOverlayActive) setForecastTabOverlayActive(false);
      prevForecastTabRef.current = selectedTab;
      prevForecastBusyRef.current = forecastBridgeBusy;
      return;
    }

    const switchedToForecast = prevTab != null && prevTab !== "forecast";
    const busyBecameTrue = !wasBusy && forecastBridgeBusy;
    if (switchedToForecast || busyBecameTrue) {
      if (!forecastTabOverlayActive) setForecastTabOverlayActive(true);
    }

    prevForecastTabRef.current = selectedTab;
    prevForecastBusyRef.current = forecastBridgeBusy;
  }, [forecastBridgeBusy, forecastTabOverlayActive, isOverview, selectedTab]);

  React.useEffect(() => {
    if (isOverview) return;
    if (!forecastTabOverlayActive) return;
    if (forecastBridgeBusy) return;
    const timeout = window.setTimeout(
      () => setForecastTabOverlayActive(false),
      250,
    );
    return () => window.clearTimeout(timeout);
  }, [forecastBridgeBusy, forecastTabOverlayActive, isOverview]);

  const forecastInitialBusyRaw = isForecastTab
    ? forecastBridgeBusy ||
      forecastTabOverlayActive ||
      forecastTabLoading ||
      tabSwitchedToForecast
    : false;
  const forecastInitialBusy = forecastInitialBusyRaw;

  const forecastBusyVisible = useStableOverlay(forecastInitialBusy, 250);
  const setOverviewPageBusy = useOptionalOverviewPageBusyControls();
  const overviewPageBusy = isOverview ? overlayVisible : forecastBusyVisible;

  React.useLayoutEffect(() => {
    if (!setOverviewPageBusy) return;
    setOverviewPageBusy(overviewPageBusy);
  }, [overviewPageBusy, setOverviewPageBusy]);

  React.useEffect(() => {
    if (!setOverviewPageBusy) return;
    return () => setOverviewPageBusy(false);
  }, [setOverviewPageBusy]);

  const { windStats, surfStats, swellStats, energyStats } =
    React.useMemo(() => {
      const makeEmptyRange = () => ({ min: null, max: null });
      const toRange = (
        values: number[],
        fractionDigits: number,
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
            Math.pow(w1 * s1, 2) + Math.pow(w2 * s2, 2) + Math.pow(w3 * s3, 2),
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

  // Set mounted and initialize time on client
  React.useEffect(() => {
    setMounted(true);
    setCurrentTime(formatNow());
  }, []);

  // Update current time every minute
  React.useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      setCurrentTime(formatNow());
    }, 60000);
    return () => clearInterval(interval);
  }, [mounted, formatNow]);

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

  const displayRows = React.useMemo(() => {
    const packed = packRowsForTwoColumn(layoutRows, layoutMeta);
    return isTwoColumnDashboardLayout
      ? packed
      : normalizeRowsForSingleColumn(packed);
  }, [layoutMeta, layoutRows, isTwoColumnDashboardLayout]);

  const visibleRows = React.useMemo(
    () =>
      displayRows.filter((row) =>
        row.items.some((id) => layoutMeta[id]?.visible !== false),
      ),
    [displayRows, layoutMeta],
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
                date={selectedDateForData}
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
                <TideStatsHeader beachId={beachId} date={selectedDateForData} />
              }
            >
              <LazyLoadTide
                beachId={beachId}
                date={selectedDateForData}
                sunSegments={sharedSunSegments}
                parentLoading={overlayVisible}
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
                date={selectedDateForData}
                sunSegments={sharedSunSegments}
                parentLoading={overlayVisible}
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
                date={selectedDateForData}
                sunSegments={sharedSunSegments}
                parentLoading={overlayVisible}
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
                date={selectedDateForData}
                sunSegments={sharedSunSegments}
                parentLoading={overlayVisible}
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
                date={selectedDateForData}
                sunSegments={sharedSunSegments}
                parentLoading={overlayVisible}
              />
            </OverviewWidget>
          );
        case "table": {
          const tableUnit =
            (dailyTableUi?.effectiveDensity ?? overviewTableDensity) === "12h"
              ? "12 hrs"
              : "3 hrs";
          return (
            <OverviewWidget
              label="Daily"
              unit={tableUnit}
              loading={overlayVisible}
            >
              <LazyLoadTable
                beachId={beachId}
                numHours={8}
                numDays={1}
                date={selectedDateForData}
                variant={isFull ? "full" : "half"}
                density={overviewTableDensity}
                onToggleDensity={toggleDailyTableDensity}
                onUiStateChange={onDailyTableUiStateChange}
              />
            </OverviewWidget>
          );
        }
        default:
          return null;
      }
    },
    [
      beachId,
      overviewTableDensity,
      dailyTableUi,
      onDailyTableUiStateChange,
      selectedDateForData,
      hour,
      label,
      timeDisplay,
      forecastRows,
      sharedSunSegments,
      toggleDailyTableDensity,
      windStats,
      surfStats,
      swellStats,
      energyStats,
      overlayVisible,
    ],
  );

  const renderEditorWidget = React.useCallback(
    (id: WidgetId, variant: "full" | "half") =>
      renderWidget(id, variant === "full"),
    [renderWidget],
  );

  const sectionId = isOverview ? "overview-content" : "forecast-content";
  const headerTitle = isOverview ? "Daily Overview" : "Weekly Forecast";
  const headerSubtitle = isOverview
    ? "Today's surf insights"
    : forecastWindowFallback;
  const loggedOutEditTarget =
    selectedTab === "forecast"
      ? `/${beachId}/overview/edit#forecast-content`
      : `/${beachId}/overview/edit#overview-content`;
  const loggedOutEditHref = `/login?next=${encodeURIComponent(
    loggedOutEditTarget,
  )}`;

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
                  ? selected.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      timeZone: "America/Los_Angeles",
                    })
                  : "Select a day"}
              </h2>
            </header>
            <Summary
              beachId={beachId}
              date={selectedDateForData}
              forecastRows={forecastRows}
              forecastLoading={forecastLoading}
              variant="overview"
            />
            {/* <LazyLoadSummary beachId={beachId} date={selected ?? undefined} /> */}
          </section>

          <section
            id={sectionId}
            ref={dashboardContainerProbeRef}
            className="mt-10 flex flex-col gap-1 w-full scroll-mt-35"
          >
            <div
              ref={dashboardTwoColumnSentinelRef}
              aria-hidden="true"
              className="sr-only flex flex-col @min-4xl:flex-row"
            />
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
                {loggedIn ? (
                  isEditing ? (
                    <button
                      type="button"
                      onClick={confirm}
                      className={cn(
                        "@min-xl:hidden inline-flex items-center rounded-full px-4 py-2.5 gap-1.5 shrink-0",
                        "border border-border/25 bg-highlight-7/50 hover:bg-highlight-6/60 shadow-even",
                        "transition-colors duration-200 motion-reduce:transition-none",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:ring-offset-0",
                      )}
                      aria-label="Done editing dashboard"
                      title="Done editing dashboard"
                    >
                      <CircleCheck className="stroke-[2.5px] w-4.5 h-4.5 @min-sm:mb-0.5" />
                      <span className="font-medium hidden @min-sm:inline-block text-[15px]">
                        Done
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        enterEdit(
                          selectedTab === "forecast" ? "forecast" : "overview",
                        )
                      }
                      className={cn(
                        "@min-xl:hidden inline-flex items-center rounded-full px-4 py-2.5 gap-1.5 shrink-0",
                        "border border-border/25 bg-highlight-7/50 hover:bg-highlight-6/60 shadow-even",
                        "transition-colors duration-200 motion-reduce:transition-none",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:ring-offset-0",
                      )}
                      aria-label={`Edit ${
                        selectedTab === "forecast" ? "forecast" : "overview"
                      } dashboard`}
                      title={`Edit ${
                        selectedTab === "forecast" ? "forecast" : "overview"
                      } dashboard`}
                    >
                      <Pencil className="stroke-[2.5px] w-4.5 h-4.5 @min-sm:mb-0.5" />
                      <span className="font-medium hidden @min-sm:inline-block text-[15px]">
                        Edit
                      </span>
                    </button>
                  )
                ) : (
                  <Link
                    href={loggedOutEditHref}
                    className={cn(
                      "@min-xl:hidden inline-flex items-center rounded-full px-4 py-2.5 gap-1.5 shrink-0",
                      "border border-border/25 bg-highlight-7/50 hover:bg-highlight-6/60 shadow-even",
                      "transition-colors duration-200 motion-reduce:transition-none",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:ring-offset-0",
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
                )}
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
            <div className={cn(isOverview ? "" : "hidden")}>
              <div className="relative min-h-[640px]">
                {isEditing ? (
                  (() => {
                    if (!isOverview) return null;
                    const cachedLayout = getCachedLayout("overview");
                    const editorInitialMeta = cachedLayout?.meta ?? layoutMeta;
                    const editorInitialRows = cachedLayout?.rows ?? layoutRows;

                    return (
                      <div className="relative">
                        <div
                          aria-hidden="true"
                          ref={floatingConfirmTopSentinelRef}
                          className="pointer-events-none absolute left-0 top-[-300px] h-px w-full"
                        />
                        {typeof document !== "undefined"
                          ? createPortal(
                              <div
                                ref={floatingConfirmWrapperRef}
                                className="ww-floating-edit-save hidden @min-4xl/main:block fixed z-[1000004] pointer-events-none opacity-0 transition-opacity duration-200 motion-reduce:transition-none"
                                style={{
                                  left: "50%",
                                  bottom: "16px",
                                  transform: "translateX(-50%)",
                                }}
                                aria-hidden="true"
                              >
                                <div
                                  className={cn(
                                    "pointer-events-auto inline-flex items-center gap-2 rounded-full",
                                    "border border-border/40 bg-background/85 shadow-xl ring-1 ring-border/30",
                                    "supports-[backdrop-filter]:backdrop-blur-md",
                                    "px-2 py-2",
                                  )}
                                >
                                  <button
                                    type="button"
                                    onClick={confirm}
                                    className={cn(
                                      "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold",
                                      "border border-border bg-highlight-4 ring-1 ring-border/55",
                                      "supports-[backdrop-filter]:backdrop-blur-md",
                                      "hover:bg-highlight-5 hover:dark:bg-highlight-5 hover:shadow-2xl transition-[opacity,background-color,box-shadow,transform] duration-200 motion-reduce:transition-none",
                                      "active:scale-[0.99]",
                                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/25 focus-visible:ring-offset-0",
                                      "ww-floating-edit-save__button",
                                    )}
                                    aria-label="Save dashboard changes"
                                    title="Save dashboard changes"
                                  >
                                    <CircleCheck className="stroke-[2.5px] w-4.5 h-4.5" />
                                    <span>Save</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancel}
                                    className={cn(
                                      "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold",
                                      "border border-destructive/45 bg-transparent",
                                      "text-destructive",
                                      "supports-[backdrop-filter]:backdrop-blur-md",
                                      "hover:bg-destructive/10 transition-colors duration-200 motion-reduce:transition-none",
                                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/25 focus-visible:ring-offset-0",
                                    )}
                                    aria-label="Cancel dashboard changes"
                                    title="Cancel dashboard changes"
                                  >
                                    <X className="stroke-[2.5px] w-4.5 h-4.5" />
                                    <span>Cancel</span>
                                  </button>
                                </div>
                              </div>,
                              document.body,
                            )
                          : null}
                        <DashboardEditorPanel
                          type="overview"
                          initialMeta={editorInitialMeta}
                          initialRows={editorInitialRows}
                          renderWidget={renderEditorWidget}
                        />
                        <div
                          aria-hidden="true"
                          ref={floatingConfirmBottomSentinelRef}
                          className="-mt-px h-px w-full"
                        />
                      </div>
                    );
                  })()
                ) : visibleRows.length === 0 ? (
                  layoutHydrated ? (
                    <p className="mx-2 mt-6 text-sm text-muted-foreground">
                      All widgets are hidden. Use the edit screen to enable
                      widgets.
                    </p>
                  ) : null
                ) : (
                  visibleRows.map((row, index) => {
                    const visibleItems = row.items.filter(
                      (id) => layoutMeta[id]?.visible !== false,
                    );
                    if (!visibleItems.length) return null;
                    const spacing = index === 0 ? "mt-4" : "mt-5";
                    const isFull = visibleItems.length === 1;
                    if (isFull) {
                      const content = renderWidget(visibleItems[0], isFull);
                      if (!content) return null;
                      return (
                        <div
                          key={`${row.id}:${index}`}
                          className={`${spacing} w-full`}
                        >
                          {content}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`${row.id}:${index}`}
                        className={`${spacing} w-full flex flex-col @min-4xl:flex-row gap-4`}
                      >
                        {visibleItems.map((id, itemIndex) => {
                          const content = renderWidget(id, isFull);
                          if (!content) return null;
                          return (
                            <React.Fragment
                              key={`${row.id}:${id}:${itemIndex}`}
                            >
                              {content}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Forecast content - hidden when overview is active */}
            <div className={cn(isOverview ? "hidden" : "")}>
              <div className="relative">
                {!isEditing || isForecastTab ? (
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
                            onBusyChange={setForecastBridgeBusy}
                            initialMeta={initialForecastMeta ?? undefined}
                            initialRows={initialForecastRows ?? undefined}
                            cardVariant="forecast"
                            tableDensity={forecastTableDensity}
                            onTableDensityChange={(next) =>
                              setForecastTableDensity(next)
                            }
                          />
                        </ForecastDataProvider>
                      </ForecastChartProvider>
                    </SunDataProvider>
                  </ForecastChartsLoadingProvider>
                ) : null}
              </div>
            </div>
          </section>
        </>
      </TideDataProvider>
    </ForecastDataProvider>
  );
};

export default DateSummaryBridge;
