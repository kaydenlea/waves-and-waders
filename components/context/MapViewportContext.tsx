"use client";

import * as React from "react";

export type VisibleMapBounds = {
  south: number;
  north: number;
  west: number;
  east: number;
  crossesAntimeridian: boolean;
} | null;

export type MapViewState = {
  zoom: number;
  center: { longitude: number; latitude: number };
};

export type MapViewportStatus = "idle" | "loading" | "success" | "error";

type MapViewportCtx = {
  mapView: MapViewState;
  setMapView: React.Dispatch<React.SetStateAction<MapViewState>>;
  visibleBounds: VisibleMapBounds;
  setVisibleBounds: React.Dispatch<React.SetStateAction<VisibleMapBounds>>;
  visibleIds: Set<string>;
  setVisibleIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  viewportRequestId: number;
  setViewportRequestId: React.Dispatch<React.SetStateAction<number>>;
  viewportStatus: MapViewportStatus;
  setViewportStatus: React.Dispatch<React.SetStateAction<MapViewportStatus>>;
  allowViewportCommit: boolean;
  setAllowViewportCommit: React.Dispatch<React.SetStateAction<boolean>>;
};

const MapViewportContext = React.createContext<MapViewportCtx | null>(null);

export function MapViewportProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mapView, setMapView] = React.useState<MapViewState>({
    zoom: 6,
    center: { longitude: -122.4, latitude: 37.8 },
  });
  const [visibleBounds, setVisibleBounds] =
    React.useState<VisibleMapBounds>(null);
  const [visibleIds, setVisibleIds] = React.useState<Set<string>>(new Set());
  const [viewportRequestId, setViewportRequestId] = React.useState(0);
  const [viewportStatus, setViewportStatus] =
    React.useState<MapViewportStatus>("idle");
  const [allowViewportCommit, setAllowViewportCommit] =
    React.useState<boolean>(true);

  const value = React.useMemo(
    () => ({
      mapView,
      setMapView,
      visibleBounds,
      setVisibleBounds,
      visibleIds,
      setVisibleIds,
      viewportRequestId,
      setViewportRequestId,
      viewportStatus,
      setViewportStatus,
      allowViewportCommit,
      setAllowViewportCommit,
    }),
    [
      mapView,
      visibleBounds,
      visibleIds,
      viewportRequestId,
      viewportStatus,
      allowViewportCommit,
    ]
  );

  return (
    <MapViewportContext.Provider value={value}>
      {children}
    </MapViewportContext.Provider>
  );
}

export function useMapViewport(): MapViewportCtx {
  const ctx = React.useContext(MapViewportContext);
  if (!ctx) {
    throw new Error("useMapViewport must be used within MapViewportProvider");
  }
  return ctx;
}
