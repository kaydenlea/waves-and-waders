"use client";

import React from "react";
import type { Map } from "maplibre-gl";

type Ctx = {
  openPanel: "filters" | "legend" | null;
  setOpenPanel: React.Dispatch<
    React.SetStateAction<"filters" | "legend" | null>
  >;
  togglePanel: (panel: "filters" | "legend") => void;
  showMap: boolean;
  setShowMap: React.Dispatch<React.SetStateAction<boolean>>;
  popupId: React.RefObject<string | null>;
  popupRef: React.RefObject<{
    id: number;
    longitude: number;
    latitude: number;
    properties: any;
  } | null>;
  popupData: string | null;
  setPopupData: React.Dispatch<React.SetStateAction<string | null>>;
  map: Map | undefined;
  setMap: React.Dispatch<React.SetStateAction<Map | undefined>>;
  mapRef: React.RefObject<Map | null>;
  filters: Set<string>;
  setFilters: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedDate: Date | null;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date | null>>;
  selectedHour: number | null;
  setSelectedHour: React.Dispatch<React.SetStateAction<number | null>>;
  surfIntensityForDate: number | null;
  setSurfIntensityForDate: React.Dispatch<React.SetStateAction<number | null>>;
  beaches: Array<{
    id: string | number;
    name: string;
    county: string;
    latitude: number;
    longitude: number;
    features?: Record<string, boolean>;
  }>;
  setBeaches: React.Dispatch<
    React.SetStateAction<
      Array<{
        id: string | number;
        name: string;
        county: string;
        latitude: number;
        longitude: number;
        features?: Record<string, boolean>;
      }>
    >
  >;
  favoriteIds: Set<string>;
  setFavoriteIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  hoverCardId: string | null;
  setHoverCardId: React.Dispatch<React.SetStateAction<string | null>>;
};

const MapFilterContext = React.createContext<Ctx | null>(null);

export function MapFilterProvider({ children }: { children: React.ReactNode }) {
  const [openPanel, setOpenPanel] = React.useState<"filters" | "legend" | null>(
    null
  );
  const togglePanel = React.useCallback((panel: "filters" | "legend") => {
    setOpenPanel((prev) => (prev === panel ? null : panel));
  }, []);
  const [showMap, setShowMap] = React.useState(true);
  const popupId = React.useRef<string | null>(null);
  const popupRef = React.useRef<{
    id: number;
    longitude: number;
    latitude: number;
    properties: any;
  } | null>(null);
  const [popupData, setPopupData] = React.useState<string | null>(null);
  const [map, setMap] = React.useState<Map | undefined>(undefined);
  const mapRef = React.useRef<Map | null>(null);
  const [filters, setFilters] = React.useState<Set<string>>(new Set());
  // Default to today's date so the map shows surf data on initial load
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(
    () => new Date()
  );
  const [selectedHour, setSelectedHour] = React.useState<number | null>(null);
  const [surfIntensityForDate, setSurfIntensityForDate] = React.useState<
    number | null
  >(null);
  const [beaches, setBeaches] = React.useState<
    Array<{
      id: string | number;
      name: string;
      county: string;
      latitude: number;
      longitude: number;
      features?: Record<string, boolean>;
    }>
  >([]);
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
      selectedDate,
      setSelectedDate,
      selectedHour,
      setSelectedHour,
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
      selectedDate,
      selectedHour,
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
