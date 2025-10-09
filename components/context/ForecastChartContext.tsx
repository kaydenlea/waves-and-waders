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
    }),
    [startIndex, windowSize, length, daysLabel]
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
