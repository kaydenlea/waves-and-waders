"use client";

import * as React from "react";

import BackButton from "@/components/general/BackButton";
import BottomNav from "@/components/general/BottomNav";
import DateSummaryBridge from "@/components/general/DateSummaryBridge";
import Footer from "@/components/general/Footer";
import { LazyLoadMap } from "@/components/general/LazyLoad/LazyLoadMap";
import NavBar from "@/components/general/NavBar";
import PathStyleWrapper from "@/components/general/PathStyleWrapper";
import SaveButton from "@/components/general/SaveButton";
import { SunDataProvider } from "@/components/context/SunDataContext";
import { useDashboardEditMode } from "@/components/context/DashboardEditModeContext";
import DashboardEditorScreen from "@/components/general/DashboardEditorScreen";
import type { BeachPoint } from "@/components/context/MapFilterContext";
import type { Row, WidgetId, WidgetMeta } from "@/components/general/dashboardLayout";

type Props = {
  beachId: string;
  beachParam: string;
  beachName: string;
  loggedIn: boolean;
  isFavorite: boolean;
  initialBeach?: BeachPoint | null;
  initialOverviewMeta: Partial<Record<WidgetId, WidgetMeta>>;
  initialOverviewRows: Row[];
  initialForecastMeta: Partial<Record<WidgetId, WidgetMeta>>;
  initialForecastRows: Row[];
};

export default function OverviewPageClient({
  beachId,
  beachParam,
  beachName,
  loggedIn,
  isFavorite,
  initialBeach,
  initialOverviewMeta,
  initialOverviewRows,
  initialForecastMeta,
  initialForecastRows,
}: Props) {
  const {
    isEditing,
    dashboardType,
    pendingScrollToId,
    clearPendingScrollTo,
    getCachedLayout,
  } = useDashboardEditMode();

  React.useLayoutEffect(() => {
    if (isEditing || !pendingScrollToId) return;

    const el = document.getElementById(pendingScrollToId);
    if (el) {
      el.scrollIntoView({ block: "start" });
      const url = new URL(window.location.href);
      url.hash = pendingScrollToId;
      history.replaceState(null, "", url.toString());
    }

    clearPendingScrollTo();
  }, [isEditing, pendingScrollToId, clearPendingScrollTo]);

  const editType = dashboardType ?? "overview";
  const cachedLayout = getCachedLayout(editType);
  const editorInitialMeta =
    cachedLayout?.meta ??
    (editType === "forecast" ? initialForecastMeta : initialOverviewMeta);
  const editorInitialRows =
    cachedLayout?.rows ??
    (editType === "forecast" ? initialForecastRows : initialOverviewRows);

  return (
    <>
      {isEditing ? (
        <DashboardEditorScreen
          beachParam={beachParam}
          type={editType}
          initialMeta={editorInitialMeta}
          initialRows={editorInitialRows}
        />
      ) : null}

      <div className={isEditing ? "hidden" : undefined} aria-hidden={isEditing}>
        <NavBar />
        <main
          id="main-content"
          className="bg-background-2 min-h-[calc(100vh-4rem)] @min-4xl:flex @min-4xl:flex-1 @min-4xl:mt-[5.5rem] @min-4xl:pb-4"
        >
          <LazyLoadMap
            beachId={beachId}
            initialBeach={initialBeach ?? undefined}
          />
          <PathStyleWrapper>
            <div className="@container pb-6 @min-4xl:pb-3 pt-2 @min-4xl:pt-8 px-1 @min-md:px-3">
              <header
                id="content"
                className="relative w-full flex flex-col gap-5 px-2 pt-3 @min-md:pt-4 pb-0 scroll-mt-30"
              >
                <div className="flex items-center gap-3">
                  <h1 className="pb-0.5 font-semibold text-3xl @min-md:text-4xl tracking-tight w-full whitespace-nowrap truncate">
                    {beachName}
                  </h1>
                  <div className="ml-auto flex items-center gap-2 shrink-0">
                    <BackButton loggedIn={loggedIn} />
                    <SaveButton beachId={beachId} initialIsFav={isFavorite} />
                  </div>
                </div>
              </header>

              <SunDataProvider>
                <DateSummaryBridge
                  beachId={beachId}
                  beachParam={beachParam}
                  isFavorite={isFavorite}
                  loggedIn={loggedIn}
                  initialOverviewMeta={initialOverviewMeta}
                  initialOverviewRows={initialOverviewRows}
                  initialForecastMeta={initialForecastMeta}
                  initialForecastRows={initialForecastRows}
                />
              </SunDataProvider>
            </div>
          </PathStyleWrapper>
        </main>
        <BottomNav />
        <Footer />
      </div>
    </>
  );
}
