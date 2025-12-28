"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";

import PathStyleWrapper from "@/components/general/PathStyleWrapper";
import { useDashboardEditMode } from "@/components/context/DashboardEditModeContext";
import type {
  DashboardType,
  Row,
  WidgetId,
  WidgetMeta,
} from "@/components/general/dashboardLayout";
import Dashboard from "@/components/general/Dashboard";
import { useDashboardLayout } from "@/components/general/useDashboardLayout";

type Props = {
  beachParam: string;
  type: DashboardType;
  initialMeta?: Partial<Record<WidgetId, WidgetMeta>> | null;
  initialRows?: Row[] | null;
};

export default function DashboardEditorScreen({
  beachParam,
  type,
  initialMeta = null,
  initialRows = null,
}: Props) {
  const router = useRouter();
  const { exitEdit, requestScrollTo, queueLayoutApply } = useDashboardEditMode();

  const { meta, rows, setMeta, setRows, reset } = useDashboardLayout({
    type,
    initialMeta,
    initialRows,
    persist: true,
    persistAnonymous: false,
  });

  const sectionId = type === "forecast" ? "forecast-content" : "overview-content";

  const handleConfirm = () => {
    const base =
      type === "forecast"
        ? `/${beachParam}/overview?tab=forecast`
        : `/${beachParam}/overview`;

    if (typeof window !== "undefined") {
      const current = `${window.location.pathname}${window.location.search}`;
      if (current !== base) router.replace(base, { scroll: false });
    }

    queueLayoutApply({ type, meta, rows });
    requestScrollTo(sectionId);
    exitEdit();
  };

  return (
    <div className="bg-background-2 min-h-screen">
      <PathStyleWrapper>
        <div id="dashboard-editor" className="@container py-0 @min-4xl:py-5 p-5 mt-0">
          <section id={sectionId} className="flex flex-col gap-3 w-full mb-2">
            <header className="mx-2 gap-2 flex justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Drag and drop widgets</h2>
                <p className="text-sm text-muted-foreground">
                  Customize your dashboard
                </p>
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex justify-center text-sm gap-1 h-10 px-3 items-center border border-border bg-highlight-4 rounded-full drop-shadow-sm hover:bg-highlight-3"
              >
                <CircleCheck size={20} />
                Confirm
              </button>
            </header>
            <Dashboard
              type={type}
              meta={meta}
              rows={rows}
              setMeta={setMeta}
              setRows={setRows}
              reset={reset}
            />
          </section>
        </div>
      </PathStyleWrapper>
    </div>
  );
}
