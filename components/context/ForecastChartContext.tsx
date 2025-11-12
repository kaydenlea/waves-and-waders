"use client";

import React from "react";

type Ctx = {
  startIndex: number;
  setStartIndex: React.Dispatch<React.SetStateAction<number>>;
  windowSize: number;
  setWindowSize: React.Dispatch<React.SetStateAction<number>>;
  length: number;
  setLength: React.Dispatch<React.SetStateAction<number>>;
  daysLabel: string;
  setDaysLabel: React.Dispatch<React.SetStateAction<string>>;
  // Cross-chart pan sync (fractional day offset)
  setPanFraction: (
    fraction: number,
    sourceId?: string,
    mode?: "drag" | "animate"
  ) => void;
  subscribePan: (
    listener: (
      fraction: number,
      sourceId?: string,
      mode?: "drag" | "animate"
    ) => void,
    opts?: { immediate?: boolean }
  ) => () => void;
};

const ForecastChartContext = React.createContext<Ctx | null>(null);

export function ForecastChartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [startIndex, setStartIndex] = React.useState(0);
  const [windowSize, setWindowSize] = React.useState(0);
  const [length, setLength] = React.useState(0);
  const [daysLabel, setDaysLabel] = React.useState("select range");

  // Imperative pan bus to avoid re-render thrash on drag
  const panListenersRef = React.useRef(
    new Set<(
      fraction: number,
      sourceId?: string,
      mode?: "drag" | "animate"
    ) => void>()
  );
  const lastPanRef = React.useRef<number | null>(null);

  const setPanFraction = React.useCallback((
    fraction: number,
    sourceId?: string,
    mode?: "drag" | "animate"
  ) => {
    lastPanRef.current = fraction;
    panListenersRef.current.forEach((fn) => {
      try {
        fn(fraction, sourceId, mode);
      } catch {}
    });
  }, []);

  const subscribePan = React.useCallback(
    (
      listener: (
        fraction: number,
        sourceId?: string,
        mode?: "drag" | "animate"
      ) => void,
      opts?: { immediate?: boolean }
    ) => {
      panListenersRef.current.add(listener);
      if (opts?.immediate && lastPanRef.current != null) {
        try {
          listener(lastPanRef.current);
        } catch {}
      }
      return () => {
        panListenersRef.current.delete(listener);
      };
    },
    []
  );
  const value = React.useMemo(
    () => ({
      startIndex,
      setStartIndex,
      windowSize,
      setWindowSize,
      length,
      setLength,
      daysLabel,
      setDaysLabel,
      setPanFraction,
      subscribePan,
    }),
    [startIndex, windowSize, length, daysLabel, setPanFraction, subscribePan]
  );
  return (
    <ForecastChartContext.Provider value={value}>
      {children}
    </ForecastChartContext.Provider>
  );
}

export function useForecastChartContext(): Ctx {
  const ctx = React.useContext(ForecastChartContext);
  if (!ctx)
    throw new Error(
      "useForecastChartContext must be used within ForecastChartProvider"
    );
  return ctx;
}
