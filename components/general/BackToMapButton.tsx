"use client";

import { MapPin } from "lucide-react";
import { useMapUI } from "../context/MapFilterContext";

const wideScreenWidth = 911;
// export const scrollToMap = () => {
//   if (window.innerWidth >= wideScreenWidth) return;
//   const mapContainer = document.getElementById("map-container");
//   if (mapContainer) {
//     const headerOffset = 100;
//     const rect = mapContainer.getBoundingClientRect();
//     const absoluteTop = rect.top + window.scrollY;
//     const targetTop = Math.max(absoluteTop - headerOffset, 0);
//     try {
//       window.scrollTo({ top: targetTop, behavior: "smooth" });
//     } catch {
//       mapContainer.scrollIntoView({ behavior: "smooth", block: "start" });
//       window.scrollBy({ top: -headerOffset, behavior: "smooth" });
//     }
//   }
// };
export const scrollToMap = () => {
  if (window.innerWidth >= wideScreenWidth) return;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export default function BackToMapButton() {
  const { setContentCollapsed } = useMapUI();
  return (
    <div className="touch-pan-y block @min-4xl:hidden flex justify-center mt-10 mb-4">
      <button
        aria-label="back to map"
        onClick={() => {
          setContentCollapsed(true);
          scrollToMap();
        }}
        className="flex items-center gap-1 px-4 py-3 rounded-full bg-background backdrop-blur border border-border shadow-lg text-sm font-medium text-foreground hover:bg-highlight-3 transition-colors"
      >
        <span>Map</span>
        <MapPin className="w-5 h-5" />
      </button>
    </div>
  );
}
