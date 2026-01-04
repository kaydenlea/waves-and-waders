"use client";

import React from "react";
import type { Map } from "maplibre-gl";

export type BeachPoint = {
  id: string | number;
  name: string;
  county: string;
  latitude: number;
  longitude: number;
  grid_id?: number | null;
  features?: Record<string, boolean>;
};

type PanelKey = "filters" | "legend" | "date";

type Ctx = {
  openPanel: PanelKey | null;
  setOpenPanel: React.Dispatch<React.SetStateAction<PanelKey | null>>;
  togglePanel: (panel: PanelKey) => void;
  showMap: boolean;
  setShowMap: React.Dispatch<React.SetStateAction<boolean>>;
  popupId: React.RefObject<string | null>;
  popupRef: React.RefObject<{
    id: number;
    longitude: number;
    latitude: number;
    properties: Record<string, unknown>;
  } | null>;
  popupData: string | null;
  setPopupData: React.Dispatch<React.SetStateAction<string | null>>;
  map: Map | undefined;
  setMap: React.Dispatch<React.SetStateAction<Map | undefined>>;
  mapRef: React.RefObject<Map | null>;
  filters: Set<string>;
  setFilters: React.Dispatch<React.SetStateAction<Set<string>>>;
  surfIntensityForDate: number | null;
  setSurfIntensityForDate: React.Dispatch<React.SetStateAction<number | null>>;
  beaches: BeachPoint[];
  setBeaches: React.Dispatch<React.SetStateAction<BeachPoint[]>>;
  favoriteIds: Set<string>;
  setFavoriteIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  hoverCardId: string | null;
  setHoverCardId: React.Dispatch<React.SetStateAction<string | null>>;
};

const MapFilterContext = React.createContext<Ctx | null>(null);

export function MapFilterProvider({ children }: { children: React.ReactNode }) {
  const [openPanel, setOpenPanel] = React.useState<PanelKey | null>(null);
  const togglePanel = React.useCallback((panel: PanelKey) => {
    setOpenPanel((prev) => (prev === panel ? null : panel));
  }, []);
  const [showMap, setShowMap] = React.useState(true);
  const popupId = React.useRef<string | null>(null);
  const popupRef = React.useRef<{
    id: number;
    longitude: number;
    latitude: number;
    properties: Record<string, unknown>;
  } | null>(null);
  const [popupData, setPopupData] = React.useState<string | null>(null);
  const [map, setMap] = React.useState<Map | undefined>(undefined);
  const mapRef = React.useRef<Map | null>(null);
  const [filters, setFilters] = React.useState<Set<string>>(new Set());
  const [surfIntensityForDate, setSurfIntensityForDate] = React.useState<
    number | null
  >(null);
  const [beaches, setBeaches] = React.useState<BeachPoint[]>([]);
  const [favoriteIds, setFavoriteIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [hoverCardId, setHoverCardId] = React.useState<string | null>(null);
  const value = React.useMemo(
    () => ({
      openPanel,
      setOpenPanel,
      togglePanel,
      showMap,
      setShowMap,
      popupId,
      popupRef,
      popupData,
      setPopupData,
      map,
      setMap,
      mapRef,
      filters,
      setFilters,
      surfIntensityForDate,
      setSurfIntensityForDate,
      beaches,
      setBeaches,
      favoriteIds,
      setFavoriteIds,
      hoverCardId,
      setHoverCardId,
    }),
    [
      openPanel,
      togglePanel,
      showMap,
      popupId,
      popupData,
      map,
      filters,
      surfIntensityForDate,
      beaches,
      favoriteIds,
      hoverCardId,
    ]
  );
  return (
    <MapFilterContext.Provider value={value}>
      {children}
    </MapFilterContext.Provider>
  );
}

export function useMapFilters(): Ctx {
  const ctx = React.useContext(MapFilterContext);
  if (!ctx)
    throw new Error("useMapFilters must be used within MapFilterProvider");
  return ctx;
}
