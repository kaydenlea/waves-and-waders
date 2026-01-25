"use client";

import { Search } from "lucide-react";
import { useOptionalSearchContext } from "@/components/context/SearchContext";
import { cn } from "@/lib/utils";

export default function MarketingSearchButton({
  className,
}: {
  className?: string;
}) {
  const setIsOverlay = useOptionalSearchContext()?.setIsOverlay;

  return (
    <button
      type="button"
      aria-label="Search beaches"
      onClick={() => setIsOverlay?.(true)}
      className={cn(
        "icon-button bg-gradient-to-br from-cyan-300 to-blue-500 p-3 text-foreground shadow-lg shadow-cyan-500/30",
        "transition active:scale-[0.98] hover:scale-[1.03] motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        className
      )}
    >
      <Search
        className="icon-md"
        strokeWidth={3}
        aria-hidden="true"
      />
    </button>
  );
}
