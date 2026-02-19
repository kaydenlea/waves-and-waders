"use client";

import * as React from "react";
import {
  useSessionContext,
  useSupabaseClient,
} from "@/lib/supabaseAuth";

import {
  getDashboardStorageKey,
  getDefaultLayout,
  normalizeMeta,
  normalizeRows,
  packRowsForTwoColumn,
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
  reconcile?: boolean;
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
  reconcile = true,
}: Options) {
  const layoutDefaults = React.useMemo(() => getDefaultLayout(type), [type]);
  const hasInitialLayout = initialMeta != null || initialRows != null;

  const supabase = useSupabaseClient();
  const { session, isLoading: sessionLoading } = useSessionContext();

  const [state, setState] = React.useState<LayoutState>(() => {
    const meta = initialMeta
      ? normalizeMeta(type, initialMeta)
      : layoutDefaults.meta;
    const rows = initialRows
      ? normalizeRows(type, initialRows, meta)
      : layoutDefaults.rows;
    // Start not hydrated when reconciling (Supabase/localStorage/no-op) so view-mode
    // overlays don't flicker on hard refresh. When reconciliation is disabled (editor
    // panels that already receive the up-to-date layout), start hydrated to prevent
    // a transient layout swap.
    const hydrated = reconcile ? false : true;
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
    if (!reconcile) {
      // Editor panels can provide the correct layout synchronously. Avoid applying
      // a second source-of-truth (Supabase/localStorage) that can cause a flash.
      setState((prev) => (prev.hydrated ? prev : { ...prev, hydrated: true }));
      return () => {
        cancelled = true;
      };
    }
    const defaults = getDefaultLayout(type);
    const initialMetaNormalized = initialMeta
      ? normalizeMeta(type, initialMeta)
      : defaults.meta;
    const initialRowsNormalized = initialRows
      ? normalizeRows(type, initialRows, initialMetaNormalized)
      : defaults.rows;

    const safeApply = (
      nextMeta: Partial<Record<WidgetId, WidgetMeta>>,
      nextRows: Row[]
    ) => {
      if (cancelled) return;
      applyLayout(nextMeta, nextRows, true);
    };

    const markHydrated = () => {
      if (cancelled) return;
      setState((prev) => (prev.hydrated ? prev : { ...prev, hydrated: true }));
    };

    const loadFromLocalStorage = (options?: { onlyIfPresent?: boolean }) => {
      if (typeof window === "undefined") {
        safeApply(defaults.meta, defaults.rows);
        return;
      }

      try {
        const savedMetaRaw = window.localStorage.getItem(storageMetaKey);
        const savedRowsRaw = window.localStorage.getItem(storageRowsKey);

        if (!savedMetaRaw && !savedRowsRaw) {
          if (options?.onlyIfPresent) {
            // Keep the server-provided layout and simply mark reconciliation complete.
            markHydrated();
            return;
          }
          if (hasInitialLayout) {
            safeApply(initialMetaNormalized, initialRowsNormalized);
            return;
          }
          safeApply(defaults.meta, defaults.rows);
          return;
        }

        const nextMeta = savedMetaRaw
          ? normalizeMeta(type, JSON.parse(savedMetaRaw))
          : hasInitialLayout
          ? initialMetaNormalized
          : defaults.meta;
        const nextRows = savedRowsRaw
          ? normalizeRows(type, JSON.parse(savedRowsRaw), nextMeta)
          : hasInitialLayout
          ? initialRowsNormalized
          : defaults.rows;

        safeApply(nextMeta, nextRows);
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Failed loading dashboard layout from storage", error);
        }
        if (options?.onlyIfPresent) {
          markHydrated();
          return;
        }
        if (hasInitialLayout) {
          safeApply(initialMetaNormalized, initialRowsNormalized);
          return;
        }
        safeApply(defaults.meta, defaults.rows);
      }
    };

    const loadFromSupabase = async () => {
      // If the server already rendered an initial layout, don't immediately "override" it
      // with localStorage while Supabase is still determining the session. That transient
      // swap can cause the Overview loading overlay to hide and re-appear on first load.
      if (hasInitialLayout && sessionLoading) {
        return;
      }
      if (!session) {
        // When the server already rendered a layout, avoid applying a defaults/localStorage
        // fallback that can later be replaced and cause a second loading cycle.
        loadFromLocalStorage({ onlyIfPresent: hasInitialLayout });
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
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              "Failed loading dashboard layout from Supabase",
              error
            );
          }
          if (hasInitialLayout) {
            safeApply(initialMetaNormalized, initialRowsNormalized);
            return;
          }
          safeApply(defaults.meta, defaults.rows);
          return;
        }

        if (!data) {
          if (hasInitialLayout) {
            safeApply(initialMetaNormalized, initialRowsNormalized);
            return;
          }
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
        if (process.env.NODE_ENV !== "production") {
          console.warn("Unexpected error loading layout", error);
        }
        if (hasInitialLayout) {
          safeApply(initialMetaNormalized, initialRowsNormalized);
          return;
        }
        safeApply(defaults.meta, defaults.rows);
      }
    };

    void loadFromSupabase();

    return () => {
      cancelled = true;
    };
  }, [
    applyLayout,
    reconcile,
    storageMetaKey,
    storageRowsKey,
    supabase,
    session,
    sessionLoading,
    type,
    hasInitialLayout,
  ]);

  React.useEffect(() => {
    if (!persist) return;
    if (!persistAnonymous) return;
    if (!state.hydrated || typeof window === "undefined" || session) return;
    try {
      const packedRows = packRowsForTwoColumn(state.rows, state.meta);
      window.localStorage.setItem(storageMetaKey, JSON.stringify(state.meta));
      window.localStorage.setItem(storageRowsKey, JSON.stringify(packedRows));
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Failed to persist dashboard layout", error);
      }
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
    const packedRows = packRowsForTwoColumn(state.rows, state.meta);

    const persistLayout = async () => {
      const payload = {
        user_id: session.user.id,
        [columnMeta]: state.meta,
        [columnRows]: packedRows,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("user_dashboard_settings")
        .upsert(payload, { onConflict: "user_id" });

      if (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Failed saving dashboard layout", error);
        }
      }
    };

    void persistLayout();
  }, [
    persist,
    state.hydrated,
    session,
    supabase,
    state.meta,
    state.rows,
    type,
  ]);

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
