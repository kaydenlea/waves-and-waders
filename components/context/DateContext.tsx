"use client";

import React from "react";

type Ctx = {
  id: React.RefObject<string>;
  mode: string;
  setMode: React.Dispatch<React.SetStateAction<string>>;
  selected: Date | null;
  setSelected: React.Dispatch<React.SetStateAction<Date | null>>;
  hour: number;
  setHour: React.Dispatch<React.SetStateAction<number>>;
  selectedDays: Date[] | null;
  setSelectedDays: React.Dispatch<React.SetStateAction<Date[] | null>>;
  surfRange: string | null;
  setSurfRange: React.Dispatch<React.SetStateAction<string | null>>;
};

const DateContext = React.createContext<Ctx | null>(null);

export function DateProvider({ children }: { children: React.ReactNode }) {
  const id = React.useRef<string>("");
  const [mode, setMode] = React.useState<string>("date");
  const [selected, setSelected] = React.useState<Date | null>(null);
  const [hour, setHour] = React.useState<number>(() => {
    if (typeof window === "undefined") return 12; // SSR-safe default
    const currentHour = new Date().getHours();
    return Math.round(Math.max(0, Math.min(21, currentHour)) / 3) * 3;
  });
  const [selectedDays, setSelectedDays] = React.useState<Date[] | null>([]);
  const [surfRange, setSurfRange] = React.useState<string | null>(null);
  const value = React.useMemo(
    () => ({
      id,
      mode,
      setMode,
      selected,
      setSelected,
      hour,
      setHour,
      selectedDays,
      setSelectedDays,
      surfRange,
      setSurfRange,
    }),
    [mode, selected, hour, selectedDays, surfRange]
  );
  return <DateContext.Provider value={value}>{children}</DateContext.Provider>;
}

export function useDateContext(): Ctx {
  const ctx = React.useContext(DateContext);
  if (!ctx) throw new Error("useDateContext must be used within DateProvider");
  return ctx;
}
