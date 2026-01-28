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

type NamedInstances = Map<string, Map<string, boolean>>;
const namedInstancesByProvider = new WeakMap<object, NamedInstances>();

function getNamedInstances(providerKey: object): NamedInstances {
  const existing = namedInstancesByProvider.get(providerKey);
  if (existing) return existing;
  const next: NamedInstances = new Map();
  namedInstancesByProvider.set(providerKey, next);
  return next;
}

function anyReady(instances: Map<string, boolean>) {
  for (const ready of instances.values()) {
    if (ready) return true;
  }
  return false;
}

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
      if (expectedCharts.length === 0) return false;
      for (const id of expectedCharts) {
        if (!statusMap.get(id)) return true; // missing or explicitly not-ready
      }
      return false; // all expected charts are registered + ready
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
  const stableName = name;
  const instanceIdRef = React.useRef<string>(makeId(stableName));
  const reportStatus = ctx.reportStatus;
  const unregister = ctx.unregister;
  const providerKey = ctx as unknown as object;

  React.useEffect(() => {
    if (stableName === undefined) {
      reportStatus(idRef.current, false);
      return () => {
        unregister(idRef.current);
      };
    }

    const store = getNamedInstances(providerKey);
    const instances = store.get(stableName) ?? new Map<string, boolean>();
    store.set(stableName, instances);
    instances.set(instanceIdRef.current, false);
    reportStatus(stableName, anyReady(instances));

    return () => {
      const currentStore = namedInstancesByProvider.get(providerKey);
      const currentInstances = currentStore?.get(stableName);
      if (!currentStore || !currentInstances) return;
      currentInstances.delete(instanceIdRef.current);
      if (currentInstances.size === 0) {
        currentStore.delete(stableName);
        unregister(stableName);
        if (currentStore.size === 0) namedInstancesByProvider.delete(providerKey);
        return;
      }
      reportStatus(stableName, anyReady(currentInstances));
    };
  }, [providerKey, reportStatus, stableName, unregister]);

  const setReady = React.useCallback(
    (ready: boolean) => {
      if (stableName === undefined) {
        reportStatus(idRef.current, ready);
        return;
      }
      const store = namedInstancesByProvider.get(providerKey);
      const instances = store?.get(stableName);
      if (!instances) return;
      instances.set(instanceIdRef.current, ready);
      reportStatus(stableName, anyReady(instances));
    },
    [providerKey, reportStatus, stableName]
  );

  return { setReady, loading: ctx.loading };
}

export function useOptionalOverviewChartLoading(name?: string) {
  const ctx = React.useContext(OverviewChartsLoadingContext);
  const idRef = React.useRef<string>(name ?? makeId());
  const stableName = name;
  const instanceIdRef = React.useRef<string>(makeId(stableName));
  const reportStatus = ctx?.reportStatus;
  const unregister = ctx?.unregister;
  const providerKey = (ctx ?? null) as unknown as object | null;

  React.useEffect(() => {
    if (!reportStatus || !unregister) return;
    if (stableName === undefined) {
      reportStatus(idRef.current, false);
      return () => {
        unregister(idRef.current);
      };
    }
    if (!providerKey) return;

    const store = getNamedInstances(providerKey);
    const instances = store.get(stableName) ?? new Map<string, boolean>();
    store.set(stableName, instances);
    instances.set(instanceIdRef.current, false);
    reportStatus(stableName, anyReady(instances));

    return () => {
      const currentStore = namedInstancesByProvider.get(providerKey);
      const currentInstances = currentStore?.get(stableName);
      if (!currentStore || !currentInstances) return;
      currentInstances.delete(instanceIdRef.current);
      if (currentInstances.size === 0) {
        currentStore.delete(stableName);
        unregister(stableName);
        if (currentStore.size === 0) namedInstancesByProvider.delete(providerKey);
        return;
      }
      reportStatus(stableName, anyReady(currentInstances));
    };
  }, [providerKey, reportStatus, stableName, unregister]);

  const setReady = React.useCallback(
    (ready: boolean) => {
      if (!reportStatus) return;
      if (stableName === undefined) {
        reportStatus(idRef.current, ready);
        return;
      }
      if (!providerKey) return;
      const store = namedInstancesByProvider.get(providerKey);
      const instances = store?.get(stableName);
      if (!instances) return;
      instances.set(instanceIdRef.current, ready);
      reportStatus(stableName, anyReady(instances));
    },
    [providerKey, reportStatus, stableName]
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

export function useOptionalOverviewChartsLoadingControls() {
  const ctx = React.useContext(OverviewChartsLoadingContext);
  return ctx ? { setExpectedCharts: ctx.setExpectedCharts } : null;
}
