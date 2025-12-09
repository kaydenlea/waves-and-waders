"use client";

import * as React from "react";
import { useViewportBeaches } from "@/lib/hooks/useViewportBeaches";
import { useMapFilters } from "./MapFilterContext";
import { useMapViewport } from "./MapViewportContext";
import { useClientPath } from "./PathContext";
import { useViewportBeachesContext } from "./ViewportBeachesContext";

const ViewportBeachesManager = () => {
  const { filters, favoriteIds, setBeaches } = useMapFilters();
  const {
    visibleBounds,
    viewportRequestId,
    setViewportStatus,
    allowViewportCommit,
  } = useMapViewport();
  const {
    pendingBounds,
    committedBounds,
    searchBounds,
    camera,
    onCameraChange,
    setStatus: setViewportContextStatus,
    setBeaches: setViewportContextBeaches,
    commitPending,
    requestSearch,
  } = useViewportBeachesContext();
  const { selectedTab } = useClientPath();
  const effectiveBounds =
    searchBounds ?? committedBounds ?? pendingBounds ?? visibleBounds;
  const { beaches, status } = useViewportBeaches({
    bounds: effectiveBounds,
    filters,
    favoriteIds,
    selectedTab,
    requestId: viewportRequestId,
  });

  React.useEffect(() => {
    if (!pendingBounds && !committedBounds) return;
    requestSearch();
  }, [filters, selectedTab, requestSearch, pendingBounds, committedBounds]);

  React.useEffect(() => {
    if (!visibleBounds) return;
    onCameraChange({
      bounds: visibleBounds,
      zoom: camera.zoom,
      center: camera.center,
    });
  }, [visibleBounds, onCameraChange, camera.center, camera.zoom]);

  React.useEffect(() => {
    setViewportStatus(status);
    setViewportContextStatus(status);
  }, [status, setViewportContextStatus, setViewportStatus]);

  const pendingBeachesRef = React.useRef<typeof beaches | null>(null);

  React.useEffect(() => {
    if (status !== "success") {
      return;
    }
    if (allowViewportCommit) {
      setViewportContextBeaches(beaches);
      setBeaches(beaches);
      commitPending();
      pendingBeachesRef.current = null;
    } else {
      pendingBeachesRef.current = beaches;
    }
  }, [
    allowViewportCommit,
    beaches,
    status,
    setBeaches,
    setViewportContextBeaches,
    commitPending,
  ]);

  React.useEffect(() => {
    if (allowViewportCommit && pendingBeachesRef.current) {
      setViewportContextBeaches(pendingBeachesRef.current);
      setBeaches(pendingBeachesRef.current);
      commitPending();
      pendingBeachesRef.current = null;
    }
  }, [allowViewportCommit, setBeaches, setViewportContextBeaches, commitPending]);

  return null;
};

export default ViewportBeachesManager;
