"use client";

import React from "react";

type Ctx = {
  reportStatus: (id: string, ready: boolean) => void;
  unregister: (id: string) => void;
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

  const rawLoading = React.useMemo(() => {
    if (statusMap.size === 0) {
      return true;
    }
    for (const ready of statusMap.values()) {
      if (!ready) return true;
    }
    return false;
  }, [statusMap]);

  const value = React.useMemo(
    () => ({ reportStatus, unregister, loading: rawLoading, busy: rawLoading }),
    [reportStatus, unregister, rawLoading]
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
  const idRef = React.useRef<string>(makeId(name));

  React.useEffect(() => {
    ctx.reportStatus(idRef.current, false);
    return () => {
      ctx.unregister(idRef.current);
    };
  }, [ctx]);

  const setReady = React.useCallback(
    (ready: boolean) => ctx.reportStatus(idRef.current, ready),
    [ctx]
  );

  return { setReady, loading: ctx.loading };
}

// Optional variant that no-ops outside a provider. Useful for components
// that may be rendered both inside and outside forecast dashboards.
export function useOptionalForecastChartLoading(name?: string) {
  const ctx = React.useContext(ForecastChartsLoadingContext);
  const idRef = React.useRef<string>(makeId(name));

  React.useEffect(() => {
    if (!ctx) return;
    ctx.reportStatus(idRef.current, false);
    return () => {
      ctx.unregister(idRef.current);
    };
  }, [ctx]);

  const setReady = React.useCallback(
    (ready: boolean) => {
      if (!ctx) return;
      ctx.reportStatus(idRef.current, ready);
    },
    [ctx]
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
