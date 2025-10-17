"use client";

import React from "react";
import type { Map } from "maplibre-gl";

type Ctx = {
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
};

const MapFilterContext = React.createContext<Ctx | null>(null);

export function MapFilterProvider({ children }: { children: React.ReactNode }) {
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
  const value = React.useMemo(
    () => ({
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
    }),
    [
      popupId,
      popupData,
      map,
      filters,
      selectedDate,
      selectedHour,
      surfIntensityForDate,
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
