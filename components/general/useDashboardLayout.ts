"use client";

import * as React from "react";
import {
  useSessionContext,
  useSupabaseClient,
} from "@supabase/auth-helpers-react";

import {
  getDashboardStorageKey,
  getDefaultLayout,
  normalizeMeta,
  normalizeRows,
  type DashboardType,
  type Row,
  type WidgetId,
  type WidgetMeta,
} from "@/components/general/dashboardLayout";

type LayoutState = {
  meta: Partial<Record<WidgetId, WidgetMeta>>;
  rows: Row[];
  hydrated: boolean;
};

type Options = {
  type: DashboardType;
  initialMeta?: Partial<Record<WidgetId, WidgetMeta>> | null;
  initialRows?: Row[] | null;
  persist?: boolean;
  persistAnonymous?: boolean;
};

interface NormalizedData {
  overview_meta?: unknown;
  forecast_meta?: unknown;
  overview_rows?: unknown;
  forecast_rows?: unknown;
}

export function useDashboardLayout({
  type,
  initialMeta = null,
  initialRows = null,
  persist = false,
  persistAnonymous = false,
}: Options) {
  const layoutDefaults = React.useMemo(() => getDefaultLayout(type), [type]);

  const [state, setState] = React.useState<LayoutState>(() => {
    const meta = initialMeta ? normalizeMeta(type, initialMeta) : layoutDefaults.meta;
    const rows = initialRows ? normalizeRows(type, initialRows, meta) : layoutDefaults.rows;
    const hydrated = Boolean(initialRows && initialRows.length);
    return { meta, rows, hydrated };
  });

  const storageMetaKey = React.useMemo(
    () => getDashboardStorageKey(type, "meta"),
    [type]
  );
  const storageRowsKey = React.useMemo(
    () => getDashboardStorageKey(type, "rows"),
    [type]
  );

  const supabase = useSupabaseClient();
  const { session } = useSessionContext();

  const setMeta = React.useCallback(
    (
      next:
        | Partial<Record<WidgetId, WidgetMeta>>
        | ((
            prev: Partial<Record<WidgetId, WidgetMeta>>
          ) => Partial<Record<WidgetId, WidgetMeta>>)
    ) => {
      setState((prev) => {
        const computed = typeof next === "function" ? next(prev.meta) : next;
        return { ...prev, meta: computed };
      });
    },
    []
  );

  const setRows = React.useCallback(
    (next: Row[] | ((prev: Row[]) => Row[])) => {
      setState((prev) => {
        const computed = typeof next === "function" ? next(prev.rows) : next;
        return { ...prev, rows: computed };
      });
    },
    []
  );

  const applyLayout = React.useCallback(
    (
      nextMeta: Partial<Record<WidgetId, WidgetMeta>>,
      nextRows: Row[],
      hydrated = true
    ) => {
      setState({ meta: nextMeta, rows: nextRows, hydrated });
    },
    []
  );

  React.useEffect(() => {
    let cancelled = false;
    const defaults = getDefaultLayout(type);

    const safeApply = (
      nextMeta: Partial<Record<WidgetId, WidgetMeta>>,
      nextRows: Row[]
    ) => {
      if (cancelled) return;
      applyLayout(nextMeta, nextRows, true);
    };

    const loadFromLocalStorage = () => {
      if (typeof window === "undefined") {
        safeApply(defaults.meta, defaults.rows);
        return;
      }

      try {
        const savedMetaRaw = window.localStorage.getItem(storageMetaKey);
        const nextMeta = savedMetaRaw
          ? normalizeMeta(type, JSON.parse(savedMetaRaw))
          : defaults.meta;

        const savedRowsRaw = window.localStorage.getItem(storageRowsKey);
        const nextRows = savedRowsRaw
          ? normalizeRows(type, JSON.parse(savedRowsRaw), nextMeta)
          : defaults.rows;

        safeApply(nextMeta, nextRows);
      } catch (error) {
        console.warn("Failed loading dashboard layout from storage", error);
        safeApply(defaults.meta, defaults.rows);
      }
    };

    const loadFromSupabase = async () => {
      if (!session) {
        loadFromLocalStorage();
        return;
      }
      try {
        const columnMeta =
          type === "overview" ? "overview_meta" : "forecast_meta";
        const columnRows =
          type === "overview" ? "overview_rows" : "forecast_rows";

        const { data, error } = await supabase
          .from("user_dashboard_settings")
          .select(`${columnMeta}, ${columnRows}`)
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) {
          console.warn("Failed loading dashboard layout from Supabase", error);
          loadFromLocalStorage();
          return;
        }

        if (!data) {
          safeApply(defaults.meta, defaults.rows);
          return;
        }

        const nextMeta = normalizeMeta(
          type,
          (data as NormalizedData)[columnMeta]
        );
        const nextRows = normalizeRows(
          type,
          (data as NormalizedData)[columnRows],
          nextMeta
        );
        safeApply(nextMeta, nextRows);
      } catch (error) {
        console.warn("Unexpected error loading layout", error);
        loadFromLocalStorage();
      }
    };

    if (!cancelled) {
      setState((prev) => (prev.hydrated ? prev : { ...prev, hydrated: false }));
    }
    void loadFromSupabase();

    return () => {
      cancelled = true;
    };
  }, [applyLayout, storageMetaKey, storageRowsKey, supabase, session, type]);

  React.useEffect(() => {
    if (!persist) return;
    if (!persistAnonymous) return;
    if (!state.hydrated || typeof window === "undefined" || session) return;
    try {
      window.localStorage.setItem(storageMetaKey, JSON.stringify(state.meta));
      window.localStorage.setItem(storageRowsKey, JSON.stringify(state.rows));
    } catch (error) {
      console.warn("Failed to persist dashboard layout", error);
    }
  }, [
    persist,
    persistAnonymous,
    session,
    state.hydrated,
    state.meta,
    state.rows,
    storageMetaKey,
    storageRowsKey,
  ]);

  React.useEffect(() => {
    if (!persist) return;
    if (!state.hydrated || !session) return;

    const columnMeta = type === "overview" ? "overview_meta" : "forecast_meta";
    const columnRows = type === "overview" ? "overview_rows" : "forecast_rows";

    const persistLayout = async () => {
      const payload = {
        user_id: session.user.id,
        [columnMeta]: state.meta,
        [columnRows]: state.rows,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("user_dashboard_settings")
        .upsert(payload, { onConflict: "user_id" });

      if (error) {
        console.warn("Failed saving dashboard layout", error);
      }
    };

    void persistLayout();
  }, [persist, state.hydrated, session, supabase, state.meta, state.rows, type]);

  const reset = React.useCallback(() => {
    const defaults = getDefaultLayout(type);
    applyLayout(defaults.meta, defaults.rows, true);
  }, [applyLayout, type]);

  return {
    meta: state.meta,
    rows: state.rows,
    hydrated: state.hydrated,
    setMeta,
    setRows,
    reset,
  };
}
