"use client";

import * as React from "react";

import type {
  DashboardType,
  Row,
  WidgetId,
  WidgetMeta,
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
  pendingLayoutApply: PendingLayoutApply | null;
};

type DashboardEditModeContextValue = DashboardEditModeState & {
  enterEdit: (type: DashboardType) => void;
  exitEdit: () => void;
  requestScrollTo: (id: string) => void;
  clearPendingScrollTo: () => void;
  queueLayoutApply: (next: PendingLayoutApply) => void;
  clearPendingLayoutApply: () => void;
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
  const cachedLayoutsRef = React.useRef<Partial<
    Record<DashboardType, LayoutSnapshot>
  > >({});

  const [state, setState] = React.useState<DashboardEditModeState>({
    isEditing: false,
    dashboardType: null,
    pendingScrollToId: null,
    pendingLayoutApply: null,
  });

  const enterEdit = React.useCallback((type: DashboardType) => {
    setState({
      isEditing: true,
      dashboardType: type,
      pendingScrollToId: null,
      pendingLayoutApply: null,
    });
  }, []);

  const exitEdit = React.useCallback(() => {
    setState((prev) => ({ ...prev, isEditing: false, dashboardType: null }));
  }, []);

  const requestScrollTo = React.useCallback((id: string) => {
    setState((prev) => ({ ...prev, pendingScrollToId: id }));
  }, []);

  const clearPendingScrollTo = React.useCallback(() => {
    setState((prev) => ({ ...prev, pendingScrollToId: null }));
  }, []);

  const queueLayoutApply = React.useCallback((next: PendingLayoutApply) => {
    setState((prev) => ({ ...prev, pendingLayoutApply: next }));
  }, []);

  const clearPendingLayoutApply = React.useCallback(() => {
    setState((prev) => ({ ...prev, pendingLayoutApply: null }));
  }, []);

  const cacheLayout = React.useCallback((next: LayoutSnapshot) => {
    cachedLayoutsRef.current[next.type] = next;
  }, []);

  const getCachedLayout = React.useCallback((type: DashboardType) => {
    return cachedLayoutsRef.current[type] ?? null;
  }, []);

  const value = React.useMemo(
    () => ({
      ...state,
      enterEdit,
      exitEdit,
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
      requestScrollTo,
      clearPendingScrollTo,
      queueLayoutApply,
      clearPendingLayoutApply,
      cacheLayout,
      getCachedLayout,
    ]
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
      "useDashboardEditMode must be used within DashboardEditModeProvider"
    );
  }
  return ctx;
}

export function useOptionalDashboardEditMode() {
  return React.useContext(DashboardEditModeContext);
}
