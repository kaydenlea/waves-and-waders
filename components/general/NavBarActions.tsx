"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LazyLoadDatePicker } from "./LazyLoad/LazyLoadDatePicker";
import SearchBar from "./SearchBar";
import { useOptionalDateContext } from "../context/DateContext";
import { LazyLoadHourSlider } from "./LazyLoad/LazyLoadHourSlider";
import { Calendar, Clock, MapIcon, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchContext } from "../context/SearchContext";
import { useClientPath } from "../context/PathContext";
import TimeRail from "./TimeRail";

const NavBarActions = () => {
  const pathname = usePathname();
  const router = useRouter();
  const homePage = pathname === "/";
  const beachesPage = pathname.endsWith("/beaches");
  const dateCtx = useOptionalDateContext();
  const { setIsOverlay } = useSearchContext();
  const { selectedTab } = useClientPath();

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

  // Keep DateContext's `id` ref in sync during client-side navigation so any
  // other consumers (outside the page content) don't get stuck on a previous beach.
  useEffect(() => {
    if (!dateCtx) return;
    if (!beachIdFromPath) return;
    if (dateCtx.id.current !== beachIdFromPath) {
      dateCtx.id.current = beachIdFromPath;
    }
  }, [beachIdFromPath, dateCtx]);

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
  const effectiveBeachId = beachIdFromPath ?? id.current ?? "";

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
            trailingActions={
              <button
                type="button"
                aria-label="search"
                onClick={() => setIsOverlay(true)}
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
        onClick={() => setIsOverlay(true)}
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
            onSelect={setSelected}
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
