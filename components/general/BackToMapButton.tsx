"use client";

import { ChevronUp } from "lucide-react";

const wideScreenWidth = 911;
export const scrollToMap = () => {
  if (window.innerWidth >= wideScreenWidth) return;
  const mapContainer = document.getElementById("map-container");
  if (mapContainer) {
    const headerOffset = 100;
    const rect = mapContainer.getBoundingClientRect();
    const absoluteTop = rect.top + window.scrollY;
    const targetTop = Math.max(absoluteTop - headerOffset, 0);
    try {
      window.scrollTo({ top: targetTop, behavior: "smooth" });
    } catch {
      mapContainer.scrollIntoView({ behavior: "smooth", block: "start" });
      window.scrollBy({ top: -headerOffset, behavior: "smooth" });
    }
  }
};

export default function BackToMapButton() {
  return (
    <div className="touch-pan-y block @min-4xl:hidden flex justify-center pt-10 pb-4">
      <button
        onClick={scrollToMap}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/95 backdrop-blur border border-border shadow-lg text-sm font-medium text-foreground hover:bg-highlight-5 transition-colors"
      >
        <ChevronUp size={16} />
        <span>Back to Map</span>
      </button>
    </div>
  );
}
