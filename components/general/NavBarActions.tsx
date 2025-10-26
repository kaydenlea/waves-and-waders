"use client";

import { usePathname } from "next/navigation";
import { LazyLoadDatePicker } from "./LazyLoad/LazyLoadDatePicker";
import SearchBar from "./SearchBar";
import { useDateContext } from "../context/DateContext";
import { LazyLoadHourSlider } from "./LazyLoad/LazyLoadHourSlider";
import { AlarmClock, Calendar, Clock, Search } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSearchContext } from "../context/SearchContext";
import { useClientPath } from "../context/PathContext";

const NavBarActions = () => {
  const pathname = usePathname();
  console.log("PATHNAME", pathname);
  const homePage = pathname === "/";
  const beachesPage = pathname.endsWith("/beaches");
  const { id, selected, setSelected, hour, setHour, mode, setMode } =
    useDateContext();
  const { setIsOverlay } = useSearchContext();
  const { selectedTab } = useClientPath();
  if (homePage || beachesPage)
    return (
      <SearchBar
        beachesPage={beachesPage}
        className={cn(
          "sm:max-w-none",
          beachesPage ? "flex" : "max-w-[12rem] hidden @min-4xl:flex"
        )}
      />
    );
  //   return (
  //     <div
  //       className={cn(
  //         "@container ml-0 @min-[1200px]:ml-10 mr-0 @min-[890px]:mr-16 w-full @min-[890px]:w-125 @min-[1200px]:w-250 flex gap-3 items-center",
  //         mode === "hour" && ""
  //       )}
  //     >
  //       {mode === "date" || forecastPage ? (
  //         <LazyLoadDatePicker
  //           beachId={id.current}
  //           {...(forecastPage && { forecast: true })}
  //           value={selected}
  //           onSelect={setSelected}
  //         />
  //       ) : (
  //         <LazyLoadHourSlider
  //           value={hour}
  //           onChange={setHour}
  //           min={0}
  //           max={21}
  //           step={3}
  //         />
  //       )}
  //       {!forecastPage && (
  //         <button
  //           onClick={() => {
  //             setMode(mode === "date" ? "hour" : "date");
  //           }}
  //           className={cn(
  //             "icon-button py-2 min-w-18 rounded-3xl hover:bg-highlight-5"
  //           )}
  //         >
  //           {mode === "date" ? (
  //             <Calendar className="w-6 h-6 mx-auto" />
  //           ) : (
  //             <Clock className="w-6 h-6 mx-auto" />
  //           )}
  //           <span className="text-sm font-medium text-center">
  //             {mode === "date" ? "Day" : "Hour"}
  //           </span>
  //         </button>
  //       )}
  //     </div>
  //   );
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
            beachId={id.current}
            {...(selectedTab === "forecast" && { forecast: true })}
            value={selected}
            onSelect={setSelected}
          />
        ) : (
          <LazyLoadHourSlider
            className="w-full"
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
