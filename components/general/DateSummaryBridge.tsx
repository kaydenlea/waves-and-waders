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
import { Pencil, TrendingUp, TrendingDown } from "lucide-react";
import { fetchBeachTides, fetchBeachForecast } from "@/lib/supabase";
import { getPacificMidnightUTC } from "@/lib/utils";

type Props = {
  beachId: string;
  beachParam?: string;
  isFavorite?: boolean;
};

const TideStatsHeader = ({ beachId, date }: { beachId: string; date?: Date }) => {
  const [highTide, setHighTide] = React.useState<string | null>(null);
  const [lowTide, setLowTide] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const loadTideStats = async () => {
      try {
        const HOURS_TO_MS = 60 * 60 * 1000;
        const hours = 24;

        let start = new Date();
        let end = new Date(start.getTime() + hours * HOURS_TO_MS);
        if (date instanceof Date) {
          start = getPacificMidnightUTC(date);
          end = new Date(start.getTime() + hours * HOURS_TO_MS);
        }

        const BUFFER_HOURS = 6;
        const tideFetchStart = new Date(start.getTime() - BUFFER_HOURS * HOURS_TO_MS);
        const tideFetchEnd = new Date(end.getTime() + BUFFER_HOURS * HOURS_TO_MS);

        const tideRows = await fetchBeachTides(beachId, tideFetchStart, tideFetchEnd);
        if (cancelled) return;

        const startMs = start.getTime();
        const endMs = end.getTime();

        const tideInRange = tideRows.filter(row => {
          const t = new Date(row.timestamp).getTime();
          return t >= startMs && t <= endMs;
        });

        const tideLevels = tideInRange
          .map(row => row.tideLevelFt)
          .filter((v): v is number => typeof v === 'number' && !isNaN(v));

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
    <div className="grid rounded-md bg-highlight-5 grid-cols-[60px_1fr] grid-rows-2 gap-y-0.5 items-center text-xs text-muted-foreground uppercase tracking-wide leading-tight px-2 py-1.5">
      <span className="flex gap-2 items-center">
        <TrendingUp
          fill="#353535ff"
          className="stroke-muted-foreground w-4 h-4"
        />
        <span className="block font-medium">High</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {highTide ?? "--"} <span className="inline-block">ft</span>
      </span>
      <span className="flex gap-2 items-center">
        <TrendingDown
          fill="#353535ff"
          className="stroke-muted-foreground w-4 h-4"
        />
        <span className="block -mb-0.5 font-medium">Low</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {lowTide ?? "--"} <span className="inline-block">ft</span>
      </span>
    </div>
  );
};

const WaveEnergyStatsHeader = ({ beachId, date }: { beachId: string; date?: Date }) => {
  const [highEnergy, setHighEnergy] = React.useState<string | null>(null);
  const [lowEnergy, setLowEnergy] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const loadEnergyStats = async () => {
      try {
        const HOURS_TO_MS = 60 * 60 * 1000;
        const hours = 24;

        let start = new Date();
        let end = new Date(start.getTime() + hours * HOURS_TO_MS);
        if (date instanceof Date) {
          start = getPacificMidnightUTC(date);
          end = new Date(start.getTime() + hours * HOURS_TO_MS);
        }

        const rows = await fetchBeachForecast(beachId, start, end);
        if (cancelled) return;

        const energyValues = rows
          .map(r => r.surf.waveEnergy)
          .filter((v): v is number => typeof v === 'number' && !isNaN(v));

        if (energyValues.length > 0) {
          const high = Math.max(...energyValues);
          const low = Math.min(...energyValues);

          if (!cancelled) {
            setHighEnergy(high.toFixed(0));
            setLowEnergy(low.toFixed(0));
          }
        }
      } catch (e) {
        console.error("Failed to load wave energy stats", e);
      }
    };

    void loadEnergyStats();

    return () => {
      cancelled = true;
    };
  }, [beachId, date]);

  return (
    <div className="grid rounded-md bg-highlight-5 grid-cols-[60px_1fr] grid-rows-2 gap-y-0.5 items-center text-xs text-muted-foreground uppercase tracking-wide leading-tight px-2 py-1.5">
      <span className="flex gap-2 items-center">
        <TrendingUp
          fill="#353535ff"
          className="stroke-muted-foreground w-4 h-4"
        />
        <span className="block font-medium">High</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {highEnergy ?? "--"} <span className="inline-block">kJ</span>
      </span>
      <span className="flex gap-2 items-center">
        <TrendingDown
          fill="#353535ff"
          className="stroke-muted-foreground w-4 h-4"
        />
        <span className="block -mb-0.5 font-medium">Low</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {lowEnergy ?? "--"} <span className="inline-block">kJ</span>
      </span>
    </div>
  );
};

