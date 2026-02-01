"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useToast } from "@/components/providers/ToastProvider";

import {
  packRowsForTwoColumn,
  type DashboardType,
  type Row,
  type WidgetId,
  type WidgetMeta,
} from "@/components/general/dashboardLayout";

type PendingLayoutApply = {
  type: DashboardType;
  meta: Partial<Record<WidgetId, WidgetMeta>>;
  rows: Row[];
};

type LayoutSnapshot = PendingLayoutApply;

type DashboardEditModeState = {
  isEditing: boolean;
  dashboardType: DashboardType | null;
  pendingScrollToId: string | null;
  pendingLayoutApply: Partial<Record<DashboardType, PendingLayoutApply>>;
};

type DashboardEditModeContextValue = DashboardEditModeState & {
  enterEdit: (type: DashboardType) => void;
  exitEdit: () => void;
  cancel: () => void;
  confirm: () => void;
  requestScrollTo: (id: string) => void;
  clearPendingScrollTo: () => void;
  queueLayoutApply: (next: PendingLayoutApply) => void;
  clearPendingLayoutApply: (type?: DashboardType) => void;
  cacheLayout: (next: LayoutSnapshot) => void;
  getCachedLayout: (type: DashboardType) => LayoutSnapshot | null;
};

const DashboardEditModeContext =
  React.createContext<DashboardEditModeContextValue | null>(null);

