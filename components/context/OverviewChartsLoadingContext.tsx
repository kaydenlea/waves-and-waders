"use client";

import React from "react";

type Ctx = {
  reportStatus: (id: string, ready: boolean) => void;
  unregister: (id: string) => void;
  setExpectedCharts: (ids: readonly string[] | null) => void;
  loading: boolean;
};

const OverviewChartsLoadingContext = React.createContext<Ctx | null>(null);

let idCounter = 0;
const makeId = (hint?: string) =>
  `${hint ?? "chart"}-${Date.now().toString(36)}-${idCounter++}`;

export function OverviewChartsLoadingProvider({
  children,
  expectedCharts: expectedChartsProp,
}: {
  children: React.ReactNode;
  expectedCharts?: readonly string[] | null;
}) {
  const [statusMap, setStatusMap] = React.useState<Map<string, boolean>>(
    () => new Map()
  );
  const [expectedChartsState, setExpectedChartsState] = React.useState<
    readonly string[] | null
  >(() => expectedChartsProp ?? null);
  const expectedCharts =
    expectedChartsProp !== undefined ? expectedChartsProp : expectedChartsState;

  const reportStatus = React.useCallback((id: string, ready: boolean) => {
    setStatusMap((prev) => {
      const next = new Map(prev);
      next.set(id, ready);
      return next;
    });
  }, []);

  const unregister = React.useCallback((id: string) => {
    setStatusMap((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const setExpectedChartsSafe = React.useCallback(
    (ids: readonly string[] | null) => {
      if (expectedChartsProp !== undefined) return;
      setExpectedChartsState((prev) => {
        if (ids === prev) return prev;
        if (ids == null || prev == null) return ids;
        if (ids.length !== prev.length) return ids;
        for (let i = 0; i < ids.length; i++) {
          if (ids[i] !== prev[i]) return ids;
        }
        return prev;
      });
    },
    [expectedChartsProp]
  );

  const rawLoading = React.useMemo(() => {
    // When the dashboard declares expected charts, consider missing registrations as "not ready".
    if (expectedCharts != null) {
      for (const id of expectedCharts) {
        if (statusMap.get(id) !== true) return true;
      }
      for (const ready of statusMap.values()) {
        if (!ready) return true;
      }
      return false;
    }

    // Fallback behavior when no expected charts have been declared yet.
    if (statusMap.size === 0) return true;
    for (const ready of statusMap.values()) {
      if (!ready) return true;
    }
    return false;
  }, [expectedCharts, statusMap]);

  const value = React.useMemo(
    () => ({
      reportStatus,
      unregister,
      setExpectedCharts: setExpectedChartsSafe,
      loading: rawLoading,
    }),
    [reportStatus, unregister, setExpectedChartsSafe, rawLoading]
  );

  return (
    <OverviewChartsLoadingContext.Provider value={value}>
      {children}
    </OverviewChartsLoadingContext.Provider>
  );
}

export function useOverviewChartLoading(name?: string) {
  const ctx = React.useContext(OverviewChartsLoadingContext);
  if (!ctx) {
    throw new Error(
      "useOverviewChartLoading must be used within OverviewChartsLoadingProvider"
    );
  }
  const idRef = React.useRef<string>(name ?? makeId());
  const reportStatus = ctx.reportStatus;
  const unregister = ctx.unregister;

  React.useEffect(() => {
    reportStatus(idRef.current, false);
    return () => {
      unregister(idRef.current);
    };
  }, [reportStatus, unregister]);

  const setReady = React.useCallback(
    (ready: boolean) => reportStatus(idRef.current, ready),
    [reportStatus]
  );

  return { setReady, loading: ctx.loading };
}

export function useOptionalOverviewChartLoading(name?: string) {
  const ctx = React.useContext(OverviewChartsLoadingContext);
  const idRef = React.useRef<string>(name ?? makeId());
  const reportStatus = ctx?.reportStatus;
  const unregister = ctx?.unregister;

  React.useEffect(() => {
    if (!reportStatus || !unregister) return;
    reportStatus(idRef.current, false);
    return () => {
      unregister(idRef.current);
    };
  }, [reportStatus, unregister]);

  const setReady = React.useCallback(
    (ready: boolean) => {
      if (!reportStatus) return;
      reportStatus(idRef.current, ready);
    },
    [reportStatus]
  );

  return { setReady, loading: ctx?.loading ?? false };
}

export function useOverviewChartsLoadingState() {
  const ctx = React.useContext(OverviewChartsLoadingContext);
  if (!ctx) {
    throw new Error(
      "useOverviewChartsLoadingState must be used within OverviewChartsLoadingProvider"
    );
  }
  return ctx.loading;
}

export function useOptionalOverviewChartsLoadingState() {
  const ctx = React.useContext(OverviewChartsLoadingContext);
  return ctx?.loading ?? false;
}

export function useOverviewChartsLoadingControls() {
  const ctx = React.useContext(OverviewChartsLoadingContext);
  if (!ctx) {
    throw new Error(
      "useOverviewChartsLoadingControls must be used within OverviewChartsLoadingProvider"
    );
  }
  return { setExpectedCharts: ctx.setExpectedCharts };
}
