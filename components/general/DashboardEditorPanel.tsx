"use client";

import * as React from "react";

import { useDashboardEditMode } from "@/components/context/DashboardEditModeContext";
import Dashboard from "@/components/general/Dashboard";
import {
  useOptionalForecastChartsLoadingControls,
} from "@/components/context/ForecastChartsLoadingContext";
import {
  useOptionalOverviewChartsLoadingControls,
} from "@/components/context/OverviewChartsLoadingContext";
import type {
  DashboardType,
  Row,
  WidgetId,
  WidgetMeta,
} from "@/components/general/dashboardLayout";
import { useDashboardLayout } from "@/components/general/useDashboardLayout";

type Props = {
  type: DashboardType;
  initialMeta?: Partial<Record<WidgetId, WidgetMeta>> | null;
  initialRows?: Row[] | null;
  renderWidget?: (id: WidgetId, variant: "full" | "half") => React.ReactNode;
};

export default function DashboardEditorPanel({
  type,
  initialMeta = null,
  initialRows = null,
  renderWidget,
}: Props) {
  const { cacheLayout } = useDashboardEditMode();
  const overviewChartsControls = useOptionalOverviewChartsLoadingControls();
  const forecastChartsControls = useOptionalForecastChartsLoadingControls();

  const { meta, rows, hydrated, setMeta, setRows, reset } = useDashboardLayout({
    type,
    initialMeta,
    initialRows,
    persist: true,
    persistAnonymous: false,
    reconcile: false,
  });

  const latestSnapshotRef = React.useRef<{ meta: typeof meta; rows: typeof rows }>(
    { meta, rows },
  );
  React.useEffect(() => {
    latestSnapshotRef.current = { meta, rows };
  }, [meta, rows]);

  React.useLayoutEffect(() => {
    if (!hydrated) return;
    cacheLayout({ type, meta, rows });
  }, [cacheLayout, hydrated, meta, rows, type]);

  React.useEffect(() => {
    return () => {
      const latest = latestSnapshotRef.current;
      if (!hydrated) return;
      cacheLayout({ type, meta: latest.meta, rows: latest.rows });
    };
  }, [cacheLayout, hydrated, type]);

  const expectedChartIds = React.useMemo(() => {
    const ids = new Set<string>();
    const widgetToCharts: Partial<Record<WidgetId, readonly string[]>> =
      type === "overview"
        ? {
            stats: ["overview-highlights"],
            tide: ["overview-tide"],
            surf: ["overview-surf"],
            swell: ["overview-swell"],
            energy: ["overview-energy"],
            wind: ["overview-wind"],
            table: ["overview-table"],
          }
        : {
            tide: ["forecast-tide"],
            surf: ["forecast-surf"],
            wind: ["forecast-wind"],
            swell: ["forecast-swell"],
            energy: ["forecast-energy"],
            table: ["forecast-table"],
            surfAndWind: ["forecast-surf", "forecast-wind"],
          };

    for (const row of rows) {
      for (const widgetId of row.items) {
        if (meta[widgetId]?.visible === false) continue;
        const charts = widgetToCharts[widgetId];
        if (!charts) continue;
        for (const chartId of charts) ids.add(chartId);
      }
    }

    return Array.from(ids).sort();
  }, [meta, rows, type]);

  React.useLayoutEffect(() => {
    const controls =
      type === "overview" ? overviewChartsControls : forecastChartsControls;
    controls?.setExpectedCharts(expectedChartIds);
  }, [
    expectedChartIds,
    forecastChartsControls,
    overviewChartsControls,
    type,
  ]);

  return (
    <Dashboard
      type={type}
      meta={meta}
      rows={rows}
      setMeta={setMeta}
      setRows={setRows}
      reset={reset}
      renderWidget={renderWidget}
    />
  );
}