const WindStatsHeader = ({ beachId, date }: { beachId: string; date?: Date }) => {
  const [highWind, setHighWind] = React.useState<string | null>(null);
  const [lowWind, setLowWind] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const loadWindStats = async () => {
      try {
        const HOURS_TO_MS = 60 * 60 * 1000;
        const hours = 24;

        let start = new Date();
        let end = new Date(start.getTime() + hours * HOURS_TO_MS);
        if (date instanceof Date) {
          start = getPacificMidnightUTC(date);
          end = new Date(start.getTime() + hours * HOURS_TO_MS);
        }

        const rows = await fetchBeachForecast(beachId, start, end);
        if (cancelled) return;

        const windValues = rows
          .map(r => r.conditions.windSpeed)
          .filter((v): v is number => typeof v === 'number' && !isNaN(v));

        if (windValues.length > 0) {
          const high = Math.max(...windValues);
          const low = Math.min(...windValues);

          if (!cancelled) {
            setHighWind(high.toFixed(0));
            setLowWind(low.toFixed(0));
          }
        }
      } catch (e) {
        console.error("Failed to load wind stats", e);
      }
    };

    void loadWindStats();

    return () => {
      cancelled = true;
    };
  }, [beachId, date]);

  return (
    <div className="grid rounded-md bg-highlight-5 grid-cols-[60px_1fr] grid-rows-2 gap-y-0.5 items-center text-xs text-muted-foreground uppercase tracking-wide leading-tight px-2 py-1.5">
      <span className="flex gap-2 items-center">
        <TrendingUp
          fill="#353535ff"
          className="stroke-muted-foreground w-4 h-4"
        />
        <span className="block font-medium">High</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {highWind ?? "--"} <span className="inline-block">mph</span>
      </span>
      <span className="flex gap-2 items-center">
        <TrendingDown
          fill="#353535ff"
          className="stroke-muted-foreground w-4 h-4"
        />
        <span className="block -mb-0.5 font-medium">Low</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {lowWind ?? "--"} <span className="inline-block">mph</span>
      </span>
    </div>
  );
};

const SurfStatsHeader = ({ beachId, date }: { beachId: string; date?: Date }) => {
  const [highSurf, setHighSurf] = React.useState<string | null>(null);
  const [lowSurf, setLowSurf] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const loadSurfStats = async () => {
      try {
        const HOURS_TO_MS = 60 * 60 * 1000;
        const hours = 24;

        let start = new Date();
        let end = new Date(start.getTime() + hours * HOURS_TO_MS);
        if (date instanceof Date) {
          start = getPacificMidnightUTC(date);
          end = new Date(start.getTime() + hours * HOURS_TO_MS);
        }

        const rows = await fetchBeachForecast(beachId, start, end);
        if (cancelled) return;

        // Calculate representative surf values the same way the chart does
        const surfValues = rows.map(r => {
          const h1 = r.swell.primary.height ?? 0;
          const p1 = r.swell.primary.period ?? 10;
          const h2 = r.swell.secondary.height ?? 0;
          const p2 = r.swell.secondary.period ?? 10;
          const h3 = r.swell.tertiary?.height ?? 0;
          const p3 = r.swell.tertiary?.period ?? 10;
          const s1 = h1 * Math.sqrt(Math.max(0, p1) / 10);
          const s2 = h2 * Math.sqrt(Math.max(0, p2) / 10);
          const s3 = h3 * Math.sqrt(Math.max(0, p3) / 10);
          const w1 = 1.0, w2 = 0.6, w3 = 0.3;
          const combined = Math.sqrt(
            Math.pow(w1 * s1, 2) + Math.pow(w2 * s2, 2) + Math.pow(w3 * s3, 2)
          );
          const wind = r.conditions.windSpeed ?? 0;
          const windPenalty = Math.min(0.5, Math.max(0, (wind - 5) / 35));
          const effective = Math.max(0, combined * (1 - windPenalty));

          // Calculate estimate from heightMin/heightMax
          const min = r.surf.heightMin ?? 0;
          const max = r.surf.heightMax ?? 0;
          const estimate = min > 0 && max > 0 ? (min + max) / 2 : max;

          let representative = effective;
          if (!Number.isFinite(representative) || representative <= 0) {
            representative = estimate > 0 ? estimate : 0;
          } else if (estimate > 0) {
            representative = representative * 0.7 + estimate * 0.3;
          }

          return Math.max(0, representative);
        }).filter((v): v is number => typeof v === 'number' && !isNaN(v));

        if (surfValues.length > 0) {
          const high = Math.max(...surfValues);
          const low = Math.min(...surfValues);

          if (!cancelled) {
            setHighSurf(high.toFixed(1));
            setLowSurf(low.toFixed(1));
          }
        }
      } catch (e) {
        console.error("Failed to load surf stats", e);
      }
    };

    void loadSurfStats();

    return () => {
      cancelled = true;
    };
  }, [beachId, date]);

  return (
    <div className="grid rounded-md bg-highlight-5 grid-cols-[60px_1fr] grid-rows-2 gap-y-0.5 items-center text-xs text-muted-foreground uppercase tracking-wide leading-tight px-2 py-1.5">
      <span className="flex gap-2 items-center">
        <TrendingUp
          fill="#353535ff"
          className="stroke-muted-foreground w-4 h-4"
        />
        <span className="block font-medium">High</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {highSurf ?? "--"} <span className="inline-block">ft</span>
      </span>
      <span className="flex gap-2 items-center">
        <TrendingDown
          fill="#353535ff"
          className="stroke-muted-foreground w-4 h-4"
        />
        <span className="block -mb-0.5 font-medium">Low</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {lowSurf ?? "--"} <span className="inline-block">ft</span>
      </span>
    </div>
  );
};

