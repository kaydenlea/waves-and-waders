"use client";

import React from "react";

type Ctx = {
  selectedDays: Date[] | null;
  setSelectedDays: React.Dispatch<React.SetStateAction<Date[] | null>>;
  surfRange: string | null;
  setSurfRange: React.Dispatch<React.SetStateAction<string | null>>;
};

const DateContext = React.createContext<Ctx | null>(null);

export function DateProvider({ children }: { children: React.ReactNode }) {
  const [selectedDays, setSelectedDays] = React.useState<Date[] | null>([]);
  const [surfRange, setSurfRange] = React.useState<string | null>(null);
  const value = React.useMemo(
    () => ({ selectedDays, setSelectedDays, surfRange, setSurfRange }),
    [selectedDays, surfRange]
  );
  return <DateContext.Provider value={value}>{children}</DateContext.Provider>;
}

export function useDateContext(): Ctx {
  const ctx = React.useContext(DateContext);
  if (!ctx)
    throw new Error("useForecastContext must be used within ForecastProvider");
  return ctx;
}
