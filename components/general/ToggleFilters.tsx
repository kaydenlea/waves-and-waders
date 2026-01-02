"use client";

import { SlidersHorizontal } from "lucide-react";
import { useMapFilters } from "../context/MapFilterContext";

const ToggleFilters = () => {
  const { togglePanel, filters } = useMapFilters();
  const filterCount = filters?.size ?? 0;

  return (
    <button
      type="button"
      aria-label="beach filters"
      onClick={() => togglePanel("filters")}
      className="relative shadow-lg rounded-full ring ring-border/70 p-3 border border-border/30 flex gap-2 items-center font-medium text-base dark:bg-highlight-5 dark:hover:bg-highlight-3 hover:bg-highlight-3 transition"
    >
      <SlidersHorizontal className="w-4.5 h-4.5" />

      {/* <span className="hidden @min-2xl:inline">Filters</span> */}

      {/* Badge (only show when filters applied) */}
      {filterCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-sky-500 text-white text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center shadow-md ring-2 ring-background dark:ring-highlight-5">
          {filterCount}
        </span>
      )}
    </button>
  );
};

export default ToggleFilters;
