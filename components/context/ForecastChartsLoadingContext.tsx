"use client";

import React from "react";

type Ctx = {
  reportStatus: (id: string, ready: boolean) => void;
  unregister: (id: string) => void;
  setExpectedCharts: (ids: readonly string[] | null) => void;
  loading: boolean;
  busy: boolean;
};

const ForecastChartsLoadingContext = React.createContext<Ctx | null>(null);

let idCounter = 0;
const makeId = (hint?: string) =>
  `${hint ?? "chart"}-${Date.now().toString(36)}-${idCounter++}`;

export function ForecastChartsLoadingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [statusMap, setStatusMap] = React.useState<Map<string, boolean>>(
    () => new Map()
  );
  const [expectedCharts, setExpectedCharts] = React.useState<
    readonly string[] | null
  >(null);

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
      setExpectedCharts((prev) => {
        if (ids === prev) return prev;
        if (ids == null || prev == null) return ids;
        if (ids.length !== prev.length) return ids;
        for (let i = 0; i < ids.length; i++) {
          if (ids[i] !== prev[i]) return ids;
        }
        return prev;
      });
    },
    []
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
      busy: rawLoading,
    }),
    [reportStatus, unregister, setExpectedChartsSafe, rawLoading]
  );

  return (
    <ForecastChartsLoadingContext.Provider value={value}>
      {children}
    </ForecastChartsLoadingContext.Provider>
  );
}

export function useForecastChartLoading(name?: string) {
  const ctx = React.useContext(ForecastChartsLoadingContext);
  if (!ctx) {
    throw new Error(
      "useForecastChartLoading must be used within ForecastChartsLoadingProvider"
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

// Optional variant that no-ops outside a provider. Useful for components
// that may be rendered both inside and outside forecast dashboards.
export function useOptionalForecastChartLoading(name?: string) {
  const ctx = React.useContext(ForecastChartsLoadingContext);
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

export function useForecastChartsLoadingState() {
  const ctx = React.useContext(ForecastChartsLoadingContext);
  if (!ctx) {
    throw new Error(
      "useForecastChartsLoadingState must be used within ForecastChartsLoadingProvider"
    );
  }
  return ctx.loading;
}

export function useForecastChartsLoadingControls() {
  const ctx = React.useContext(ForecastChartsLoadingContext);
  if (!ctx) {
    throw new Error(
      "useForecastChartsLoadingControls must be used within ForecastChartsLoadingProvider"
    );
  }
  return { setExpectedCharts: ctx.setExpectedCharts };
}

export function useOptionalForecastChartsLoadingControls() {
  const ctx = React.useContext(ForecastChartsLoadingContext);
  return ctx ? { setExpectedCharts: ctx.setExpectedCharts } : null;
}

export function useForecastChartsBusyState() {
  const ctx = React.useContext(ForecastChartsLoadingContext);
  if (!ctx) {
    throw new Error(
      "useForecastChartsBusyState must be used within ForecastChartsLoadingProvider"
    );
  }
  return ctx.busy;
}

// Optional variant for read-only access to the global loading flag.
// Returns `false` when used outside a provider, which is useful for
// components that should only react to forecast dashboard loading when
// they actually live inside a forecast layout.
export function useOptionalForecastChartsLoadingState() {
  const ctx = React.useContext(ForecastChartsLoadingContext);
  return ctx?.loading ?? false;
}

export function useOptionalForecastChartsBusyState() {
  const ctx = React.useContext(ForecastChartsLoadingContext);
  return ctx?.busy ?? false;
}
