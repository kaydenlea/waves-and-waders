"use client";

import * as React from "react";

export type OverviewSurfaceTab = "overview" | "fishing";

type OverviewSurfaceContextValue = {
  overviewSurfaceTab: OverviewSurfaceTab;
  setOverviewSurfaceTab: React.Dispatch<React.SetStateAction<OverviewSurfaceTab>>;
  openFishingComposer?: () => void;
};

const OverviewSurfaceContext =
  React.createContext<OverviewSurfaceContextValue | null>(null);

export function OverviewSurfaceProvider({
  value,
  children,
}: {
  value: OverviewSurfaceContextValue;
  children: React.ReactNode;
}) {
  return (
    <OverviewSurfaceContext.Provider value={value}>
      {children}
    </OverviewSurfaceContext.Provider>
  );
}

export function useOptionalOverviewSurface() {
  return React.useContext(OverviewSurfaceContext);
}
