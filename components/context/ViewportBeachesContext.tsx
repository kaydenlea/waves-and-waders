"use client";

import * as React from "react";
import type { BeachPoint, VisibleMapBounds } from "@/components/context/MapFilterContext";

export type VisibleViewportBounds = {
  south: number;
  north: number;
  west: number;
  east: number;
  crossesAntimeridian: boolean;
} | null;

type ViewportStatus = "idle" | "dirty" | "loading" | "success" | "error";

type ViewportCamera = {
  center: { longitude: number; latitude: number };
  zoom: number;
  bounds: VisibleViewportBounds;
};

type State = {
  camera: ViewportCamera;
  pendingBounds: VisibleViewportBounds;
  committedBounds: VisibleViewportBounds;
  searchBounds: VisibleViewportBounds;
  status: ViewportStatus;
  beaches: BeachPoint[];
  error: Error | null;
};

type Actions = {
  onCameraChange: (payload: {
    bounds: VisibleViewportBounds;
    zoom: number;
    center?: { longitude: number; latitude: number };
  }) => void;
  commitPending: () => void;
  setStatus: React.Dispatch<React.SetStateAction<ViewportStatus>>;
  setBeaches: React.Dispatch<React.SetStateAction<BeachPoint[]>>;
  setError: React.Dispatch<React.SetStateAction<Error | null>>;
  requestSearch: () => void;
  readyToSearch: boolean;
};

type ContextValue = State & Actions;

const DEFAULT_CAMERA: ViewportCamera = {
  center: { longitude: -122.4, latitude: 37.8 },
  zoom: 6,
  bounds: null,
};

const ViewportBeachesContext = React.createContext<ContextValue | null>(null);

export const ViewportBeachesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [camera, setCamera] = React.useState<ViewportCamera>(DEFAULT_CAMERA);
  const [pendingBounds, setPendingBounds] =
    React.useState<VisibleMapBounds>(null);
  const [committedBounds, setCommittedBounds] =
    React.useState<VisibleMapBounds>(null);
  const [searchBounds, setSearchBounds] =
    React.useState<VisibleMapBounds>(null);
  const [status, setStatus] = React.useState<ViewportStatus>("idle");
  const [beaches, setBeaches] = React.useState<BeachPoint[]>([]);
  const [error, setError] = React.useState<Error | null>(null);
  const [readyToSearch, setReadyToSearch] = React.useState(false);
  const idleTimeoutRef = React.useRef<number | null>(null);

  const clearIdleTimer = React.useCallback(() => {
    if (idleTimeoutRef.current != null) {
      window.clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
  }, []);

  const boundsEqual = React.useCallback(
    (a: VisibleMapBounds, b: VisibleMapBounds) => {
      if (!a || !b) return false;
      return (
        a.south === b.south &&
        a.north === b.north &&
        a.west === b.west &&
        a.east === b.east &&
        a.crossesAntimeridian === b.crossesAntimeridian
      );
    },
    []
  );

  const requestSearch = React.useCallback(() => {
    if (!pendingBounds) return;
    setSearchBounds((current) => {
      if (boundsEqual(current, pendingBounds)) {
        return current;
      }
      setStatus("loading");
      setReadyToSearch(false);
      return pendingBounds;
    });
  }, [boundsEqual, pendingBounds]);

  const onCameraChange = React.useCallback(
    ({
      bounds,
      zoom,
      center,
    }: {
      bounds: VisibleMapBounds;
      zoom: number;
      center?: { longitude: number; latitude: number };
    }) => {
      setCamera((prev) => ({
        center: center ?? prev.center,
        zoom,
        bounds,
      }));
      setPendingBounds(bounds);
      setReadyToSearch(true);
      setStatus((prev) => (prev === "loading" ? "loading" : "dirty"));
      clearIdleTimer();
      idleTimeoutRef.current = window.setTimeout(() => {
        idleTimeoutRef.current = null;
        requestSearch();
      }, 350);
    },
    [clearIdleTimer, requestSearch]
  );

  const commitPending = React.useCallback(() => {
    setCommittedBounds((prev) => searchBounds ?? pendingBounds ?? prev);
    setSearchBounds(null);
    setReadyToSearch(false);
  }, [pendingBounds, searchBounds]);

  React.useEffect(() => {
    return () => {
      clearIdleTimer();
    };
  }, [clearIdleTimer]);

  React.useEffect(() => {
    if (!pendingBounds) return;
    if (!committedBounds && !searchBounds && status === "dirty") {
      requestSearch();
    }
  }, [pendingBounds, committedBounds, searchBounds, status, requestSearch]);

  const value = React.useMemo<ContextValue>(
    () => ({
      camera,
      pendingBounds,
      committedBounds,
      searchBounds,
      searchBounds,
      status,
      beaches,
      error,
      onCameraChange,
      commitPending,
      setStatus,
      setBeaches,
      setError,
      requestSearch,
      readyToSearch,
    }),
    [
      camera,
      pendingBounds,
      committedBounds,
      searchBounds,
      searchBounds,
      status,
      beaches,
      error,
      onCameraChange,
      commitPending,
      requestSearch,
      readyToSearch,
    ]
  );

  return (
    <ViewportBeachesContext.Provider value={value}>
      {children}
    </ViewportBeachesContext.Provider>
  );
};

export const useViewportBeachesContext = () => {
  const ctx = React.useContext(ViewportBeachesContext);
  if (!ctx) {
    throw new Error(
      "useViewportBeachesContext must be used within ViewportBeachesProvider"
    );
  }
  return ctx;
};