export function DashboardEditModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const pathname = usePathname() ?? "";
  const cachedLayoutsRef = React.useRef<
    Partial<Record<DashboardType, LayoutSnapshot>>
  >({});
  const baselineSignaturesRef = React.useRef<
    Partial<Record<DashboardType, string>>
  >({});
  const dirtyTypesRef = React.useRef<Partial<Record<DashboardType, boolean>>>(
    {},
  );
  const lastPathnameRef = React.useRef<string>("");

  const [state, setState] = React.useState<DashboardEditModeState>({
    isEditing: false,
    dashboardType: null,
    pendingScrollToId: null,
    pendingLayoutApply: {},
  });

  React.useEffect(() => {
    const prev = lastPathnameRef.current;
    lastPathnameRef.current = pathname;
    if (!state.isEditing) return;
    if (!prev) return;
    if (prev === pathname) return;

    const wasOverviewRoute = prev.includes("/overview");
    const isOverviewRoute = pathname.includes("/overview");
    if (wasOverviewRoute && !isOverviewRoute) {
      setState((current) =>
        current.isEditing
          ? {
              ...current,
              isEditing: false,
              dashboardType: null,
              pendingScrollToId: null,
            }
          : current,
      );
      dirtyTypesRef.current = {};
      baselineSignaturesRef.current = {};
    }
  }, [pathname, state.isEditing]);

  const layoutSignature = React.useCallback((snapshot: LayoutSnapshot) => {
    // Stable, cheap-enough signature for detecting user edits across tabs.
    return JSON.stringify({ meta: snapshot.meta, rows: snapshot.rows });
  }, []);

  const enterEdit = React.useCallback(
    (type: DashboardType) => {
      baselineSignaturesRef.current = {
        overview: cachedLayoutsRef.current.overview
          ? layoutSignature(cachedLayoutsRef.current.overview)
          : undefined,
        forecast: cachedLayoutsRef.current.forecast
          ? layoutSignature(cachedLayoutsRef.current.forecast)
          : undefined,
      };
      dirtyTypesRef.current = {};
      setState({
        isEditing: true,
        dashboardType: type,
        pendingScrollToId: null,
        pendingLayoutApply: {},
      });
    },
    [layoutSignature],
  );

  const exitEdit = React.useCallback(() => {
    setState((prev) => ({ ...prev, isEditing: false, dashboardType: null }));
  }, []);

  const cancel = React.useCallback(() => {
    // Discard any in-progress edits (do not apply pending layouts).
    cachedLayoutsRef.current = {};
    dirtyTypesRef.current = {};
    baselineSignaturesRef.current = {};
    setState((prev) => ({
      ...prev,
      isEditing: false,
      dashboardType: null,
      pendingScrollToId: null,
    }));
  }, []);

  const confirm = React.useCallback(() => {
    const dirtyTypes = (["overview", "forecast"] as const).filter((type) => {
      const snapshot = cachedLayoutsRef.current[type];
      if (!snapshot) return false;
      const baseline = baselineSignaturesRef.current[type];
      if (typeof baseline === "undefined") return false;
      return layoutSignature(snapshot) !== baseline;
    });
    const message = "Dashboard saved";
    // dirtyTypes.length === 2
    //   ? "Dashboard saved (Overview + Forecast)"
    //   : dirtyTypes.length === 1
    //     ? `Dashboard saved (${dirtyTypes[0] === "overview" ? "Overview" : "Forecast"})`
    //     : "Dashboard saved";

    setState((prev) => {
      const nextPending = { ...prev.pendingLayoutApply };
      for (const type of dirtyTypes) {
        const snapshot = cachedLayoutsRef.current[type];
        if (snapshot) nextPending[type] = snapshot;
      }
      return {
        ...prev,
        isEditing: false,
        dashboardType: null,
        pendingLayoutApply: nextPending,
      };
    });

    toast(message);
    dirtyTypesRef.current = {};
    baselineSignaturesRef.current = {};
  }, [layoutSignature, toast]);

  const requestScrollTo = React.useCallback((id: string) => {
    setState((prev) => ({ ...prev, pendingScrollToId: id }));
  }, []);

  const clearPendingScrollTo = React.useCallback(() => {
    setState((prev) => ({ ...prev, pendingScrollToId: null }));
  }, []);

  const queueLayoutApply = React.useCallback((next: PendingLayoutApply) => {
    setState((prev) => ({
      ...prev,
      pendingLayoutApply: { ...prev.pendingLayoutApply, [next.type]: next },
    }));
  }, []);

  const clearPendingLayoutApply = React.useCallback((type?: DashboardType) => {
    if (!type) {
      setState((prev) => ({ ...prev, pendingLayoutApply: {} }));
      return;
    }
    setState((prev) => {
      if (!prev.pendingLayoutApply[type]) return prev;
      const next = { ...prev.pendingLayoutApply };
      delete next[type];
      return { ...prev, pendingLayoutApply: next };
    });
  }, []);

  const cacheLayout = React.useCallback(
    (next: LayoutSnapshot) => {
      const canonical = {
        ...next,
        rows: packRowsForTwoColumn(next.rows, next.meta),
      };
      cachedLayoutsRef.current[canonical.type] = canonical;
      if (!state.isEditing) return;
      const sig = layoutSignature(canonical);
      const baseline = baselineSignaturesRef.current[canonical.type];
      if (typeof baseline === "undefined") {
        baselineSignaturesRef.current[canonical.type] = sig;
        dirtyTypesRef.current[canonical.type] = false;
        return;
      }
      dirtyTypesRef.current[canonical.type] = baseline !== sig;
    },
    [layoutSignature, state.isEditing],
  );

  const getCachedLayout = React.useCallback((type: DashboardType) => {
    return cachedLayoutsRef.current[type] ?? null;
  }, []);

  const value = React.useMemo(
    () => ({
      ...state,
      enterEdit,
      exitEdit,
      cancel,
      confirm,
      requestScrollTo,
      clearPendingScrollTo,
      queueLayoutApply,
      clearPendingLayoutApply,
      cacheLayout,
      getCachedLayout,
    }),
    [
      state,
      enterEdit,
      exitEdit,
      cancel,
      confirm,
      requestScrollTo,
      clearPendingScrollTo,
      queueLayoutApply,
      clearPendingLayoutApply,
      cacheLayout,
      getCachedLayout,
    ],
  );

  return (
    <DashboardEditModeContext.Provider value={value}>
      {children}
    </DashboardEditModeContext.Provider>
  );
}

export function useDashboardEditMode() {
  const ctx = React.useContext(DashboardEditModeContext);
  if (!ctx) {
    throw new Error(
      "useDashboardEditMode must be used within DashboardEditModeProvider",
    );
  }
  return ctx;
}

export function useOptionalDashboardEditMode() {
  return React.useContext(DashboardEditModeContext);
}
