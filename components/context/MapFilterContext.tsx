"use client";

import React from "react";

type Ctx = {
  filters: Set<string>;
  setFilters: React.Dispatch<React.SetStateAction<Set<string>>>;
};

const MapFilterContext = React.createContext<Ctx | null>(null);

export function MapFilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = React.useState<Set<string>>(new Set());
  const value = React.useMemo(() => ({ filters, setFilters }), [filters]);
  return <MapFilterContext.Provider value={value}>{children}</MapFilterContext.Provider>;
}

export function useMapFilters(): Ctx {
  const ctx = React.useContext(MapFilterContext);
  if (!ctx) throw new Error("useMapFilters must be used within MapFilterProvider");
  return ctx;
}

