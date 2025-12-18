"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { cn } from "@/lib/utils";
import FocusMapButton from "./FocusMapButton";
import SaveButton from "./SaveButton";
import { useMapFilters } from "../context/MapFilterContext";
import {
  ArrowLeftFromLine,
  Calendar1,
  CalendarDays,
  MapPinned,
  Pencil,
} from "lucide-react";
import { motion } from "motion/react";
import { useClientPath } from "../context/PathContext";
import { poppins } from "@/lib/fonts";

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
};

const PageTabs = ({
  beach,
  beachId,
  defaultPage,
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
}: PageTabsProps) => {
  const router = useRouter();
  const [favorite, setFavorite] = useState(isFavorite);
  const [isDesktop, setIsDesktop] = useState(false);
  const { selectedTab, setSelectedTab } = useClientPath();
  const { showMap, setShowMap } = useMapFilters();

  const tabsRef = useRef<HTMLDivElement>(null);

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
    setSelectedTab(overviewPage ? "overview" : "nearby");
  }, [selectedTab, overviewPage, setSelectedTab]);

  // If user is not logged in and Saved is active on the beaches page, redirect to login.
  useEffect(() => {
    if (!beachPage) return;
    if (loggedIn) return;
    if (selectedTab !== "saved") return;
    router.push(`/login?next=${encodeURIComponent("/beaches?tab=saved")}`);
  }, [beachPage, loggedIn, selectedTab, router]);

  useEffect(() => {
    setFavorite(isFavorite);
  }, [isFavorite]);

  const showSaveButton = Boolean(buttons && beachId && placement === "default");

  return (
    <div
      ref={tabsRef}
      className={cn(
        `${poppins.variable} font-poppins antialiased`,
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
          {/* Reopen map button (left-most when visible) */}
          {!showMap && isDesktop && (
            <button
              type="button"
              aria-label="Reopen map"
              className={cn(
                "bg-highlight-5 hover:bg-highlight-3 rounded-full py-2.5 px-4 disabled:opacity-50 disabled:hover:bg-highlight-5 flex gap-1.5"
              )}
              onClick={() => setShowMap(!showMap)}
            >
              {showMap ? (
                <ArrowLeftFromLine className="w-6 h-6 @min-sm:w-6 @min-sm:h-6" />
              ) : (
                <MapPinned className="w-5 h-5 @min-sm:w-5 @min-sm:h-5" />
              )}
              <span className="font-medium text-[15px]">Zoom</span>
            </button>
          )}
          <div className="w-full hidden @min-md:block @min-xl:hidden bg-highlight-3 p-1 rounded-3xl max-w-45">
            <span className="flex font-medium text-sm px-3 py-2.5 bg-background dark:bg-highlight-5 rounded-3xl text-center gap-2 flex items-center justify-center">
              {forecastPage ? (
                <CalendarDays className="w-5 h-5 mb-0.5" />
              ) : (
                <Calendar1 className="w-5 h-5 mb-0.5" />
              )}
              <span>{`${forecastPage ? 4 : 1} day range`}</span>
            </span>
          </div>
          {(forecastPage || overviewPage) && beachId && (
            <Link
              href={
                loggedIn
                  ? selectedTab === "forecast"
                    ? `/${beachId}/forecast/edit#forecast-content`
                    : `/${beachId}/overview/edit#overview-content`
                  : `/login?next=${encodeURIComponent(
                      selectedTab === "forecast"
                        ? `/${beachId}/forecast/edit#forecast-content`
                        : `/${beachId}/overview/edit#overview-content`
                    )}`
              }
              className="hidden @min-xl:inline-flex bg-highlight-5 hover:bg-highlight-3 items-center rounded-full p-3 @min-2xl:py-2.5 @min-2xl:px-4 gap-1.5"
              aria-label={`Edit ${
                forecastPage ? "forecast" : "overview"
              } dashboard`}
            >
              <Pencil className="stroke-[2.5px] w-4.5 h-4.5 @min-2xl:mb-0.5" />
              <span className="font-medium hidden @min-2xl:inline-block text-[15px]">
                Edit
              </span>
            </Link>
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
          "relative flex rounded-full p-1 bg-highlight-3 @min-sm:text-base text-sm font-medium border border-border/20 shadow-md",
          responsiveFull
            ? "w-full @min-xl:w-fit"
            : fullWidth
            ? "w-full"
            : "w-fit",
          beachPage &&
            "hidden @min-4xl:block absolute left-3 top-3 shadow-lg bg-highlight-3/80 backdrop-blur z-[1000]"
        )}
      >
        {tabs.map((tab) => {
          const isActive = selectedTab === tab;
          // const href =
          //   tab.toLowerCase() === "overview"
          //     ? beach
          //       ? `/${beach}/overview`
          //       : "/beaches"
          //     : beach
          //     ? `/${beach}/forecast`
          //     : "/favorites";

          return (
            <button
              onClick={(e) => {
                const next = tab.toLowerCase();
                if (beachPage && next === "saved" && !loggedIn) {
                  // Redirect unauthenticated users to login when selecting Saved on beaches page
                  router.push(`/login?next=${encodeURIComponent("/beaches")}`);
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
                  router.push(href, { scroll: false });
                  return;
                }

                if (forecastPage && !overviewPage && beach) {
                  // Dedicated forecast page: switch routes between overview/forecast.
                  if (next === "overview") {
                    router.push(`/${beach}/overview`, { scroll: false });
                    return;
                  }
                  if (next === "forecast") {
                    router.push(`/${beach}/forecast`, { scroll: false });
                    return;
                  }
                }
              }}
              type="button"
              aria-label={`${selectedTab} tab`}
              key={tab}
              className={cn(
                "relative z-10 flex-1 rounded-full px-4 py-1 text-center capitalize transition-colors duration-300",
                responsiveFull && "py-2",
                fullWidth ? "py-1.5 min-w-0" : "w-27",
                isActive
                  ? beachPage
                    ? "text-foreground font-medium"
                    : "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground/80"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="tab-pill"
                  className="absolute inset-0 z-0 rounded-full bg-background dark:bg-highlight-5"
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}
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
          href={beach ? `/${beach}/forecast` : "/favorites"}
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
