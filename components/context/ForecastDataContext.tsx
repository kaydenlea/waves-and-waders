"use client";

import React from "react";
import type { ForecastData } from "@/lib/supabase";

export type ForecastDataContextValue = {
  rows: ForecastData[] | null;
  start: Date | null;
  end: Date | null;
  loading: boolean;
};

const ForecastDataContext = React.createContext<ForecastDataContextValue>({
  rows: null,
  start: null,
  end: null,
  loading: false,
});

export function ForecastDataProvider({
  value,
  children,
}: {
  value: ForecastDataContextValue;
  children: React.ReactNode;
}) {
  return (
    <ForecastDataContext.Provider value={value}>
      {children}
    </ForecastDataContext.Provider>
  );
}

export function useForecastData() {
  return React.useContext(ForecastDataContext);
}
