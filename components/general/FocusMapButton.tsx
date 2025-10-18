"use client";

import { extractBeachId } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";

import { MAP_FOCUS_EVENT, type MapFocusEventDetail } from "./mapEvents";
import { scrollToMap } from "./BackToMapButton";

type FocusMapButtonProps = {
  beach?: string;
  className?: string;
};

const FocusMapButton = ({ beach, className }: FocusMapButtonProps) => {
  const handleClick = () => {
    if (typeof window === "undefined") return;
    if (!beach) return;

    const beachId = extractBeachId(beach);

    const detail: MapFocusEventDetail = {
      beachId,
      scroll: true,
    };

    window.dispatchEvent(new CustomEvent(MAP_FOCUS_EVENT, { detail }));
    scrollToMap();
  };

  return (
    <button
      type="button"
      aria-label="Refocus map on beach"
      className={cn(
        "bg-highlight-5 hover:bg-highlight-3 my-auto rounded-full p-2",
        className,
        !beach && "opacity-50 cursor-not-allowed hover:bg-highlight-5"
      )}
      onClick={handleClick}
      disabled={!beach}
    >
      <MapPin className="w-6 h-6 @min-sm:w-6 @min-sm:h-6" />
    </button>
  );
};

export default FocusMapButton;
