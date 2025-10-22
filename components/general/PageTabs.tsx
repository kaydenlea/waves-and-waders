"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import FocusMapButton from "./FocusMapButton";
import SaveButton from "./SaveButton";
import { useMapFilters } from "../context/MapFilterContext";
import { ArrowLeftFromLine, Map, Pencil } from "lucide-react";

type PageTabsProps = {
  beach?: string;
  beachId?: string;
  defaultPage: string;
  tabs: string[];
  buttons?: boolean;
  isFavorite?: boolean;
  beachPage?: boolean;
  forecastPage?: boolean;
  overviewPage?: boolean;
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
}: PageTabsProps) => {
  const [favorite, setFavorite] = useState(isFavorite);
  const [isDesktop, setIsDesktop] = useState(false);
  const { showMap, setShowMap } = useMapFilters();

  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs) return;

    const adjustScreenSize = () => {
      const width = tabs.clientWidth;
      setIsDesktop(width >= 855);
    };

    const observer = new ResizeObserver(adjustScreenSize);
    observer.observe(tabs);

    adjustScreenSize();

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setFavorite(isFavorite);
  }, [isFavorite]);

  const showSaveButton = Boolean(buttons && beachId);

  return (
    <div
      ref={tabsRef}
      className={cn(
        "mx-auto flex gap-1 @min-sm:gap-2 w-full justify-center",
        beachPage
          ? "@min-xl:absolute @min-xl:right-0 @min-xl:justify-end"
          : "@min-3xl:absolute @min-3xl:right-0 @min-3xl:justify-end"
      )}
    >
      {buttons && (
        <>
          {/* <FocusMapButton beach={beach} /> */}
          {(forecastPage || overviewPage) && (
            <Link
              href={
                forecastPage
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
                <Map className="w-6 h-6 @min-sm:w-6 @min-sm:h-6" />
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
      <div className="text-sm @min-sm:text-base font-medium p-1.5 flex bg-highlight-3 rounded-full border border-border/20">
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
      </div>
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
