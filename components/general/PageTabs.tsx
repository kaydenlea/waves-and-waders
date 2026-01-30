"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { cn } from "@/lib/utils";
import PeekingSideTab from "./PeekingSideTab";
import SaveButton from "./SaveButton";
import { useMapUI } from "../context/MapFilterContext";
import { Calendar1, CalendarDays, CircleCheck, MapPinned, Pencil } from "lucide-react";
import { useClientPath } from "../context/PathContext";
import { poppins } from "@/lib/fonts";
import { useDashboardEditMode } from "@/components/context/DashboardEditModeContext";

type PageTabsProps = {
  beach?: string;
  beachId?: string;
  defaultPage?: string;
  tabs: string[];
  buttons?: boolean;
  isFavorite?: boolean;
  beachPage?: boolean;
  forecastPage?: boolean;
  overviewPage?: boolean;
  loggedIn?: boolean;
  className?: string;
  placement?: "default" | "inline";
  fullWidth?: boolean;
  responsiveFull?: boolean;
  onEditDone?: () => void;
};

const PageTabs = ({
  beach,
  beachId,
  tabs,
  buttons = true,
  isFavorite = false,
  beachPage = false,
  forecastPage = false,
  overviewPage = false,
  loggedIn = false,
  className,
  placement = "default",
  fullWidth = false,
  responsiveFull = false,
  onEditDone,
}: PageTabsProps) => {
  const router = useRouter();
  const [favorite, setFavorite] = useState(isFavorite);
  const [isDesktop, setIsDesktop] = useState(false);
  const { selectedTab, setSelectedTab } = useClientPath();
  const { showMap, setShowMap } = useMapUI();
  const { enterEdit, isEditing, confirm } = useDashboardEditMode();

  const tabsRef = useRef<HTMLDivElement>(null);
  const normalizedTabs = tabs.map((tab) => tab.toLowerCase());
  const tabCount = Math.max(1, tabs.length);
  const activeIndexRaw = normalizedTabs.indexOf(selectedTab);
  const activeIndex = activeIndexRaw >= 0 ? activeIndexRaw : 0;

  useEffect(() => {
    const adjustScreenSize = () => {
      if (typeof window === "undefined") return;
      setIsDesktop(window.innerWidth >= 911);
    };

    adjustScreenSize();

    const handleWindowResize = () => adjustScreenSize();
    window.addEventListener("resize", handleWindowResize);

    const tabs = tabsRef.current;
    const observer =
      tabs != null
        ? new ResizeObserver(() => {
            adjustScreenSize();
          })
        : null;

    if (tabs && observer) {
      observer.observe(tabs);
    }

    return () => {
      window.removeEventListener("resize", handleWindowResize);
      observer?.disconnect();
    };
  }, []);

  // Set a default only if no tab has been selected/restored yet.
  useEffect(() => {
    if (selectedTab !== "") return;
    if (overviewPage || forecastPage) return;
    setSelectedTab("nearby");
  }, [selectedTab, overviewPage, forecastPage, setSelectedTab]);

  // If user is not logged in and Saved is active on the beaches page, redirect to login.
  useEffect(() => {
    if (!beachPage) return;
    if (loggedIn) return;
    if (selectedTab !== "saved") return;

    // If Saved is active only due to persisted local state, don't hijack `/beaches`.
    // Only redirect when the user explicitly requested Saved via `?tab=saved`.
    const explicitSaved =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("tab") === "saved";
    if (!explicitSaved) {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("tab:/beaches", "nearby");
        }
      } catch {}
      setSelectedTab("nearby");
      return;
    }

    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("tab:/beaches", "nearby");
      }
    } catch {}
    setSelectedTab("nearby");
    router.push(`/login?next=${encodeURIComponent("/beaches?tab=saved")}`);
  }, [beachPage, loggedIn, selectedTab, router, setSelectedTab]);

  useEffect(() => {
    setFavorite(isFavorite);
  }, [isFavorite]);

  const showSaveButton = Boolean(buttons && beachId && placement === "default");

  return (
    <div
      ref={tabsRef}
      className={cn(
        `${poppins.variable} font-poppins antialiased touch-none`,
        placement === "inline"
          ? "flex w-full items-center gap-1 @min-sm:gap-2 justify-center @min-xl:ml-auto @min-xl:justify-end @min-xl:w-auto"
          : "mx-auto flex gap-1 @min-sm:gap-2 w-full justify-center",
        placement === "default" &&
          (beachPage
            ? "hidden @min-4xl:block absolute left-0 top-0 shadow-lg bg-highlight-3/80 backdrop-blur z-[1000]"
            : "@min-3xl:absolute @min-3xl:right-0 @min-3xl:justify-end"),
        className
      )}
    >
      {buttons && (
        <>
          {/* Reopen map button (floating, only when map is minimized on desktop) */}
          {!beachPage &&
            (overviewPage || forecastPage) &&
            !showMap &&
            isDesktop && <PeekingSideTab onClick={() => setShowMap(true)} />}
          <div className="w-full hidden @min-md:block @min-xl:hidden max-w-45">
            <span
              className={cn(
                "flex items-center justify-center gap-2 rounded-full px-4 py-3 text-center text-sm font-medium",
                "border border-border/25 bg-highlight-7/70 text-foreground shadow-even",
                "supports-[backdrop-filter]:bg-highlight-7/40 supports-[backdrop-filter]:backdrop-blur-md"
              )}
            >
              {forecastPage ? (
                <CalendarDays className="w-5 h-5 mb-0.5" />
              ) : (
                <Calendar1 className="w-5 h-5 mb-0.5" />
              )}
              <span>{`${forecastPage ? 4 : 1} day range`}</span>
            </span>
          </div>
          {(forecastPage || overviewPage) && beachId && (
            <>
              {overviewPage && !beachPage && !showMap && isDesktop && (
                <button
                  type="button"
                  onClick={() => setShowMap(true)}
                  className={cn(
                    "hidden @min-xl:inline-flex items-center gap-1.5 rounded-full",
                    "border border-border/25 bg-highlight-7 shadow-even",
                    "supports-[backdrop-filter]:backdrop-blur-md",
                    "hover:bg-highlight-6/60 transition-colors duration-200 motion-reduce:transition-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:ring-offset-0",
                    "p-3 @min-2xl:py-2.5 @min-2xl:px-4"
                  )}
                  aria-label="Show map"
                  title="Show map"
                >
                  <MapPinned className="stroke-[2.5px] w-4.5 h-4.5 @min-2xl:mb-0.5" />
                  <span className="font-medium hidden @min-2xl:inline-block text-[15px]">
                    Map
                  </span>
                </button>
              )}
              {(() => {
                const editType =
                  selectedTab === "forecast" ? "forecast" : "overview";
                const nextTarget =
                  selectedTab === "forecast"
                    ? `/${beachId}/forecast/edit#forecast-content`
                    : `/${beachId}/overview/edit#overview-content`;

                const className = cn(
                  "hidden @min-xl:inline-flex items-center gap-1.5 rounded-full",
                  "border border-border/25 bg-highlight-7 shadow-even",
                  "supports-[backdrop-filter]:backdrop-blur-md",
                  "hover:bg-highlight-6/60 transition-colors duration-200 motion-reduce:transition-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 focus-visible:ring-offset-0",
                  "p-3 @min-2xl:py-2.5 @min-2xl:px-4"
                );

                if (!loggedIn) {
                  return (
                    <Link
                      href={`/login?next=${encodeURIComponent(nextTarget)}`}
                      className={className}
                      aria-label={`Edit ${editType} dashboard`}
                      title={`Edit ${editType} dashboard`}
                    >
                      <Pencil className="stroke-[2.5px] w-4.5 h-4.5 @min-2xl:mb-0.5" />
                      <span className="font-medium hidden @min-2xl:inline-block text-[15px]">
                        Edit
                      </span>
                    </Link>
                  );
                }

                if (isEditing) {
                  return (
                    <button
                      type="button"
                      className={className}
                      title={`Done editing ${editType} dashboard`}
                      aria-label={`Done editing ${editType} dashboard`}
                      onClick={onEditDone ?? confirm}
                    >
                      <CircleCheck className="stroke-[2.5px] w-4.5 h-4.5 @min-2xl:mb-0.5" />
                      <span className="font-medium hidden @min-2xl:inline-block text-[15px]">
                        Done
                      </span>
                    </button>
                  );
                }

                return (
                  <button
                    type="button"
                    className={className}
                    title={`Edit ${editType} dashboard`}
                    aria-label={`Edit ${editType} dashboard`}
                    onClick={() => {
                      enterEdit(editType);

                      // Dedicated forecast/overview routes should jump to the combined
                      // editor on the overview route.
                      if (forecastPage && !overviewPage) {
                        const targetBase = beach ? `/${beach}/overview` : null;
                        if (!targetBase) return;
                        router.push(
                          `${targetBase}?tab=${encodeURIComponent(
                            selectedTab
                          )}`,
                          { scroll: false }
                        );
                      }
                    }}
                  >
                    <Pencil className="stroke-[2.5px] w-4.5 h-4.5 @min-2xl:mb-0.5" />
                    <span className="font-medium hidden @min-2xl:inline-block text-[15px]">
                      Edit
                    </span>
                  </button>
                );
              })()}
            </>
          )}
          {showSaveButton && (
            <SaveButton
              beachId={beachId!}
              isFav={favorite}
              onChange={setFavorite}
              className="hidden @min-3xl:block"
            />
          )}
        </>
      )}
      <div
        className={cn(
          "relative flex rounded-full p-1 @min-sm:text-base text-sm font-medium",
          "border border-border/25 bg-highlight-7/70 shadow-even",
          "supports-[backdrop-filter]:bg-highlight-7/70 supports-[backdrop-filter]:dark:bg-highlight-7/40 supports-[backdrop-filter]:backdrop-blur-md",
          responsiveFull
            ? "w-full @min-xl:w-fit"
            : fullWidth
            ? "w-full"
            : "w-fit",
          beachPage &&
            "hidden @min-4xl:block absolute left-3 top-3 shadow-lg bg-highlight-3/80 backdrop-blur z-[1000]"
        )}
      >
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-y-1 left-1 z-0 rounded-full bg-highlight-3/50 dark:bg-highlight-5/80 shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none",
            beachPage && "bg-background"
          )}
          style={{
            width: `calc((100% - 0.5rem) / ${tabCount})`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
        {tabs.map((tab) => {
          const normalizedTab = tab.toLowerCase();
          const isActive = selectedTab === normalizedTab;
          // const href =
          //   tab.toLowerCase() === "overview"
          //     ? beach
          //       ? `/${beach}/overview`
          //       : "/beaches"
          //     : beach
          //     ? `/${beach}/forecast`
          //     : "/beaches?tab=saved";

          return (
            <button
              onClick={() => {
                const next = tab.toLowerCase();
                if (beachPage && next === "saved" && !loggedIn) {
                  // Redirect unauthenticated users to login when selecting Saved on beaches page
                  router.push(
                    `/login?next=${encodeURIComponent("/beaches?tab=saved")}`
                  );
                  return;
                }
                setSelectedTab(next);

                // Keep URL/tab state in sync for overview/forecast dashboards to avoid
                // flicker on refresh and allow deep-linking.
                if (overviewPage && !beachPage) {
                  // Combined overview/forecast dashboard on the overview route.
                  // Keep tab in the query string but avoid hash-based scrolling.
                  if (!beach) return;
                  const base = `/${beach}/overview`;
                  const tabParam = next;
                  const href = `${base}?tab=${encodeURIComponent(tabParam)}`;
                  startTransition(() => {
                    router.push(href, { scroll: false });
                  });
                  return;
                }

                if (forecastPage && !overviewPage && beach) {
                  // Dedicated forecast page: switch routes between overview/forecast.
                  if (next === "overview") {
                    startTransition(() => {
                      router.push(`/${beach}/overview`, { scroll: false });
                    });
                    return;
                  }
                  if (next === "forecast") {
                    startTransition(() => {
                      router.push(`/${beach}/forecast`, { scroll: false });
                    });
                    return;
                  }
                }
              }}
              type="button"
              aria-label={`${tab} tab`}
              title={`Open ${tab} tab`}
              key={tab}
              className={cn(
                "relative z-10 flex-1 rounded-full px-4 py-1 text-center capitalize transition-colors duration-300",
                responsiveFull && "py-2",
                fullWidth ? "py-1.5 min-w-0" : "w-27",
                isActive
                  ? beachPage
                    ? "text-foreground font-medium"
                    : "text-foreground font-semibold"
                  : "text-foreground/80 hover:text-foreground"
              )}
            >
              <span className="relative z-10">{tab}</span>
            </button>
          );
        })}
      </div>
      {/* <div className="text-sm @min-sm:text-base font-medium p-1.5 flex bg-highlight-3 rounded-full border border-border/20">
        <Link
          className={cn(
            "px-3 py-1 rounded-full capitalize",
            defaultPage === tabs[0]
              ? "bg-background dark:bg-highlight-5"
              : "hover:bg-background/50 dark:hover:bg-highlight-5/50"
          )}
          href={beach ? `/${beach}/overview` : "/beaches"}
        >
          {tabs[0]}
        </Link>
        <Link
          className={cn(
            "px-3 py-1 rounded-full capitalize",
            defaultPage === tabs[1]
              ? "bg-background dark:bg-highlight-5"
              : "hover:bg-background/50 dark:hover:bg-highlight-5/50"
          )}
          href={beach ? `/${beach}/forecast` : "/beaches?tab=saved"}
        >
          {tabs[1]}
        </Link>
      </div> */}
      {showSaveButton && (
        <SaveButton
          beachId={beachId!}
          isFav={favorite}
          onChange={setFavorite}
          className="@min-3xl:hidden"
        />
      )}
    </div>
  );
};

export default PageTabs;
