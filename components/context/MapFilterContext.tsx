"use client";

import React from "react";
import type { Map } from "maplibre-gl";

export type BeachPoint = {
  id: string | number;
  name: string;
  county: string;
  latitude: number;
  longitude: number;
  features?: Record<string, boolean>;
};

type MapViewState = {
  zoom: number;
  center: { longitude: number; latitude: number };
};

type ViewportStatus = "idle" | "loading" | "success" | "error";

export type VisibleMapBounds = {
  south: number;
  north: number;
  west: number;
  east: number;
  crossesAntimeridian: boolean;
} | null;

type Ctx = {
  openPanel: "filters" | "legend" | null;
  setOpenPanel: React.Dispatch<
    React.SetStateAction<"filters" | "legend" | null>
  >;
  togglePanel: (panel: "filters" | "legend") => void;
  showMap: boolean;
  setShowMap: React.Dispatch<React.SetStateAction<boolean>>;
  popupId: React.RefObject<string | null>;
  popupRef: React.RefObject<{
    id: number;
    longitude: number;
    latitude: number;
    properties: any;
  } | null>;
  popupData: string | null;
  setPopupData: React.Dispatch<React.SetStateAction<string | null>>;
  map: Map | undefined;
  setMap: React.Dispatch<React.SetStateAction<Map | undefined>>;
  mapRef: React.RefObject<Map | null>;
  filters: Set<string>;
  setFilters: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedDate: Date | null;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date | null>>;
  selectedHour: number | null;
  setSelectedHour: React.Dispatch<React.SetStateAction<number | null>>;
  surfIntensityForDate: number | null;
  setSurfIntensityForDate: React.Dispatch<React.SetStateAction<number | null>>;
  beaches: BeachPoint[];
  setBeaches: React.Dispatch<React.SetStateAction<BeachPoint[]>>;
  favoriteIds: Set<string>;
  setFavoriteIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  hoverCardId: string | null;
  setHoverCardId: React.Dispatch<React.SetStateAction<string | null>>;
  mapView: MapViewState;
  setMapView: React.Dispatch<React.SetStateAction<MapViewState>>;
  visibleBounds: VisibleMapBounds;
  setVisibleBounds: React.Dispatch<React.SetStateAction<VisibleMapBounds>>;
  visibleIds: Set<string>;
  setVisibleIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  viewportRequestId: number;
  setViewportRequestId: React.Dispatch<React.SetStateAction<number>>;
  viewportStatus: ViewportStatus;
  setViewportStatus: React.Dispatch<React.SetStateAction<ViewportStatus>>;
  allowViewportCommit: boolean;
  setAllowViewportCommit: React.Dispatch<React.SetStateAction<boolean>>;
};

const MapFilterContext = React.createContext<Ctx | null>(null);

export function MapFilterProvider({ children }: { children: React.ReactNode }) {
  const [openPanel, setOpenPanel] = React.useState<"filters" | "legend" | null>(
    null
  );
  const togglePanel = React.useCallback((panel: "filters" | "legend") => {
    setOpenPanel((prev) => (prev === panel ? null : panel));
  }, []);
  const [showMap, setShowMap] = React.useState(true);
  const popupId = React.useRef<string | null>(null);
  const popupRef = React.useRef<{
    id: number;
    longitude: number;
    latitude: number;
    properties: any;
  } | null>(null);
  const [popupData, setPopupData] = React.useState<string | null>(null);
  const [map, setMap] = React.useState<Map | undefined>(undefined);
  const mapRef = React.useRef<Map | null>(null);
  const [filters, setFilters] = React.useState<Set<string>>(new Set());
  // Default to today's date so the map shows surf data on initial load
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(
    () => new Date()
  );
  const [selectedHour, setSelectedHour] = React.useState<number | null>(null);
  const [surfIntensityForDate, setSurfIntensityForDate] = React.useState<
    number | null
  >(null);
  const [beaches, setBeaches] = React.useState<BeachPoint[]>([]);
  const [favoriteIds, setFavoriteIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [hoverCardId, setHoverCardId] = React.useState<string | null>(null);
  const [mapView, setMapView] = React.useState<MapViewState>({
    zoom: 6,
    center: { longitude: -122.4, latitude: 37.8 },
  });
  const [visibleBounds, setVisibleBounds] =
    React.useState<VisibleMapBounds>(null);
  const [visibleIds, setVisibleIds] = React.useState<Set<string>>(new Set());
  const [viewportRequestId, setViewportRequestId] = React.useState(0);
  const [viewportStatus, setViewportStatus] =
    React.useState<ViewportStatus>("idle");
  const [allowViewportCommit, setAllowViewportCommit] =
    React.useState<boolean>(true);
  const value = React.useMemo(
    () => ({
      openPanel,
      setOpenPanel,
      togglePanel,
      showMap,
      setShowMap,
      popupId,
      popupRef,
      popupData,
      setPopupData,
      map,
      setMap,
      mapRef,
      filters,
      setFilters,
      selectedDate,
      setSelectedDate,
      selectedHour,
      setSelectedHour,
      surfIntensityForDate,
      setSurfIntensityForDate,
      beaches,
      setBeaches,
      favoriteIds,
      setFavoriteIds,
      hoverCardId,
      setHoverCardId,
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
      openPanel,
      togglePanel,
      showMap,
      popupId,
      popupData,
      map,
      filters,
      selectedDate,
      selectedHour,
      surfIntensityForDate,
      beaches,
      favoriteIds,
      hoverCardId,
      mapView,
      visibleBounds,
      visibleIds,
      viewportRequestId,
      viewportStatus,
      allowViewportCommit,
    ]
  );
  return (
    <MapFilterContext.Provider value={value}>
      {children}
    </MapFilterContext.Provider>
  );
}

export function useMapFilters(): Ctx {
  const ctx = React.useContext(MapFilterContext);
  if (!ctx)
    throw new Error("useMapFilters must be used within MapFilterProvider");
  return ctx;
}
