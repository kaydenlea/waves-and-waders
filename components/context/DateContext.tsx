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
  hoveredHourRef: React.MutableRefObject<number | null>;
  hoveredHourListeners: React.MutableRefObject<Set<() => void>>;
  subscribeToHover: (callback: () => void) => () => void;
  setHoveredHour: (hour: number | null) => void;
  showSecondarySwells: boolean;
  setShowSecondarySwells: React.Dispatch<React.SetStateAction<boolean>>;
};

const DateContext = React.createContext<Ctx | null>(null);

export function DateProvider({ children }: { children: React.ReactNode }) {
  const [showSecondarySwells, setShowSecondarySwells] = React.useState(false);
  const skipSecondarySwellsPersistRef = React.useRef(true);
  const id = React.useRef<string>("");
  const [mode, setMode] = React.useState<string>("date");
  const [selected, setSelected] = React.useState<Date | null>(null);
  // Hydration-safe default; adjust to local time after mount
  const [hour, setHour] = React.useState<number>(12);
  const [selectedDays, setSelectedDays] = React.useState<Date[] | null>([]);
  const [surfRange, setSurfRange] = React.useState<string | null>(null);

  // Use ref for hover to avoid context re-creation on every hover
  const hoveredHourRef = React.useRef<number | null>(null);
  const hoveredHourListeners = React.useRef<Set<() => void>>(new Set());

  const setHoveredHour = React.useCallback((hour: number | null) => {
    if (hoveredHourRef.current === hour) return; // Skip if unchanged
    hoveredHourRef.current = hour;
    hoveredHourListeners.current.forEach((listener) => listener());
  }, []);

  const subscribeToHover = React.useCallback((callback: () => void) => {
    hoveredHourListeners.current.add(callback);
    return () => {
      hoveredHourListeners.current.delete(callback);
    };
  }, []);

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
      hoveredHourRef,
      hoveredHourListeners,
      subscribeToHover,
      setHoveredHour,
      showSecondarySwells,
      setShowSecondarySwells,
    }),
    // Only recreate context when these specific values change
    // This prevents unnecessary re-renders in consuming components
    [mode, selected, hour, selectedDays, surfRange, showSecondarySwells]
  );
  // After mount, set hour to nearest 3-hour bucket to avoid SSR/CSR mismatch
  React.useEffect(() => {
    const currentHour = new Date().getHours();
    const rounded = Math.round(Math.max(0, Math.min(21, currentHour)) / 3) * 3;
    setHour(rounded);
  }, []);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(
        "waves-and-waders.statTable.showSecondarySwells"
      );
      if (stored === "1" || stored === "true") {
        skipSecondarySwellsPersistRef.current = true;
        setShowSecondarySwells(true);
      } else if (stored === "0" || stored === "false") {
        skipSecondarySwellsPersistRef.current = true;
        setShowSecondarySwells(false);
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    if (skipSecondarySwellsPersistRef.current) {
      skipSecondarySwellsPersistRef.current = false;
      return;
    }
    try {
      window.localStorage.setItem(
        "waves-and-waders.statTable.showSecondarySwells",
        showSecondarySwells ? "1" : "0"
      );
    } catch {}
  }, [showSecondarySwells]);

  // After mount, ensure selected date defaults to today if not set
  React.useEffect(() => {
    if (!selected) {
      const now = new Date();
      setSelected(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    }
  }, []);
  return <DateContext.Provider value={value}>{children}</DateContext.Provider>;
}

export function useDateContext(): Ctx {
  const ctx = React.useContext(DateContext);
  if (!ctx) throw new Error("useDateContext must be used within DateProvider");
  return ctx;
}

export function useOptionalDateContext(): Ctx | null {
  return React.useContext(DateContext);
}

// Custom hook for charts to subscribe to hover changes without causing context re-renders
export function useHoveredHour(): number | null {
  const { hoveredHourRef, subscribeToHover } = useDateContext();
  const [hoveredHour, setHoveredHour] = React.useState<number | null>(
    hoveredHourRef.current
  );

  React.useEffect(() => {
    const updateHover = () => {
      setHoveredHour(hoveredHourRef.current);
    };

    const unsubscribe = subscribeToHover(updateHover);
    return unsubscribe;
  }, [hoveredHourRef, subscribeToHover]);

  return hoveredHour;
}