const SwellStatsHeader = ({ beachId, date }: { beachId: string; date?: Date }) => {
  const [highSwell, setHighSwell] = React.useState<string | null>(null);
  const [lowSwell, setLowSwell] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const loadSwellStats = async () => {
      try {
        const HOURS_TO_MS = 60 * 60 * 1000;
        const hours = 24;

        let start = new Date();
        let end = new Date(start.getTime() + hours * HOURS_TO_MS);
        if (date instanceof Date) {
          start = getPacificMidnightUTC(date);
          end = new Date(start.getTime() + hours * HOURS_TO_MS);
        }

        const rows = await fetchBeachForecast(beachId, start, end);
        if (cancelled) return;

        const swellValues = rows
          .map(r => r.swell.primary.height)
          .filter((v): v is number => typeof v === 'number' && !isNaN(v));

        if (swellValues.length > 0) {
          const high = Math.max(...swellValues);
          const low = Math.min(...swellValues);

          if (!cancelled) {
            setHighSwell(high.toFixed(1));
            setLowSwell(low.toFixed(1));
          }
        }
      } catch (e) {
        console.error("Failed to load swell stats", e);
      }
    };

    void loadSwellStats();

    return () => {
      cancelled = true;
    };
  }, [beachId, date]);

  return (
    <div className="grid rounded-md bg-highlight-5 grid-cols-[60px_1fr] grid-rows-2 gap-y-0.5 items-center text-xs text-muted-foreground uppercase tracking-wide leading-tight px-2 py-1.5">
      <span className="flex gap-2 items-center">
        <TrendingUp
          fill="#353535ff"
          className="stroke-muted-foreground w-4 h-4"
        />
        <span className="block font-medium">High</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {highSwell ?? "--"} <span className="inline-block">ft</span>
      </span>
      <span className="flex gap-2 items-center">
        <TrendingDown
          fill="#353535ff"
          className="stroke-muted-foreground w-4 h-4"
        />
        <span className="block -mb-0.5 font-medium">Low</span>
      </span>
      <span className="ml-1 text-foreground normal-case font-medium">
        {lowSwell ?? "--"} <span className="inline-block">ft</span>
      </span>
    </div>
  );
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
            <VisualWrapper
              label="Tide"
              headerContent={<TideStatsHeader beachId={beachId} date={selected ?? undefined} />}
            >
              <LazyLoadTide beachId={beachId} date={selected ?? undefined} />
            </VisualWrapper>
          );
        case "wind":
          return (
            <VisualWrapper
              label="Wind"
              headerContent={<WindStatsHeader beachId={beachId} date={selected ?? undefined} />}
            >
              <LazyLoadWind beachId={beachId} date={selected ?? undefined} />
            </VisualWrapper>
          );
        case "swell":
          return (
            <VisualWrapper
              label="Swell"
              headerContent={<SwellStatsHeader beachId={beachId} date={selected ?? undefined} />}
            >
              <LazyLoadSwell beachId={beachId} date={selected ?? undefined} />
            </VisualWrapper>
          );
        case "surf":
          return (
            <VisualWrapper
              label="Surf"
              headerContent={<SurfStatsHeader beachId={beachId} date={selected ?? undefined} />}
            >
              <LazyLoadSurf beachId={beachId} date={selected ?? undefined} />
            </VisualWrapper>
          );
        case "energy":
          return (
            <VisualWrapper
              label="Wave Energy"
              headerContent={<WaveEnergyStatsHeader beachId={beachId} date={selected ?? undefined} />}
            >
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
              className="@min-xl:hidden inline-flex bg-highlight-5 hover:bg-highlight-3 rounded-full p-3 @min-sm:py-2 gap-2 @min-sm:px-4 shrink-0"
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

        {/* Overview content - hidden when forecast is active */}
        <div className={isOverview ? "" : "hidden"}>
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
        </div>

        {/* Forecast content - hidden when overview is active */}
        <div className={isOverview ? "hidden" : ""}>
          <ForecastChartProvider>
            <ForecastBridge
              beachId={beachId}
              hideHeader
              onWindowStringChange={setForecastWindow}
            />
          </ForecastChartProvider>
        </div>
      </section>
    </>
  );
};

export default DateSummaryBridge;
