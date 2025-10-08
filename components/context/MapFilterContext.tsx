"use client";

import React from "react";

type Ctx = {
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
  const [filters, setFilters] = React.useState<Set<string>>(new Set());
  // Default to today's date so the map shows surf data on initial load
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(() => new Date());
  const [selectedHour, setSelectedHour] = React.useState<number | null>(null);
  const [surfIntensityForDate, setSurfIntensityForDate] = React.useState<number | null>(null);
  const value = React.useMemo(
    () => ({
      filters,
      setFilters,
      selectedDate,
      setSelectedDate,
      selectedHour,
      setSelectedHour,
      surfIntensityForDate,
      setSurfIntensityForDate,
    }),
    [filters, selectedDate, selectedHour, surfIntensityForDate]
  );
  return <MapFilterContext.Provider value={value}>{children}</MapFilterContext.Provider>;
}

export function useMapFilters(): Ctx {
  const ctx = React.useContext(MapFilterContext);
  if (!ctx) throw new Error("useMapFilters must be used within MapFilterProvider");
  return ctx;
}

