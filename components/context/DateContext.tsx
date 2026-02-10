"use client";

import React from "react";
import { usePacificTodayMs } from "@/lib/hooks/usePacificTodayMs";
import { getPacificHour } from "@/lib/utils";

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

export function DateProvider({
  children,
  initialSelectedMs,
}: {
  children: React.ReactNode;
  initialSelectedMs?: number;
}) {
  const initialSelectedMsSafe =
    typeof initialSelectedMs === "number" && Number.isFinite(initialSelectedMs)
      ? initialSelectedMs
      : null;
  const pacificTodayMs = usePacificTodayMs();
  const [showSecondarySwells, setShowSecondarySwells] = React.useState(false);
  const skipSecondarySwellsPersistRef = React.useRef(true);
  const id = React.useRef<string>("");
  const [mode, setMode] = React.useState<string>("date");
  const [selected, setSelected] = React.useState<Date | null>(() =>
    new Date(initialSelectedMsSafe ?? pacificTodayMs)
  );
  const lastPacificTodayMsRef = React.useRef<number | null>(
    initialSelectedMsSafe
  );
  const [hour, setHour] = React.useState<number>(() => {
    const nowHour = getPacificHour(new Date());
    return Math.round(Math.max(0, Math.min(21, nowHour)) / 3) * 3;
  });
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
  // Keep the selected hour aligned to the current (Pacific) 3-hour bucket on mount.
  React.useEffect(() => {
    const currentHour = getPacificHour(new Date());
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

  React.useEffect(() => {
    const prevTodayMs = lastPacificTodayMsRef.current;
    const nextTodayMs = pacificTodayMs;

    // First run: establish the baseline "today" and initialize selection.
    if (prevTodayMs == null) {
      lastPacificTodayMsRef.current = nextTodayMs;
      if (!selected) {
        setSelected(new Date(nextTodayMs));
      }
      return;
    }

    if (prevTodayMs === nextTodayMs) return;

    // If the user is still on the previously-current day (or never selected),
    // roll everything forward to the new current day.
    const selectedMs = selected?.getTime() ?? null;
    const shouldRollForward = selectedMs == null || selectedMs === prevTodayMs;
    lastPacificTodayMsRef.current = nextTodayMs;

    if (!shouldRollForward) return;

    setSelected(new Date(nextTodayMs));
    setSelectedDays([]);
    setSurfRange(null);
  }, [pacificTodayMs, selected]);

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
