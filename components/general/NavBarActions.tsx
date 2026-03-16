"use client";

import { startTransition, useCallback, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { LazyLoadDatePicker } from "./LazyLoad/LazyLoadDatePicker";
import SearchBar from "./SearchBar";
import { useOptionalDateContext } from "../context/DateContext";
import { LazyLoadHourSlider } from "./LazyLoad/LazyLoadHourSlider";
import { Calendar, Clock, PlusCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOptionalSearchContext } from "../context/SearchContext";
import { useClientPath } from "../context/PathContext";
import { useOptionalOverviewSurface } from "../context/OverviewSurfaceContext";
import TimeRail from "./TimeRail";
import {
  FISHING_SPECIES_LABELS,
  useFishingIntelligenceData,
} from "@/lib/community/fishingIntelligence";

const titleCaseSlug = (value: string) =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const compactTimeRange = (value: string | null) => {
  if (!value) return null;

  const normalized = value
    .replace(/Ã¢â‚¬â€œ|â€“|–|—/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const match = normalized.match(
    /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i,
  );

  if (!match) {
    return normalized
      .replace(/:00/g, "")
      .replace(/\s*-\s*/g, "-")
      .replace(/\s*AM/gi, "A")
      .replace(/\s*PM/gi, "P");
  }

  const [
    ,
    startHourRaw,
    startMinuteRaw,
    startMeridiemRaw,
    endHourRaw,
    endMinuteRaw,
    endMeridiemRaw,
  ] = match;

  const startHour = String(Number(startHourRaw));
  const endHour = String(Number(endHourRaw));
  const startMinute = startMinuteRaw ?? "00";
  const endMinute = endMinuteRaw ?? "00";
  const startMeridiem = startMeridiemRaw.toUpperCase();
  const endMeridiem = endMeridiemRaw.toUpperCase();
  const startValue =
    startMinute === "00" ? startHour : `${startHour}:${startMinute}`;
  const endValue = endMinute === "00" ? endHour : `${endHour}:${endMinute}`;

  if (startMeridiem === endMeridiem) {
    return `${startValue}-${endValue}${endMeridiem === "AM" ? "A" : "P"}`;
  }

  return `${startValue}${startMeridiem === "AM" ? "A" : "P"}-${endValue}${endMeridiem === "AM" ? "A" : "P"}`;
};

const getCompactSpeciesLabel = (value: string | undefined) => {
  switch (value) {
    case "Calico Bass":
      return "Calico";
    default:
      return value ?? "Fishing";
  }
};

const getFishingTrendState = (
  value: string | undefined,
): "rising" | "steady" | "cooling" | null => {
  switch (value) {
    case "heating_up":
    case "emerging":
      return "rising";
    case "cooling_down":
      return "cooling";
    case "steady":
      return "steady";
    default:
      return null;
  }
};

const NavBarActions = () => {
  const pathname = usePathname();
  const homePage = pathname === "/";
  const beachesPage = pathname.endsWith("/beaches");
  const dateCtx = useOptionalDateContext();
  const setIsOverlay = useOptionalSearchContext()?.setIsOverlay;
  const { selectedTab } = useClientPath();
  const overviewSurface = useOptionalOverviewSurface();

  const beachIdFromPath = (() => {
    const parts = (pathname ?? "").split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const section = parts[1];
    if (section !== "overview" && section !== "forecast") return null;
    const raw = parts[0];
    if (!raw) return null;
    const delimiterIndex = raw.lastIndexOf("--");
    return delimiterIndex >= 0 ? raw.slice(delimiterIndex + 2) : raw;
  })();
  const beachNameFromPath = (() => {
    const parts = (pathname ?? "").split("/").filter(Boolean);
    const raw = parts[0];
    if (!raw) return undefined;
    const delimiterIndex = raw.lastIndexOf("--");
    const slug = delimiterIndex >= 0 ? raw.slice(0, delimiterIndex) : raw;
    return slug ? titleCaseSlug(decodeURIComponent(slug)) : undefined;
  })();

  // Keep DateContext's `id` ref in sync during client-side navigation so any
  // other consumers (outside the page content) don't get stuck on a previous beach.
  useEffect(() => {
    if (!dateCtx) return;
    if (!beachIdFromPath) return;
    if (dateCtx.id.current !== beachIdFromPath) {
      dateCtx.id.current = beachIdFromPath;
    }
  }, [beachIdFromPath, dateCtx]);

  const effectiveBeachId = beachIdFromPath ?? dateCtx?.id.current ?? "";
  const fishingData = useFishingIntelligenceData(beachNameFromPath);
  const fishingRailSummary = useMemo(() => {
    if (overviewSurface?.overviewSurfaceTab !== "fishing") return null;
    const data = fishingData.data;
    const leadSpecies = data.speciesMomentum[0] ?? null;
    const leadWindow = data.timeWindows[0] ?? null;
    return {
      activityCount: data.confidenceSummary.recentReports,
      activityValue: `${data.confidenceSummary.recentReports} reports`,
      speciesValue: leadSpecies
        ? getCompactSpeciesLabel(FISHING_SPECIES_LABELS[leadSpecies.species])
        : "Fishing signal",
      windowValue: compactTimeRange(leadWindow?.timeRange ?? null) ?? "--",
      speciesTrend: getFishingTrendState(leadSpecies?.trend),
      hasAccessWatch: Boolean(data.accessAlerts[0]),
    };
  }, [fishingData.data, overviewSurface?.overviewSurfaceTab]);
  const handleDateSelect = useCallback(
    (next: Date) => {
      if (!dateCtx) return;
      startTransition(() => {
        dateCtx.setSelected(next);
      });
    },
    [dateCtx],
  );

  if (!dateCtx) {
    if (homePage || beachesPage) {
      return (
        <SearchBar
          beachesPage={beachesPage}
          className={cn(
            "sm:max-w-none",
            beachesPage ? "flex" : "max-w-[12rem] hidden @min-4xl:flex"
          )}
        />
      );
    }
    return null;
  }

  const { id, selected, setSelected, hour, setHour, mode, setMode } = dateCtx;

  // Note: In NavBarActions, we only update the DateContext hour
  // The MapFilterContext syncing happens elsewhere (e.g., DateSummaryBridge)
  // So we can just update setHour immediately without debouncing here
  // since the expensive operations are already handled by React Query caching

  if (homePage || beachesPage) {
    return (
      <SearchBar
        beachesPage={beachesPage}
        className={cn(
          "sm:max-w-none",
          beachesPage ? "flex" : "max-w-[12rem] hidden @min-4xl:flex"
        )}
      />
    );
  }

  // Overview: shared TimeRail + compact search
  if (pathname?.includes("/overview")) {
    return (
      <div
        className={
          "w-full flex items-center justify-center flex-1 @min-4xl:mx-8"
        }
      >
        <div className="flex-1 min-w-0 w-full @min-4xl:max-w-[820px] mx-auto flex items-center gap-2">
          <TimeRail
            beachId={effectiveBeachId}
            size="lg"
            surfaceMode={
              overviewSurface?.overviewSurfaceTab === "fishing"
                ? "fishing"
                : "surf"
            }
            fishingSummary={fishingRailSummary}
            leadingActions={
              overviewSurface?.overviewSurfaceTab === "fishing" ? (
                <button
                  type="button"
                  aria-label="Create a fishing report"
                  onClick={() => overviewSurface.openFishingComposer?.()}
                  className="group/button inline-flex h-9 items-center justify-center gap-1 rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 px-2.5 text-[11px] font-semibold text-foreground shadow-md shadow-cyan-500/20 transition hover:scale-[1.03] hover:shadow-lg hover:shadow-cyan-500/30 active:scale-[0.98] @min-lg:px-3 @min-lg:text-[12px]"
                >
                  <PlusCircle
                    className="h-4 w-4 transition-transform group-hover/button:scale-[1.05]"
                    strokeWidth={2.6}
                  />
                  <span className="hidden @min-xl:inline">New report</span>
                </button>
              ) : undefined
            }
            trailingActions={
              <button
                type="button"
                aria-label="search"
                onClick={() => setIsOverlay?.(true)}
                className="group/button hover:scale-[1.03] inline-flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 px-3 py-2 font-medium text-foreground shadow-md shadow-cyan-500/20 transition active:scale-[0.98]"
              >
                <Search className="h-5 w-5" strokeWidth={3} />
              </button>
            }
          />
        </div>
      </div>
    );
  }

  // Default: search + date/hour control + toggle
  return (
    <div
      className={"w-full flex gap-3 items-center max-w-250 mx-0 @min-4xl:mx-16"}
    >
      <button
        type="button"
        aria-label="search"
        onClick={() => setIsOverlay?.(true)}
        className="group/button hover:scale-[1.05] hidden @min-4xl:inline-flex items-center gap-1 rounded-3xl bg-gradient-to-br from-cyan-300 to-blue-500 p-3 font-medium text-foreground shadow-lg shadow-cyan-500/30 transition active:scale-[0.98]"
      >
        <Search
          className="h-6 w-6 group-hover/button:scale-[1.05]"
          strokeWidth={3}
        />
      </button>
      <div className="@container flex-1 min-w-0 w-full">
        {mode === "date" || selectedTab === "forecast" ? (
          <LazyLoadDatePicker
            className="w-full"
            beachId={effectiveBeachId}
            {...(selectedTab === "forecast" && { forecast: true })}
            value={selected}
            onSelect={handleDateSelect}
          />
        ) : (
          <LazyLoadHourSlider
            className="w-full"
            beachId={effectiveBeachId}
            date={selected}
            value={hour}
            onChange={setHour}
            min={0}
            max={21}
            step={3}
          />
        )}
      </div>
      {selectedTab === "overview" && !beachesPage && (
        <button
          onClick={() => setMode(mode === "date" ? "hour" : "date")}
          className={cn(
            "hidden @min-md:flex icon-button py-2 min-w-18 rounded-3xl bg-background dark:bg-highlight-5 hover:bg-highlight-3 dark:hover:bg-highlight-3 flex-col items-center justify-center"
          )}
        >
          {mode === "date" ? (
            <Calendar className="w-6 h-6 mx-auto" />
          ) : (
            <Clock className="w-6 h-6 mx-auto" />
          )}
          <span className="text-sm font-medium text-center">
            {mode === "date" ? "Day" : "Hour"}
          </span>
        </button>
      )}
    </div>
  );
};

export default NavBarActions;
