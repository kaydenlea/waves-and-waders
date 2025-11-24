"use client";

import React, { createContext, useContext } from "react";
import type { TideWindowData } from "@/lib/hooks/useTideWindow";

const TideDataContext = createContext<TideWindowData | null>(null);

type ProviderProps = {
  value: TideWindowData;
  children: React.ReactNode;
};

export const TideDataProvider: React.FC<ProviderProps> = ({
  value,
  children,
}) => (
  <TideDataContext.Provider value={value}>
    {children}
  </TideDataContext.Provider>
);

export const useTideData = () => useContext(TideDataContext);
