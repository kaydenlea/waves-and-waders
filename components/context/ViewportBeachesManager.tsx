"use client";

import * as React from "react";
import { useViewportBeaches } from "@/lib/hooks/useViewportBeaches";
import { useMapData } from "./MapFilterContext";
import { useMapViewport } from "./MapViewportContext";
import { useClientPath } from "./PathContext";
import { useViewportBeachesContext } from "./ViewportBeachesContext";

const MAX_VIEWPORT_BEACHES = 1500;
const ViewportBeachesManager = () => {
  const { filters, favoriteIds, setBeaches, beaches: mapBeaches } = useMapData();
  const mapBeachesCount = mapBeaches.length;
  const deferredFilters = React.useDeferredValue(filters);
  const {
    visibleBounds,
    viewportRequestId,
    setViewportStatus,
    allowViewportCommit,
  } = useMapViewport();
  const {
    committedBounds,
    searchBounds,
    setStatus: setViewportContextStatus,
    setBeaches: setViewportContextBeaches,
    commitPending,
  } = useViewportBeachesContext();
  const { selectedTab } = useClientPath();
  // Only fetch when bounds are explicitly "searched"/committed, not on every
  // transient camera update. This prevents rapid map interactions from
  // continuously triggering viewport requests and UI churn.
  const effectiveBounds = searchBounds ?? committedBounds;
  const { beaches, status } = useViewportBeaches({
    bounds: effectiveBounds,
    filters: deferredFilters,
    favoriteIds,
    selectedTab,
    limit: MAX_VIEWPORT_BEACHES,
    // Always allow the request to run; we gate *committing* results to map state
    // with `allowViewportCommit` below. Disabling the request entirely can leave
    // the map stuck showing a previous tab's markers (e.g. Nearby while on Saved).
    enabled: true,
    requestId: viewportRequestId,
    // Bounds updates are already debounced/throttled at the map level.
    // Avoid stacking additional client delays before the viewport request starts.
    debounceMs: 0,
  });

  React.useEffect(() => {
    const shouldMaskSuccess =
      status === "success" && beaches.length > 0 && mapBeachesCount === 0;
    const next = shouldMaskSuccess ? "loading" : status;
    setViewportStatus(next);
    setViewportContextStatus(next);
  }, [
    status,
    beaches.length,
    mapBeachesCount,
    setViewportContextStatus,
    setViewportStatus,
  ]);

  const pendingBeachesRef = React.useRef<typeof beaches | null>(null);
  const pendingRequestIdRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (status !== "success") {
      return;
    }
    if (allowViewportCommit) {
      React.startTransition(() => {
        setViewportContextBeaches(beaches);
        setBeaches(beaches);
        commitPending();
      });
      pendingBeachesRef.current = null;
      pendingRequestIdRef.current = null;
    } else {
      pendingBeachesRef.current = beaches;
      pendingRequestIdRef.current = viewportRequestId;
    }
  }, [
    allowViewportCommit,
    beaches,
    status,
    setBeaches,
    setViewportContextBeaches,
    commitPending,
    viewportRequestId,
  ]);
  React.useEffect(() => {
    if (
      !allowViewportCommit ||
      status !== "success" ||
      !pendingBeachesRef.current ||
      pendingRequestIdRef.current !== viewportRequestId
    ) {
      return;
    }
    {
      const next = pendingBeachesRef.current;
      React.startTransition(() => {
        setViewportContextBeaches(next);
        setBeaches(next);
        commitPending();
      });
      pendingBeachesRef.current = null;
      pendingRequestIdRef.current = null;
    }
  }, [
    allowViewportCommit,
    status,
    setBeaches,
    setViewportContextBeaches,
    commitPending,
    viewportRequestId,
  ]);

  return null;
};

export default ViewportBeachesManager;
