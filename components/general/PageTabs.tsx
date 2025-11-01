"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { cn } from "@/lib/utils";
import FocusMapButton from "./FocusMapButton";
import SaveButton from "./SaveButton";
import { useMapFilters } from "../context/MapFilterContext";
import { ArrowLeftFromLine, MapPinned, Pencil } from "lucide-react";
import { motion } from "motion/react";
import { useClientPath } from "../context/PathContext";

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
}: PageTabsProps) => {
  const router = useRouter();
  const [favorite, setFavorite] = useState(isFavorite);
  const [isDesktop, setIsDesktop] = useState(false);
  const { selectedTab, setSelectedTab } = useClientPath();
  const { showMap, setShowMap } = useMapFilters();

  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs) return;

    const adjustScreenSize = () => {
      const width = window.innerWidth;
      setIsDesktop(width >= 911);
    };

    const observer = new ResizeObserver(adjustScreenSize);
    observer.observe(tabs);

    adjustScreenSize();

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (selectedTab === "") {
      console.log("BEACH TEST TAB 1", selectedTab);
      setSelectedTab(overviewPage ? "overview" : "nearby");
    } else if (
      (selectedTab === "overview" || selectedTab === "forecast") &&
      beachPage
    ) {
      console.log("BEACH TEST TAB 2", selectedTab);
      setSelectedTab("nearby");
    } else if (
      (selectedTab === "saved" || selectedTab === "nearby") &&
      overviewPage
    ) {
      console.log("BEACH TEST TAB 3", selectedTab);
      setSelectedTab("overview");
    }
    console.log("BEACH TEST TAB", selectedTab);
  }, []);

  useEffect(() => {
    setFavorite(isFavorite);
  }, [isFavorite]);

  const showSaveButton = Boolean(buttons && beachId && placement === "default");

  return (
    <div
      ref={tabsRef}
      className={cn(
        placement === "inline"
          ? "flex w-full flex-wrap items-center gap-1 @min-sm:gap-2 justify-start @min-lg:ml-auto @min-lg:justify-end @min-lg:w-auto"
          : "mx-auto flex gap-1 @min-sm:gap-2 w-full justify-center",
        placement === "default" &&
          (beachPage
            ? "@min-xl:absolute @min-xl:right-0 @min-xl:justify-end"
            : "@min-3xl:absolute @min-3xl:right-0 @min-3xl:justify-end"),
        className
      )}
    >
      {buttons && (
        <>
          {/* <FocusMapButton beach={beach} /> */}
          {(forecastPage || overviewPage) && (
            <Link
              href={
                selectedTab === "forecast"
                  ? `/${beachId}/forecast/edit#forecast-content`
                  : `/${beachId}/overview/edit#overview-content`
              }
              className="bg-highlight-5 hover:bg-highlight-3 my-auto rounded-full p-2.5"
              aria-label={`Edit ${
                forecastPage ? "forecast" : "overview"
              } dashboard`}
            >
              <Pencil className="stroke-[2.5px] w-5 h-5 @min-sm:w-5 @min-sm:h-5" />
            </Link>
          )}
          {!showMap && isDesktop && (
            <button
              type="button"
              aria-label="Reopen map"
              className={cn(
                "bg-highlight-5 hover:bg-highlight-3 my-auto rounded-full p-2 disabled:opacity-50 disabled:hover:bg-highlight-5"
              )}
              onClick={() => setShowMap(!showMap)}
            >
              {showMap ? (
                <ArrowLeftFromLine className="w-6 h-6 @min-sm:w-6 @min-sm:h-6" />
              ) : (
                <MapPinned className="w-6 h-6 @min-sm:w-6 @min-sm:h-6" />
              )}
            </button>
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
      <div className="relative flex w-fit rounded-full bg-highlight-3 p-1.5 text-sm @min-sm:text-base font-medium border border-border/20 shadow-inner">
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
                const clicked = (e.target as HTMLElement).innerText;
                console.log("BEACH TEST CLICK", clicked);
                if (!clicked) return;
                const next = clicked.toLowerCase();
                if (beachPage && next === "saved" && !loggedIn) {
                  // Redirect unauthenticated users to login when selecting Saved on beaches page
                  router.push(`/login?next=${encodeURIComponent("/beaches")}`);
                  return;
                }
                setSelectedTab(next);
              }}
              type="button"
              aria-label={`${selectedTab} tab`}
              key={tab}
              className={cn(
                "relative z-10 flex-1 rounded-full px-4 py-1 w-27 text-center capitalize transition-colors duration-300",
                isActive
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground/80"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="tab-pill"
                  className="absolute inset-0 z-0 rounded-full bg-background dark:bg-highlight-5 shadow-md"
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
