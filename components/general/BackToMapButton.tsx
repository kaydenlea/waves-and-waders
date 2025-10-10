"use client";

import { ChevronUp } from "lucide-react";

export default function BackToMapButton() {
  const scrollToMap = () => {
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="block @min-4xl:hidden flex justify-center pt-20 pb-4">
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
